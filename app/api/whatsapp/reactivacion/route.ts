import twilio from 'twilio'
import { createServiceRoleClient } from '@/utils/supabase/server'
import {
  getTwilioConfig,
  getWhatsAppProvider,
  normalizePhoneNumber,
  sendMetaWhatsAppMessage,
  type WhatsAppProvider,
} from '@/lib/whatsapp/provider'
import {
  DIAS_SILENCIO_POR_ETAPA,
  esTrackA,
  HORAS_MIN_ENTRE_INTENTOS,
  normalizarEtapaReactivacion,
  obtenerMensajeReactivacion,
  type ReactivationStageKey,
} from '@/lib/whatsapp/reactivacion-messages'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const STAGES_PARA_BUSCAR = [
  'primer_contacto',
  'contactado',
  'examen_ubicacion',
  'clase_muestra',
  'segundo_contacto',
  'seguimiento',
  'promocion_enviada',
  'promo_enviada',
  'inscripcion_pendiente',
  'tercer_contacto',
]

type ConvRow = {
  id: string
  provider: string | null
  ultimo_mensaje_at: string | null
  whatsapp: string
}

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim() === secret
  }
  const h = request.headers.get('x-cron-secret')
  return h === secret
}

function msDesde(fecha: Date): number {
  return Date.now() - fecha.getTime()
}

function diasDesde(fecha: Date): number {
  return msDesde(fecha) / (24 * 60 * 60 * 1000)
}

