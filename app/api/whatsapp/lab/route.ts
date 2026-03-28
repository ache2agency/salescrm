import { NextResponse } from 'next/server'

export const maxDuration = 60

const AGENDAR_LINK = 'https://crm.windsor.edu.mx/agendar/hola@windsor.edu.mx'

// Flujo correcto:
// saludo → nombre → programa (muestra catálogo) → info_enviada (info detallada) → correo → accion (CTA)

const FASE_INSTRUCCION: Record<string, string> = {
  saludo: 'Saluda brevemente y pide el nombre del prospecto.',

  programa: `Ya tienes el nombre. Ahora muestra TODA la oferta educativa disponible consultando la BASE DE CONOCIMIENTO.
Si el prospecto ya mencionó una categoría (ej: licenciaturas), lista TODOS los programas de esa categoría con sus nombres reales.
Si no mencionó nada específico, lista toda la oferta educativa con los nombres reales de cada programa.
No hagas preguntas todavía — primero da la lista completa, luego pregunta cuál le interesa.`,

  info_enviada: `El prospecto eligió un programa. Da TODA la información relevante de ese programa usando la BASE DE CONOCIMIENTO:
duración, costos (inscripción y mensualidad), horarios disponibles, modalidad, certificaciones, campo laboral o siguiente paso.
No preguntes si quiere info — dala completa. Al final pregunta si tiene alguna duda o si quiere avanzar.`,

  dudas: 'Responde la duda con datos concretos de la BASE (costos, horarios, requisitos, etc.). Cuando no haya más dudas, pide el correo para dar seguimiento.',

  correo: `Ya diste la información completa del programa. Pide el correo brevemente para dar seguimiento personalizado.
Si no lo tiene o no quiere darlo, avanza de todas formas a accion.`,

  accion: `Invita al prospecto al siguiente paso concreto.
Para inglés (niños/adultos): agenda una clase de prueba gratuita → ${AGENDAR_LINK}
Para otros programas: agenda una asesoría o inscripción → ${AGENDAR_LINK}
Sé directo y entusiasta.`,

  cerrado: 'La conversación está cerrada. Si vuelve a escribir, pregunta si puedes ayudarle en algo más.',
  perdido: 'El prospecto no estaba interesado. Si vuelve a escribir, responde con amabilidad.',
  seguimiento: 'Retoma la conversación de forma amable y recuérdale el siguiente paso.',
}

const NEXT_STEP_LABEL: Record<string, string> = {
  saludo: 'Capturar nombre',
  programa: 'Mostrar catálogo y elegir programa',
  info_enviada: 'Resolver dudas',
  dudas: 'Capturar correo',
  correo: 'Capturar correo',
  accion: 'Cerrar proceso',
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

    // Consultar RAG en fases donde se necesita contenido
    let ragContext = ''
    const needsRAG = ['programa', 'info_enviada', 'dudas', 'correo'].includes(fase) || programa
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

    const systemPrompt = `Eres un asesor comercial de Instituto Windsor (escuela en México) que atiende prospectos por WhatsApp. Tu objetivo es generar confianza y llevar al prospecto a inscribirse. Hablas como una persona real: amable, directo y con conocimiento del programa.

FLUJO DE CONVERSACIÓN:
1. Capturas el nombre
2. Muestras la oferta educativa completa de la BASE y preguntas cuál le interesa
3. Das información detallada del programa elegido (costos, horarios, todo)
4. Pides el correo para dar seguimiento
5. Invitas al siguiente paso con link

DATOS ACTUALES DEL PROSPECTO:
${leadContext}

QUÉ HACER AHORA: ${FASE_INSTRUCCION[fase] ?? 'Responde de forma natural y útil.'}

${ragContext ? `BASE DE CONOCIMIENTO — usa esta información en tu respuesta:\n${ragContext}\n` : ''}
REGLAS:
- En fases de captura (saludo, correo): respuestas cortas.
- En fases de contenido (programa, info_enviada, dudas): usa TODO lo que hay en la BASE. No recortes información importante.
- NUNCA pidas correo antes de haber dado información del programa.
- No repitas datos que ya tienes del prospecto.
- Si el prospecto da nombre + programa + correo juntos, captúralos todos.
- Si pide hablar con una persona, pon requestedHuman: true.
- "siguienteFase" debe ser: saludo, programa, info_enviada, dudas, correo, accion, cerrado, perdido o seguimiento.
- "programa": nombre exacto que usó el prospecto, o null si no cambió.
- "nombre": nombre dado en este mensaje, o null.
- "email": correo dado en este mensaje, o null.

Responde ÚNICAMENTE con JSON válido:
{
  "respuesta": "mensaje para el prospecto",
  "siguienteFase": "fase_siguiente",
  "nombre": null,
  "email": null,
  "programa": null,
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
      requestedHuman: result.requestedHuman || false,
    })
  } catch (e) {
    console.error('[lab] error:', e)
    return NextResponse.json({ error: 'Error en simulación', detail: String(e) }, { status: 500 })
  }
}
