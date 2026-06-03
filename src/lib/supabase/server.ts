import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/auth-helpers'

export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookie setting ignored
          }
        },
      },
    }
  )

  const originalGetUser = client.auth.getUser.bind(client.auth)
  
  client.auth.getUser = async () => {
    const result = await originalGetUser()
    const user = result.data.user
    
    if (!user || !isAdmin(user.app_metadata)) {
      return result
    }

    const impersonateCookie = cookieStore.get('orbit_impersonation')?.value
    if (impersonateCookie) {
      let target: { id?: string | null; email?: string | null; nome?: string | null } | null = null
      try {
        target = JSON.parse(impersonateCookie)
      } catch (e) {
        console.error('Failed to parse orbit_impersonation cookie', e)
      }

      if (!target?.id || !target?.email) {
        try { cookieStore.delete('orbit_impersonation') } catch { /* no-op in server component */ }
        return result
      }

      result.data.user = {
        ...user,
        id: target.id,
        email: target.email,
        app_metadata: {
          ...user.app_metadata,
          role: undefined,
          roles: undefined,
        },
        user_metadata: {
          ...user.user_metadata,
          is_impersonating: true,
          impersonated_name: target.nome,
          real_admin_id: user.id,
          real_admin_email: user.email,
        }
      }
    }

    return result
  }

  return client
}
