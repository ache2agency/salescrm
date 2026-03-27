import { createServiceRoleClient } from '@/utils/supabase/server'
import {
  getMetaConfig,
  getWhatsAppProvider,
  normalizePhoneNumber,
  sendMetaWhatsAppMessage,
  type WhatsAppProvider,
} from '@/lib/whatsapp/provider'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildTwiml(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  })
}

type IncomingWhatsAppMessage = {
  provider: WhatsAppProvider
  body: string
  from: string
  waNumber: string
  profileName: string
  rawPayload: Record<string, unknown>
}

async function logBotMessageAndUpdateFase(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  conversacionId: string,
  message: string,
  nextFase?: string
) {
  await supabase.from('whatsapp_mensajes').insert([
    { conversacion_id: conversacionId, rol: 'bot', contenido: message },
  ])
  const update: { ultimo_mensaje_at: string; fase?: string; estado?: string } = {
    ultimo_mensaje_at: new Date().toISOString(),
  }
  if (nextFase) update.fase = nextFase
  if (nextFase === 'cerrado' || nextFase === 'perdido') {
    update.estado = 'cerrada'
  } else if (nextFase) {
    update.estado = 'abierta'
  }
  await supabase
    .from('whatsapp_conversaciones')
    .update(update)
    .eq('id', conversacionId)
}

type ConversationRow = {
  id: string
  modo_humano?: boolean | null
  fase?: string | null
}

type FlowRule = {
  match?: string | null
  contains?: string | null
  answer?: string | null
  response?: string | null
  use_rag?: boolean | null
  type?: string | null
}

type FlowConfig = {
  rules?: FlowRule[] | null
}

type LeadSnapshot = {
  id?: string
  nombre?: string | null
  email?: string | null
  curso?: string | null
  stage?: string | null
}

const AGENDAR_LINK = 'https://crm.windsor.edu.mx/agendar/hola@windsor.edu.mx'
const BOT_SIGNATURE = 'Instituto Windsor'

function hasLeadName(
  nombre: string | null | undefined,
  whatsapp: string | null | undefined
) {
  const value = String(nombre || '').trim()
  if (!value) return false
  if (value === String(whatsapp || '').trim()) return false
  if (value.length < 2) return false
  if (/@/.test(value)) return false
  return true
}

function getNextDataPhase(lead: LeadSnapshot | null | undefined, whatsapp: string) {
  if (!hasLeadName(lead?.nombre, whatsapp)) return 'saludo'
  if (!hasLeadProgram(lead?.curso)) return 'programa'
  if (!hasLeadEmail(lead?.email)) return 'correo'
  return 'info_enviada'
}

function getStageForPhase(phase: string | null | undefined) {
  switch (phase) {
    case 'saludo':
      return 'nuevo'
    case 'programa':
    case 'correo':
      return 'contactado'
    case 'info_enviada':
    case 'dudas':
    case 'accion':
    case 'seguimiento':
      return 'interesado'
    case 'cerrado':
      return 'cerrado'
    case 'perdido':
      return 'perdido'
    default:
      return null
  }
}

function isMetaWebhookPayload(payload: unknown) {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'object' in payload &&
      (payload as { object?: string }).object === 'whatsapp_business_account'
  )
}

