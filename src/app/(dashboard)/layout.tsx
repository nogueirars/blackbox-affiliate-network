import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardShell from '@/components/layout/DashboardShell'
import { SidebarProvider } from '@/contexts/SidebarContext'

// DB enum → UI role key (lowercase, Portuguese)
const DB_ROLE_MAP: Record<string, string> = {
  ADMIN: 'admin',
  AFILIADO: 'afiliado',
  INTERMEDIARIO: 'intermediario',
  GERENTE: 'gerente',
}

const ROLE_LABEL: Record<string, string> = {
  afiliado: 'Afiliado', gerente: 'Gerente',
  intermediario: 'Intermediário', admin: 'Agência',
}
const ROLE_BADGE: Record<string, string> = {
  afiliado: 'badge-gray', gerente: 'badge-blue',
  intermediario: 'badge-orange', admin: 'badge-red',
}
const ROLE_HIERARCHY = ['admin', 'intermediario', 'gerente', 'afiliado']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.id) redirect('/login')

  // Read roles array from JWT — backward compat with old single role string
  const metaRoles: string[] = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as string[]).map((r: string) => r.toUpperCase())
    : user.app_metadata?.role
      ? [(user.app_metadata.role as string).toUpperCase()]
      : []

  const isAdminByMeta = metaRoles.includes('ADMIN')
  let roles: string[] = isAdminByMeta ? ['admin'] : []

  // DB lookup — fetch publicUser + roles together so we can check for DB-level ADMIN
  // before applying the approval-status gate (users with ADMIN role are never blocked)
  let publicUser: { id: string; status_aprovacao: string; user_roles: { role: string }[] } | null = null
  try {
    publicUser = user.id ? await prisma.public_users.findUnique({
      where: { auth_id: user.id },
      select: {
        id: true,
        status_aprovacao: true,
        user_roles: { where: { ativo: true }, select: { role: true } },
      },
    }) : null
  } catch (e) {
    console.error('[layout] prisma.public_users error:', e)
    // Graceful fallback — rely on JWT meta only; no DB-based admin check
  }

  const isAdminByDB = publicUser?.user_roles.some(r => r.role === 'ADMIN') ?? false
  const isAdmin = isAdminByMeta || isAdminByDB
  if (isAdminByDB) roles.push('admin')

  if (publicUser && !isAdmin) {
    const blocked = publicUser.status_aprovacao === 'PENDENTE' || publicUser.status_aprovacao === 'REPROVADO'
    if (blocked) redirect('/aguardando')
  }

  if (publicUser) {
    const dbRoles = publicUser.user_roles
      .map(r => DB_ROLE_MAP[r.role] ?? r.role.toLowerCase())
      .filter(r => r !== 'admin')
    roles.push(...dbRoles)
  }

  if (roles.length === 0) roles.push('afiliado')

  const primaryRole = ROLE_HIERARCHY.find(r => roles.includes(r)) ?? 'afiliado'

  const isImpersonating = user.user_metadata?.is_impersonating === true
  const impersonatedEmail = user.email
  const impersonatedName = user.user_metadata?.impersonated_name

  return (
    <SidebarProvider>
      <DashboardShell
        userEmail={user.email ?? ''}
        roles={roles}
        isAdmin={isAdmin}
        roleLabel={ROLE_LABEL[primaryRole] ?? primaryRole}
        roleBadgeClass={ROLE_BADGE[primaryRole] ?? 'badge-gray'}
        isImpersonating={isImpersonating}
        impersonatedEmail={impersonatedEmail ?? ''}
        impersonatedName={impersonatedName ?? ''}
      >
        {children}
      </DashboardShell>
    </SidebarProvider>
  )
}
