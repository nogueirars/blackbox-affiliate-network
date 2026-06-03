'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getGerenteId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: { id: true },
  })
  return publicUser?.id ?? null
}

export async function aceitarAfiliado(subAfiliadoId: string) {
  const gerenteId = await getGerenteId()
  if (!gerenteId) throw new Error('Não autorizado')

  const sub = await prisma.public_users.findFirst({
    where: { id: subAfiliadoId, id_gerente: gerenteId },
    select: { id: true },
  })
  if (!sub) throw new Error('Afiliado não encontrado ou não pertence a você')

  await prisma.public_users.update({
    where: { id: subAfiliadoId },
    data: { status_aprovacao: 'APROVADO' },
  })

  revalidatePath('/gerente/sub-afiliados')
}

export async function recusarAfiliado(subAfiliadoId: string) {
  const gerenteId = await getGerenteId()
  if (!gerenteId) throw new Error('Não autorizado')

  const sub = await prisma.public_users.findFirst({
    where: { id: subAfiliadoId, id_gerente: gerenteId },
    select: { id: true },
  })
  if (!sub) throw new Error('Afiliado não encontrado ou não pertence a você')

  await prisma.public_users.update({
    where: { id: subAfiliadoId },
    data: { status_aprovacao: 'REPROVADO' },
  })

  revalidatePath('/gerente/sub-afiliados')
}
