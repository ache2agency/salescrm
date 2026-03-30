import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const AGENDAR_LINK = 'https://crm.windsor.edu.mx/agendar/hola@windsor.edu.mx'

const INSCRIPCION_LICS_MSG = `🔴PROCESO DE INSCRIPCIÓN LICENCIATURAS🔴

Antes que nada, ¡felicidades por tomar acción en tu crecimiento profesional y personal! Estamos seguros que tomaste la decisión correcta. 🎉

Para empezar tu proceso de inscripción vas a necesitar los siguientes archivos:

📄 *Acta de nacimiento*
Nombre del archivo: "Acta de nacimiento (tu nombre)"

📄 *Certificado de bachillerato*
Nombre del archivo: "Certificado de bachillerato (tu nombre)"

📄 *Comprobante de pago*
Nombre del archivo: "Comprobante de pago (tu nombre)"

🏦 Información bancaria:
https://drive.google.com/file/d/1Hj9rRk1zHMWGnG_CjF287W-hxY2AoTe9/view?usp=drivesdk

🔵 ¿Ya tienes todos los documentos? Sigue estos pasos:

1️⃣ Ingresa a https://www.windsor.edu.mx/solicitud-de-inscripcion y llena la *"Solicitud de inscripción licenciaturas"*

2️⃣ Envíanos un mensaje por este medio cuando hayas terminado.

¡Listo, ya eres parte de la familia Windsor! 🎉🎉🎉
¡¡BIENVENID@!!`

const CLASE_PRUEBA_MSG = `¡Me gustaría invitarte a una clase de prueba! 🎉

Tendrás la oportunidad de conocer a tu profesor(a) y socializar con tus compañeros. La idea es que experimentes nuestro servicio antes de tomar una decisión.

✅ *Completamente GRATUITA*

👉 Agenda tu clase aquí:
${AGENDAR_LINK}

¿Te animas? 😊`

async function getBotPrompt(): Promise<string> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('whatsapp_flows')
      .select('config')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const prompt = data?.config?.bot_prompt
    return typeof prompt === 'string' && prompt.trim() ? prompt.trim() : ''
  } catch {
    return ''
  }
}

// Flujo correcto:
// saludo → programa (catálogo) → correo (antes de info) → info_enviada → accion (CTA A/B) → dudas o inscripcion/clase_prueba

const FASE_INSTRUCCION: Record<string, string> = {
  saludo: 'Saluda brevemente y pide el nombre del prospecto.',

  programa: `Ya tienes el nombre. Muestra TODA la oferta educativa de la BASE DE CONOCIMIENTO.
Si el prospecto ya mencionó una categoría (ej: licenciaturas), lista TODOS los de esa categoría con nombres reales.
Si no mencionó nada, lista toda la oferta educativa con nombres reales.
Primero da la lista completa, luego pregunta cuál le interesa.`,

  correo: `El prospecto eligió un programa. ANTES de dar información del programa, pide su correo electrónico brevemente para dar seguimiento personalizado.
Si no lo quiere dar, da una respuesta evasiva, o dice que no tiene, avanza de todas formas a info_enviada.
No menciones el programa todavía — solo pide el correo.`,

  info_enviada: `Da TODA la información del programa usando la BASE DE CONOCIMIENTO:
duración, costos (inscripción y mensualidad), horarios, modalidad, certificaciones, campo laboral.
Al terminar, presenta estas dos opciones:
A) Tengo dudas sobre el programa
B) Quiero inscribirme [si es programa de inglés, usa "B) Quiero agendar mi clase de prueba gratuita"]`,

  dudas: `Responde la duda con datos concretos de la BASE (costos, horarios, requisitos, etc.).
Al terminar de responder, vuelve a presentar:
A) Tengo más dudas
B) Quiero inscribirme [o "B) Quiero mi clase de prueba" si es inglés]
Si elige A → siguienteFase: dudas. Si elige B → siguienteFase: inscripcion (o clase_prueba si es inglés).`,

  accion: `Presenta las opciones para el siguiente paso:
Si el programa es inglés (niños o adultos): A) Tengo dudas  B) Quiero agendar mi clase de prueba gratuita → siguienteFase: clase_prueba
Para todos los demás programas: A) Tengo dudas  B) Quiero inscribirme → siguienteFase: inscripcion
Si elige A → siguienteFase: dudas.`,

  asesor: `INFORMACIÓN DE CONTACTO DE LOS PLANTELES:
🏢 CHILPANCINGO: Sofía Tena #1, Col. Viguri | Tel: 747 472 8775 / 747 472 2466 / 747 491 4498
🏢 IGUALA: Ignacio Zaragoza 99, Col. Centro | Tel: 733 334 0498
Horarios: Lun–Vie 8:00–14:00 y 17:00–20:00 | Sáb 8:00–14:00

Flujo:
1. Si aún no mostraste los horarios: muéstralos y pregunta qué día y hora le viene mejor.
2. Si ya diste los horarios y preguntaste el día/hora: pide su número de teléfono.
3. Si ya tienes el teléfono: confirma que un asesor lo llamará en aproximadamente 1 hora desde uno de los números de los planteles.
Captura el teléfono en el campo "telefono" del JSON si el prospecto lo proporciona.`,

  inscripcion: 'El prospecto quiere inscribirse. El sistema enviará el proceso de inscripción automáticamente.',
  clase_prueba: 'El prospecto quiere su clase de prueba. El sistema enviará la invitación automáticamente.',

  cerrado: 'La conversación está cerrada. Si vuelve a escribir, pregunta si puedes ayudarle en algo más.',
  perdido: 'El prospecto no estaba interesado. Si vuelve a escribir, responde con amabilidad.',
  seguimiento: 'Retoma la conversación de forma amable y recuérdale el siguiente paso.',
}

