import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { user_role } from '@prisma/client'
import { generateUniqueRefCode } from '@/lib/ref-code'

export async function getProfileById(authId: string) {
  return prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true, nome_completo: true, email: true, created_at: true },
  })
}

export async function getProfilesByIds(authIds: string[]) {
  return prisma.public_users.findMany({
    where: { auth_id: { in: authIds } },
    select: { id: true, auth_id: true, nome_completo: true, email: true },
  })
}

export async function getProfilesCount() {
  return prisma.public_users.count()
}

export async function getUserRoles(authId: string): Promise<user_role[]> {
  const user = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })
  if (!user) return []

  const rows = await prisma.user_roles.findMany({
    where: { id_usuario: user.id, ativo: true },
    select: { role: true },
  })
  return rows.map(r => r.role)
}

export async function assignRole(publicUserId: string, role: user_role): Promise<void> {
  const existing = await prisma.user_roles.findFirst({
    where: { id_usuario: publicUserId, role, ativo: true },
  })
  if (!existing) {
    const ref_code = await generateUniqueRefCode()
    await prisma.user_roles.create({
      data: { id_usuario: publicUserId, role, ref_code },
    })
  }
  await syncClaim(publicUserId)
}

export async function removeRole(publicUserId: string, role: user_role): Promise<void> {
  await prisma.user_roles.updateMany({
    where: { id_usuario: publicUserId, role, ativo: true },
    data: { ativo: false, inativado_at: new Date() },
  })
  await syncClaim(publicUserId)
}

export async function syncClaim(publicUserId: string): Promise<void> {
  const user = await prisma.public_users.findUnique({
    where: { id: publicUserId },
    select: { auth_id: true },
  })
  if (!user?.auth_id) return
  const db = createAdminClient()
  const { error } = await db.rpc('sync_user_role_claim' as never, { p_user_id: user.auth_id } as never)
  if (error) console.error('[profiles] sync claim error', error)
}
