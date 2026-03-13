import { createClient } from '@/utils/supabase/server'

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

    // Crear lead automáticamente en Supabase con el número de WhatsApp
    if (waNumber) {
      try {
        const supabase = await createClient()

        // Normalizamos el número como lo recibimos, sin transformarlo más
        const whatsappValue = waNumber

        // Verificar si ya existe un lead con este WhatsApp
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('whatsapp', whatsappValue)
          .maybeSingle()

        if (!existing) {
          const today = new Date().toISOString().slice(0, 10)
          const nombre = profileName || whatsappValue

          await supabase.from('leads').insert([
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
      return buildTwiml(
        '¡Perfecto! Agenda tu clase de prueba gratuita aquí: https://salescrm-three.vercel.app/agendar/hola@windsor.edu.mx'
      )
    }

    // Todos los mensajes pasan por RAG + GPT-4o
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
        const answer: string =
          (data && typeof data.answer === 'string' && data.answer) ||
          '¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿En qué puedo ayudarte?'
        return buildTwiml(answer)
      }
    } catch {
      // Si falla el RAG, respondemos con mensaje genérico
    }

    return buildTwiml(
      '¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿En qué puedo ayudarte?'
    )
  } catch (e) {
    // En caso de error, respondemos 200 vacío para que Twilio no reintente indefinidamente
    return new Response('', { status: 200 })
  }
}

