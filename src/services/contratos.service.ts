/**
 * contratos.service.ts
 * Schema blackbox_influencers — usa modelo contratos.
 * contratos_gerente / contratos_intermediario não existem; rede via id_gerente/id_intermediario em public_users.
 */
import { prisma } from '@/lib/prisma'

export async function getContratosByAfiliado(
  authId: string,
  { limit = 20 }: { limit?: number } = {}
) {
  const user = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })
  if (!user) return []

  return prisma.contratos.findMany({
    where: { user_roles: { id_usuario: user.id } },
    orderBy: { created_at: 'desc' },
    take: limit,
    select: { id: true, id_user_role: true, id_casa: true, ativo: true, created_at: true, tipo_contrato: true },
  })
}

export async function getContratosAtivosCount() {
  return prisma.contratos.count({ where: { ativo: true } })
}

export async function getRedeByGerente(gerenteId: string) {
  // Afiliados cujo id_gerente aponta para este gerente
  const gerente = await prisma.public_users.findUnique({
    where: { auth_id: gerenteId },
    select: { id: true },
  })
  if (!gerente) return []

  return prisma.public_users.findMany({
    where: { id_gerente: gerente.id, ativo: true },
    select: { id: true, auth_id: true, nome_completo: true, email: true, created_at: true },
    take: 200,
  })
}

export async function getRedeByIntermediario(intermediarioId: string) {
  const intermediario = await prisma.public_users.findUnique({
    where: { auth_id: intermediarioId },
    select: { id: true },
  })
  if (!intermediario) return []

  return prisma.public_users.findMany({
    where: { id_intermediario: intermediario.id, ativo: true },
    select: { id: true, auth_id: true, nome_completo: true, email: true, created_at: true },
    take: 200,
  })
}
