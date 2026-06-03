import { EntidadeOption } from '../types'
import { Field, Select, Spinner } from '../utils'

export interface NewCasaDraft {
  nome_exibicao: string
  razao_social: string
  icone_url: string
  affiliate_url: string
  id_entidade: string
  regras_cpa: string
  tempo_atualizacao: string
  exige_documentacao: string
  deposito_minimo: string
  observacoes: string
}

interface Props {
  draft: NewCasaDraft
  setDraft: React.Dispatch<React.SetStateAction<NewCasaDraft>>
  entidades: EntidadeOption[]
  onSave: () => void
  onCancel: () => void
  onClear: () => void
  saving: boolean
  error: string
}

export default function NewCasaDrawerContent({
  draft,
  setDraft,
  entidades,
  onSave,
  onCancel,
  onClear,
  saving,
  error,
}: Props) {
  const updateField = (key: keyof NewCasaDraft) => (val: string) => {
    setDraft(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] text-[var(--color-on-surface)] relative">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-[var(--color-outline-variant)] sticky top-0 bg-[var(--color-surface)] z-10">
        <h2 className="font-bold text-xl leading-tight">Cadastrar Nova Casa</h2>
        <p className="text-xs text-[var(--color-on-surface-variant)] opacity-70 mt-1">
          Insira as informações gerais e as regras de negócio da nova casa de aposta.
        </p>
      </div>

      {/* Content Form */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">
            {error}
          </div>
        )}

        {/* Dados Gerais Section */}
        <section className="flex flex-col gap-4">
          <h3 className="font-semibold text-[var(--color-primary)] text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            Dados Principais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Nome de Exibição *"
              value={draft.nome_exibicao}
              onChange={updateField('nome_exibicao')}
              placeholder="Ex: Betano"
              required
            />
            <Field
              label="Razão Social"
              value={draft.razao_social}
              onChange={updateField('razao_social')}
              placeholder="Ex: Empresa Ltda."
            />
          </div>
          <Field
            label="URL do Ícone"
            value={draft.icone_url}
            onChange={updateField('icone_url')}
            placeholder="https://..."
          />
          <Field
            label="URL de Afiliação"
            value={draft.affiliate_url}
            onChange={updateField('affiliate_url')}
            placeholder="https://..."
          />
          <Select
            label="Entidade vinculada *"
            value={draft.id_entidade}
            onChange={updateField('id_entidade')}
            options={entidades.map(e => ({ value: e.id, label: e.nome }))}
            required
          />
        </section>

        <hr className="border-[var(--color-outline-variant)]" />

        {/* Regras de Negócio Section */}
        <section className="flex flex-col gap-4">
          <h3 className="font-semibold text-[var(--color-primary)] text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">rule_folder</span>
            Regras de Negócio
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              Validação do CPA
            </label>
            <textarea
              value={draft.regras_cpa}
              onChange={e => updateField('regras_cpa')(e.target.value)}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 h-20 resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              placeholder="Ex: Depósito mínimo de R$ 30 + 1 aposta de R$ 10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Tempo de Atualização"
              value={draft.tempo_atualizacao}
              onChange={updateField('tempo_atualizacao')}
              placeholder="Ex: A cada 24h"
            />
            <Field
              label="Exige Documentação?"
              value={draft.exige_documentacao}
              onChange={updateField('exige_documentacao')}
              placeholder="Ex: Após depósito"
            />
            <Field
              label="Depósito Mínimo (R$)"
              value={draft.deposito_minimo}
              onChange={updateField('deposito_minimo')}
              type="number"
              placeholder="Ex: 30"
            />
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              Observações
            </label>
            <textarea
              value={draft.observacoes}
              onChange={e => updateField('observacoes')(e.target.value)}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 h-16 resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              placeholder="Notas adicionais..."
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] sticky bottom-0 z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)] transition-colors"
          >
            Cancelar
          </button>
          
          {(draft.nome_exibicao || draft.razao_social || draft.icone_url || draft.affiliate_url || draft.id_entidade || draft.regras_cpa || draft.tempo_atualizacao || draft.exige_documentacao || draft.deposito_minimo || draft.observacoes) && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
              title="Limpar todos os campos digitados"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Limpar Rascunho
            </button>
          )}
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md"
          style={{ background: 'var(--color-primary)' }}
        >
          {saving ? <Spinner /> : <span className="material-symbols-outlined text-[18px]">add_task</span>}
          {saving ? 'Criando...' : 'Criar Casa'}
        </button>
      </div>
    </div>
  )
}
