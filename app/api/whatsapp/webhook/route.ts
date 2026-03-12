import { NextResponse } from 'next/server'
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

    const text = body.trim().toLowerCase()
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

    // Cualquier mensaje inicial (incluye "hola") recibe este mensaje
    return buildTwiml(
      '¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿Te interesa conocer nuestros programas educativos? Responde SÍ para más información.'
    )
  } catch (e) {
    // En caso de error, respondemos 200 vacío para que Twilio no reintente indefinidamente
    return new Response('', { status: 200 })
  }
}

