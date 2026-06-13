import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { FiCrosshair, FiLoader, FiAlertCircle, FiLayers, FiMap } from 'react-icons/fi'
import { useSearch } from '../../context/SearchContext'
import { PERSON_CATEGORIES } from '../../data/sarProfiles'
import { useTopographicData } from '../../hooks/useTopographicData'
import HeatmapLayer from './HeatmapLayer'

// ─── Íconos ─────────────────────────────────────────────────
const lkpIcon = L.divIcon({
  html: `
    <div style="position:relative;width:32px;height:32px;">
      <div style="
        position:absolute;inset:0;background:#ef4444;border:3px solid #fff;
        border-radius:50%;box-shadow:0 0 0 4px rgba(239,68,68,0.3);
        z-index:2;display:flex;align-items:center;justify-content:center;">
        <div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div>
      </div>
    </div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], className: '',
})

const CLUE_META = {
  clue_found:     { color: '#F59E0B', emoji: '📦', label: 'Pertenencia / Pista' },
  tracks_found:   { color: '#10B981', emoji: '👣', label: 'Huellas / Rastro'    },
  audio_contact:  { color: '#8B5CF6', emoji: '🔊', label: 'Contacto auditivo'   },
  visual_contact: { color: '#EF4444', emoji: '👁️', label: 'Contacto visual'     },
  witness:        { color: '#64748b', emoji: '🗣️', label: 'Testimonio testigo'  },
}

function makeClueIcon(type) {
  const meta  = CLUE_META[type] || { color: '#F59E0B', emoji: '📌' }
  return L.divIcon({
    html: `<div style="background:${meta.color};border:2px solid #fff;border-radius:6px;padding:3px 5px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${meta.emoji}</div>`,
    className: '', iconAnchor: [14, 14],
  })
}

// ─── Centra el mapa al LKP ───────────────────────────────────
function MapCenter({ lkp }) {
  const map = useMap()
  useEffect(() => {
    if (lkp) map.setView([lkp.lat, lkp.lng], 11, { animate: true })
  }, [lkp, map])
  return null
}

// ─── Handler de click (react-leaflet v5) ─────────────────────
function MapClickHandler({ onMapClick, isPlacingClue }) {
  // Ref para evitar closure desactualizado — useMapEvents registra el handler
  // una sola vez y no lo actualiza aunque cambien las props.
  const isPlacingRef = useRef(isPlacingClue)
  const onMapClickRef = useRef(onMapClick)
  useEffect(() => { isPlacingRef.current = isPlacingClue }, [isPlacingClue])
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])

  useMapEvents({
    click(e) {
      if (isPlacingRef.current && onMapClickRef.current) {
        onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    },
  })
  return null
}

