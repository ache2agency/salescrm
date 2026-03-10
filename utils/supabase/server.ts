import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // En Server Components de Next.js, modificar cookies directamente
        // causa el error "Cookies can only be modified in a Server Action or Route Handler".
        // Para evitarlo aquí, ignoramos los intentos de escritura.
        setAll() {
          // no-op en este contexto
        },
      },
    }
  )
}