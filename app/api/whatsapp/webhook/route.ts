import { createServiceRoleClient } from '@/utils/supabase/server'

function buildTwiml(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  })
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
  const update: { ultimo_mensaje_at: string; fase?: string } = {
    ultimo_mensaje_at: new Date().toISOString(),
  }
  if (nextFase) update.fase = nextFase
  await supabase
    .from('whatsapp_conversaciones')
    .update(update)
    .eq('id', conversacionId)
}

const AGENDAR_LINK = 'https://salescrm-three.vercel.app/agendar/hola@windsor.edu.mx'

export async function POST(request: Request) {
  try {
    let leadSummary = ''
    let leadId: string | undefined
    let humanMode = false
    let currentFase = 'saludo'
    let conversacionIdOuter: string | undefined

    const formData = await request.formData()
    const body = (formData.get('Body') as string | null) ?? ''
    const from = (formData.get('From') as string | null) ?? ''
    const waId = (formData.get('WaId') as string | null) ?? ''
    const profileName = (formData.get('ProfileName') as string | null) ?? ''

    const originalText = body.trim()
    const text = originalText.toLowerCase()
    const waNumber = waId || from || ''

    // Crear lead y conversación automáticamente en Supabase con el número de WhatsApp
    if (waNumber) {
      try {
        const supabase = createServiceRoleClient()

        // Normalizamos el número como lo recibimos, sin transformarlo más
        const whatsappValue = waNumber

        // Verificar si ya existe un lead con este WhatsApp
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('whatsapp', whatsappValue)
          .maybeSingle()

        leadId = existingLead?.id as string | undefined

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
            .select('id')
            .single()

          leadId = insertedLead?.id
        }

        // Crear o reutilizar conversación de WhatsApp
        let conversacionId: string | undefined
        let conversacionRow: any | null = null
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
        } else {
          const { data: nuevaConv } = await supabase
            .from('whatsapp_conversaciones')
            .insert([
              {
                whatsapp: whatsappValue,
                lead_id: leadId ?? null,
                estado: 'abierta',
                fase: 'saludo',
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
              raw_payload: Object.fromEntries(formData.entries()),
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
      return new Response('', { status: 200 })
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

      const cfg: any = flow?.config
      const rules: any[] = Array.isArray(cfg?.rules) ? cfg.rules : []

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

    const esSi =
      text === 'si' ||
      text === 'sí' ||
      text === 'si.' ||
      text === 'sí.' ||
      text === 'si!' ||
      text === 'sí!' ||
      text === 'si ' ||
      text === 'sí '

    const esHola =
      /^(hola|buenas|hey|buen dia|buenos dias|hello|hi)(\s|\.|!|$)/i.test(text) ||
      text === 'hola' ||
      text === 'buenas'

    // Orquestación por fase (solo si tenemos conversación)
    if (conversacionIdOuter && waNumber) {
      const supabase = createServiceRoleClient()

      // --- Fase SALUDO: solo saludar y pedir SÍ; nunca pasar a flow/RAG ---
      if (currentFase === 'saludo') {
        if (esSi) {
          const answer =
            '¡Perfecto! Para darte mejor información, envíame tu nombre completo y tu correo (ej: Juan Pérez, juan@mail.com).'
          await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer, 'datos')
          return buildTwiml(answer)
        }
        // Cualquier otro mensaje en saludo: repetir saludo y pedir SÍ (no ofrecer link ni clase prueba)
        const answer =
          '¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿Te interesa conocer nuestros programas educativos? Responde SÍ para más información.'
        await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer)
        return buildTwiml(answer)
      }

      // --- Fase DATOS: intentar extraer nombre y email ---
      if (currentFase === 'datos') {
        const hasComma = originalText.includes(',')
        const parts = hasComma
          ? originalText.split(',').map((p) => p.trim())
          : originalText.split(/\s+-\s+|\s+–\s+/).map((p) => p.trim())
        const posibleNombre = parts[0] || ''
        const posibleEmail = (parts[1] || '').trim()
        const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(posibleEmail)
        const hasName = posibleNombre.length >= 2 && !posibleNombre.includes('@')

        if (hasName && leadId) {
          await supabase
            .from('leads')
            .update({
              nombre: posibleNombre,
              ...(looksLikeEmail && { email: posibleEmail }),
              stage: 'contactado',
            })
            .eq('id', leadId)
          const answer =
            'Gracias. Tenemos: *Idiomas para niños*, *Idiomas para adultos* y otros programas. ¿Cuál te interesa? Responde con el nombre del programa.'
          await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer, 'info_programa')
          return buildTwiml(answer)
        }
        const answer =
          'Por favor envía tu nombre completo y tu correo (ej: Juan Pérez, juan@mail.com).'
        await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer)
        return buildTwiml(answer)
      }

      // --- Fase INFO_PROGRAMA: detectar programa y ofrecer siguiente paso ---
      if (currentFase === 'info_programa') {
        const programLower = text.replace(/[^\w\sáéíóú]/gi, '')
        const isIdiomas =
          programLower.includes('idioma') ||
          programLower.includes('ingles') ||
          programLower.includes('niños') ||
          programLower.includes('ninos') ||
          programLower.includes('adultos')
        const isOther = programLower.length > 3 && (programLower.includes('otro') || programLower.includes('mas'))

        if (isIdiomas || isOther) {
          const programa = isIdiomas ? 'idiomas' : 'nuestros programas'
          const offerText = isIdiomas
            ? 'En Idiomas tenemos clases para niños y adultos. Puedes agendar una *clase de prueba gratuita*.'
            : 'Te podemos dar más información por llamada o correo.'
          const answer = `${offerText} ¿Tienes alguna duda? Si no, podemos agendar una clase de prueba o una llamada. ¿Te gustaría?`
          if (leadId) {
            await supabase.from('leads').update({ curso: programa }).eq('id', leadId)
          }
          await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer, 'seguimiento')
          return buildTwiml(answer)
        }
        const answer =
          '¿Cuál te interesa? Tenemos: *Idiomas para niños*, *Idiomas para adultos* y otros programas. Responde con el nombre.'
        await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer)
        return buildTwiml(answer)
      }

      // --- Fase SEGUIMIENTO: agendar o resolver dudas ---
      if (currentFase === 'seguimiento') {
        const quiereAgendar =
          /agendar|agendamos|cita|clase prueba|llamada|inscribir|inscripcion|sí|si\b|dale|ok|vale|yes/i.test(text)
        const noInteresado = /no quiero|no me interesa|no gracias|cancelar|baja/i.test(text)

        if (noInteresado) {
          const answer = 'Entendido. Si más adelante te interesa, aquí seguimos. ¡Éxitos!'
          if (leadId) {
            await supabase.from('leads').update({ stage: 'perdido' }).eq('id', leadId)
          }
          await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer, 'perdido')
          return buildTwiml(answer)
        }
        if (quiereAgendar) {
          const answer = `¡Perfecto! Agenda tu clase de prueba gratuita o llama aquí: ${AGENDAR_LINK}`
          if (leadId) {
            await supabase.from('leads').update({ stage: 'en_proceso' }).eq('id', leadId)
          }
          await logBotMessageAndUpdateFase(supabase, conversacionIdOuter, answer, 'cerrado')
          return buildTwiml(answer)
        }
        // Si no es agendar ni no, sigue a RAG para dudas
      }
    }

    // SÍ pero no teníamos conversación: pedir datos (no mandar link aún)
    if (esSi && !conversacionIdOuter) {
      const answer =
        '¡Perfecto! Para darte mejor información, envíame tu nombre completo y tu correo (ej: Juan Pérez, juan@mail.com).'
      try {
        const supabase = createServiceRoleClient()
        const { data: conv } = await supabase
          .from('whatsapp_conversaciones')
          .select('id')
          .eq('whatsapp', waNumber)
          .order('ultimo_mensaje_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (conv?.id) {
          await logBotMessageAndUpdateFase(supabase, conv.id, answer, 'datos')
        }
      } catch {
        // no bloquear
      }
      return buildTwiml(answer)
    }

    // Sin conversación: no usar flow ni RAG; siempre saludo para iniciar el flujo
    if (waNumber && !conversacionIdOuter) {
      const answer =
        '¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿Te interesa conocer nuestros programas educativos? Responde SÍ para más información.'
      return buildTwiml(answer)
    }

    // Si hay una respuesta fija desde el flow, la usamos y no llamamos a RAG (solo en seguimiento/cerrado/perdido/otro)
    if (flowAnswer && !flowUsesRag) {
      try {
        const supabase = createServiceRoleClient()
        const whatsappValue = waNumber
        const { data: conv } = await supabase
          .from('whatsapp_conversaciones')
          .select('id')
          .eq('whatsapp', whatsappValue)
          .order('ultimo_mensaje_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (conv?.id) {
          await supabase.from('whatsapp_mensajes').insert([
            {
              conversacion_id: conv.id,
              rol: 'bot',
              contenido: flowAnswer,
            },
          ])
          await supabase
            .from('whatsapp_conversaciones')
            .update({ ultimo_mensaje_at: new Date().toISOString() })
            .eq('id', conv.id)
        }
      } catch {
        // no bloquear respuesta a WhatsApp si falla logging
      }

      return buildTwiml(flowAnswer)
    }

    // Todos los demás mensajes pasan por RAG + GPT-4o
    let finalAnswer =
      '¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿En qué puedo ayudarte?'

    try {
      const url = new URL(request.url)
      const ragUrl = new URL('/api/rag/query', url.origin)
      const questionForRag =
        leadSummary && leadSummary.length > 0
          ? `Contexto del lead (desde CRM): ${leadSummary}\n\nMensaje actual por WhatsApp: ${originalText}`
          : originalText
      const ragRes = await fetch(ragUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionForRag }),
      })

      if (ragRes.ok) {
        const data = await ragRes.json()
        finalAnswer =
          (data && typeof data.answer === 'string' && data.answer) ||
          finalAnswer
      }
    } catch {
      // Si falla el RAG, seguimos con finalAnswer genérico
    }

    // Guardar respuesta del bot en la conversación (best-effort)
    try {
      const supabase = createServiceRoleClient()
      const whatsappValue = waNumber
      const { data: conv } = await supabase
        .from('whatsapp_conversaciones')
        .select('id')
        .eq('whatsapp', whatsappValue)
        .order('ultimo_mensaje_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (conv?.id) {
        await supabase.from('whatsapp_mensajes').insert([
          {
            conversacion_id: conv.id,
            rol: 'bot',
            contenido: finalAnswer,
          },
        ])
        await supabase
          .from('whatsapp_conversaciones')
          .update({ ultimo_mensaje_at: new Date().toISOString() })
          .eq('id', conv.id)
      }
    } catch {
      // no bloqueamos la respuesta si falla logging
    }

    return buildTwiml(finalAnswer)
  } catch (e) {
    // En caso de error, respondemos 200 vacío para que Twilio no reintente indefinidamente
    return new Response('', { status: 200 })
  }
}

