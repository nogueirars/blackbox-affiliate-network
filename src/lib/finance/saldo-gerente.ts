/**
 * saldo-gerente.ts
 * Schema blackbox_influencers: sem commission_ledger/pagamentos_afiliados/producao_incentivo.
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { SaldoGerente } from '@/types'

export async function getSaldoGerente(authId: string): Promise<SaldoGerente> {
  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })

  if (!publicUser) {
    return {
      gerente_id: authId,
      comissao_propria: 0,
      lucro_rede: 0,
      incentivo: 0,
      consumido: 0,
      saques_ativos: 0,
      saldo_disponivel: 0,
    }
  }

  // Get contract IDs for this gerente
  const contratos = await prisma.contratos.findMany({
    where: { ativo: true, user_roles: { id_usuario: publicUser.id, role: 'GERENTE', ativo: true } },
    select: { id: true },
  })
  const contratoIds = contratos.map(c => c.id)

  let lucroRede = 0
  if (contratoIds.length > 0) {
    const rows = await prisma.$queryRaw<[{ total: string }]>(
      Prisma.sql`
        SELECT COALESCE(SUM(lucro_liquido_total), 0)::text AS total
        FROM public.vw_producao_gerente
        WHERE id_contrato = ANY(${contratoIds}::uuid[])
      `
    )
    lucroRede = Number(rows[0]?.total ?? 0)
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

  // Lucro da rede é o que o gerente ganha. 
  // Se ele tiver comissao própria (como influencer), podemos buscar também, mas o padrão aqui é lucro da rede.
  const saldoDisponivel = Math.max(0, lucroRede - pagRecebidos - saquesAtivos)

  return {
    gerente_id: authId,
    comissao_propria: 0, // Poderia ser puxado de vw_producao_influencer se o gerente também for influencer
    lucro_rede: lucroRede,
    incentivo: 0,
    consumido: pagRecebidos, // o que ele já sacou
    saques_ativos: saquesAtivos,
    saldo_disponivel: saldoDisponivel,
  }
}
