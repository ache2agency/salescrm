import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

function splitIntoChunks(text: string, wordsPerChunk = 500): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '))
  }
  return chunks
}

export async function POST(request: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Falta configurar OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { contenido, titulo } = body as { contenido?: string; titulo?: string }

    if (!contenido || !contenido.trim()) {
      return NextResponse.json(
        { error: 'El campo contenido es obligatorio' },
        { status: 400 }
      )
    }

    const chunks = splitIntoChunks(contenido.trim(), 500)
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo generar contenido para indexar' },
        { status: 400 }
      )
    }

    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: chunks,
      }),
    })

    if (!embeddingRes.ok) {
      const detail = await embeddingRes.text()
      return NextResponse.json(
        { error: 'Error generando embeddings', detail },
        { status: 500 }
      )
    }

    const embeddingData = await embeddingRes.json()
    const vectors: number[][] = embeddingData.data?.map((d: any) => d.embedding) || []

    if (vectors.length !== chunks.length) {
      return NextResponse.json(
        { error: 'Cantidad de embeddings no coincide con los chunks' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const rows = chunks.map((chunk, idx) => ({
      titulo: titulo || null,
      contenido: chunk,
      embedding: vectors[idx],
    }))

    const { error: insertError } = await supabase.from('documentos').insert(rows)
    if (insertError) {
      return NextResponse.json(
        { error: 'Error guardando documentos en Supabase', detail: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      chunks_indexed: chunks.length,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Error procesando carga de RAG', detail: String(e) },
      { status: 500 }
    )
  }
}

