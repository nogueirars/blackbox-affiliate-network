/**
 * saldo-intermediario.ts
 * Schema blackbox_influencers: sem commission_ledger/pagamentos_afiliados.
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { SaldoIntermediario } from '@/types'

export async function getSaldoIntermediario(authId: string): Promise<SaldoIntermediario> {
  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })

  if (!publicUser) {
    return {
      intermediario_id: authId,
      comissao_bruta: 0,
      repasse_devido: 0,
      consumido: 0,
      saques_ativos: 0,
      saldo_disponivel: 0,
    }
  }

  // Get contract IDs for this intermediario
  const contratos = await prisma.contratos.findMany({
    where: { ativo: true, user_roles: { id_usuario: publicUser.id, role: 'INTERMEDIARIO', ativo: true } },
    select: { id: true },
  })
  const contratoIds = contratos.map(c => c.id)

  let lucroLiquido = 0
  if (contratoIds.length > 0) {
    const rows = await prisma.$queryRaw<[{ total: string }]>(
      Prisma.sql`
        SELECT COALESCE(SUM(lucro_liquido_total), 0)::text AS total
        FROM public.vw_producao_intermediario
        WHERE id_contrato = ANY(${contratoIds}::uuid[])
      `
    )
    lucroLiquido = Number(rows[0]?.total ?? 0)
  }

  // Saques
  const saques = await prisma.saques.findMany({
    where: { id_usuario: publicUser.id },
    select: { montante: true, status: true },
  })

  const saquesAtivos = saques
    .filter(s => ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF', 'PROCESSANDO', 'MANUAL'].includes(s.status))
    .reduce((acc, s) => acc + Number(s.montante), 0)

  const pagRecebidos = saques
    .filter(s => s.status === 'CONCLUIDO')
    .reduce((acc, s) => acc + Number(s.montante), 0)

  const saldoDisponivel = Math.max(0, lucroLiquido - pagRecebidos - saquesAtivos)

  return {
    intermediario_id: authId,
    comissao_bruta: lucroLiquido, // Representa o lucro líquido/receita do intermediário
    repasse_devido: 0,
    consumido: pagRecebidos, // o que ele já sacou
    saques_ativos: saquesAtivos,
    saldo_disponivel: saldoDisponivel,
  }
}
