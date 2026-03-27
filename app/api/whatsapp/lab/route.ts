import { NextResponse } from 'next/server'

export const maxDuration = 60

const AGENDAR_LINK = 'https://crm.windsor.edu.mx/agendar/hola@windsor.edu.mx'

const FASE_INSTRUCCION: Record<string, string> = {
  saludo: 'Saluda brevemente y pide el nombre del prospecto.',
  programa: 'Ya tienes el nombre. Pregunta qué programa le interesa de forma natural.',
  correo: 'Pide el correo brevemente. Si el prospecto dice que no tiene o no quiere darlo, avanza de inmediato a info_enviada y comparte la información del programa sin insistir en el correo.',
  info_enviada: 'COMPARTE AHORA la información del programa usando la BASE DE CONOCIMIENTO: costos, horarios, duración y proceso de inscripción. No preguntes si quiere la info — dala directamente. Al final pregunta si tiene alguna duda.',
  dudas: 'Responde la duda usando la BASE DE CONOCIMIENTO con datos concretos (precios, horarios, etc.). Cuando no haya más dudas, invita al siguiente paso.',
  accion: `El prospecto ya tiene la info. Invítalo al siguiente paso concreto: para inglés ofrece clase de prueba gratuita, para otros programas ofrece asesoría o inscripción. Da este link: ${AGENDAR_LINK}`,
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

    // Build a descriptive program name for RAG (e.g. "adultos" → "Inglés para adultos")
    const programaForRag = programa
      ? (/adulto/i.test(programa) ? 'Inglés para adultos'
        : /ni[ñn]/i.test(programa) ? 'Inglés para niños'
        : programa)
      : null

    // Always query RAG when we know the program, or during info/dudas phases
    let ragContext = ''
    if (programaForRag || fase === 'info_enviada' || fase === 'dudas') {
      const question = programaForRag
        ? `${programaForRag} en Instituto Windsor: costos, horarios, duración, niveles, proceso de inscripción`
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
- En fases de captura de datos (saludo, programa, correo): máximo 2 oraciones.
- En fases de información (info_enviada, dudas): comparte todos los datos relevantes de la BASE. No resumas ni ocultes información útil.
- No vuelvas a pedir datos que ya tienes (nombre, email, programa).
- Si el prospecto da nombre + programa + correo en un mensaje, captúralos todos de una vez.
- Si pide hablar con una persona, pon requestedHuman: true.
- Si no hay información en la BASE sobre el programa, dilo con honestidad y ofrece el link de contacto.
- El campo "siguienteFase" debe ser uno de: saludo, programa, correo, info_enviada, dudas, accion, cerrado, perdido, seguimiento.
- El campo "programa" es el nombre del programa que mencionó el prospecto, o null.
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
