import { NextResponse } from 'next/server'

export const maxDuration = 60

const AGENDAR_LINK = 'https://crm.windsor.edu.mx/agendar/hola@windsor.edu.mx'

const FASE_INSTRUCCION: Record<string, string> = {
  saludo: 'Saluda brevemente y pide el nombre del prospecto.',
  programa: 'Ya tienes el nombre. Pregunta qué programa le interesa de forma natural.',
  correo: 'Ya tienes nombre y programa. Pide el correo para enviarle información. Si ya lo dio, avanza a info_enviada.',
  info_enviada: 'Comparte un resumen breve y claro del programa usando la BASE DE CONOCIMIENTO. Termina preguntando si tiene alguna duda.',
  dudas: 'Responde la duda usando la BASE DE CONOCIMIENTO. Cuando no haya más dudas, invita al siguiente paso concreto.',
  accion: `Ofrece el siguiente paso según el programa. Para inglés (niños/adultos): clase de prueba gratuita. Para licenciaturas/maestrías/diplomados y otros programas: asesoría o inscripción. Incluye siempre este link: ${AGENDAR_LINK}`,
  cerrado: 'La conversación está cerrada. Si vuelve a escribir, pregunta si puedes ayudarle en algo más.',
  perdido: 'El prospecto no estaba interesado. Si vuelve a escribir, responde con amabilidad.',
  seguimiento: 'Retoma la conversación de forma amable y recuérdale el siguiente paso.',
}

const NEXT_STEP_LABEL: Record<string, string> = {
  saludo: 'Capturar nombre',
  programa: 'Identificar programa de interés',
  correo: 'Capturar correo',
  info_enviada: 'Resolver dudas',
  dudas: 'Llevar al siguiente paso',
  accion: 'Cerrar proceso',
  cerrado: 'Conversación cerrada',
  perdido: 'Prospecto perdido',
  seguimiento: 'Retomar interés',
}

async function queryRAG(question: string): Promise<string> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.windsor.edu.mx'}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data?.answer || ''
  } catch {
    return ''
  }
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

    // Query RAG if we have a program or user is asking something specific
    let ragContext = ''
    if (programa || fase === 'info_enviada' || fase === 'dudas') {
      const question = programa
        ? `Información sobre ${programa} en Instituto Windsor: costos, horarios, duración, proceso de inscripción`
        : userMessage
      ragContext = await queryRAG(question)
    }

    const leadContext = [
      `Nombre: ${nombre || 'no capturado aún'}`,
      `Email: ${email || 'no capturado aún'}`,
      `Programa de interés: ${programa || 'no identificado aún'}`,
      `Fase actual: ${fase}`,
    ].join('\n')

    const systemPrompt = `Eres un asistente comercial de Instituto Windsor (escuela en México) que atiende prospectos por WhatsApp. Tu tono es amable, breve y cercano — como una persona real, no un robot.

OFERTA EDUCATIVA:
- Inglés para niños (4–12 años) → clase de prueba gratuita
- Inglés para adultos (12 años en adelante) → clase de prueba gratuita
- Bachillerato, Licenciaturas, Maestrías, Diplomados y más → asesoría o inscripción
- Para cualquier programa específico que mencione el prospecto, usa la BASE DE CONOCIMIENTO.

DATOS ACTUALES DEL PROSPECTO:
${leadContext}

QUÉ HACER AHORA: ${FASE_INSTRUCCION[fase] ?? 'Responde de forma natural y útil.'}

${ragContext ? `BASE DE CONOCIMIENTO (úsala si es relevante):\n${ragContext}\n` : ''}
REGLAS:
- Máximo 3 oraciones por mensaje. Sin listas largas.
- Si ya tienes un dato (nombre, email, programa), no lo vuelvas a pedir.
- Si el prospecto da nombre + programa + correo en un mensaje, captúralos todos.
- Si pide hablar con una persona, pon requestedHuman: true.
- El campo "siguienteFase" debe ser uno de: saludo, programa, correo, info_enviada, dudas, accion, cerrado, perdido, seguimiento.
- El campo "programa" es el nombre exacto que usó el prospecto, o null.
- El campo "nombre" es el nombre que dio el prospecto en este mensaje, o null.
- El campo "email" es el correo que dio en este mensaje, o null.

Responde ÚNICAMENTE con JSON válido:
{
  "respuesta": "mensaje para el prospecto",
  "siguienteFase": "fase_siguiente",
  "nombre": null,
  "email": null,
  "programa": null,
  "requestedHuman": false
}`

    const history = Array.isArray(messages) ? messages.slice(-8) : []
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
        temperature: 0.6,
        max_tokens: 400,
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
