export interface EntidadeOption { id: string; nome: string }

export interface RegrasCasa {
  id: string
  regras_cpa: string | null
  tempo_atualizacao: string | null
  exige_documentacao: string | null
  deposito_minimo: number | null
  observacoes: string | null
}

export interface Casa {
  id: string
  nome_exibicao: string
  razao_social: string
  icone_url: string | null
  affiliate_url: string | null
  ativo: boolean
  created_at: string
  id_entidade: string | null
  entidades: EntidadeOption | null
  tem_regras: boolean
  materiais_count: number
}

export interface MaterialPublicidade {
  id: string
  casa_id: string
  nome: string
  descricao: string | null
  file_path: string | null
  file_size: number | null
  file_type: string | null
  created_at?: string
  updated_at?: string
}

