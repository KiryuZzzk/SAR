import { useEffect, useRef, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { buildProbabilityGrid, scoreToRGBA } from '../../utils/probabilityGrid'
import { kmToDegreesLat, kmToDegreesLng } from '../../utils/geo'
import { PERSON_CATEGORIES } from '../../data/sarProfiles'

const CANVAS_SIZE = 700  // px — resolución del canvas

export default function HeatmapLayer({ incident, topoData, clueMarkers, clearedZones }) {
  const map        = useMap()
  const overlayRef = useRef(null)

  // Construir grilla (recalcula cuando cambian datos relevantes)
  const gridPoints = useMemo(() => {
    if (!incident?.lkp || !incident?.profileId) return []
    return buildProbabilityGrid(
      incident,
      topoData,
      clueMarkers,
      clearedZones,
    )
  }, [
    incident?.lkp?.lat,
    incident?.lkp?.lng,
    incident?.profileId,
    topoData,
    clueMarkers?.length,
    clearedZones?.length,
  ])

  useEffect(() => {
    if (!gridPoints.length || !incident?.lkp) return

    const profile  = PERSON_CATEGORIES[incident.profileId]
    const radiusKm = (profile?.distances?.p95 || 10) * (incident.terrainMultiplier || 1.2)
    const lkp      = incident.lkp

    const latDelta = kmToDegreesLat(radiusKm)
    const lngDelta = kmToDegreesLng(radiusKm, lkp.lat)

    const sw     = [lkp.lat - latDelta, lkp.lng - lngDelta]
    const ne     = [lkp.lat + latDelta, lkp.lng + lngDelta]
    const bounds = L.latLngBounds(sw, ne)

    // ── Canvas ───────────────────────────────────────────────
    const C   = CANVAS_SIZE
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = C
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, C, C)

    const latRange = ne[0] - sw[0]
    const lngRange = ne[1] - sw[1]

    // Tamaño de celda en píxeles + radio de blob (con overlap para suavidad)
    const gridN    = Math.round(Math.sqrt(gridPoints.length))
    const cellPx   = C / gridN
    const blobR    = cellPx * 1.8  // overlap generoso → transiciones suaves

    // Primer pasada: blobs de calor con gradiente radial
    for (const { lat, lng, score } of gridPoints) {
      if (score < 0.03) continue

      const x = ((lng - sw[1]) / lngRange) * C
      const y = ((ne[0] - lat) / latRange) * C   // Y invertida

      const [r, g, b, a] = scoreToRGBA(score)
      const alpha = a / 255

      // Gradiente radial con caída suave
      const grad = ctx.createRadialGradient(x, y, 0, x, y, blobR)
      grad.addColorStop(0.0, `rgba(${r},${g},${b},${(alpha * 0.95).toFixed(3)})`)
      grad.addColorStop(0.4, `rgba(${r},${g},${b},${(alpha * 0.70).toFixed(3)})`)
      grad.addColorStop(0.7, `rgba(${r},${g},${b},${(alpha * 0.30).toFixed(3)})`)
      grad.addColorStop(1.0, `rgba(${r},${g},${b},0)`)

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, blobR, 0, Math.PI * 2)
      ctx.fill()
    }

    // Segunda pasada: realzar puntos de máxima probabilidad (núcleos)
    for (const { lat, lng, score } of gridPoints) {
      if (score < 0.75) continue

      const x = ((lng - sw[1]) / lngRange) * C
      const y = ((ne[0] - lat) / latRange) * C

      const [r, g, b] = scoreToRGBA(score)
      const coreR = cellPx * 0.7

      const grad2 = ctx.createRadialGradient(x, y, 0, x, y, coreR)
      grad2.addColorStop(0,   `rgba(${r},${g},${b},0.5)`)
      grad2.addColorStop(1,   `rgba(${r},${g},${b},0)`)

      ctx.fillStyle = grad2
      ctx.beginPath()
      ctx.arc(x, y, coreR, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── Aplicar como ImageOverlay ────────────────────────────
    const dataUrl = canvas.toDataURL('image/png')

    if (overlayRef.current) {
      map.removeLayer(overlayRef.current)
    }

    overlayRef.current = L.imageOverlay(dataUrl, bounds, {
      opacity:     0.55,
      zIndex:      200,
      interactive: false,
    }).addTo(map)

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current)
        overlayRef.current = null
      }
    }
  }, [gridPoints, map])

  return null
}
