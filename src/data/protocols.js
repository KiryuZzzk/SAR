// ============================================================
// Protocolos SAR — México e Internacionales
// Referencias: INASAR, CONAFOR, Cruz Roja Mexicana,
//              NASAR (EUA), ISAR (ONU), Koester 2008
// ============================================================

export const PROTOCOLS = {
  mexico: {
    name: 'Protocolos México',
    shortName: 'MEX',
    color: '#006847',
    items: [
      {
        id: 'mx-1',
        title: 'Activación COEPROC / Protección Civil',
        description: 'Notificar a la Coordinación Estatal de Protección Civil dentro de la primera hora. Número único: 800-PROTEGE (776-8343).',
        phase: 'inicial',
      },
      {
        id: 'mx-2',
        title: 'Punto de Comando (PC)',
        description: 'Establecer Punto de Comando fijo con registro de entrada/salida de todos los equipos. Debe tener comunicación radial y mapa impreso del área.',
        phase: 'inicial',
      },
      {
        id: 'mx-3',
        title: 'Registro e Identificación de la Víctima',
        description: 'Completar formato CONAFOR-SAR-001: nombre, edad, condición física, medicamentos, ropa al momento, foto reciente, contacto familiar.',
        phase: 'inicial',
      },
      {
        id: 'mx-4',
        title: 'Coordinar con SEDENA / GN si aplica',
        description: 'Para áreas remotas mayores de 50 km² o cuando hayan pasado más de 12 horas, solicitar apoyo de Guardia Nacional o Ejército para cobertura aérea.',
        phase: 'escalada',
      },
      {
        id: 'mx-5',
        title: 'Notificación a Ministerio Público',
        description: 'Si la persona es menor de edad o hay sospecha de delito, notificar al MP en las primeras 2 horas. Preservar cadena de custodia en LKP.',
        phase: 'legal',
      },
      {
        id: 'mx-6',
        title: 'Protocolo Alba / Amber Alert',
        description: 'Para menores: activar Protocolo Alba en primeras 4 horas. Para niños 0–17 años: Alerta Amber si hay sospecha de sustracción.',
        phase: 'legal',
      },
      {
        id: 'mx-7',
        title: 'Coordinación con CONANP',
        description: 'En Áreas Naturales Protegidas, la Comisión Nacional de Áreas Naturales Protegidas tiene jurisdicción y debe ser notificada. Tienen datos cartográficos locales.',
        phase: 'institucional',
      },
      {
        id: 'mx-8',
        title: 'Registro en RNPDNO',
        description: 'Si la persona no se encuentra en 24 horas, registrar en el Registro Nacional de Personas Desaparecidas y No Localizadas (RNPDNO / CNBSP).',
        phase: 'seguimiento',
      },
    ],
  },

  international: {
    name: 'Estándares Internacionales',
    shortName: 'ISAR',
    color: '#1D4ED8',
    items: [
      {
        id: 'int-1',
        title: 'ICS — Sistema de Comando de Incidentes',
        description: 'Estructurar la operación bajo ICS: Comandante de Incidente, Sección de Operaciones, Sección de Logística, Sección de Planificación, Finanzas.',
        phase: 'estructura',
      },
      {
        id: 'int-2',
        title: 'Establecer PLS y LKP',
        description: 'Diferenciar: Point Last Seen (PLS) = último lugar visto por testigos. Last Known Point (LKP) = última evidencia física. Buscar desde PLS primero.',
        phase: 'inicial',
      },
      {
        id: 'int-3',
        title: 'Cálculo de Área de Búsqueda (Search Area)',
        description: 'Usar estadísticas LPB de Koester para definir radio de búsqueda según perfil. Calcular IPP (Initial Planning Point) y trazar zonas concéntricas.',
        phase: 'planificación',
      },
      {
        id: 'int-4',
        title: 'POD — Probabilidad de Detección',
        description: 'Para cada segmento buscado registrar POD (Probability of Detection). No marcar zona como "limpia" hasta alcanzar POD ≥ 75% en terreno abierto y ≥ 50% en vegetación densa.',
        phase: 'operaciones',
      },
      {
        id: 'int-5',
        title: 'Gestión de Probabilidad (POA y POS)',
        description: 'POA = Probability of Area (prob. de que esté en esa zona). POS = Probability of Success (POA × POD). Recalcular después de cada segmento buscado.',
        phase: 'operaciones',
      },
      {
        id: 'int-6',
        title: 'Documentación SARMAN',
        description: 'Usar formularios estándar SAR: Form A (situación), Form B (recursos), Form C (asignación de equipos), Form D (resultados por segmento).',
        phase: 'documentación',
      },
      {
        id: 'int-7',
        title: 'Regla de las 72 Horas',
        description: 'Las primeras 72 horas son críticas. Escalar recursos exponencialmente: 0-12h respuesta rápida local, 12-24h mutual aid regional, 24-72h recursos estatales/nacionales.',
        phase: 'escalada',
      },
      {
        id: 'int-8',
        title: 'Gestión de Voluntarios',
        description: 'Registrar todos los voluntarios. No desplegar no entrenados en zona de búsqueda. Asignar a voluntarios sin cert. SAR tareas de apoyo logístico.',
        phase: 'recursos',
      },
      {
        id: 'int-9',
        title: 'Briefing/Debriefing de Equipos',
        description: 'Briefing antes de cada misión: mapa del segmento, punto de inicio/fin, frecuencia radio, protocolo emergencia. Debriefing al regreso: hallazgos, condiciones, POD estimado.',
        phase: 'operaciones',
      },
      {
        id: 'int-10',
        title: 'Continuidad de Búsqueda (24/7)',
        description: 'Para personas con bajo tiempo de supervivencia (niños, demencia, clima extremo) operar en turnos nocturnos con iluminación. No suspender salvo riesgo extremo al rescatador.',
        phase: 'operaciones',
      },
    ],
  },
}

