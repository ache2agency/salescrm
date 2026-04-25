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

  const metadata: any = user.user_metadata || {}
  const role = metadata.role || 'seller'
  const nombre = metadata.nombre || user.email?.split('@')[0] || 'Usuario'

  return (
    <div>
      <div style={{
        padding:20,
        borderBottom:"1px solid #eee",
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span>Bienvenido {user.email}</span>
          {role === 'admin' && (
            <span style={{
              fontSize:10,
              padding:"2px 8px",
              borderRadius:999,
              background:"#111",
              color:"#E8A838",
              border:"1px solid #E8A838"
            }}>
              ADMIN
            </span>
          )}
        </div>

        <form action="/auth/signout" method="post">
          <button type="submit">Cerrar sesión</button>
        </form>
      </div>

      <CRM />
    </div>
  )
}