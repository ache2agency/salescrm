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
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

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
  } catch (e) {
    return NextResponse.json(
      { error: 'Error enviando mensaje de WhatsApp', detail: String(e) },
      { status: 500 }
    )
  }
}

