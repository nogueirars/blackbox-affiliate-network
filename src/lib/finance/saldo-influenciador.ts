/**
 * saldo-influenciador.ts
 * Uses vw_producao_influencer via $queryRaw (view lacks @@unique so Prisma
 * doesn't expose it as a model property — raw SQL is the safe path).
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { SaldoInfluenciador } from '@/types'

export async function getSaldoInfluenciador(
  authId: string
): Promise<SaldoInfluenciador> {
  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })

  if (!publicUser) {
    return { influenciador_id: authId, comissao_bruta: 0, pag_recebidos: 0, estornos: 0, saques_ativos: 0, saldo_disponivel: 0 }
  }

  // Get contract IDs for this influencer
  const contratos = await prisma.contratos.findMany({
    where: { ativo: true, user_roles: { id_usuario: publicUser.id, ativo: true } },
    select: { id: true },
  })
  const contratoIds = contratos.map(c => c.id)

  // Aggregate receita_total_calculada from view via raw SQL
  let comissaoBruta = 0
  if (contratoIds.length > 0) {
    const rows = await prisma.$queryRaw<[{ total: string }]>(
      Prisma.sql`
        SELECT COALESCE(SUM(receita_total_calculada), 0)::text AS total
        FROM public.vw_producao_influencer
        WHERE id_contrato = ANY(${contratoIds}::uuid[])
      `
    )
    comissaoBruta = Number(rows[0]?.total ?? 0)
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

  // FALHA = saque rejeitado → dinheiro NÃO foi pago → não deduz saldo disponível
  // (apenas exibido como informação na UI)
  const estornos = saques
    .filter(s => s.status === 'FALHA')
    .reduce((acc, s) => acc + Number(s.montante), 0)

  const saldoDisponivel = Math.max(0, comissaoBruta - pagRecebidos - saquesAtivos)

  return {
    influenciador_id: authId,
    comissao_bruta: comissaoBruta,
    pag_recebidos: pagRecebidos,
    estornos,
    saques_ativos: saquesAtivos,
    saldo_disponivel: saldoDisponivel,
  }
}
