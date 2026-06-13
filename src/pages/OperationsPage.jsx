import { useState, useEffect, useCallback } from 'react'
import { useSearch } from '../context/SearchContext'
import { PERSON_CATEGORIES } from '../data/sarProfiles'
import { URGENCY_COLORS, survivalColor } from '../data/probabilityModel'
import SearchMap from '../components/map/SearchMap'
import IncidentPanel from '../components/panels/IncidentPanel'
import ChecklistPanel from '../components/panels/ChecklistPanel'
import UpdatesPanel from '../components/panels/UpdatesPanel'
import UpdateModal from '../components/modals/UpdateModal'
import RecommendationsPanel from '../components/panels/RecommendationsPanel'
import { generateRecommendations } from '../utils/adaptiveEngine'
import {
  FiAlertTriangle, FiMap, FiList, FiActivity, FiRadio,
  FiRefreshCw, FiClock, FiChevronRight, FiMaximize2, FiMinimize2, FiZap,
} from 'react-icons/fi'

// ─── Tabs del sidebar ────────────────────────────────────────
const SIDEBAR_TABS = [
  { id: 'incident',  label: 'Incidente', icon: FiActivity },
  { id: 'checklist', label: 'Checklist', icon: FiList },
  { id: 'updates',   label: 'Updates',   icon: FiRadio },
  { id: 'analysis',  label: 'Análisis',  icon: FiZap },
]

