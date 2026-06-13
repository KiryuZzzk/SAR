import { useSearch } from '../../context/SearchContext'
import { PERSON_CATEGORIES, TERRAIN_TYPES, WEATHER_CONDITIONS } from '../../data/sarProfiles'
import { URGENCY_COLORS, survivalColor } from '../../data/probabilityModel'
import { FiAlertTriangle, FiUser, FiMapPin, FiClock, FiActivity } from 'react-icons/fi'

function useElapsedDisplay(elapsedHours) {
  const h = Math.floor(elapsedHours)
  const m = Math.floor((elapsedHours - h) * 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function IncidentPanel() {
  const { state } = useSearch()
  const { incident, elapsedHours, survivalProbability, urgency, zones } = state
  if (!incident) return null

  const profile = PERSON_CATEGORIES[incident.profileId]
  const terrain = TERRAIN_TYPES.find(t => t.id === incident.terrain)
  const weather = WEATHER_CONDITIONS.find(w => w.id === incident.weather)
  const elapsed = useElapsedDisplay(elapsedHours)
  const urgColor = URGENCY_COLORS[urgency] || '#64748b'
  const survColor = survivalColor(survivalProbability)

  return (
    <div className="space-y-3 p-3">
      {/* Cabecera del incidente */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-white font-bold text-base leading-tight">{incident.name}</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {profile?.icon} {profile?.label}
            </p>
          </div>
          <span
            className="text-xs font-bold px-2 py-1 rounded-lg border shrink-0"
            style={{ color: urgColor, borderColor: urgColor, background: `${urgColor}22` }}
          >
            {urgency}
          </span>
        </div>

        {incident.age && (
          <p className="text-slate-500 text-xs mt-2">
            <FiUser className="inline mr-1" size={11} />
            {incident.age} años
            {incident.medicalConditions ? ` · ${incident.medicalConditions}` : ''}
          </p>
        )}
        {incident.clothing && (
          <p className="text-slate-500 text-xs mt-0.5 truncate-2">{incident.clothing}</p>
        )}
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={FiClock}
          label="Tiempo transcurrido"
          value={elapsed}
          valueColor="#f59e0b"
        />
        <StatCard
          icon={FiActivity}
          label="Prob. supervivencia"
          value={`${survivalProbability}%`}
          valueColor={survColor}
        />
      </div>

      {/* Detalles */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 space-y-2 text-xs">
        <InfoRow icon={FiMapPin} label="LKP" value={`${incident.lkp.lat.toFixed(4)}, ${incident.lkp.lng.toFixed(4)}`} />
        {incident.locationName && <InfoRow label="Lugar" value={incident.locationName} />}
        <InfoRow label="Terreno" value={terrain?.label} />
        <InfoRow label="Clima" value={`${weather?.icon} ${weather?.label}`} />
        <InfoRow label="Reportado por" value={incident.reportedBy} />
        {incident.contactPhone && <InfoRow label="Tel. contacto" value={incident.contactPhone} />}
        {incident.notes && (
          <div className="pt-1 border-t border-slate-700">
            <p className="text-slate-500">Notas:</p>
            <p className="text-slate-300 mt-0.5">{incident.notes}</p>
          </div>
        )}
      </div>

      {/* Zona crítica */}
      {zones && (
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-xs space-y-1">
          <p className="text-red-400 font-semibold flex items-center gap-1">
            <FiAlertTriangle size={12} /> Radio de búsqueda prioritario
          </p>
          <div className="flex gap-3 text-slate-300 mt-1">
            <span>
              <span className="text-red-400">●</span> Crítica:{' '}
              <span className="font-mono">{(zones.zone1.radiusM / 1000).toFixed(1)} km</span>
            </span>
            <span>
              <span className="text-yellow-400">●</span> 90%:{' '}
              <span className="font-mono">{(zones.zone4.radiusM / 1000).toFixed(1)} km</span>
            </span>
          </div>
        </div>
      )}

      {/* Comportamientos esperados */}
      {profile && (
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <p className="text-slate-400 text-xs font-semibold mb-2">Comportamiento esperado (LPB)</p>
          <ul className="space-y-1">
            {profile.tendencies.map((t, i) => (
              <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                <span className="text-blue-400 mt-0.5 shrink-0">›</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riesgos */}
      {profile && (
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <p className="text-red-400 text-xs font-semibold mb-2">⚠ Factores de riesgo</p>
          <ul className="space-y-1">
            {profile.riskFactors.map((r, i) => (
              <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                <span className="text-red-500 mt-0.5 shrink-0">!</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, valueColor }) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
      <p className="text-slate-500 text-xs flex items-center gap-1">
        {Icon && <Icon size={11} />} {label}
      </p>
      <p className="text-xl font-bold font-mono mt-1" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-slate-600 shrink-0 w-24">{label}:</span>
      <span className="text-slate-300">{value || '—'}</span>
    </div>
  )
}
