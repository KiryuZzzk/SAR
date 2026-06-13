import { useState } from 'react'
import { useSearch } from '../../context/SearchContext'
import { UPDATE_TYPES } from '../../data/protocols'
import {
  FiX, FiMapPin, FiCheckCircle, FiEye, FiVolume2,
  FiCloud, FiTruck, FiFileText, FiClock,
} from 'react-icons/fi'
import { GiFootprint } from 'react-icons/gi'

const TYPE_ICONS = {
  clue_found:     FiMapPin,
  zone_cleared:   FiCheckCircle,
  witness:        FiEye,
  tracks_found:   GiFootprint,
  audio_contact:  FiVolume2,
  visual_contact: FiEye,
  time_elapsed:   FiClock,
  weather_change: FiCloud,
  new_resource:   FiTruck,
  note:           FiFileText,
}

// datetime-local necesita hora LOCAL, no UTC — corregir offset de zona horaria
function toLocalDateTimeInput(date) {
  const d = new Date(date)
  d.setSeconds(0, 0)
  const offset = d.getTimezoneOffset() * 60_000          // ms de diferencia UTC↔local
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

export default function UpdateModal({ onClose, onRequestMapClick, pendingLatLng, onClearPending }) {
  const { addUpdate, addClearedZone, state } = useSearch()
  const [type, setType]               = useState('')
  const [description, setDescription] = useState('')
  const [hoursAdded, setHoursAdded]   = useState(1)
  const [pod, setPod]                 = useState(70)
  const [foundAt, setFoundAt]         = useState(() => toLocalDateTimeInput(new Date()))

  const selectedType  = UPDATE_TYPES.find(t => t.id === type)
  const needsLocation = ['clue_found', 'tracks_found', 'zone_cleared', 'audio_contact', 'visual_contact', 'witness'].includes(type)
  const needsTime     = type === 'time_elapsed'
  const needsPOD      = type === 'zone_cleared'
  const needsDateTime = ['clue_found', 'tracks_found', 'audio_contact', 'visual_contact', 'witness'].includes(type)

  function handleSubmit() {
    if (!type || !description) return
    const update = {
      type,
      description,
      color: selectedType?.color || '#64748b',
      label: selectedType?.label || type,
    }
    if (needsLocation && pendingLatLng) update.latlng = pendingLatLng
    if (needsTime)     update.hoursAdded = parseFloat(hoursAdded)
    if (needsPOD)      update.pod = parseInt(pod)
    if (needsDateTime) {
      const ts = new Date(foundAt).getTime()
      update.foundAt   = ts                                          // epoch ms
      update.ageHours  = (Date.now() - ts) / 3_600_000             // para el modelo bayesiano
      update.timestamp = ts
    }

    // Si es zona barrida con ubicación, registrarla en el mapa
    if (type === 'zone_cleared' && pendingLatLng) {
      addClearedZone({
        center: [pendingLatLng.lat, pendingLatLng.lng],
        radius: 500,   // radio de 500 m por defecto
        pod: parseInt(pod),
        label: description,
      })
    }

    addUpdate(update)
    onClearPending?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Registrar Actualización</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Tipo */}
          <div>
            <label className="label">Tipo de novedad *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {UPDATE_TYPES.map(t => {
                const Icon = TYPE_ICONS[t.id] || FiFileText
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-all ${
                      type === t.id
                        ? 'border-current text-white'
                        : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}
                    style={type === t.id ? {
                      borderColor: t.color,
                      background: `${t.color}22`,
                      color: t.color,
                    } : {}}
                  >
                    <Icon size={12} style={{ color: t.color, flexShrink: 0 }} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Descripción */}
          {type && (
            <div>
              <label className="label">Descripción *</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder={
                  type === 'clue_found'   ? 'ej. Mochila roja hallada a 2 km NE del LKP' :
                  type === 'zone_cleared' ? 'ej. Sector A del sendero principal barrido sin resultado' :
                  type === 'witness'      ? 'ej. Testigo reporta haber visto a la persona en el mirador' :
                  type === 'tracks_found' ? 'ej. Huellas de bota talla 10 dirección norte-noroeste' :
                  type === 'time_elapsed' ? 'Actualización de tiempo transcurrido' :
                  type === 'weather_change' ? 'ej. Lluvia iniciada, visibilidad reducida a 200m' :
                  'Describe la novedad operacional…'
                }
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          )}

          {/* Fecha y hora del hallazgo */}
          {needsDateTime && (
            <div>
              <label className="label">Fecha y hora del hallazgo</label>
              <input
                type="datetime-local"
                className="input"
                value={foundAt}
                max={toLocalDateTimeInput(new Date())}
                onChange={e => setFoundAt(e.target.value)}
              />
              {(() => {
                const ageMs = Date.now() - new Date(foundAt).getTime()
                const ageH  = Math.floor(ageMs / 3_600_000)
                const ageM  = Math.floor((ageMs % 3_600_000) / 60_000)
                if (ageMs < 0) return (
                  <p className="text-xs text-red-400 mt-1">⚠ La hora no puede ser futura</p>
                )
                return (
                  <p className="text-xs text-slate-500 mt-1">
                    Hace {ageH > 0 ? `${ageH}h ` : ''}{ageM}m —
                    <span className="text-slate-400"> el modelo ajustará la dispersión según este tiempo</span>
                  </p>
                )
              })()}
            </div>
          )}

          {/* Horas adicionales */}
          {needsTime && (
            <div>
              <label className="label">
                Horas adicionales:&nbsp;
                <span className="text-yellow-400 font-mono">{hoursAdded}h</span>
              </label>
              <input
                type="range" min={0.5} max={24} step={0.5}
                value={hoursAdded}
                onChange={e => setHoursAdded(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* POD para zona barrida */}
          {needsPOD && (
            <div>
              <label className="label">
                POD — Probabilidad de Detección:&nbsp;
                <span className="text-blue-400 font-mono">{pod}%</span>
              </label>
              <input
                type="range" min={10} max={95} step={5}
                value={pod}
                onChange={e => setPod(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-600 mt-1">
                Estándar NASAR: terreno abierto ≥ 75% · vegetación densa ≥ 50%
              </p>
            </div>
          )}

          {/* Ubicación en mapa para pistas */}
          {needsLocation && (
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-xs">
              {pendingLatLng ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <FiCheckCircle size={14} />
                    <span>
                      Ubicación marcada: {pendingLatLng.lat.toFixed(5)},&nbsp;
                      {pendingLatLng.lng.toFixed(5)}
                    </span>
                  </div>
                  <button
                    onClick={onClearPending}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 mb-2">
                    {{
                      zone_cleared:   'Marca el centro de la zona barrida en el mapa:',
                      audio_contact:  'Marca dónde se escuchó en el mapa:',
                      visual_contact: 'Marca dónde fue visto en el mapa:',
                      witness:        'Marca dónde reporta el testigo en el mapa:',
                    }[type] ?? 'Marca la ubicación del hallazgo en el mapa:'}
                  </p>
                  <button
                    onClick={() => { onRequestMapClick(); onClose() }}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  >
                    📌 Marcar en mapa y volver
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!type || !description}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}