const NEXT_STEP_LABEL: Record<string, string> = {
  saludo: 'Capturar nombre',
  programa: 'Mostrar catálogo y elegir programa',
  correo: 'Capturar correo',
  info_enviada: 'Dar información del programa',
  dudas: 'Resolver dudas',
  accion: 'Presentar opciones A/B',
  asesor: 'Conectar con asesor',
  inscripcion: 'Enviar proceso de inscripción',
  clase_prueba: 'Agendar clase de prueba',
  cerrado: 'Conversación cerrada',
  perdido: 'Prospecto perdido',
  seguimiento: 'Retomar interés',
}

async function queryRAG(question: string, matchCount = 5): Promise<string> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.windsor.edu.mx'}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, match_count: matchCount }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data?.answer || ''
  } catch {
    return ''
  }
}

const BROAD_CATEGORIES = ['licenciaturas', 'maestrías', 'maestrias', 'diplomados', 'programas', 'oferta', 'lics', 'maes', 'dipl']
function isBroadCategory(texto: string): boolean {
  const lower = texto.toLowerCase()
  return BROAD_CATEGORIES.some(c => lower.includes(c))
}

function buildRAGQuestion(fase: string, programa: string | null, userMessage: string): { question: string; matchCount: number } {
  // En fase programa: mostrar catálogo
  if (fase === 'programa') {
    if (programa && isBroadCategory(programa)) {
      return {
        question: `Lista completa de ${programa} disponibles en Instituto Windsor: nombres, duración y costos`,
        matchCount: 15,
      }
    }
    return {
      question: 'Lista completa de toda la oferta educativa del Instituto Windsor: todos los programas disponibles con nombres reales',
      matchCount: 15,
    }
  }

  // Para programa específico
  if (programa) {
    // Normalizar abreviaciones comunes
    let programaNorm = programa
    if (/^adulto/i.test(programa)) programaNorm = 'Inglés para adultos'
    if (/^ni[ñn]/i.test(programa)) programaNorm = 'Inglés para niños'

    if (isBroadCategory(programaNorm)) {
      return {
        question: `Lista completa de ${programaNorm} en Instituto Windsor con nombres, costos y duración`,
        matchCount: 15,
      }
    }
    return {
      question: `${programaNorm} en Instituto Windsor: costos, horarios, duración, modalidad, certificaciones, campo laboral, proceso de inscripción`,
      matchCount: 10,
    }
  }

  return { question: userMessage, matchCount: 5 }
}

