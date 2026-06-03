'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth-helpers'

export async function startImpersonation(targetAuthId: string | null, targetEmail: string, targetNomeCompleto: string) {
  if (!targetAuthId) {
    throw new Error('Usuário sem conta de autenticação — impersonação indisponível.')
  }
  // Use createClient without the override logic yet, or bypass the override
  // Wait, if createClient() has the override, and we are NOT impersonating yet, it will return the real admin user.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.app_metadata)) {
    throw new Error('Acesso negado')
  }

  const cookieStore = await cookies()
  const targetData = {
    id: targetAuthId,
    email: targetEmail,
    nome: targetNomeCompleto,
  }

  // Set cookie for 2 hours
  cookieStore.set('orbit_impersonation', JSON.stringify(targetData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 2, // 2 hours
    path: '/',
  })

  // We should redirect to the dashboard so layout.tsx can pick up the new user
  redirect('/dashboard')
}

export async function stopImpersonation() {
  const cookieStore = await cookies()
  
  // We don't strictly need to check auth to delete the cookie, 
  // but it's safe to just delete it.
  cookieStore.delete('orbit_impersonation')

  redirect('/admin/afiliados')
}

export async function clearImpersonationCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('orbit_impersonation')
}
