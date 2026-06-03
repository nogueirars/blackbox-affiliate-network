/**
 * commission.service.ts
 * Schema blackbox_influencers — sem tabela commission_ledger.
 * Funções de ledger retornam zeros até a lógica financeira ser mapeada.
 */
import { prisma } from '@/lib/prisma'

// ── Ledger stubs (commission_ledger não existe no novo schema) ──────────────

export async function getLedgerByAfiliado(
  _afiliadoId: string,
  _opts: { limit?: number } = {}
) {
  return []
}

export async function getLedgerSumByAfiliado(_afiliadoId: string) {
  return 0
}

export async function getLedgerSumByGerente(_gerenteId: string) {
  return { comissao_propria: 0, lucro_rede: 0 }
}

export async function getLedgerSumByMaster(_masterId: string) {
  return { comissao_bruta: 0, repasse_devido: 0 }
}

// ── Admin stats ─────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const [saquesPendentes, totalUsuarios, contratosAtivos] = await prisma.$transaction([
    prisma.saques.aggregate({
      where: { status: 'AGUARDANDO_NF' },
      _sum: { montante: true },
      _count: true,
    }),
    prisma.public_users.count(),
    prisma.contratos.count({ where: { ativo: true } }),
  ])
  return {
    saques_pendentes_count: saquesPendentes._count,
    saques_pendentes_valor: Number(saquesPendentes._sum.montante ?? 0),
    total_afiliados: totalUsuarios,
    contratos_ativos: contratosAtivos,
  }
}
