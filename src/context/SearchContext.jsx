import { createContext, useContext, useReducer, useCallback } from 'react'
import { calculateZones, calculateSurvivalProbability, calculateUrgency } from '../data/probabilityModel'

// ─── Estado inicial ───────────────────────────────────────────
const INITIAL_STATE = {
  // Fase de la app: 'setup' | 'operations'
  phase: 'setup',

  // Datos del incidente
  incident: null,
  /*
    incident = {
      id, name, profileId, lkp: {lat, lng},
      startTime: Date, elapsedHours,
      terrain, weather, description,
      reportedBy, contactPhone,
    }
  */

  // Zonas de probabilidad calculadas
  zones: null,

  // Probabilidad de supervivencia actual (0-100)
  survivalProbability: null,

  // Urgencia actual
  urgency: null,

  // Feed de actualizaciones dinámicas
  updates: [],

  // Zonas marcadas como barridas (polígonos en el mapa)
  clearedZones: [],

  // Marcadores de pistas/hallazgos
  clueMarkers: [],

  // Checklist completado
  checklistItems: {},

  // Sidebar activo
  activeSidebarTab: 'incident',

  // Temporizador
  elapsedHours: 0,
}

// ─── Reducer ─────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'START_INCIDENT': {
      const { incident } = action
      const zones = calculateZones(
        incident.profileId,
        incident.elapsedHours,
        [],
        incident.terrainMultiplier || 1.2
      )
      const survivalProbability = calculateSurvivalProbability(
        incident.elapsedHours,
        incident.weather,
        incident.profileId
      )
      const urgency = calculateUrgency(incident.profileId, incident.elapsedHours, incident.weather)
      return {
        ...state,
        phase: 'operations',
        incident,
        zones,
        survivalProbability,
        urgency,
        updates: [],
        clearedZones: [],
        clueMarkers: [],
        checklistItems: {},
        elapsedHours: incident.elapsedHours,
      }
    }

    case 'ADD_UPDATE': {
      const update = { ...action.update, id: Date.now(), timestamp: new Date() }
      const newUpdates = [update, ...state.updates]

      // Recalcular zonas según el nuevo update
      const newElapsed = update.type === 'time_elapsed'
        ? (state.elapsedHours + (update.hoursAdded || 1))
        : state.elapsedHours

      // Recopilar pistas y zonas barridas para el modelo
      const allUpdates = newUpdates

      const zones = calculateZones(
        state.incident.profileId,
        newElapsed,
        allUpdates,
        state.incident.terrainMultiplier || 1.2
      )
      const survivalProbability = calculateSurvivalProbability(
        newElapsed,
        update.weather || state.incident.weather,
        state.incident.profileId
      )
      const urgency = calculateUrgency(
        state.incident.profileId,
        newElapsed,
        state.incident.weather
      )

      // Si es pista, agregar marcador al mapa con metadata para el modelo bayesiano
      const isClueType = ['clue_found', 'tracks_found', 'audio_contact', 'visual_contact', 'witness'].includes(update.type)
      const newClueMarkers = isClueType && update.latlng
        ? [...state.clueMarkers, {
            id: update.id,
            latlng: update.latlng,
            type: update.type,
            description: update.description,
            // Si el usuario especificó cuándo fue hallado, usarlo; si no, ahora mismo
            timestamp: update.foundAt ?? Date.now(),
            ageHours:  update.ageHours ?? 0,
          }]
        : state.clueMarkers

      // Actualizar ageHours de todos los marcadores existentes
      const updatedClueMarkers = newClueMarkers.map(m => ({
        ...m,
        ageHours: (Date.now() - m.timestamp) / 3_600_000,
      }))

      return {
        ...state,
        updates: newUpdates,
        zones,
        survivalProbability,
        urgency,
        elapsedHours: newElapsed,
        clueMarkers: updatedClueMarkers,
      }
    }

    case 'TOGGLE_CHECKLIST': {
      return {
        ...state,
        checklistItems: {
          ...state.checklistItems,
          [action.itemId]: !state.checklistItems[action.itemId],
        },
      }
    }

    case 'ADD_CLEARED_ZONE': {
      return {
        ...state,
        clearedZones: [...state.clearedZones, action.zone],
      }
    }

    case 'SET_SIDEBAR_TAB': {
      return { ...state, activeSidebarTab: action.tab }
    }

    case 'TICK_TIME': {
      const newElapsed = state.elapsedHours + (1 / 60) // +1 minuto en horas
      const zones = calculateZones(
        state.incident?.profileId,
        newElapsed,
        state.updates,
        state.incident?.terrainMultiplier || 1.2
      )
      const survivalProbability = calculateSurvivalProbability(
        newElapsed,
        state.incident?.weather,
        state.incident?.profileId
      )
      const urgency = calculateUrgency(
        state.incident?.profileId,
        newElapsed,
        state.incident?.weather
      )
      // Actualizar antigüedad de pistas con el tiempo real
      const clueMarkers = state.clueMarkers.map(m => ({
        ...m,
        ageHours: (Date.now() - m.timestamp) / 3_600_000,
      }))
      return { ...state, elapsedHours: newElapsed, zones, survivalProbability, urgency, clueMarkers }
    }

    case 'RESET':
      return INITIAL_STATE

    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────
const SearchContext = createContext(null)

export function SearchProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const startIncident    = useCallback((incident) => dispatch({ type: 'START_INCIDENT', incident }), [])
  const addUpdate        = useCallback((update)   => dispatch({ type: 'ADD_UPDATE', update }), [])
  const toggleChecklist  = useCallback((itemId)   => dispatch({ type: 'TOGGLE_CHECKLIST', itemId }), [])
  const addClearedZone   = useCallback((zone)     => dispatch({ type: 'ADD_CLEARED_ZONE', zone }), [])
  const setSidebarTab    = useCallback((tab)      => dispatch({ type: 'SET_SIDEBAR_TAB', tab }), [])
  const reset            = useCallback(()         => dispatch({ type: 'RESET' }), [])

  return (
    <SearchContext.Provider value={{ state, startIncident, addUpdate, toggleChecklist, addClearedZone, setSidebarTab, reset }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch debe usarse dentro de SearchProvider')
  return ctx
}
