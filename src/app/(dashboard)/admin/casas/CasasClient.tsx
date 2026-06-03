'use client'

import { useState } from 'react'
import { Casa, EntidadeOption } from './types'
import IntegracoesTab from './tabs/IntegracoesTab'
import Drawer from '@/components/ui/Drawer'
import NewCasaDrawerContent, { NewCasaDraft } from './tabs/NewCasaDrawerContent'

interface Props { casas: Casa[]; entidades: EntidadeOption[] }

export default function CasasClient({ casas: initial, entidades }: Props) {
  const [casas, setCasas] = useState(initial)

  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  const filtered = casas.filter(c => {
    const matchSearch = c.nome_exibicao.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || (statusFilter === 'ativo' ? c.ativo : !c.ativo)
    return matchSearch && matchStatus
  })

  // Creation Flow States
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<NewCasaDraft>({
    nome_exibicao: '',
    razao_social: '',
    icone_url: '',
    affiliate_url: '',
    id_entidade: '',
    regras_cpa: '',
    tempo_atualizacao: '',
    exige_documentacao: '',
    deposito_minimo: '',
    observacoes: '',
  })

  const handleClearDraft = () => {
    setDraft({
      nome_exibicao: '',
      razao_social: '',
      icone_url: '',
      affiliate_url: '',
      id_entidade: '',
      regras_cpa: '',
      tempo_atualizacao: '',
      exige_documentacao: '',
      deposito_minimo: '',
      observacoes: '',
    })
  }

  const handleCreateCasa = async () => {
    if (!draft.nome_exibicao || !draft.id_entidade) {
      setError('Preencha Nome de Exibição e Entidade.')
      return
    }
    setSaving(true)
    setError('')

    try {
      // 1. Create base house
      const res = await fetch('/api/admin/casas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_exibicao: draft.nome_exibicao,
          razao_social: draft.razao_social,
          icone_url: draft.icone_url,
          affiliate_url: draft.affiliate_url,
          id_entidade: draft.id_entidade,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erro ao criar casa')
      }

      const createdCasa = data.casa
      let hasRules = false

      // 2. Save Rules if any rules field is provided
      if (
        draft.regras_cpa ||
        draft.tempo_atualizacao ||
        draft.exige_documentacao ||
        draft.deposito_minimo ||
        draft.observacoes
      ) {
        const rulesRes = await fetch(`/api/admin/casas/${createdCasa.id}/regras`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            regras_cpa: draft.regras_cpa,
            tempo_atualizacao: draft.tempo_atualizacao,
            exige_documentacao: draft.exige_documentacao,
            deposito_minimo: draft.deposito_minimo ? parseFloat(draft.deposito_minimo) : null,
            observacoes: draft.observacoes,
          }),
        })

        const rulesData = await rulesRes.json()
        if (!rulesRes.ok || rulesData.error) {
          throw new Error(rulesData.error || 'Casa criada, mas erro ao salvar regras')
        }
        hasRules = true
      }

      // 3. Resolve display entities
      const selectedEntidade = entidades.find(e => e.id === draft.id_entidade)

      const newCasa: Casa = {
        id: createdCasa.id,
        nome_exibicao: createdCasa.nome_exibicao,
        razao_social: createdCasa.razao_social,
        icone_url: createdCasa.icone_url,
        ativo: createdCasa.ativo,
        created_at: createdCasa.created_at,
        id_entidade: createdCasa.id_entidade,
        entidades: selectedEntidade ? { id: selectedEntidade.id, nome: selectedEntidade.nome } : null,
        affiliate_url: createdCasa.affiliate_url ?? null,
        tem_regras: hasRules,
        materiais_count: 0,
      }

      setCasas(prev => [newCasa, ...prev])
      handleClearDraft()
      setIsCreating(false)
    } catch (err: any) {
      setError(err.message || 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-[var(--color-on-surface)]">Casas de Apostas</h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
            {casas.length} casa(s) ·{' '}
            <span style={{ color: '#22D3A5' }}>{casas.filter(c => c.ativo).length} ativa(s)</span>
            {' · '}
            <span style={{ color: '#ef4444' }}>{casas.filter(c => !c.ativo).length} inativa(s)</span>
          </p>
        </div>
        <button
          onClick={() => {
            setError('')
            setIsCreating(true)
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 transition-opacity hover:opacity-80 cursor-pointer"
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nova Casa
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <span className="material-symbols-outlined absolute pointer-events-none" style={{ left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--color-on-surface-variant)' }}>search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar casa..."
            className="w-full outline-none transition-all"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-outline-variant)',
              borderRadius: 10,
              color: 'var(--color-on-surface)',
              fontSize: '0.875rem',
              padding: '9px 14px 9px 34px',
              height: 40,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-outline-variant)' }}
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container)' }}>
          {(['todos', 'ativo', 'inativo'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: statusFilter === s ? 'var(--color-primary-container)' : 'transparent',
                color: statusFilter === s ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                border: 'none',
              }}
            >
              {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativas' : 'Inativas'}
            </button>
          ))}
        </div>

        {/* Result count */}
        {(search || statusFilter !== 'todos') && (
          <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <IntegracoesTab casas={filtered} entidades={entidades} setCasas={setCasas} />

      {/* Creation Drawer */}
      <Drawer
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title=""
        size="md"
      >
        <NewCasaDrawerContent
          draft={draft}
          setDraft={setDraft}
          entidades={entidades}
          onSave={handleCreateCasa}
          onCancel={() => setIsCreating(false)}
          onClear={handleClearDraft}
          saving={saving}
          error={error}
        />
      </Drawer>
    </div>
  )
}


