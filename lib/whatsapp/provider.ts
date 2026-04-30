export type WhatsAppProvider = 'twilio' | 'meta'

export function getWhatsAppProvider(): WhatsAppProvider {
  return process.env.WHATSAPP_PROVIDER === 'meta' ? 'meta' : 'twilio'
}

export function normalizePhoneNumber(value: string) {
  let normalized = (value || '').replace(/^whatsapp:/i, '').trim()
  if (normalized && !normalized.startsWith('+')) normalized = `+${normalized}`
  return normalized
}

export function getTwilioConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  }
}

export function getMetaConfig() {
  return {
    accessToken: process.env.META_WHATSAPP_TOKEN || process.env.META_WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
    verifyToken: process.env.META_WHATSAPP_VERIFY_TOKEN,
    appSecret: process.env.META_APP_SECRET,
  }
}

export async function sendMetaWhatsAppTemplate({
  to,
  templateName,
  parameters,
}: {
  to: string
  templateName: string
  parameters: string[]
}) {
  const { accessToken, phoneNumberId } = getMetaConfig()
  if (!accessToken || !phoneNumberId) throw new Error('Faltan variables de entorno de Meta')

  const toFormatted = normalizePhoneNumber(to).replace(/^\+/, '')

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toFormatted,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es_MX' },
          components: [
            {
              type: 'body',
              parameters: parameters.map(v => ({ type: 'text', text: v })),
            },
          ],
        },
      }),
    }
  )

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`
    throw new Error(detail)
  }
  return { id: data?.messages?.[0]?.id || null, raw: data }
}

export async function sendMetaWhatsAppMessage({
  to,
  body,
}: {
  to: string
  body: string
}) {
  const { accessToken, phoneNumberId } = getMetaConfig()

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      'Faltan variables de entorno de Meta (META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID)'
    )
  }

  const toFormatted = normalizePhoneNumber(to).replace(/^\+/, '')

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toFormatted,
        type: 'text',
        text: {
          body,
        },
      }),
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const detail =
      (data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof data.error === 'object' &&
        data.error &&
        'message' in data.error &&
        typeof data.error.message === 'string' &&
        data.error.message) ||
      `HTTP ${response.status}`
    throw new Error(detail)
  }

  const firstMessage =
    data &&
    typeof data === 'object' &&
    'messages' in data &&
    Array.isArray(data.messages) &&
    data.messages.length > 0
      ? data.messages[0]
      : null

  return {
    id:
      firstMessage &&
      typeof firstMessage === 'object' &&
      'id' in firstMessage &&
      typeof firstMessage.id === 'string'
        ? firstMessage.id
        : null,
    raw: data,
  }
}
