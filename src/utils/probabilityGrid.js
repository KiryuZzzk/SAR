// ============================================================
// Motor de grilla de probabilidad SAR — v3 (Bayesiano)
//
// Modelo en tres capas:
//
//  PRIOR  = terreno OSM/SRTM × perfil LPB
//           (lo que sabemos antes de cualquier hallazgo)
//
//  UPDATE = actualización bayesiana con cada pieza de evidencia:
//    · Pistas/huellas → likelihood gaussiana centrada en el hallazgo,
//      ajustada por tiempo transcurrido desde el hallazgo
//    · Múltiples pistas → vector de desplazamiento; proyecta masa
//      hacia adelante en la dirección de avance inferida
//    · Zona barrida → reduce probabilidad en proporción al POD y
//      REDISTRIBUYE esa masa hacia el resto del área (conservación)
//
//  POSTERIOR = prior × producto de likelihoods (normalizado)
//
// Referencia: Koester "Lost Person Behavior" + metodología SAROPS
// ============================================================

import { haversine, kmToDegreesLat, kmToDegreesLng, minDistToNodes, interpolateElevation } from './geo'
import { PERSON_CATEGORIES } from '../data/sarProfiles'

const GRID_SIZE = 30   // 30×30 = 900 puntos

// ─────────────────────────────────────────────────────────────
// PRIOR — Terreno × LPB
// ─────────────────────────────────────────────────────────────

function lpbBoundaryMask(distKm, distances) {
  const { p90, p95 } = distances
  if (distKm <= p90) return 1.0
  if (distKm <= p95) return 1.0 - (distKm - p90) / (p95 - p90)
  return Math.max(0, 0.08 * Math.exp(-(distKm - p95) / (p95 * 0.4)))
}

function terrainAttraction(point, lkp, weights, topoData) {
  const { trailNodes, waterNodes, peakNodes, elevGrid, lkpElevation } = topoData
  let score = 0

  if (trailNodes.length > 0) {
    const d = minDistToNodes(point, trailNodes)
    const influence = Math.exp(-d / 1.5)
    score += weights.trail > 0
      ? weights.trail * influence
      : weights.trail * influence   // también resta si es negativo
  }

  if (waterNodes.length > 0) {
    const d = minDistToNodes(point, waterNodes)
    score += weights.water * Math.exp(-d / 2.0)
  }

  if (elevGrid?.length > 0 && lkpElevation !== null) {
    const pointElev = interpolateElevation(point, elevGrid)
    if (pointElev !== null) {
      const diff = pointElev - lkpElevation
      if (diff < 0 && weights.downhill > 0)
        score += weights.downhill * Math.min(Math.abs(diff) / 400, 1)
      if (diff > 0)
        score += weights.uphill * Math.min(diff / 600, 1)
    }
  }

  if (peakNodes.length > 0 && weights.uphill > 1.0) {
    const d = minDistToNodes(point, peakNodes)
    score += weights.uphill * 0.6 * Math.exp(-d / 1.2)
  }

  if (weights.isolation > 0) {
    const allFeatures = [...(trailNodes || []), ...(waterNodes || [])]
    const dAll = allFeatures.length > 0 ? minDistToNodes(point, allFeatures) : 3
    score += weights.isolation * Math.min(dAll / 2.0, 1.0)
  }

  return score
}

// ─────────────────────────────────────────────────────────────
// BAYESIAN UPDATE — Evidencia
// ─────────────────────────────────────────────────────────────

// Decay temporal: un hallazgo reciente tiene más peso que uno viejo.
// La persona siguió moviéndose desde entonces.
function temporalDecay(ageMinutes) {
  // Reduce a la mitad del peso cada 90 minutos
  return Math.exp(-ageMinutes / 130)
}

// Likelihood gaussiana: la probabilidad de que la persona esté en `point`
// dado que se encontró una pista en `clue.latlng`.
// σ depende del tipo de pista y del tiempo desde el hallazgo.
function clueLikelihood(point, clue, elapsedHours) {
  if (!clue.latlng) return 1.0

  const dist = haversine(point, clue.latlng)   // km

  // El sigma (dispersión) aumenta con el tiempo que pasó desde el hallazgo:
  // la persona puede haberse movido desde que dejó la pista.
  const clueAgeH = clue.ageHours ?? 0          // horas desde el hallazgo
  const movementRadius = 0.4 + clueAgeH * 0.5  // km: ±0.4 base + 0.5/h

  // Peso base según tipo de pista
  const typeWeight = {
    clue_found:     1.0,   // pertenencia encontrada
    tracks_found:   1.4,   // huellas → más preciso espacialmente
    audio_contact:  1.6,   // escucharon la voz → muy preciso
    visual_contact: 2.0,   // lo vieron → máxima precisión
    witness:        0.7,   // testimonio → menos fiable
  }[clue.type] ?? 1.0

  const sigma = movementRadius / typeWeight
  const likelihood = Math.exp(-(dist * dist) / (2 * sigma * sigma))

  // Decay temporal desde el hallazgo
  const decay = temporalDecay((clue.ageHours ?? 0) * 60)

  // Mezcla: entre 1.0 (sin efecto) y la likelihood pura
  // — si el decay es bajo, el hallazgo ya no reubica tanto
  return 1.0 + (likelihood - 0.5) * typeWeight * Math.max(decay, 0.2) * 2
}

