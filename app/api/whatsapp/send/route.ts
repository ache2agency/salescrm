import { NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: Request) {
  try {
    const { to, body } = (await request.json()) as {
      to?: string
      body?: string
    }

    if (!to || !body) {
      return NextResponse.json(
        { error: 'Parámetros to y body son obligatorios' },
        { status: 400 }
      )
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: 'Faltan variables de entorno de Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)' },
        { status: 500 }
      )
    }

    const client = twilio(accountSid, authToken)

    const from =
      fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`

    // Normalizar número: quitar prefijo whatsapp:, asegurar E.164 (+ al inicio)
    let num = to.replace(/^whatsapp:/i, '').trim()
    if (num && !num.startsWith('+')) num = `+${num}`
    const toFormatted = `whatsapp:${num}`

    const message = await client.messages.create({
      from,
      to: toFormatted,
      body,
    })

    return NextResponse.json({
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const detail = e instanceof Error ? e.message : String(e)

    // Guía clara cuando Twilio rechaza el número "From" (configuración WhatsApp)
    if (
      /from address|could not find.*channel|invalid.*from/i.test(msg) ||
      (typeof (e as { code?: number })?.code === 'number' && [21211, 21608].includes((e as { code: number }).code))
    ) {
      return NextResponse.json(
        {
          error: 'Número "From" de WhatsApp no válido en Twilio',
          detail: `Revisa TWILIO_WHATSAPP_NUMBER en .env.local. Debe ser exactamente el número del sandbox de WhatsApp (Twilio Console → Messaging → Try it out → Send a WhatsApp message). Formato: +14155238886 (sin espacios, con +). Error: ${detail}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error enviando mensaje de WhatsApp', detail },
      { status: 500 }
    )
  }
}