async function enviarWhatsApp(
  to: string,
  body: string,
  provider: WhatsAppProvider
): Promise<void> {
  const normalized = normalizePhoneNumber(to)
  if (provider === 'meta') {
    await sendMetaWhatsAppMessage({ to: normalized, body })
    return
  }
  const { accountSid, authToken, fromNumber } = getTwilioConfig()
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Faltan variables de entorno de Twilio')
  }
  const client = twilio(accountSid, authToken)
  const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`
  const toFormatted = `whatsapp:${normalized.replace(/^whatsapp:/i, '')}`
  await client.messages.create({ from, to: toFormatted, body })
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.CRON_SECRET) {
    return Response.json(
      { error: 'CRON_SECRET no configurado en el servidor' },
      { status: 500 }
    )
  }

  const supabase = createServiceRoleClient()
  const defaultProvider = getWhatsAppProvider()

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, nombre, whatsapp, curso, stage')
    .in('stage', STAGES_PARA_BUSCAR)
    .not('whatsapp', 'is', null)

  if (leadsError) {
    return Response.json({ error: leadsError.message }, { status: 500 })
  }

  const resultados: {
    lead_id: string
    accion: 'omitido' | 'enviado_intento_1' | 'enviado_intento_2' | 'archivado' | 'error'
    detalle?: string
  }[] = []

  for (const lead of leads || []) {
    const etapaCanon = normalizarEtapaReactivacion(lead.stage)
    if (!etapaCanon || !DIAS_SILENCIO_POR_ETAPA[etapaCanon]) {
      resultados.push({ lead_id: lead.id, accion: 'omitido', detalle: 'etapa no reactivable' })
      continue
    }

    const diasUmbral = DIAS_SILENCIO_POR_ETAPA[etapaCanon]
    let conv: ConvRow | null = null

    const { data: convByLead } = await supabase
      .from('whatsapp_conversaciones')
      .select('id, provider, ultimo_mensaje_at, whatsapp')
      .eq('lead_id', lead.id)
      .order('ultimo_mensaje_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (convByLead?.id) {
      conv = convByLead as ConvRow
    } else if (lead.whatsapp) {
      const w = normalizePhoneNumber(lead.whatsapp)
      const { data: convWa } = await supabase
        .from('whatsapp_conversaciones')
        .select('id, provider, ultimo_mensaje_at, whatsapp')
        .eq('whatsapp', w)
        .order('ultimo_mensaje_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (convWa?.id) conv = convWa as ConvRow
    }

    const conversacionId = conv?.id

    if (!conversacionId || !conv) {
      resultados.push({ lead_id: lead.id, accion: 'omitido', detalle: 'sin conversación WhatsApp' })
      continue
    }

    const { data: ultimoUsuario } = await supabase
      .from('whatsapp_mensajes')
      .select('created_at')
      .eq('conversacion_id', conversacionId)
      .eq('rol', 'usuario')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const ultimoUsuarioAt = ultimoUsuario?.created_at
      ? new Date(ultimoUsuario.created_at as string)
      : null
    const referenciaSilencio =
      ultimoUsuarioAt || (conv.ultimo_mensaje_at ? new Date(conv.ultimo_mensaje_at) : null)

    if (!referenciaSilencio) {
      resultados.push({ lead_id: lead.id, accion: 'omitido', detalle: 'sin fecha de referencia' })
      continue
    }

    if (diasDesde(referenciaSilencio) < diasUmbral) {
      resultados.push({ lead_id: lead.id, accion: 'omitido', detalle: 'silencio dentro del umbral' })
      continue
    }

    const { data: intentosRows } = await supabase
      .from('reactivacion_intentos')
      .select('intento, enviado_at')
      .eq('lead_id', lead.id)
      .eq('etapa', etapaCanon)
      .order('intento', { ascending: true })

    const intentos = intentosRows || []
    const maxIntento = intentos.length ? Math.max(...intentos.map((i) => i.intento)) : 0

    if (intentos.length >= 2) {
      await supabase.from('leads').update({ stage: 'archivado' }).eq('id', lead.id)
      await supabase.from('lead_activities').insert([
        {
          lead_id: lead.id,
          actor_id: null,
          event_type: 'reactivacion_archivado',
          title: 'Lead archivado',
          detail: 'Dos intentos de reactivación sin respuesta en la etapa actual.',
          meta: { etapa: etapaCanon, motivo: 'reactivacion' },
        },
      ])
      resultados.push({ lead_id: lead.id, accion: 'archivado' })
      continue
    }

    const siguienteIntento = (maxIntento + 1) as 1 | 2
    if (siguienteIntento > 2) {
      resultados.push({ lead_id: lead.id, accion: 'omitido', detalle: 'intento inválido' })
      continue
    }

    if (siguienteIntento === 2) {
      const primero = intentos.find((i) => i.intento === 1)
      if (!primero?.enviado_at) {
        resultados.push({ lead_id: lead.id, accion: 'omitido', detalle: 'falta intento 1' })
        continue
      }
      const horasDesdePrimero =
        msDesde(new Date(primero.enviado_at as string)) / (60 * 60 * 1000)
      if (horasDesdePrimero < HORAS_MIN_ENTRE_INTENTOS) {
        resultados.push({
          lead_id: lead.id,
          accion: 'omitido',
          detalle: `espera entre intentos (${HORAS_MIN_ENTRE_INTENTOS}h)`,
        })
        continue
      }
    }

    const nombre = lead.nombre?.trim() || 'ahí'
    const trackA = esTrackA(lead.curso)
    const mensaje = obtenerMensajeReactivacion(etapaCanon, siguienteIntento, trackA, nombre)

    const provider = (conv.provider as WhatsAppProvider | null) || defaultProvider
    const to = conv.whatsapp || lead.whatsapp

    try {
      await enviarWhatsApp(to!, mensaje, provider)

      const now = new Date().toISOString()
      await supabase.from('reactivacion_intentos').insert([
        {
          lead_id: lead.id,
          etapa: etapaCanon,
          intento: siguienteIntento,
          enviado_at: now,
        },
      ])

      await supabase.from('whatsapp_mensajes').insert([
        {
          conversacion_id: conversacionId,
          rol: 'bot',
          contenido: mensaje,
        },
      ])

      await supabase
        .from('whatsapp_conversaciones')
        .update({ ultimo_mensaje_at: now })
        .eq('id', conversacionId)

      resultados.push({
        lead_id: lead.id,
        accion: siguienteIntento === 1 ? 'enviado_intento_1' : 'enviado_intento_2',
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      resultados.push({ lead_id: lead.id, accion: 'error', detalle: msg })
    }
  }

  return Response.json({
    ok: true,
    procesados: resultados.length,
    resultados,
  })
}