// ─── Helper: formatea horas en texto legible ─────────────────
function useElapsedDisplay(elapsedHours) {
  const h = Math.floor(elapsedHours)
  const m = Math.floor((elapsedHours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function OperationsPage() {
  const { state, reset } = useSearch()
  const { incident, urgency, survivalProbability, elapsedHours, updates } = state

  const [activeTab, setActiveTab]           = useState('incident')
  const [isPlacingClue, setIsPlacingClue]   = useState(false)
  const [pendingLatLng, setPendingLatLng]   = useState(null)
  const [showModal, setShowModal]           = useState(false)
  const [sidebarCollapsed, setSidebarCol]   = useState(false)
  const [critBlink, setCritBlink]           = useState(false)

  const elapsed   = useElapsedDisplay(elapsedHours)
  const urgColor  = URGENCY_COLORS[urgency] || '#64748b'
  const survColor = survivalColor(survivalProbability)
  const profile   = PERSON_CATEGORIES[incident?.profileId]

  // Badge de recomendaciones críticas
  const critRecs = incident
    ? generateRecommendations(state).filter(r => r.priority.label === 'CRÍTICA').length
    : 0

  // Parpadeo para urgencia CRÍTICA
  useEffect(() => {
    if (urgency !== 'CRÍTICA') { setCritBlink(false); return }
    const t = setInterval(() => setCritBlink(b => !b), 800)
    return () => clearInterval(t)
  }, [urgency])

  // Click en mapa para colocar pista
  const handleMapClick = useCallback((latlng) => {
    if (!isPlacingClue) return
    setPendingLatLng(latlng)
    setIsPlacingClue(false)
    setShowModal(true)   // reabre el modal con la ubicación ya marcada
  }, [isPlacingClue])

  // Abre modal y cambia tab a updates para ver el feed después
  const openModal = () => {
    setShowModal(true)
    setActiveTab('updates')
  }

  if (!incident) return null

  return (
    <div className="flex flex-col bg-slate-950" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* ════ HEADER ════ */}
      <header className="h-12 shrink-0 flex items-center gap-3 px-4 bg-slate-900 border-b border-slate-800 z-10">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-300"
            style={{ background: critBlink ? '#7f1d1d' : '#991b1b' }}
          >
            <FiAlertTriangle className="text-red-400" size={14} />
          </div>
          <span className="text-white font-bold text-sm hidden sm:block">SAR</span>
        </div>

        {/* Breadcrumb del incidente */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 border-l border-slate-700 pl-3">
          <FiChevronRight size={11} className="text-slate-600" />
          <span className="text-white font-semibold">{incident.name}</span>
          <span className="text-slate-600">·</span>
          <span>{profile?.icon} {profile?.labelShort}</span>
          {incident.locationName && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{incident.locationName}</span>
            </>
          )}
        </div>

        {/* Métricas en tiempo real */}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <FiClock size={11} className="text-slate-500" />
            <span className="text-yellow-400 font-mono font-bold">{elapsed}</span>
            <span className="text-slate-600 hidden md:inline">transcurrido</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
            <FiActivity size={11} style={{ color: survColor }} />
            <span className="font-mono font-bold" style={{ color: survColor }}>
              {survivalProbability}%
            </span>
            <span className="text-slate-600 hidden md:inline">superv.</span>
          </div>

          <span
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border"
            style={{
              color: urgColor,
              borderColor: urgColor,
              background: `${urgColor}22`,
            }}
          >
            {urgency === 'CRÍTICA' && <span className="blink">⚠</span>}
            {urgency}
          </span>

          {/* Botón marcar pista */}
          <button
            onClick={() => setIsPlacingClue(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
              isPlacingClue
                ? 'border-yellow-500 bg-yellow-950/40 text-yellow-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
            }`}
          >
            <FiMap size={11} />
            {isPlacingClue ? 'Marcando…' : 'Marcar pista'}
          </button>

          {/* Botón principal de actualización */}
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all"
          >
            <FiRefreshCw size={11} />
            Actualizar
          </button>

          {/* Nuevo incidente */}
          <button
            onClick={() => {
              if (confirm('¿Cerrar este incidente e iniciar uno nuevo?')) reset()
            }}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Nuevo
          </button>
        </div>
      </header>

      {/* ════ CUERPO ════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Mapa ── */}
        <div className={`flex-1 relative${isPlacingClue ? ' placing-clue' : ''}`}>
          <SearchMap
            isPlacingClue={isPlacingClue}
            onMapClick={handleMapClick}
          />

          {/* Indicador de modo marcar pista */}
          {isPlacingClue && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] bg-yellow-500/95 text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
              📌 Haz clic en el mapa para marcar la ubicación
            </div>
          )}

          {/* Mini-feed de últimas novedades sobre el mapa */}
          {updates.length > 0 && !isPlacingClue && (
            <div className="absolute top-3 right-3 z-[998] space-y-1.5 max-w-[220px]">
              {updates.slice(0, 3).map(u => (
                <div
                  key={u.id}
                  className="bg-slate-900/95 border border-slate-700 rounded-xl px-2.5 py-2 text-xs shadow-xl backdrop-blur"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: u.color }} />
                    <span className="font-semibold text-slate-300 truncate">{u.label}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 leading-tight line-clamp-2">{u.description}</p>
                </div>
              ))}
              {updates.length > 3 && (
                <button
                  onClick={() => setActiveTab('updates')}
                  className="text-[11px] text-slate-500 hover:text-slate-300 bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1 w-full text-center transition-colors"
                >
                  +{updates.length - 3} más
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div
          className={`flex flex-col border-l border-slate-800 bg-slate-900 transition-all duration-300 ${
            sidebarCollapsed ? 'w-10' : 'w-80'
          }`}
        >
          {/* Toggle colapso */}
          <button
            onClick={() => setSidebarCol(c => !c)}
            className="h-10 flex items-center justify-center text-slate-600 hover:text-slate-300 border-b border-slate-800 shrink-0 transition-colors"
            title={sidebarCollapsed ? 'Expandir panel' : 'Colapsar panel'}
          >
            {sidebarCollapsed ? <FiMaximize2 size={13} /> : <FiMinimize2 size={13} />}
          </button>

          {!sidebarCollapsed && (
            <>
              {/* Tabs */}
              <div className="flex border-b border-slate-800 shrink-0">
                {SIDEBAR_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-all ${
                      activeTab === tab.id
                        ? 'text-white border-b-2 border-red-500 bg-slate-800/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <tab.icon size={14} />
                    <span className="text-[10px]">{tab.label}</span>
                    {tab.id === 'updates' && updates.length > 0 && (
                      <span className="absolute top-1 right-3 w-4 h-4 bg-red-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                        {updates.length > 9 ? '9+' : updates.length}
                      </span>
                    )}
                    {tab.id === 'analysis' && critRecs > 0 && (
                      <span className="absolute top-1 right-3 w-4 h-4 bg-orange-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                        {critRecs > 9 ? '9+' : critRecs}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Contenido del tab — altura restante */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'incident'  && <div className="h-full overflow-y-auto"><IncidentPanel /></div>}
                {activeTab === 'checklist' && <ChecklistPanel />}
                {activeTab === 'updates'   && <UpdatesPanel onOpenModal={openModal} />}
                {activeTab === 'analysis'  && <RecommendationsPanel />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════ MODAL DE ACTUALIZACIÓN (nivel raíz, siempre disponible) ════ */}
      {showModal && (
        <UpdateModal
          onClose={() => setShowModal(false)}
          onRequestMapClick={() => { setIsPlacingClue(true); setShowModal(false) }}
          pendingLatLng={pendingLatLng}
          onClearPending={() => setPendingLatLng(null)}
        />
      )}
    </div>
  )
}
