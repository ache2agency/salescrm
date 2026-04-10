/**
 * Mensajes de reactivación — docs/PIPELINE_TAREAS.md §2c
 * Track A: idiomas / inglés / flujo examen-clase
 * Track B: licenciaturas, bachillerato, diplomados, maestrías
 */

export type ReactivationStageKey =
  | 'primer_contacto'
  | 'examen_ubicacion'
  | 'clase_muestra'
  | 'segundo_contacto'
  | 'promocion_enviada'
  | 'inscripcion_pendiente'

/** Días sin mensaje del usuario para poder enviar intento 1 (por etapa normalizada). */
export const DIAS_SILENCIO_POR_ETAPA: Record<ReactivationStageKey, number> = {
  primer_contacto: 2,
  examen_ubicacion: 2,
  clase_muestra: 2,
  segundo_contacto: 3,
  promocion_enviada: 2,
  inscripcion_pendiente: 1,
}

/** Mínimo de horas entre intento 1 y 2 (evita doble envío en el mismo día). */
export const HORAS_MIN_ENTRE_INTENTOS = 48

/** Heurística Track A (idiomas / examen / clase muestra). */
export function esTrackA(curso: string | null | undefined): boolean {
  const c = String(curso || '').toLowerCase()
  if (!c || c.includes('whatsapp - instituto')) return true
  return (
    /idioma|ingl[eé]s|inglés|franc[eé]s|italiano|niño|adulto|examen|clase de prueba|clase muestra|ubicaci[oó]n/.test(
      c
    ) || /licenciatura en ingl[eé]s/.test(c)
  )
}

const ETAPAS_CANONICAS: ReactivationStageKey[] = [
  'primer_contacto',
  'examen_ubicacion',
  'clase_muestra',
  'segundo_contacto',
  'promocion_enviada',
  'inscripcion_pendiente',
]

/** Mapea stage del lead (CRM o legacy) a clave de reactivación. */
export function normalizarEtapaReactivacion(stage: string | null | undefined): ReactivationStageKey | null {
  const s = String(stage || '').trim()
  if (ETAPAS_CANONICAS.includes(s as ReactivationStageKey)) return s as ReactivationStageKey
  const map: Record<string, ReactivationStageKey> = {
    contactado: 'primer_contacto',
    nuevo: 'primer_contacto',
    seguimiento: 'segundo_contacto',
    tercer_contacto: 'segundo_contacto',
    promo_enviada: 'promocion_enviada',
  }
  return map[s] ?? null
}

function replaceNombre(plantilla: string, nombre: string) {
  const n = nombre?.trim() || 'ahí'
  return plantilla.replace(/\[nombre\]/g, n)
}

const TRACK_A: Record<
  ReactivationStageKey,
  { intento1: string; intento2: string }
> = {
  primer_contacto: {
    intento1:
      'Hola [nombre] 👋 ¿Pudiste revisar la información que te compartimos? Si tienes alguna duda con gusto te ayudamos. 😊',
    intento2:
      'Hola [nombre], queremos asegurarnos de que tengas toda la información que necesitas para tomar la mejor decisión. Recuerda que tenemos una promoción activa con descuento en inscripción. ¿Te gustaría agendar tu examen de ubicación gratuito?',
  },
  examen_ubicacion: {
    intento1:
      'Hola [nombre] 👋 ¿Pudiste realizar tu examen de ubicación? Es el primer paso para unirte a la familia Windsor. Si necesitas ayuda con el proceso, aquí estamos. 😊',
    intento2:
      'Hola [nombre], tu lugar está disponible. El examen de ubicación es gratuito y solo toma unos minutos. ¿Lo agendamos hoy?',
  },
  clase_muestra: {
    intento1:
      'Hola [nombre] 👋 ¿Te gustaría agendar tu clase de prueba gratuita? Es la mejor manera de conocer nuestra metodología y al equipo. 😊',
    intento2:
      'Hola [nombre], tu clase de prueba gratuita sigue disponible. Son pocos los lugares y queremos asegurarnos de que puedas vivirla. ¿La agendamos?',
  },
  segundo_contacto: {
    intento1:
      'Hola [nombre] 👋 ¿Cómo vas con tu decisión? Si tienes alguna duda sobre el programa o el proceso de inscripción, con gusto te orientamos. Estamos aquí para ayudarte. 😊',
    intento2:
      'Hola [nombre], sabemos que tomar una decisión importante lleva tiempo. Si quieres, podemos resolver cualquier duda que tengas antes de que decidas. Recuerda que la promoción actual tiene fecha límite. ¿Hablamos?',
  },
  promocion_enviada: {
    intento1:
      'Hola [nombre] 👋 Solo para recordarte que la promoción que te compartimos tiene fecha límite. ¿Te gustaría apartar tu lugar antes de que expire? 😊',
    intento2:
      'Hola [nombre], este es nuestro último aviso sobre la promoción vigente. Es una oportunidad única para iniciar tu carrera con un descuento importante. ¿La aprovechamos juntos?',
  },
  inscripcion_pendiente: {
    intento1:
      'Hola [nombre] 👋 ¿Pudiste reunir los documentos y realizar el pago? Si tienes alguna duda con el proceso, aquí te ayudamos paso a paso. 😊',
    intento2:
      'Hola [nombre], tu lugar está casi apartado. Solo falta completar el proceso de inscripción. ¿Necesitas ayuda con algún documento o con los datos de pago?',
  },
}

const TRACK_B: Partial<Record<ReactivationStageKey, { intento1: string; intento2: string }>> = {
  primer_contacto: {
    intento1:
      'Hola [nombre] 👋 ¿Pudiste revisar la información que te compartimos? Si tienes alguna duda con gusto te ayudamos. 😊',
    intento2:
      'Hola [nombre], queremos asegurarnos de que tengas toda la información que necesitas para tomar la mejor decisión. Recuerda que tenemos una promoción activa. ¿Hablamos?',
  },
  segundo_contacto: {
    intento1:
      'Hola [nombre] 👋 ¿Cómo vas con tu decisión? Si tienes alguna duda, con gusto te orientamos. 😊',
    intento2:
      'Hola [nombre], sabemos que tomar una decisión importante lleva tiempo. Recuerda que la promoción tiene fecha límite. ¿Te ayudamos a dar el siguiente paso?',
  },
  promocion_enviada: {
    intento1:
      'Hola [nombre] 👋 Solo para recordarte que la promoción que te compartimos tiene fecha límite. ¿Te gustaría apartar tu lugar? 😊',
    intento2:
      'Hola [nombre], este es nuestro último aviso sobre la promoción vigente. ¿La aprovechamos juntos?',
  },
  inscripcion_pendiente: {
    intento1:
      'Hola [nombre] 👋 ¿Pudiste reunir los documentos y realizar el pago? Aquí te ayudamos. 😊',
    intento2:
      'Hola [nombre], tu lugar está casi apartado. Solo falta completar el proceso. ¿Necesitas ayuda?',
  },
}

export function obtenerMensajeReactivacion(
  etapa: ReactivationStageKey,
  intento: 1 | 2,
  trackA: boolean,
  nombre: string
): string {
  const key = intento === 1 ? 'intento1' : 'intento2'
  if (trackA) {
    return replaceNombre(TRACK_A[etapa][key], nombre)
  }
  const b = TRACK_B[etapa]
  if (b?.[key]) {
    return replaceNombre(b[key], nombre)
  }
  return replaceNombre(TRACK_A[etapa][key], nombre)
}
