// ============================================================
// Hook: obtiene datos topográficos del área de búsqueda
//   · Overpass API (OSM) — senderos, agua, cumbres  [gratuito]
//   · OpenTopoData (SRTM 90m)  — elevación          [gratuito]
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { kmToDegreesLat, kmToDegreesLng } from '../utils/geo'
import { PERSON_CATEGORIES } from '../data/sarProfiles'

// ─── Overpass API ─────────────────────────────────────────────
async function fetchOSMFeatures(lkp, radiusM) {
  const query = `
[out:json][timeout:30];
(
  way["highway"~"path|track|footway|bridleway|trail"](around:${radiusM},${lkp.lat},${lkp.lng});
  way["waterway"~"river|stream|canal|drain"](around:${radiusM},${lkp.lat},${lkp.lng});
  way["natural"~"water|wetland"](around:${radiusM},${lkp.lat},${lkp.lng});
  relation["natural"~"water"](around:${radiusM},${lkp.lat},${lkp.lng});
  node["natural"="peak"](around:${radiusM},${lkp.lat},${lkp.lng});
  node["natural"="spring"](around:${radiusM},${lkp.lat},${lkp.lng});
  node["amenity"="drinking_water"](around:${radiusM},${lkp.lat},${lkp.lng});
);
out body;
>;
out skel qt;
  `.trim()

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!res.ok) throw new Error(`Overpass error: ${res.status}`)
  const data = await res.json()
  return parseOSMResponse(data)
}

function parseOSMResponse(data) {
  const nodeMap = {}
  const trailNodes  = []
  const waterNodes  = []
  const peakNodes   = []

  // Construir mapa de nodos
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodeMap[el.id] = { lat: el.lat, lng: el.lon }
      if (el.tags?.natural === 'peak') {
        peakNodes.push({ lat: el.lat, lng: el.lon, name: el.tags.name || 'Cima' })
      }
      if (el.tags?.natural === 'spring' || el.tags?.amenity === 'drinking_water') {
        waterNodes.push({ lat: el.lat, lng: el.lon })
      }
    }
  }

  // Expandir ways a sus nodos
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.nodes) continue
    const tag = el.tags || {}
    const isTrail = tag.highway
    const isWater = tag.waterway || tag.natural === 'water' || tag.natural === 'wetland'

    // Submuestrear: 1 de cada 2 nodos (balance precisión/performance)
    const nodeIds = el.nodes.filter((_, i) => i % 2 === 0)

    for (const nid of nodeIds) {
      const pos = nodeMap[nid]
      if (!pos) continue
      if (isTrail) trailNodes.push(pos)
      if (isWater) waterNodes.push(pos)
    }
  }

  return { trailNodes, waterNodes, peakNodes }
}

// ─── OpenTopoData — grilla de elevación 10×10 ────────────────
async function fetchElevationGrid(lkp, radiusKm) {
  const GRID = 10  // 10×10 = 100 puntos (límite gratis de OpenTopoData)
  const latDelta = kmToDegreesLat(radiusKm)
  const lngDelta = kmToDegreesLng(radiusKm, lkp.lat)

  const locations = []
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const lat = lkp.lat + (i / (GRID - 1) - 0.5) * 2 * latDelta
      const lng = lkp.lng + (j / (GRID - 1) - 0.5) * 2 * lngDelta
      locations.push(`${lat.toFixed(6)},${lng.toFixed(6)}`)
    }
  }

  const url = `https://api.opentopodata.org/v1/srtm90m?locations=${locations.join('|')}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`OpenTopoData error: ${res.status}`)
  const data = await res.json()

  const elevGrid = (data.results || []).map(r => ({
    lat: r.location.lat,
    lng: r.location.lng,
    elevation: r.elevation ?? 0,
  }))

  // Elevación del LKP
  const lkpRes = await fetch(
    `https://api.opentopodata.org/v1/srtm90m?locations=${lkp.lat},${lkp.lng}`
  )
  const lkpData = await lkpRes.json()
  const lkpElevation = lkpData.results?.[0]?.elevation ?? null

  return { elevGrid, lkpElevation }
}

// ─── Hook principal ───────────────────────────────────────────
export function useTopographicData(incident) {
  const [topoData, setTopoData]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const abortRef                  = useRef(false)

  useEffect(() => {
    if (!incident?.lkp || !incident?.profileId) return

    const profile   = PERSON_CATEGORIES[incident.profileId]
    const radiusKm  = (profile?.distances?.p95 || 10) * (incident.terrainMultiplier || 1.2)
    const radiusM   = Math.round(radiusKm * 1000)

    abortRef.current = false
    setLoading(true)
    setError(null)
    setTopoData(null)

    ;(async () => {
      try {
        // Paso 1: features OSM
        setStatusMsg('Obteniendo senderos y cuerpos de agua (OSM)…')
        const osmFeatures = await fetchOSMFeatures(incident.lkp, radiusM)
        if (abortRef.current) return

        // Paso 2: elevación
        setStatusMsg('Obteniendo datos de elevación (SRTM 90m)…')
        let elevData = { elevGrid: [], lkpElevation: null }
        try {
          elevData = await fetchElevationGrid(incident.lkp, radiusKm)
        } catch (e) {
          // La elevación es opcional — si falla, seguimos sin ella
          console.warn('Elevación no disponible:', e.message)
        }
        if (abortRef.current) return

        setTopoData({
          trailNodes:   osmFeatures.trailNodes,
          waterNodes:   osmFeatures.waterNodes,
          peakNodes:    osmFeatures.peakNodes,
          elevGrid:     elevData.elevGrid,
          lkpElevation: elevData.lkpElevation,
          // Métricas para mostrar en UI
          stats: {
            trails:  osmFeatures.trailNodes.length,
            water:   osmFeatures.waterNodes.length,
            peaks:   osmFeatures.peakNodes.length,
            radiusKm: radiusKm.toFixed(1),
          }
        })
        setStatusMsg('')
        setLoading(false)

      } catch (err) {
        if (!abortRef.current) {
          setError(err.message)
          setLoading(false)
          setStatusMsg('')
        }
      }
    })()

    return () => { abortRef.current = true }
  }, [incident?.lkp?.lat, incident?.lkp?.lng, incident?.profileId])

  return { topoData, loading, error, statusMsg }
}
