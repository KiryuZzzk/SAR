// ── Distancia Haversine en km ────────────────────────────────
export function haversine(p1, p2) {
  const R = 6371
  const dLat = (p2.lat - p1.lat) * Math.PI / 180
  const dLng = (p2.lng - p1.lng) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.lat * Math.PI / 180) *
    Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Convierte km a grados de latitud (aprox) ────────────────
export function kmToDegreesLat(km) {
  return km / 111.32
}

// ── Convierte km a grados de longitud según latitud ─────────
export function kmToDegreesLng(km, lat) {
  return km / (111.32 * Math.cos(lat * Math.PI / 180))
}

// ── Mínima distancia en km desde un punto a un array de nodos ─
export function minDistToNodes(point, nodes) {
  if (!nodes || nodes.length === 0) return Infinity
  let min = Infinity
  for (const n of nodes) {
    const d = haversine(point, n)
    if (d < min) min = d
  }
  return min
}

// ── Interpolación bilineal de elevación en una grilla ────────
export function interpolateElevation(point, elevGrid) {
  if (!elevGrid || elevGrid.length === 0) return null
  // Encuentra los 4 puntos más cercanos y promedia ponderado por distancia
  const sorted = elevGrid
    .map(g => ({ ...g, d: haversine(point, { lat: g.lat, lng: g.lng }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4)

  if (sorted[0].d < 0.01) return sorted[0].elevation // punto exacto

  const sumW = sorted.reduce((s, g) => s + 1 / g.d, 0)
  return sorted.reduce((s, g) => s + (g.elevation / g.d), 0) / sumW
}
