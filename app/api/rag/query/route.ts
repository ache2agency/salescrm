import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Falta configurar OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { question } = body as { question?: string }

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'El campo question es obligatorio' },
        { status: 400 }
      )
    }

    // 1) Embedding de la pregunta
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: question,
      }),
    })

    if (!embRes.ok) {
      const detail = await embRes.text()
      return NextResponse.json(
        { error: 'Error generando embedding de la pregunta', detail },
        { status: 500 }
      )
    }

    const embData = await embRes.json()
    const queryEmbedding: number[] = embData.data?.[0]?.embedding
    if (!Array.isArray(queryEmbedding)) {
      return NextResponse.json(
        { error: 'Embedding inválido para la pregunta' },
        { status: 500 }
      )
    }

    // 2) Buscar documentos similares en Supabase
    const supabase = await createClient()
    const { data: matches, error: matchError } = await supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_count: 3,
      })

    if (matchError) {
      return NextResponse.json(
        { error: 'Error buscando documentos relacionados', detail: matchError.message },
        { status: 500 }
      )
    }

    const contextText = (matches || [])
      .map((m: any, idx: number) => `Fragmento ${idx + 1}:\n${m.contenido}`)
      .join('\n\n---\n\n')

    // 3) Llamar a GPT-4o con contexto + pregunta
    const promptMessages = [
      {
        role: 'system',
        content:
          'Eres un asistente del Instituto Windsor. Responde solo usando el contexto proporcionado. Si no encuentras la respuesta en el contexto, dilo explícitamente.',
      },
      {
        role: 'system',
        content: `Contexto:\n${contextText || 'Sin contexto disponible.'}`,
      },
      {
        role: 'user',
        content: question,
      },
    ]

    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: promptMessages,
        temperature: 0.3,
      }),
    })

    if (!chatRes.ok) {
      const detail = await chatRes.text()
      return NextResponse.json(
        { error: 'Error llamando a GPT-4o', detail },
        { status: 500 }
      )
    }

    const chatData = await chatRes.json()
    const answer: string =
      chatData.choices?.[0]?.message?.content ||
      'No pude generar una respuesta en este momento.'

    return NextResponse.json({
      answer,
      context: contextText,
      matches,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Error procesando la consulta RAG', detail: String(e) },
      { status: 500 }
    )
  }
}