async function parseIncomingWhatsAppMessage(
  request: Request
): Promise<IncomingWhatsAppMessage | null> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => null)

    if (!isMetaWebhookPayload(payload)) return null

    const entry = Array.isArray((payload as { entry?: unknown[] }).entry)
      ? ((payload as { entry: unknown[] }).entry[0] as
          | { changes?: unknown[] }
          | undefined)
      : undefined
    const change = Array.isArray(entry?.changes)
      ? ((entry?.changes?.[0] as { value?: unknown }) || null)
      : null
    const value =
      change &&
      typeof change === 'object' &&
      'value' in change &&
      typeof change.value === 'object'
        ? (change.value as {
            contacts?: Array<{ profile?: { name?: string } }>
            messages?: Array<{
              from?: string
              text?: { body?: string }
              type?: string
            }>
            statuses?: unknown[]
          })
        : null

    const message = Array.isArray(value?.messages) ? value?.messages?.[0] : null
    if (!message || message.type !== 'text' || !message.text?.body || !message.from) {
      return null
    }

    const profileName = value?.contacts?.[0]?.profile?.name || ''
    const normalizedFrom = normalizePhoneNumber(message.from)

    return {
      provider: 'meta',
      body: message.text.body,
      from: normalizedFrom,
      waNumber: normalizedFrom,
      profileName,
      rawPayload:
        payload && typeof payload === 'object'
          ? (payload as Record<string, unknown>)
          : {},
    }
  }

  const formData = await request.formData()
  const body = (formData.get('Body') as string | null) ?? ''
  const from = (formData.get('From') as string | null) ?? ''
  const waId = (formData.get('WaId') as string | null) ?? ''
  const profileName = (formData.get('ProfileName') as string | null) ?? ''
  const normalizedFrom = normalizePhoneNumber(waId || from || '')

  return {
    provider: 'twilio',
    body,
    from: normalizePhoneNumber(from),
    waNumber: normalizedFrom,
    profileName,
    rawPayload: Object.fromEntries(formData.entries()),
  }
}

async function buildProviderResponse(
  provider: WhatsAppProvider,
  message: string,
  waNumber: string
) {
  if (provider === 'meta') {
    if (waNumber) {
      await sendMetaWhatsAppMessage({ to: waNumber, body: message })
    }
    return Response.json({ ok: true })
  }

  return buildTwiml(message)
}

// ─── GPT-4o como cerebro del bot ─────────────────────────────────────────────

type GptBotResult = {
  respuesta: string
  siguienteFase: string
  nombre: string | null
  email: string | null
  programa: string | null
  requestedHuman: boolean
  noInterest: boolean
}