// ─── Cono direccional (múltiples pistas) ─────────────────────
// Con 2+ pistas ubicadas, infiere el bearing de marcha y crea
// un cono de probabilidad hacia adelante desde la última pista.
function directionalConeLikelihood(point, locatedClues) {
  if (locatedClues.length < 2) return 1.0

  // IMPORTANTE: usar orden de inserción en el array (cronológico por cuándo
  // fueron encontrados), NO ordenar por timestamp — cuando ambas pistas son
  // "recientes", los timestamps son casi idénticos y el sort es impredecible.
  const first = locatedClues[0].latlng
  const last  = locatedClues[locatedClues.length - 1].latlng

  // Separación real entre pistas — escala la proyección
  const clueSpacingKm = haversine(first, last)
  if (clueSpacingKm < 0.01) return 1.0   // prácticamente el mismo punto

  // Vector de dirección de marcha
  const dLat = last.lat - first.lat
  const dLng = last.lng - first.lng
  const mag  = Math.sqrt(dLat * dLat + dLng * dLng)
  const uLat = dLat / mag
  const uLng = dLng / mag

  // Vector desde la última pista al punto evaluado
  const toLat = point.lat - last.lat
  const toLng = point.lng - last.lng
  const toMag = Math.sqrt(toLat * toLat + toLng * toLng)
  if (toMag < 1e-8) return 3.0   // justo en la última pista

  // Coseno del ángulo: +1 = adelante, 0 = perpendicular, -1 = atrás
  const cosAngle = (toLat * uLat + toLng * uLng) / toMag
  const distKm   = haversine(point, last)

  // Pico de proyección: 1.5–2 "pasos" del espaciado entre pistas.
  // Si las pistas están a 300m, proyectamos ~450-600m más adelante.
  // Si están a 2km, proyectamos ~3-4km más adelante.
  const distancePeak  = Math.max(clueSpacingKm * 1.8, 0.6)
  const distanceSigma = distancePeak * 1.1

  const distanceFactor = Math.exp(
    -Math.pow(distKm - distancePeak, 2) / (2 * distanceSigma * distanceSigma)
  )

  // Factor angular: cono hacia adelante, corte suave
  const angularFactor = Math.max(0, cosAngle)
  const coneFactor    = Math.pow(angularFactor, 1.2)

  // Bonus fuerte — debe dominar sobre los blobs individuales
  const bonus = coneFactor * distanceFactor * 10.0

  // Penalizar zona posterior (la persona ya pasó por ahí)
  const backPenalty = cosAngle < -0.2 ? Math.max(0.25, 1 + cosAngle * 0.6) : 1.0

  return (1.0 + bonus) * backPenalty
}

