import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CRM from './crm'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <div>
      <div style={{
        padding:20,
        borderBottom:"1px solid #eee",
        display:"flex",
        justifyContent:"space-between"
      }}>
        <div>Bienvenido {user.email}</div>

        <form action="/auth/signout" method="post">
          <button type="submit">Cerrar sesión</button>
        </form>
      </div>

      <CRM />
    </div>
  )
}