export const INCIDENT_PHASES = [
  { id: 'inicial',        label: 'Fase Inicial',         color: '#DC2626', description: '0–2 horas desde la desaparición' },
  { id: 'expansion',     label: 'Expansión',             color: '#EA580C', description: '2–6 horas' },
  { id: 'operacion',     label: 'Operación Activa',      color: '#CA8A04', description: '6–24 horas' },
  { id: 'escalada',      label: 'Escalada',              color: '#7C3AED', description: '24–72 horas' },
  { id: 'busqueda_ext',  label: 'Búsqueda Extendida',   color: '#1D4ED8', description: '+72 horas' },
]

export const UPDATE_TYPES = [
  { id: 'clue_found',      label: 'Pista / Pertenencia encontrada', icon: 'FaMapPin',        color: '#F59E0B', probabilityImpact: 'high' },
  { id: 'zone_cleared',    label: 'Zona barrida sin resultado',      icon: 'FaCheckSquare',   color: '#6B7280', probabilityImpact: 'negative' },
  { id: 'witness',         label: 'Testimonio de testigo',           icon: 'FaUser',          color: '#3B82F6', probabilityImpact: 'medium' },
  { id: 'tracks_found',    label: 'Huellas / Rastro encontrado',    icon: 'FaShoeprints',    color: '#10B981', probabilityImpact: 'high' },
  { id: 'audio_contact',   label: 'Contacto auditivo (voz/señal)',  icon: 'FaVolumeUp',      color: '#8B5CF6', probabilityImpact: 'critical' },
  { id: 'visual_contact',  label: 'Contacto visual confirmado',     icon: 'FaEye',           color: '#EF4444', probabilityImpact: 'critical' },
  { id: 'time_elapsed',    label: 'Actualización de tiempo',        icon: 'FaClock',         color: '#64748B', probabilityImpact: 'time' },
  { id: 'weather_change',  label: 'Cambio de condiciones clima',    icon: 'FaCloudRain',     color: '#0EA5E9', probabilityImpact: 'survival' },
  { id: 'new_resource',    label: 'Nuevo recurso desplegado',       icon: 'FaTruck',         color: '#22C55E', probabilityImpact: 'none' },
  { id: 'note',            label: 'Nota general de operaciones',    icon: 'FaStickyNote',    color: '#A78BFA', probabilityImpact: 'none' },
]