// ─── Zona barrida (actualización bayesiana) ───────────────────
// En lugar de solo penalizar, calcula cuánta "masa" se elimina
// y la redistribuye implícitamente normalizando al final.
function clearedLikelihood(point, clearedZones) {
  let factor = 1.0
  for (const z of clearedZones) {
    const center = { lat: z.center[0], lng: z.center[1] }
    const dist   = haversine(point, center)
    const radiusKm = (z.radius ?? 500) / 1000

    if (dist < radiusKm) {
      // Dentro de la zona: reducir por POD con caída suave en el borde
      const pod = (z.pod ?? 70) / 100
      const edgeFactor = 1 - Math.pow(1 - dist / radiusKm, 2) * 0.3  // suaviza borde
      factor *= (1 - pod * edgeFactor)
    } else if (dist < radiusKm * 1.5) {
      // Borde exterior: ligero boost (la persona "rebotó")
      const borderBonus = 0.15 * Math.exp(-(dist - radiusKm) / (radiusKm * 0.3))
      factor *= (1 + borderBonus)
    }
  }
  return Math.max(factor, 0.01)
}

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────
export function buildProbabilityGrid(incident, topoData, clueMarkers = [], clearedZones = []) {
  const profile = PERSON_CATEGORIES[incident.profileId]
  if (!profile || !incident.lkp) return []

  const lkp      = incident.lkp
  const weights  = profile.terrainWeights || { trail: 1, water: 0.5, downhill: 0.3, uphill: 0.2, isolation: 0 }
  const radiusKm = profile.distances.p95 * (incident.terrainMultiplier || 1.2)
  const latDelta = kmToDegreesLat(radiusKm)
  const lngDelta = kmToDegreesLng(radiusKm, lkp.lat)
  const elapsedHours = incident.elapsedHours ?? 0

  // ── Pistas con ubicación, ordenadas cronológicamente ────────
  const locatedClues = clueMarkers
    .filter(c => c.latlng)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
  const hasDirectionEvidence = locatedClues.length >= 2

  // ── Paso 1: Generar grilla ────────────────────────────────
  const points = []
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const lat    = lkp.lat + (i / (GRID_SIZE - 1) - 0.5) * 2 * latDelta
      const lng    = lkp.lng + (j / (GRID_SIZE - 1) - 0.5) * 2 * lngDelta
      const distKm = haversine(lkp, { lat, lng })
      const mask   = lpbBoundaryMask(distKm, profile.distances)
      points.push({ lat, lng, distKm, mask })
    }
  }

  // ── Paso 2: Prior de terreno ─────────────────────────────
  const hasTopo = topoData &&
    (topoData.trailNodes?.length > 0 ||
     topoData.waterNodes?.length > 0 ||
     topoData.elevGrid?.length > 0)

  let priorRaw
  if (hasTopo) {
    priorRaw = points.map(p => terrainAttraction(p, lkp, weights, topoData))
    const maxT = Math.max(...priorRaw), minT = Math.min(...priorRaw)
    const span = maxT - minT
    priorRaw = span > 0.001
      ? priorRaw.map(t => 0.05 + 0.95 * (t - minT) / span)
      : priorRaw.map(() => 0.5)
  } else {
    priorRaw = points.map(p => {
      const t = p.distKm / (profile.distances.p50 || 3)
      return Math.exp(-0.5 * t * t)
    })
    const maxT = Math.max(...priorRaw, 0.001)
    priorRaw = priorRaw.map(t => t / maxT)
  }

  // ── Paso 3: Posterior = Prior × LPB × Likelihoods ────────
  const posterior = points.map((p, i) => {
    let score = priorRaw[i] * p.mask

    // Actualización bayesiana por cada pista
    for (const clue of clueMarkers) {
      const rawLikelihood = clueLikelihood(p, clue, elapsedHours)
      // Con dirección conocida, los blobs individuales se suprimen al 10%:
      // el cono debe dominar visualmente. Sin dirección, efecto completo.
      const blobStrength = hasDirectionEvidence ? 0.1 : 1.0
      score *= 1.0 + (rawLikelihood - 1.0) * blobStrength
    }

    // Cono direccional (2+ pistas) — update dominante: hasta 11x en el pico
    if (hasDirectionEvidence) {
      score *= directionalConeLikelihood(p, locatedClues)
    }

    // Actualización por zonas barridas (con redistribución implícita)
    score *= clearedLikelihood(p, clearedZones)

    return Math.max(score, 0)
  })

  // ── Paso 4: Normalizar (conservación de probabilidad) ────
  // La redistribución de zonas barridas se consigue aquí: al
  // normalizar, la masa que se "quitó" de las zonas barridas
  // aumenta proporcionalmente el resto del mapa.
  const maxScore = Math.max(...posterior, 0.001)
  return points.map((p, i) => ({
    lat: p.lat,
    lng: p.lng,
    score: posterior[i] / maxScore,
    hasTopo,
  }))
}

// ─── Score 0-1 → RGBA para el canvas ─────────────────────────
export function scoreToRGBA(score) {
  if (score < 0.04) return [0, 0, 0, 0]

  const stops = [
    { s: 0.04, rgba: [22,  163,  74,  12] },
    { s: 0.18, rgba: [34,  197,  94,  45] },
    { s: 0.35, rgba: [163, 230,  53,  85] },
    { s: 0.50, rgba: [234, 179,   8, 115] },
    { s: 0.67, rgba: [234,  88,  12, 145] },
    { s: 0.84, rgba: [220,  38,  38, 170] },
    { s: 1.00, rgba: [127,  29,  29, 190] },
  ]

  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i], hi = stops[i + 1]
    if (score >= lo.s && score <= hi.s) {
      const t = (score - lo.s) / (hi.s - lo.s)
      return lo.rgba.map((v, k) => Math.round(v + t * (hi.rgba[k] - v)))
    }
  }
  return stops[stops.length - 1].rgba
}
