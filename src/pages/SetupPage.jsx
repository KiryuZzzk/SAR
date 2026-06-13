import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  FiAlertTriangle, FiUser, FiMapPin, FiClock, FiCloudRain,
  FiChevronRight, FiChevronLeft, FiCheckCircle, FiInfo
} from 'react-icons/fi'
import { FaMountain } from 'react-icons/fa'
import { useSearch } from '../context/SearchContext'
import { PERSON_CATEGORIES, TERRAIN_TYPES, WEATHER_CONDITIONS } from '../data/sarProfiles'

// Ícono personalizado para LKP
const lkpIcon = L.divIcon({
  html: `<div style="
    width:20px;height:20px;background:#ef4444;border:3px solid #fff;
    border-radius:50%;box-shadow:0 0 0 3px rgba(239,68,68,0.4);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: '',
})

function LKPSelector({ value, onChange }) {
  function MapClick() {
    useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) })
    return null
  }
  const center = value ? [value.lat, value.lng] : [23.6345, -102.5528]
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-600" style={{ height: 300 }}>
      <MapContainer center={center} zoom={value ? 12 : 5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
          subdomains="abcd"
        />
        <MapClick />
        {value && <Marker position={[value.lat, value.lng]} icon={lkpIcon} />}
      </MapContainer>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-300 text-xs px-3 py-1 rounded-full border border-slate-600 pointer-events-none z-[999]">
        {value
          ? `LKP: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : 'Haz clic en el mapa para marcar el Último Punto de Avistamiento'}
      </div>
    </div>
  )
}

const STEPS = [
  { id: 1, label: 'Persona', icon: FiUser },
  { id: 2, label: 'Ubicación', icon: FiMapPin },
  { id: 3, label: 'Condiciones', icon: FiCloudRain },
  { id: 4, label: 'Confirmar', icon: FiCheckCircle },
]

