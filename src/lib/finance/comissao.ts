import { StatusFinanceiro, TipoComissao, FATOR_STATUS } from '@/types'

const REVSHARE_TAX_RATE = 0.145 // 14.5% imposto plataforma

// ─── Factor por status ────────────────────────────────────────────────────────
export function fatorStatus(status: StatusFinanceiro): number {
  return FATOR_STATUS[status] ?? 0
}

// ─── Calcula comissão de uma linha de produção ────────────────────────────────
export function calcComissao(
  tipo: TipoComissao,
  params: {
    cpas?: number
    valorCpa?: number
    receitaRevshare?: number
    percentualRevshare?: number
    statusFinanceiro: StatusFinanceiro
  }
): number {
  const fator = fatorStatus(params.statusFinanceiro)
  if (fator === 0) return 0

  if (tipo === 'CPA') {
    const cpas = params.cpas ?? 0
    const valorCpa = params.valorCpa ?? 0
    return cpas * valorCpa * fator
  }

  // REVSHARE: receita líquida após taxa de plataforma × percentual
  const receita = params.receitaRevshare ?? 0
  const pct = params.percentualRevshare ?? 0
  const receitaLiquida = receita * (1 - REVSHARE_TAX_RATE)
  return receitaLiquida * (pct / 100) * fator
}