async function askGPT(params: {
  fase: string
  leadData: { nombre?: string | null; email?: string | null; curso?: string | null }
  userMessage: string
  ragContext: string
}): Promise<GptBotResult> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) throw new Error('No OPENAI_API_KEY')

  const faseInstruccion: Record<string, string> = {
    saludo: 'Pide el nombre del prospecto si aún no lo tienes. Si ya lo tienes, avanza a programa.',
    programa: 'Ya tienes el nombre. Identifica qué programa le interesa y avanza a correo.',
    correo: 'Ya tienes nombre y programa. Pide el correo de forma natural para enviarle información. Si no lo da, avanza de igual forma a info_enviada.',
    info_enviada: 'Envía un resumen breve del programa usando la información de la base de conocimiento. Luego pregunta si tiene alguna duda.',
    dudas: 'Responde la duda del prospecto usando la información de la base de conocimiento. Cuando no haya más dudas invita al siguiente paso (avanza a accion).',
    accion: 'Ofrece el siguiente paso concreto según el programa: clase de prueba (inglés niños/adultos) o asesoría/examen/inscripción (licenciaturas/maestrías/diplomados). Si acepta, incluye el link y pon siguienteFase: cerrado.',
    seguimiento: 'Retoma la conversación de forma amable y recuérdale el siguiente paso.',
    cerrado: 'La conversación está cerrada. Si escribe, pregunta si puedes ayudarle en algo más.',
    perdido: 'El prospecto no estaba interesado. Si vuelve a escribir, responde con amabilidad.',
  }

  const leadContext = [
    `Nombre: ${params.leadData.nombre || 'no capturado aún'}`,
    `Email: ${params.leadData.email || 'no capturado aún'}`,
    `Programa de interés: ${params.leadData.curso || 'no identificado aún'}`,
  ].join('\n')

  const systemPrompt = `Eres un asistente comercial de Instituto Windsor (escuela en México) que atiende prospectos por WhatsApp. Tu tono es amable, breve y cercano — como una persona real, no un robot.

OFERTA EDUCATIVA:
- Inglés para niños (4-12 años) → clase de prueba gratuita → ${AGENDAR_LINK}
- Inglés para adultos (12 años en adelante) → clase de prueba gratuita → ${AGENDAR_LINK}
- Licenciaturas, Maestrías, Diplomados → asesoría, examen de ubicación o inscripción → ${AGENDAR_LINK}

DATOS ACTUALES DEL PROSPECTO:
${leadContext}

FASE ACTUAL: ${params.fase}
QUÉ HACER EN ESTA FASE: ${faseInstruccion[params.fase] ?? 'Responde de forma natural y útil.'}

${params.ragContext ? `INFORMACIÓN DE LA BASE DE CONOCIMIENTO (úsala si es relevante):\n${params.ragContext}\n` : ''}
REGLAS IMPORTANTES:
- Máximo 3 oraciones por mensaje. Nada de listas largas ni párrafos.
- Si el prospecto da nombre + programa + correo en un mismo mensaje, captúralos todos de una vez.
- No vuelvas a pedir datos que ya tienes.
- Si pide hablar con una persona o asesor, pon requestedHuman: true.
- Si claramente no le interesa (dice "no gracias", "ya no", "baja"), pon noInterest: true.
- El campo "programa" solo acepta estos valores exactos: "Inglés niños", "Inglés adultos", "Licenciaturas", "Maestrías", "Diplomados", o null.
- El campo "siguienteFase" solo acepta: saludo, programa, correo, info_enviada, dudas, accion, cerrado, perdido, seguimiento.

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "respuesta": "mensaje que se enviará al prospecto por WhatsApp",
  "siguienteFase": "fase_siguiente",
  "nombre": "nombre detectado en el mensaje o null",
  "email": "email detectado en el mensaje o null",
  "programa": "programa detectado o null",
  "requestedHuman": false,
  "noInterest": false
}`

  const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
      temperature: 0.6,
      max_tokens: 350,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(13000),
  })

  if (!chatRes.ok) throw new Error(`OpenAI error ${chatRes.status}`)

  const data = await chatRes.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)

  return {
    respuesta: typeof parsed.respuesta === 'string' && parsed.respuesta ? parsed.respuesta : 'Disculpa, ¿me repites?',
    siguienteFase: typeof parsed.siguienteFase === 'string' ? parsed.siguienteFase : params.fase,
    nombre: typeof parsed.nombre === 'string' ? parsed.nombre : null,
    email: typeof parsed.email === 'string' && parsed.email.includes('@') ? parsed.email : null,
    programa: typeof parsed.programa === 'string' ? parsed.programa : null,
    requestedHuman: Boolean(parsed.requestedHuman),
    noInterest: Boolean(parsed.noInterest),
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const { verifyToken } = getMetaConfig()

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    return new Response(challenge || '', { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: Request) {
  try {
    let leadSummary = ''
    let leadId: string | undefined
    let humanMode = false
    let currentFase = 'saludo'
    let conversacionIdOuter: string | undefined

    const incoming = await parseIncomingWhatsAppMessage(request)
    if (!incoming) {
      return Response.json({ ok: true, ignored: true })
    }

    const provider = incoming.provider || getWhatsAppProvider()
    const originalText = incoming.body.trim()
    const text = originalText.toLowerCase()
    const waNumber = incoming.waNumber || ''
    const profileName = incoming.profileName || ''

    let leadSnapshot: LeadSnapshot | null = null

    // Crear lead y conversación automáticamente en Supabase con el número de WhatsApp
    if (waNumber) {
      try {
        const supabase = createServiceRoleClient()

        // Normalizamos el número como lo recibimos, sin transformarlo más
        const whatsappValue = waNumber

        // Verificar si ya existe un lead con este WhatsApp
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, nombre, email, curso, stage')
          .eq('whatsapp', whatsappValue)
          .maybeSingle()

        leadId = existingLead?.id as string | undefined
        leadSnapshot = (existingLead as LeadSnapshot | null) || null

        if (!leadId) {
          const today = new Date().toISOString().slice(0, 10)
          const nombre = profileName || whatsappValue

          const { data: insertedLead } = await supabase
            .from('leads')
            .insert([
              {
                nombre,
                email: '',
                whatsapp: whatsappValue,
                curso: 'WhatsApp - Instituto Windsor',
                valor: 0,
                notas: 'Lead creado automáticamente desde WhatsApp.',
                stage: 'nuevo',
                fecha: today,
              },
            ])
            .select('id, nombre, email, curso, stage')
            .single()

          leadId = insertedLead?.id
          leadSnapshot = (insertedLead as LeadSnapshot | null) || null
        }

        const desiredPhase = getNextDataPhase(leadSnapshot, whatsappValue)

        // Crear o reutilizar conversación de WhatsApp
        let conversacionId: string | undefined
        let conversacionRow: ConversationRow | null = null
        const { data: existingConv } = await supabase
          .from('whatsapp_conversaciones')
          .select('id, modo_humano, fase')
          .eq('whatsapp', whatsappValue)
          .order('ultimo_mensaje_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingConv?.id) {
          conversacionId = existingConv.id
          conversacionRow = existingConv
          const nextConversationUpdate: {
            lead_id: string | null
            estado: string
            fase?: string
          } = {
            lead_id: leadId ?? null,
            estado:
              existingConv.fase === 'cerrado' || existingConv.fase === 'perdido'
                ? 'cerrada'
                : 'abierta',
          }
          if (
            existingConv.fase === 'saludo' ||
            existingConv.fase === 'programa' ||
            existingConv.fase === 'correo'
          ) {
            nextConversationUpdate.fase = desiredPhase
          }
          await supabase
            .from('whatsapp_conversaciones')
            .update(nextConversationUpdate)
            .eq('id', existingConv.id)
        } else {
          const { data: nuevaConv } = await supabase
            .from('whatsapp_conversaciones')
            .insert([
              {
                whatsapp: whatsappValue,
                lead_id: leadId ?? null,
                estado: 'abierta',
                fase: desiredPhase,
              },
            ])
            .select('id, modo_humano, fase')
            .single()
          conversacionId = nuevaConv?.id
          conversacionRow = nuevaConv || null
        }

        humanMode = Boolean(conversacionRow?.modo_humano)
        conversacionIdOuter = conversacionId
        currentFase = (conversacionRow?.fase as string) || 'saludo'

        // Registrar mensaje del usuario
        if (conversacionId) {
          await supabase.from('whatsapp_mensajes').insert([
            {
              conversacion_id: conversacionId,
              rol: 'usuario',
              contenido: originalText || '',
              raw_payload: incoming.rawPayload,
            },
          ])

          // actualizar timestamp de último mensaje
          await supabase
            .from('whatsapp_conversaciones')
            .update({ ultimo_mensaje_at: new Date().toISOString() })
            .eq('id', conversacionId)
        }

        // Cargar resumen del lead para "memoria" del bot
        if (leadId) {
          const { data: lead } = await supabase
            .from('leads')
            .select('nombre, email, whatsapp, curso, stage, notas')
            .eq('id', leadId)
            .maybeSingle()

          if (lead) {
            const partes: string[] = []
            if (lead.nombre) partes.push(`Nombre: ${lead.nombre}`)
            if (lead.email) partes.push(`Email: ${lead.email}`)
            if (lead.whatsapp) partes.push(`WhatsApp: ${lead.whatsapp}`)
            if (lead.curso) partes.push(`Programa: ${lead.curso}`)
            if (lead.stage) partes.push(`Stage CRM: ${lead.stage}`)
            if (lead.notas) partes.push(`Notas: ${lead.notas}`)
            leadSummary = partes.join(' | ')
          }
        }
      } catch {
        // Si falla la creación del lead, no bloqueamos la respuesta de WhatsApp
      }
    }

    // Si la conversación está en modo humano (tomada por un vendedor),
    // solo registramos el mensaje y NO respondemos automáticamente.
    if (humanMode) {
      return provider === 'meta'
        ? Response.json({ ok: true, humanMode: true })
        : new Response('', { status: 200 })
    }

    // Intentar aplicar flow de reglas (keyword-based) antes de la lógica fija/RAG
    let flowAnswer: string | null = null
    let flowUsesRag = false

    try {
      const supabaseFlow = createServiceRoleClient()
      const { data: flow } = await supabaseFlow
        .from('whatsapp_flows')
        .select('config')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const cfg = (flow?.config as FlowConfig | null) ?? null
      const rules = Array.isArray(cfg?.rules) ? cfg.rules : []

      for (const rule of rules) {
        const matchText = ((rule.match || rule.contains || '') as string).toLowerCase().trim()
        if (!matchText) continue

        if (text.includes(matchText)) {
          if (rule.use_rag || rule.type === 'rag') {
            flowUsesRag = true
          } else {
            flowAnswer = (rule.answer as string) || (rule.response as string) || null
          }
          break
        }
      }
    } catch {
      // Si falla el flow, seguimos con la lógica normal
    }

    // Fallback: si tenemos número pero no conversación (ej. error en el try anterior), buscar conv existente
    if (waNumber && !conversacionIdOuter) {
      try {
        const supabaseFallback = createServiceRoleClient()
        const whatsappValue = waNumber
        const { data: convExistente } = await supabaseFallback
          .from('whatsapp_conversaciones')
          .select('id, modo_humano, fase, lead_id')
          .eq('whatsapp', whatsappValue)
          .order('ultimo_mensaje_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (convExistente?.id) {
          conversacionIdOuter = convExistente.id
          currentFase = (convExistente.fase as string) || 'saludo'
          humanMode = Boolean(convExistente.modo_humano)
          if (convExistente.lead_id && !leadId) leadId = convExistente.lead_id as string
        }
      } catch {
        // ignorar
      }
    }

    // Compatibilidad: fases antiguas se tratan como programa
    const phase = currentFase === 'datos' || currentFase === 'info_programa' ? 'programa' : currentFase

    // ── Flow de reglas por keyword (respuesta fija, sin GPT) ─────────────────
    if (flowAnswer && !flowUsesRag && conversacionIdOuter) {
      const supabaseFlow = createServiceRoleClient()
      await logBotMessageAndUpdateFase(supabaseFlow, conversacionIdOuter, flowAnswer)
      return buildProviderResponse(provider, flowAnswer, waNumber)
    }

    // ── Orquestación principal con GPT-4o ────────────────────────────────────
    if (conversacionIdOuter && waNumber) {
      const supabase = createServiceRoleClient()

      // Contexto RAG: siempre lo buscamos para que GPT pueda usarlo en cualquier fase
      let ragContext = ''
      try {
        const ragUrl = new URL('/api/rag/query', new URL(request.url).origin)
        const ragRes = await fetch(ragUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: leadSummary
              ? `${leadSummary}\n\n${originalText}`
              : originalText,
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (ragRes.ok) {
          const ragData = await ragRes.json()
          if (typeof ragData?.answer === 'string') ragContext = ragData.answer
        }
      } catch { /* continuar sin RAG */ }

      // Llamada central a GPT-4o
      const gpt = await askGPT({
        fase: phase,
        leadData: {
          nombre: leadSnapshot?.nombre,
          email: leadSnapshot?.email,
          curso: leadSnapshot?.curso,
        },
        userMessage: originalText,
        ragContext,
      })

      // Persistir datos capturados por GPT
      if (gpt.nombre && leadId && !hasLeadName(leadSnapshot?.nombre, waNumber)) {
        await supabase.from('leads').update({ nombre: gpt.nombre, stage: 'contactado' }).eq('id', leadId)
      }
      if (gpt.email && leadId) {
        await supabase.from('leads').update({ email: gpt.email }).eq('id', leadId)
      }
      if (gpt.programa && leadId) {
        await supabase.from('leads').update({ curso: gpt.programa }).eq('id', leadId)
      }

      // Actualizar stage del lead según la fase destino
      const newStage = getStageForPhase(gpt.siguienteFase)
      if (newStage && leadId) {
        await supabase.from('leads').update({ stage: newStage }).eq('id', leadId)
      }

      await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, gpt.respuesta, gpt.siguienteFase)
      return buildProviderResponse(provider, gpt.respuesta, waNumber)
    }

    // Sin conversación aún: saludo inicial
    if (waNumber && !conversacionIdOuter) {
      const answer = `Hola, gracias por comunicarte con ${BOT_SIGNATURE}. ¿Me compartes tu nombre, por favor?`
      return buildProviderResponse(provider, answer, waNumber)
    }

    return buildProviderResponse(provider, `Hola. Soy el asistente de ${BOT_SIGNATURE}. ¿En qué puedo ayudarte?`, waNumber)
  } catch (e) {
    // Log para depurar en Vercel (Functions → Logs)
    console.error('[webhook whatsapp]', e)
    // Devolver un mensaje en lugar de 200 vacío, así el usuario recibe algo y Twilio no reintenta
    const fallback = 'Disculpa, tuvimos un detalle momentáneo. Escríbeme de nuevo y con gusto te respondo.'
    return buildProviderResponse(getWhatsAppProvider(), fallback, '')
  }
}
