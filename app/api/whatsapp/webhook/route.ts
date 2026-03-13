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

export async function POST(request: Request) {
  try {
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

        let leadId = existingLead?.id as string | undefined

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
        const { data: existingConv } = await supabase
          .from('whatsapp_conversaciones')
          .select('id')
          .eq('whatsapp', whatsappValue)
          .order('ultimo_mensaje_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingConv?.id) {
          conversacionId = existingConv.id
        } else {
          const { data: nuevaConv } = await supabase
            .from('whatsapp_conversaciones')
            .insert([
              {
                whatsapp: whatsappValue,
                lead_id: leadId ?? null,
                estado: 'abierta',
              },
            ])
            .select('id')
            .single()
          conversacionId = nuevaConv?.id
        }

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
      } catch {
        // Si falla la creación del lead, no bloqueamos la respuesta de WhatsApp
      }
    }

    // Lógica de respuesta del bot
    const esSi =
      text === 'si' ||
      text === 'sí' ||
      text === 'si.' ||
      text === 'sí.' ||
      text === 'si!' ||
      text === 'sí!' ||
      text === 'si ' ||
      text === 'sí '

    if (esSi) {
      const answer =
        '¡Perfecto! Agenda tu clase de prueba gratuita aquí: https://salescrm-three.vercel.app/agendar/hola@windsor.edu.mx'

      // Intentar guardar respuesta del bot en la conversación (best-effort)
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
              contenido: answer,
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

      return buildTwiml(answer)
    }

    // Todos los demás mensajes pasan por RAG + GPT-4o
    let finalAnswer =
      '¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿En qué puedo ayudarte?'

    try {
      const url = new URL(request.url)
      const ragUrl = new URL('/api/rag/query', url.origin)
      const ragRes = await fetch(ragUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: originalText }),
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