export default function SetupPage() {
  const { startIncident } = useSearch()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    // Paso 1
    missingName: '',
    profileId: '',
    age: '',
    physicalDescription: '',
    clothing: '',
    medicalConditions: '',
    // Paso 2
    lkp: null,
    locationName: '',
    terrain: '',
    // Paso 3
    elapsedHours: 3,
    weather: '',
    reportedBy: '',
    contactPhone: '',
    notes: '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  function canNext() {
    if (step === 1) return form.profileId && form.missingName
    if (step === 2) return form.lkp && form.terrain
    if (step === 3) return form.weather && form.reportedBy
    return true
  }

  function handleSubmit() {
    const terrain = TERRAIN_TYPES.find(t => t.id === form.terrain)
    startIncident({
      id: Date.now(),
      name: form.missingName,
      profileId: form.profileId,
      age: form.age,
      physicalDescription: form.physicalDescription,
      clothing: form.clothing,
      medicalConditions: form.medicalConditions,
      lkp: form.lkp,
      locationName: form.locationName,
      terrain: form.terrain,
      terrainMultiplier: terrain?.multiplier || 1.2,
      elapsedHours: parseFloat(form.elapsedHours),
      weather: form.weather,
      reportedBy: form.reportedBy,
      contactPhone: form.contactPhone,
      notes: form.notes,
      startTime: new Date(Date.now() - form.elapsedHours * 3600000),
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
            <FiAlertTriangle className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-none">SAR — Sistema de Búsqueda y Rescate</h1>
            <p className="text-slate-500 text-xs mt-0.5">Áreas naturales y grandes extensiones · México</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
          <FiInfo size={12} />
          Basado en estándares NASAR · INASAR · Protocolos MEX
        </div>
      </header>

      {/* Contenido — scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-2xl mx-auto">

          {/* Título */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Nuevo Incidente SAR</h2>
            <p className="text-slate-400 text-sm mt-1">
              Ingresa los parámetros del incidente para generar el mapa de búsqueda probabilístico
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center mb-8 gap-0">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    step === s.id
                      ? 'bg-red-600 text-white'
                      : step > s.id
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <s.icon size={14} />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${step > s.id ? 'bg-slate-500' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Card del formulario */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">

            {/* PASO 1: Persona */}
            {step === 1 && (
              <div className="space-y-5">
                <SectionTitle icon={FiUser} text="Datos de la Persona Desaparecida" />

                <div>
                  <label className="label">Nombre completo *</label>
                  <input
                    className="input"
                    placeholder="Nombre de la persona buscada"
                    value={form.missingName}
                    onChange={e => set('missingName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Perfil de Comportamiento (LPB) *</label>
                  <p className="text-xs text-slate-500 mb-3">
                    Define el radio y patrón estadístico de búsqueda según NASAR/Koester
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(PERSON_CATEGORIES).map(p => (
                      <button
                        key={p.id}
                        onClick={() => set('profileId', p.id)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all ${
                          form.profileId === p.id
                            ? 'border-red-500 bg-red-950/40 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-lg">{p.icon}</span>
                        <span className="font-medium leading-tight">{p.labelShort}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {form.profileId && (
                  <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                    <p className="text-xs font-semibold text-slate-300 mb-1">
                      Comportamientos típicos — {PERSON_CATEGORIES[form.profileId].label}
                    </p>
                    <ul className="space-y-1">
                      {PERSON_CATEGORIES[form.profileId].tendencies.slice(0, 3).map((t, i) => (
                        <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                          <span className="text-red-500 mt-0.5">›</span> {t}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-slate-700 flex gap-4 text-xs">
                      <span className="text-slate-500">Radio 50%:</span>
                      <span className="text-yellow-400 font-mono">
                        {PERSON_CATEGORIES[form.profileId].distances.p50} km
                      </span>
                      <span className="text-slate-500">Radio 90%:</span>
                      <span className="text-green-400 font-mono">
                        {PERSON_CATEGORIES[form.profileId].distances.p90} km
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Edad</label>
                    <input className="input" placeholder="ej. 34" value={form.age} onChange={e => set('age', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Condiciones médicas</label>
                    <input className="input" placeholder="Diabetes, epilepsia…" value={form.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="label">Descripción física / ropa al momento</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    placeholder="Camisa azul, pantalón negro, mochila roja…"
                    value={form.clothing}
                    onChange={e => set('clothing', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PASO 2: Ubicación */}
            {step === 2 && (
              <div className="space-y-5">
                <SectionTitle icon={FiMapPin} text="Último Punto de Avistamiento (LKP)" />
                <p className="text-xs text-slate-500 -mt-2">
                  Haz clic en el mapa para marcar el LKP. Puedes hacer zoom para mayor precisión.
                </p>

                <LKPSelector value={form.lkp} onChange={v => set('lkp', v)} />

                <div>
                  <label className="label">Nombre del lugar o referencia</label>
                  <input className="input" placeholder="ej. Sendero principal, Cerro El Potosí" value={form.locationName} onChange={e => set('locationName', e.target.value)} />
                </div>

                <div>
                  <label className="label">Tipo de terreno *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TERRAIN_TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => set('terrain', t.id)}
                        className={`p-2.5 rounded-lg border text-sm text-left transition-all ${
                          form.terrain === t.id
                            ? 'border-blue-500 bg-blue-950/40 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <FaMountain className="inline mr-1.5 opacity-60" size={11} />
                        {t.label}
                        <span className={`ml-1 text-xs ${form.terrain === t.id ? 'text-blue-400' : 'text-slate-600'}`}>
                          ×{t.multiplier}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: Condiciones */}
            {step === 3 && (
              <div className="space-y-5">
                <SectionTitle icon={FiClock} text="Tiempo y Condiciones" />

                <div>
                  <label className="label">
                    Horas desde la desaparición: <span className="text-red-400 font-mono ml-1">{form.elapsedHours}h</span>
                  </label>
                  <input
                    type="range" min={0.5} max={168} step={0.5}
                    value={form.elapsedHours}
                    onChange={e => set('elapsedHours', e.target.value)}
                    className="w-full mt-1"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-1">
                    <span>30 min</span><span>12h</span><span>24h</span><span>48h</span><span>7 días</span>
                  </div>
                </div>

                <div>
                  <label className="label">Condiciones climáticas actuales *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEATHER_CONDITIONS.map(w => (
                      <button
                        key={w.id}
                        onClick={() => set('weather', w.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${
                          form.weather === w.id
                            ? 'border-sky-500 bg-sky-950/40 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span>{w.icon}</span>
                        <span>{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Reportado por *</label>
                    <input className="input" placeholder="Nombre del reportante" value={form.reportedBy} onChange={e => set('reportedBy', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Teléfono de contacto</label>
                    <input className="input" placeholder="+52 81 xxxx xxxx" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="label">Notas adicionales</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    placeholder="Información adicional relevante para la búsqueda…"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PASO 4: Confirmar */}
            {step === 4 && (
              <div className="space-y-4">
                <SectionTitle icon={FiCheckCircle} text="Confirmar y Activar Incidente" />

                <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 text-sm">
                  <p className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                    <FiAlertTriangle /> Resumen del Incidente
                  </p>
                  <div className="space-y-2 text-slate-300">
                    <Row label="Persona" value={form.missingName} />
                    <Row label="Perfil LPB" value={PERSON_CATEGORIES[form.profileId]?.label} />
                    {form.age && <Row label="Edad" value={`${form.age} años`} />}
                    {form.medicalConditions && <Row label="Condición médica" value={form.medicalConditions} />}
                    {form.clothing && <Row label="Ropa / Descripción" value={form.clothing} />}
                    <Row label="LKP" value={form.lkp ? `${form.lkp.lat.toFixed(5)}, ${form.lkp.lng.toFixed(5)}` : '—'} />
                    {form.locationName && <Row label="Lugar" value={form.locationName} />}
                    <Row label="Terreno" value={TERRAIN_TYPES.find(t => t.id === form.terrain)?.label} />
                    <Row label="Tiempo transcurrido" value={`${form.elapsedHours} horas`} />
                    <Row label="Clima" value={WEATHER_CONDITIONS.find(w => w.id === form.weather)?.label} />
                    <Row label="Reportado por" value={form.reportedBy} />
                  </div>
                </div>

                <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-xs text-slate-400">
                  Al activar el incidente se generará el mapa de probabilidades basado en estadísticas NASAR/Koester
                  para el perfil <strong className="text-white">{PERSON_CATEGORIES[form.profileId]?.label}</strong> y
                  se iniciará el seguimiento dinámico de la búsqueda.
                </div>
              </div>
            )}

            {/* Navegación */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={16} /> Anterior
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente <FiChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-900/40"
                >
                  <FiAlertTriangle size={15} />
                  ACTIVAR INCIDENTE SAR
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers visuales ────────────────────────────────────────
function SectionTitle({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="text-red-500" size={16} />
      <h3 className="text-white font-semibold text-sm">{text}</h3>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 w-36 shrink-0">{label}:</span>
      <span className="text-slate-200">{value || '—'}</span>
    </div>
  )
}

// ─── Estilos inline con clases Tailwind ─────────────────────
// (ponemos estilos reutilizables como strings en index.css via @apply,
//  pero aquí los aplicamos directamente para no complicar el build)
const style = document.createElement('style')
style.textContent = `
  .label { display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem; }
  .input {
    width:100%; background:#0f172a; border:1px solid #334155; border-radius:0.5rem;
    padding:0.5rem 0.75rem; font-size:0.875rem; color:#e2e8f0; outline:none;
    transition: border-color 0.15s;
  }
  .input:focus { border-color:#3b82f6; }
  .input::placeholder { color:#475569; }
`
document.head.appendChild(style)
