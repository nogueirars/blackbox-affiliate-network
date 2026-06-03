// ─── Roles ────────────────────────────────────────────────────────────────────
// DB/JWT enum values (uppercase)
export type Role = 'AFILIADO' | 'GERENTE' | 'INTERMEDIARIO' | 'ADMIN'

// UI-facing lowercase keys used in nav/labels
export type RoleKey = 'afiliado' | 'gerente' | 'intermediario' | 'admin'

// ─── Status financeiro ────────────────────────────────────────────────────────
export type StatusFinanceiro = 'liberado' | 'parcial_liberado' | 'pendente_liberacao'

export const FATOR_STATUS: Record<StatusFinanceiro, number> = {
  liberado: 1.0,
  parcial_liberado: 0.5,
  pendente_liberacao: 0.0,
}

// ─── Tipo de comissão ─────────────────────────────────────────────────────────
export type TipoComissao = 'CPA' | 'REVSHARE'

// ─── Tipo de cadeia (commission_ledger) ──────────────────────────────────────
export type TipoCadeia = 'direto' | 'sub' | 'intermediario' | 'intermediario_proprio'

// ─── Profiles ────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  nome: string
  email: string
  roles: Role[]
  created_at: string
}

// ─── Contrato ────────────────────────────────────────────────────────────────
export interface Contrato {
  id: string
  afiliado_id: string
  casa_id: string
  tipo_comissao: TipoComissao
  valor_cpa: number | null
  percentual_revshare: number | null
  data_inicio: string
  data_fim: string | null
  ativo: boolean
}

// ─── Saldo results ────────────────────────────────────────────────────────────
export interface SaldoAfiliado {
  influenciador_id: string
  comissao_bruta: number
  pag_recebidos: number
  estornos: number
  saques_ativos: number
  saldo_disponivel: number
}

export interface SaldoGerente {
  gerente_id: string
  comissao_propria: number
  lucro_rede: number
  incentivo: number
  consumido: number
  saques_ativos: number
  saldo_disponivel: number
}

export interface SaldoIntermediario {
  intermediario_id: string
  comissao_bruta: number
  repasse_devido: number
  consumido: number
  saques_ativos: number
  saldo_disponivel: number
}