export async function POST(request: Request) {
  try {
    const { messages, state, userMessage } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Falta OPENAI_API_KEY' }, { status: 500 })
    }

    const fase = state?.fase || 'saludo'
    const nombre = state?.nombre || null
    const email = state?.email || null
    const programa = state?.programa || null

    // Mensajes hardcoded para fases específicas (sin GPT)
    if (fase === 'inscripcion') {
      return NextResponse.json({
        respuesta: INSCRIPCION_LICS_MSG,
        siguienteFase: 'cerrado',
        nextStep: NEXT_STEP_LABEL['cerrado'],
        nombre: null, email: null, programa: null, telefono: null, requestedHuman: false,
      })
    }
    if (fase === 'clase_prueba') {
      return NextResponse.json({
        respuesta: CLASE_PRUEBA_MSG,
        siguienteFase: 'cerrado',
        nextStep: NEXT_STEP_LABEL['cerrado'],
        nombre: null, email: null, programa: null, telefono: null, requestedHuman: false,
      })
    }

    // Consultar RAG en fases donde se necesita contenido
    let ragContext = ''
    const needsRAG = ['programa', 'info_enviada', 'dudas', 'correo', 'asesor'].includes(fase) || programa
    if (needsRAG) {
      const { question, matchCount } = buildRAGQuestion(fase, programa, userMessage)
      ragContext = await queryRAG(question, matchCount)
    }

    const leadContext = [
      `Nombre: ${nombre || 'no capturado aún'}`,
      `Email: ${email || 'no capturado aún'}`,
      `Programa de interés: ${programa || 'no identificado aún'}`,
      `Fase actual: ${fase}`,
    ].join('\n')

    const savedBotPrompt = await getBotPrompt()

    const baseInstructions = savedBotPrompt ||
      `Eres un asesor comercial de Instituto Windsor (escuela en México) que atiende prospectos por WhatsApp.
Tu objetivo es generar confianza y llevar al prospecto a inscribirse.
Hablas como una persona real: amable, directo y con conocimiento del programa.

FLUJO:
1. Captura el nombre
2. Muestra toda la oferta educativa de la BASE y pregunta cuál le interesa
3. Da información detallada del programa elegido (costos, horarios, modalidad, certificaciones)
4. Pide el correo para dar seguimiento
5. Invita al siguiente paso con link`

    const systemPrompt = `${baseInstructions}

DATOS ACTUALES DEL PROSPECTO:
${leadContext}

QUÉ HACER AHORA: ${FASE_INSTRUCCION[fase] ?? 'Responde de forma natural y útil.'}

${ragContext ? `BASE DE CONOCIMIENTO — usa esta información en tu respuesta:\n${ragContext}\n` : ''}
REGLAS TÉCNICAS:
- En fases de captura (saludo, correo): respuestas cortas.
- En fases de contenido (programa, info_enviada, dudas): usa TODO lo que hay en la BASE. No recortes.
- El correo se pide ANTES de dar información del programa (fase correo → fase info_enviada).
- No repitas datos que ya tienes del prospecto.
- Si el prospecto da nombre + programa + correo juntos, captúralos todos.
- Si pide hablar con una persona, pon requestedHuman: true y siguienteFase: asesor.
- "siguienteFase": saludo, programa, correo, info_enviada, dudas, accion, asesor, inscripcion, clase_prueba, cerrado, perdido, seguimiento.
- "programa": nombre que usó el prospecto, o null.
- "nombre": nombre dado en este mensaje, o null.
- "email": correo dado en este mensaje, o null.
- "telefono": teléfono dado en este mensaje (en fase asesor), o null.

Responde ÚNICAMENTE con JSON válido:
{
  "respuesta": "mensaje para el prospecto",
  "siguienteFase": "fase_siguiente",
  "nombre": null,
  "email": null,
  "programa": null,
  "telefono": null,
  "requestedHuman": false
}`

    const history = Array.isArray(messages) ? messages.slice(-10) : []
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ]

    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: chatMessages,
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!chatRes.ok) {
      const detail = await chatRes.text()
      return NextResponse.json({ error: 'Error OpenAI', detail }, { status: 500 })
    }

    const chatData = await chatRes.json()
    const raw = chatData.choices?.[0]?.message?.content || '{}'
    const result = JSON.parse(raw)

    const siguienteFase = result.siguienteFase || fase

    return NextResponse.json({
      respuesta: result.respuesta || '',
      siguienteFase,
      nextStep: NEXT_STEP_LABEL[siguienteFase] || '',
      nombre: result.nombre || null,
      email: result.email || null,
      programa: result.programa || null,
      telefono: result.telefono || null,
      requestedHuman: result.requestedHuman || false,
    })
  } catch (e) {
    console.error('[lab] error:', e)
    return NextResponse.json({ error: 'Error en simulación', detail: String(e) }, { status: 500 })
  }
}
