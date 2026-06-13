import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearch } from '../../context/SearchContext'
import { generateRecommendations, CATEGORY } from '../../utils/adaptiveEngine'
import { FiChevronDown, FiChevronUp, FiBell, FiRefreshCw } from 'react-icons/fi'

// ─── Tarjeta individual ───────────────────────────────────────
function RecCard({ rec, isNew }) {
  const [expanded, setExpanded] = useState(isNew)  // abrir si es nuevo
  const p = rec.priority

  return (
    <div
      className={`rounded-xl border text-xs transition-all duration-300 ${
        isNew ? 'ring-1 ring-offset-0' : ''
      }`}
      style={{
        borderColor: `${p.color}55`,
        background:  `${p.bg}`,
        ringColor:   p.color,
      }}
    >
      {/* Header de la tarjeta */}
      <button
        className="w-full flex items-start gap-2 p-2.5 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Badge prioridad */}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
          style={{ background: p.color, color: '#fff' }}
        >
          {p.label}
        </span>

        {/* Categoría + título */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] text-slate-500">
              {CATEGORY[rec.category]?.icon} {CATEGORY[rec.category]?.label}
            </span>
            {isNew && (
              <span className="text-[9px] bg-blue-600 text-white px-1 rounded font-bold">NUEVO</span>
            )}
          </div>
          <p className="text-slate-200 font-semibold leading-snug">{rec.title}</p>
        </div>

        {/* Toggle */}
        <div className="text-slate-600 shrink-0 mt-0.5">
          {expanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-slate-700/50 pt-2">
          {/* Análisis */}
          <p className="text-slate-400 leading-relaxed">{rec.detail}</p>

          {/* Acción recomendada */}
          {rec.action && (
            <div
              className="rounded-lg p-2 border-l-2"
              style={{ borderColor: p.color, background: 'rgba(255,255,255,0.04)' }}
            >
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Acción</p>
              <p className="text-slate-300">{rec.action}</p>
            </div>
          )}

          {/* Disparador */}
          {rec.trigger && (
            <p className="text-[10px] text-slate-600 flex items-center gap-1">
              <FiRefreshCw size={9} />
              Activado por: {rec.trigger}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────
export default function RecommendationsPanel() {
  const { state } = useSearch()
  const prevIdsRef   = useRef(new Set())
  const [newIds, setNewIds] = useState(new Set())

  const recommendations = useMemo(
    () => generateRecommendations(state),
    // Recalcular cuando cambien cualquiera de estos valores
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.elapsedHours,
      state.incident?.weather,
      state.incident?.profileId,
      state.updates?.length,
      state.clearedZones?.length,
      state.clueMarkers?.length,
      state.survivalProbability,
    ]
  )

  // Detectar recomendaciones verdaderamente nuevas
  useEffect(() => {
    const currentIds = new Set(recommendations.map(r => r.id))
    const fresh = new Set([...currentIds].filter(id => !prevIdsRef.current.has(id)))
    if (fresh.size > 0) setNewIds(fresh)
    prevIdsRef.current = currentIds

    // Limpiar "nuevo" después de 8 segundos
    const t = setTimeout(() => setNewIds(new Set()), 8000)
    return () => clearTimeout(t)
  }, [recommendations])

  const critCount = recommendations.filter(r => r.priority.label === 'CRÍTICA').length
  const newCount  = newIds.size

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-semibold">Análisis Adaptativo</p>
            {critCount > 0 && (
              <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                {critCount} crítica{critCount > 1 ? 's' : ''}
              </span>
            )}
            {newCount > 0 && (
              <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <FiBell size={8} /> {newCount} nueva{newCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            {recommendations.length} recomendaciones activas · se actualiza automáticamente
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {recommendations.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-xs">
            No hay recomendaciones activas.
          </div>
        )}

        {recommendations.map(rec => (
          <RecCard
            key={rec.id}
            rec={rec}
            isNew={newIds.has(rec.id)}
          />
        ))}
      </div>

      {/* Footer — nota sobre la IA futura */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <p className="text-[10px] text-slate-700 leading-relaxed">
          Motor de reglas basado en NASAR/Koester · Protocolos MEX/ISAR.
          <span className="text-slate-600"> En versión con IA: aprendizaje de casos históricos para ajuste predictivo.</span>
        </p>
      </div>
    </div>
  )
}
