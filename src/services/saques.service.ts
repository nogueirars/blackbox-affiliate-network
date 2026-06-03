/**
 * saques.service.ts
 * Schema blackbox_influencers — campos atualizados para novo modelo saques.
 * id_usuario (ref public_users.id), id_contrato, status enum saque_status.
 */
import { prisma } from '@/lib/prisma'
import { saque_status, pix_key_type, Prisma } from '@prisma/client'

// Resolve public_users.id a partir do auth_id do Supabase
async function resolveUserId(authId: string): Promise<string | null> {
  const u = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })
  return u?.id ?? null
}

export async function getSaquesByAfiliado(
  authId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
) {
  const userId = await resolveUserId(authId)
  if (!userId) return []

  return prisma.saques.findMany({
    where: { id_usuario: userId },
    orderBy: { created_at: 'desc' },
    take: limit,
    skip: offset,
  })
}

export async function getSaquesAdmin(
  { status, limit = 20, offset = 0 }: { status?: string; limit?: number; offset?: number } = {}
) {
  const where: Prisma.saquesWhereInput = status
    ? { status: status as saque_status }
    : {}

  const [data, total] = await prisma.$transaction([
    prisma.saques.findMany({
      where,
      orderBy: { created_at: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.saques.count({ where }),
  ])
  return { data, total, limit, offset }
}

export async function getSaquesPendentesCount() {
  return prisma.saques.count({ where: { status: 'AGUARDANDO_LIBERACAO' } })
}

export async function getSaqueById(id: string) {
  return prisma.saques.findUnique({ where: { id } })
}

export async function getSaquesAtivos(authId: string, _tipoPerfil: string) {
  const userId = await resolveUserId(authId)
  if (!userId) return []

  return prisma.saques.findMany({
    where: {
      id_usuario: userId,
      status: { in: ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF', 'PROCESSANDO'] as saque_status[] },
    },
  })
}

export async function createSaque(data: {
  afiliado_id: string   // auth_id do Supabase
  cnpj: string
  razao_social: string
  telefone: string
  pix_key: string
  pix_key_type: string
  montante: number
  itens: Array<{ id_casa: string; montante: number }>
}) {
  const userId = await resolveUserId(data.afiliado_id)
  if (!userId) throw new Error('Usuário não encontrado')
  if (!data.pix_key?.trim()) throw new Error('Chave PIX obrigatória')
  if (!data.pix_key_type)    throw new Error('Tipo de chave PIX obrigatório')

  return prisma.$transaction(async (tx) => {
    const saque = await tx.saques.create({
      data: {
        id_usuario:   userId,
        cnpj:         data.cnpj,
        razao_social: data.razao_social,
        telefone:     data.telefone,
        pix_key:      data.pix_key,
        pix_key_type: data.pix_key_type as pix_key_type | undefined,
        montante:     data.montante,
        status:       'AGUARDANDO_LIBERACAO',
      },
      select: { id: true, status: true, montante: true, created_at: true },
    })

    if (data.itens.length > 0) {
      await tx.saques_itens.createMany({
        data: data.itens.map(item => ({
          id_saque: saque.id,
          id_casa:  item.id_casa,
          montante: item.montante,
        })),
      })
    }

    return saque
  })
}

export async function updateSaqueStatus(
  id: string,
  updates: {
    status: string
    efetivado_at?: Date
    comprovante_url?: string
    nota_fiscal?: string
    saque_valido?: boolean
    motivo_correcao_nf?: string | null
    correcao_nf_solicitada_em?: Date | null
  }
) {
  return prisma.saques.update({
    where: { id },
    data: {
      ...updates,
      status: updates.status as saque_status,
    },
    select: { id: true, status: true, montante: true, efetivado_at: true },
  })
}

export async function submitNotaFiscal(saqueId: string, userId: string, notaFiscalUrl: string) {
  // Verify ownership and correct status
  const saque = await prisma.saques.findFirst({
    where: { id: saqueId, id_usuario: userId, status: 'AGUARDANDO_NF' },
    select: { id: true },
  })
  if (!saque) throw new Error('Saque não encontrado ou não está aguardando NF')

  return prisma.saques.update({
    where: { id: saqueId },
    data: {
      nota_fiscal:               notaFiscalUrl,
      status:                    'PROCESSANDO',
      motivo_correcao_nf:        null,
      correcao_nf_solicitada_em: null,
    },
    select: { id: true, status: true },
  })
}
