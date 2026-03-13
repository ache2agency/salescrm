import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { question } = await req.json()
  if (!question) return NextResponse.json({ error: 'El campo question es obligatorio' }, { status: 400 })

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  // Generar embedding de la pregunta
  const embController = new AbortController()
  const embTimeout = setTimeout(() => embController.abort(), 60000) // 60s

  const embRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-ada-002', input: question }),
    signal: embController.signal,
  }).catch((e: any) => {
    if (e?.name === 'AbortError') {
      throw new Error('Timeout llamando a OpenAI embeddings (query)')
    }
    throw e
  })
  clearTimeout(embTimeout)
  const embData = await embRes.json()
  const embedding = embData.data?.[0]?.embedding
  if (!embedding) return NextResponse.json({ error: 'Error generando embedding' }, { status: 500 })

  // Buscar documentos similares con cliente de service role
  const { data: matches, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_count: 3
  })

  if (error) {
    console.error('RPC error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('matches:', JSON.stringify(matches), 'error:', JSON.stringify(error))

  if (!matches || matches.length === 0) {
    return NextResponse.json({ answer: 'No encontré información relevante.', context: '', matches: [] })
  }

  const context = matches.map((m: any) => m.contenido).join('\n\n')

  // Responder con GPT
  const chatController = new AbortController()
  const chatTimeout = setTimeout(() => chatController.abort(), 60000) // 60s

  const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `Eres el asistente de Instituto Windsor. Responde basándote en este contexto:\n\n${context}` },
        { role: 'user', content: question }
      ]
    }),
    signal: chatController.signal,
  }).catch((e: any) => {
    if (e?.name === 'AbortError') {
      throw new Error('Timeout llamando a OpenAI chat (query)')
    }
    throw e
  })
  clearTimeout(chatTimeout)
  const chatData = await chatRes.json()
  const answer = chatData.choices?.[0]?.message?.content || 'Sin respuesta'

  return NextResponse.json({ answer, context, matches })
}

