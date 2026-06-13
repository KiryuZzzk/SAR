// ============================================================
// Modelo de Probabilidad de Zona SAR
// Basado en estadísticas LPB de Koester (2008) y NASAR
// ============================================================

import { PERSON_CATEGORIES, SURVIVAL_STATS, WEATHER_CONDITIONS } from './sarProfiles'

/**
 * Calcula los radios de las zonas de probabilidad en metros
 * según el perfil de la persona y ajustes dinámicos.
 */
export function calculateZones(profileId, elapsedHours, updates = [], terrainMultiplier = 1.0) {
  const profile = PERSON_CATEGORIES[profileId]
  if (!profile) return null

  const base = profile.distances
  let expansionFactor = 1.0

  // Expansión por tiempo transcurrido (persona móvil se aleja)
  if (elapsedHours > 6)  expansionFactor += 0.1
  if (elapsedHours > 12) expansionFactor += 0.15
  if (elapsedHours > 24) expansionFactor += 0.20
  if (elapsedHours > 48) expansionFactor += 0.15
  if (elapsedHours > 72) expansionFactor += 0.10

  // Ajustar por pistas encontradas (pueden encoger o mover zona)
  const cluesFound = updates.filter(u => u.type === 'clue_found' || u.type === 'tracks_found')
  const zonesCleared = updates.filter(u => u.type === 'zone_cleared')

  // Si hay pistas, reducir la zona de búsqueda principal
  if (cluesFound.length > 0) expansionFactor *= 0.85
  // Si muchas zonas barridas, expandir hacia afuera
  if (zonesCleared.length > 2) expansionFactor += 0.10

  const tf = terrainMultiplier * expansionFactor

  return {
    // zona 1: 75% de probabilidad acumulada
    zone1: { radiusM: base.p25 * 1000 * tf, probability: 25, color: '#DC2626', fillOpacity: 0.35, label: 'Zona Crítica' },
    // zona 2: 50%
    zone2: { radiusM: base.p50 * 1000 * tf, probability: 50, color: '#EA580C', fillOpacity: 0.25, label: 'Zona Alta' },
    // zona 3: 75%
    zone3: { radiusM: base.p75 * 1000 * tf, probability: 75, color: '#CA8A04', fillOpacity: 0.18, label: 'Zona Media' },
    // zona 4: 90%
    zone4: { radiusM: base.p90 * 1000 * tf, probability: 90, color: '#16A34A', fillOpacity: 0.10, label: 'Zona Baja' },
    // zona 5: 95% (límite de búsqueda)
    zone5: { radiusM: base.p95 * 1000 * tf, probability: 95, color: '#1D4ED8', fillOpacity: 0.06, label: 'Zona Extendida' },
  }
}

/**
 * Calcula la probabilidad de supervivencia actual
 * según horas transcurridas, clima y perfil.
 */
export function calculateSurvivalProbability(elapsedHours, weatherId, profileId) {
  const stats = SURVIVAL_STATS.baseline
  const weather = WEATHER_CONDITIONS.find(w => w.id === weatherId)
  const weatherMult = weather ? weather.survivalMultiplier : 1.0

  // Interpolación lineal entre los puntos de la tabla
  let lower = stats[0]
  let upper = stats[stats.length - 1]

  for (let i = 0; i < stats.length - 1; i++) {
    if (elapsedHours >= stats[i].hours && elapsedHours <= stats[i + 1].hours) {
      lower = stats[i]
      upper = stats[i + 1]
      break
    }
  }

  const ratio = lower.hours === upper.hours
    ? 0
    : (elapsedHours - lower.hours) / (upper.hours - lower.hours)

  const baseProbability = lower.probability + ratio * (upper.probability - lower.probability)

  // Ajustes por perfil vulnerable
  let profileMult = 1.0
  if (profileId === 'child_1_6')  profileMult = 0.85
  if (profileId === 'alzheimer')  profileMult = 0.80
  if (profileId === 'elderly')    profileMult = 0.88
  if (profileId === 'despondent') profileMult = 0.90

  return Math.max(1, Math.min(99, Math.round(baseProbability * weatherMult * profileMult)))
}

/**
 * Genera la urgencia del incidente basada en múltiples factores.
 * Retorna: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'NORMAL'
 */
export function calculateUrgency(profileId, elapsedHours, weatherId) {
  const survival = calculateSurvivalProbability(elapsedHours, weatherId, profileId)
  const vulnerableProfiles = ['child_1_6', 'alzheimer', 'elderly', 'despondent']
  const isVulnerable = vulnerableProfiles.includes(profileId)

  if (survival < 40 || (isVulnerable && elapsedHours > 24)) return 'CRÍTICA'
  if (survival < 60 || (isVulnerable && elapsedHours > 12)) return 'ALTA'
  if (survival < 75 || elapsedHours > 24) return 'MEDIA'
  return 'NORMAL'
}

/**
 * Recalcula las probabilidades de cada zona después de updates.
 * Retorna array de zonas con probabilidades ajustadas.
 */
export function recalculateAfterUpdate(currentZones, update) {
  if (!currentZones) return currentZones

  const impact = update.impact // { zoneId, adjustment }
  if (!impact) return currentZones

  return {
    ...currentZones,
    [impact.zoneId]: {
      ...currentZones[impact.zoneId],
      fillOpacity: Math.max(0.02, Math.min(0.5,
        currentZones[impact.zoneId].fillOpacity + impact.opacityDelta
      )),
    },
  }
}

/**
 * Color semáforo para la probabilidad de supervivencia
 */
export function survivalColor(probability) {
  if (probability >= 80) return '#16A34A'
  if (probability >= 60) return '#CA8A04'
  if (probability >= 40) return '#EA580C'
  return '#DC2626'
}

/**
 * Urgency color
 */
export const URGENCY_COLORS = {
  'CRÍTICA': '#DC2626',
  'ALTA':    '#EA580C',
  'MEDIA':   '#CA8A04',
  'NORMAL':  '#16A34A',
}
