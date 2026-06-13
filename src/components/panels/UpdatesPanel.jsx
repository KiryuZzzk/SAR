import { useSearch } from '../../context/SearchContext'
import { UPDATE_TYPES } from '../../data/protocols'
import {
  FiPlus, FiMapPin, FiClock, FiAlertCircle, FiCheckCircle,
  FiEye, FiVolume2, FiCloud, FiTruck, FiFileText,
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

function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function UpdatesPanel({ onOpenModal }) {
  const { state } = useSearch()
  const { updates } = state

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 shrink-0">
        <div>
          <p className="text-white text-sm font-semibold">Feed de Operaciones</p>
          <p className="text-slate-500 text-xs">{updates.length} actualizaciones registradas</p>
        </div>
        <button
          onClick={onOpenModal}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
        >
          <FiPlus size={13} /> Nueva
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {updates.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-sm">
            <FiAlertCircle className="mx-auto mb-2" size={20} />
            Sin actualizaciones aún.<br />
            <span className="text-xs">Usa "Nueva" para registrar hallazgos y novedades.</span>
          </div>
        )}

        {updates.map(update => {
          const Icon = TYPE_ICONS[update.type] || FiFileText
          return (
            <div key={update.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs">
              <div className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${update.color}22` }}
                >
                  <Icon size={14} style={{ color: update.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-300">{update.label}</span>
                    <span className="text-slate-600 shrink-0">{formatTime(update.timestamp)}</span>
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">{update.description}</p>
                  {update.latlng && (
                    <p className="text-slate-600 mt-1 flex items-center gap-1">
                      <FiMapPin size={10} />
                      {update.latlng.lat.toFixed(4)}, {update.latlng.lng.toFixed(4)}
                    </p>
                  )}
                  {update.hoursAdded && (
                    <p className="text-yellow-600 mt-1 flex items-center gap-1">
                      <FiClock size={10} /> +{update.hoursAdded}h al contador
                    </p>
                  )}
                  {update.pod && (
                    <p className="text-slate-600 mt-1">POD: {update.pod}%</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
