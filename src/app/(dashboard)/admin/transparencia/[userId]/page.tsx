import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTransparenciaData, ProfileType } from '@/services/transparencia.service'
import { PortalTransparencia } from '@/components/transparencia/PortalTransparencia'
import { prisma } from '@/lib/prisma'

export default async function AdminTransparenciaPage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ profile?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { userId } = await params
  const { profile } = await searchParams

  // Determine which profile to load if not explicitly provided
  let activeProfile: ProfileType = (profile as ProfileType) || 'influenciador'
  let isAdmin = false
  let data: Awaited<ReturnType<typeof getTransparenciaData>> | null = null

  try {
    const adminCheck = await prisma.public_users.findUnique({
      where: { auth_id: user.id },
      select: { user_roles: { select: { role: true } } }
    })

    isAdmin = !!adminCheck?.user_roles.some(r => r.role === 'ADMIN')

    if (isAdmin && !profile) {
      const targetRoles = await prisma.user_roles.findMany({
        where: { id_usuario: userId, ativo: true },
        select: { role: true }
      })

      if (targetRoles.some(r => r.role === 'GERENTE')) activeProfile = 'gerente'
      else if (targetRoles.some(r => r.role === 'INTERMEDIARIO')) activeProfile = 'intermediario'
      else activeProfile = 'influenciador'
    }

    if (isAdmin) {
      data = await getTransparenciaData(userId, activeProfile)
    }
  } catch (e) {
    console.error('[admin/transparencia] prisma error:', e)
    redirect('/dashboard')
  }

  if (!isAdmin || !data) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[var(--color-surface-container)] p-4 rounded-xl border border-[var(--color-surface-border)] mb-4">
        <p className="text-sm text-[var(--color-on-surface-variant)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
          <strong>Visão Admin:</strong> Exibindo portal do usuário {userId} sob a ótica de <span className="uppercase text-[var(--color-primary)] font-bold">{activeProfile}</span>.
        </p>
      </div>
      <PortalTransparencia profile={activeProfile} data={data} />
    </div>
  )
}