// ─── Leyenda flotante ─────────────────────────────────────────
function ZoneLegend({ zones }) {
  if (!zones) return null
  return (
    <div className="absolute bottom-6 left-3 z-[999] bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5 pointer-events-none" style={{ minWidth: 170 }}>
      <p className="text-slate-400 font-semibold mb-2 text-[11px] uppercase tracking-wide">Zonas estadísticas</p>
      {Object.values(zones).map((z, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: z.color, opacity: 0.85 }} />
          <span className="text-slate-300">{z.label}</span>
          <span className="ml-auto text-slate-500 font-mono">≤{z.probability}%</span>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
        <div className="w-3 h-3 rounded-sm shrink-0 bg-slate-600" />
        <span className="text-slate-400">Zona barrida</span>
      </div>
    </div>
  )
}

// ─── Panel de estado topográfico ─────────────────────────────
function TopoStatus({ loading, error, statusMsg, topoData, showHeatmap, onToggle }) {
  return (
    <div className="absolute top-3 left-3 z-[999] bg-slate-900/95 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl max-w-xs">
      {loading && (
        <div className="flex items-center gap-2 text-blue-400">
          <FiLoader className="animate-spin shrink-0" size={12} />
          <span className="truncate">{statusMsg || 'Cargando datos topográficos…'}</span>
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center gap-2 text-yellow-500">
          <FiAlertCircle size={12} className="shrink-0" />
          <span>Sin conexión a datos topo — usando modelo estadístico</span>
        </div>
      )}
      {topoData && !loading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-green-400">
              <FiLayers size={11} />
              <span className="font-semibold">
                {topoData.stats.trails > 0 || topoData.stats.water > 0
                  ? 'Heatmap topográfico activo'
                  : 'Heatmap estadístico (sin features OSM)'}
              </span>
            </div>
            <button
              onClick={onToggle}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                showHeatmap ? 'bg-red-600/80 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <FiMap size={9} />
              {showHeatmap ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="flex gap-3 text-slate-500 text-[10px]">
            {topoData.stats.trails > 0 && <span>🛤 {topoData.stats.trails} pts sendero</span>}
            {topoData.stats.water > 0  && <span>💧 {topoData.stats.water} pts agua</span>}
            {topoData.stats.peaks > 0  && <span>⛰ {topoData.stats.peaks} cumbres</span>}
            {topoData.stats.trails === 0 && topoData.stats.water === 0 &&
              <span className="text-yellow-700">Sin features OSM en el área</span>}
          </div>
          {topoData.elevGrid?.length > 0 && (
            <div className="text-[10px] text-slate-600">
              Elevación SRTM 90m · Radio {topoData.stats.radiusKm} km
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────
export default function SearchMap({ onMapClick, isPlacingClue }) {
  const { state }  = useSearch()
  const { incident, zones, clueMarkers, clearedZones } = state
  const [showHeatmap, setShowHeatmap] = useState(true)

  const { topoData, loading, error, statusMsg } = useTopographicData(incident)

  if (!incident?.lkp) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600 text-sm">
        <FiCrosshair className="mr-2" /> Sin LKP definido
      </div>
    )
  }

  const { lkp } = incident
  const profile  = PERSON_CATEGORIES[incident.profileId]
  const zoneList = zones ? Object.values(zones).reverse() : []

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[lkp.lat, lkp.lng]} zoom={11} style={{ width: '100%', height: '100%' }} zoomControl>
        {/* Tiles oscuros CartoDB */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        <MapClickHandler onMapClick={onMapClick} isPlacingClue={isPlacingClue} />
        <MapCenter lkp={lkp} />

        {/* ── Heatmap topográfico (canvas overlay) ── */}
        {showHeatmap && topoData && (
          <HeatmapLayer
            incident={incident}
            topoData={topoData}
            clueMarkers={clueMarkers}
            clearedZones={clearedZones}
          />
        )}

        {/* ── Círculos estadísticos (bordes de referencia) ── */}
        {zoneList.map((z, i) => (
          <Circle
            key={i}
            center={[lkp.lat, lkp.lng]}
            radius={z.radiusM}
            interactive={!isPlacingClue}
            pathOptions={{
              color:       z.color,
              fillColor:   'transparent',
              fillOpacity: 0,
              weight:      i === zoneList.length - 1 ? 2 : 1,
              dashArray:   '5 6',
              opacity:     showHeatmap ? 0.5 : 0.8,
              interactive: !isPlacingClue,
            }}
          >
            <Popup>
              <strong style={{ color: z.color }}>{z.label}</strong>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
                {z.probability}% probabilidad acumulada (LPB)<br />
                Radio: {(z.radiusM / 1000).toFixed(1)} km
              </p>
            </Popup>
          </Circle>
        ))}

        {/* ── Zonas barridas ── */}
        {clearedZones.map((zone, i) => (
          <Circle
            key={`cleared-${i}`}
            center={zone.center}
            radius={zone.radius}
            interactive={!isPlacingClue}
            pathOptions={{ color: '#64748b', fillColor: '#1e293b', fillOpacity: 0.55, weight: 1, dashArray: '6 4', interactive: !isPlacingClue }}
          >
            <Popup>
              <strong style={{ color: '#94a3b8' }}>Zona Barrida</strong>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                {zone.label || 'Sin resultado'}<br />POD: {zone.pod ?? '—'}%
              </p>
            </Popup>
          </Circle>
        ))}

        {/* ── LKP ── */}
        <Marker position={[lkp.lat, lkp.lng]} icon={lkpIcon} interactive={!isPlacingClue}>
          <Popup>
            <strong style={{ color: '#ef4444' }}>LKP — Último Punto de Avistamiento</strong>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
              {incident.name}<br />{profile?.label}<br />
              {lkp.lat.toFixed(5)}, {lkp.lng.toFixed(5)}
            </p>
          </Popup>
        </Marker>

        {/* ── Pistas encontradas ── */}
        {clueMarkers.map(clue => {
          const meta = CLUE_META[clue.type] || { color: '#F59E0B', emoji: '📌', label: 'Hallazgo' }
          const foundAgo = clue.ageHours != null
            ? clue.ageHours < 1
              ? `Hace ${Math.round(clue.ageHours * 60)}m`
              : `Hace ${clue.ageHours.toFixed(1)}h`
            : null
          return (
            <Marker key={clue.id} position={[clue.latlng.lat, clue.latlng.lng]} icon={makeClueIcon(clue.type)} interactive={!isPlacingClue}>
              <Popup>
                <strong style={{ color: meta.color }}>{meta.emoji} {meta.label}</strong>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
                  {clue.description || 'Sin descripción adicional'}
                </p>
                {foundAgo && (
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11 }}>⏱ {foundAgo}</p>
                )}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* ── Estado topográfico (top-left) ── */}
      <TopoStatus
        loading={loading}
        error={error}
        statusMsg={statusMsg}
        topoData={topoData}
        showHeatmap={showHeatmap}
        onToggle={() => setShowHeatmap(v => !v)}
      />

      {/* ── Leyenda de zonas (bottom-left) ── */}
      <ZoneLegend zones={zones} />

      {/* ── Indicador de modo marcar ── */}
      {isPlacingClue && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] bg-yellow-400 text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none animate-pulse">
          📌 Haz clic en el mapa para marcar la ubicación
        </div>
      )}
    </div>
  )
}
