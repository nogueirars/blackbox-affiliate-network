'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Drawer from '@/components/ui/Drawer'
import { fetchCep } from '@/lib/cep'

type Entidade = {
  id: string
  razao_social: string
  nome_fantasia: string
  cnpj: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  cep: string
  ativo: boolean
  created_at: string
  _count: { casas_aposta: number }
}

type FormData = {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

const EMPTY_FORM: FormData = {
  razao_social: '', nome_fantasia: '', cnpj: '',
  logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '', cep: '',
}

function toForm(e: Entidade): FormData {
  return {
    razao_social: e.razao_social,
    nome_fantasia: e.nome_fantasia,
    cnpj: e.cnpj,
    logradouro: e.logradouro,
    numero: e.numero,
    complemento: e.complemento ?? '',
    bairro: e.bairro,
    cidade: e.cidade,
    estado: e.estado,
    cep: e.cep,
  }
}

function fmtCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function fmtCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{5})(\d)/, '$1-$2')
}

// ── Small UI helpers ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--color-on-surface)' }}>{value || '—'}</p>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, required, mono, maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  mono?: boolean
  maxLength?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>
        {label}{required && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors focus:border-[var(--color-primary)] ${mono ? 'font-mono' : ''}`}
        style={{
          background: 'var(--color-surface-container)',
          borderColor: 'var(--color-outline-variant)',
          color: 'var(--color-on-surface)',
        }}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EntidadesClient({ entidades: initial }: { entidades: Entidade[] }) {
  const router = useRouter()
  const [entidades, setEntidades] = useState(initial)
  const [search, setSearch] = useState('')

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Entidade | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Form state
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [createDraft, setCreateDraft] = useState<FormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState('')

  function openCreate() {
    setSelected(null)
    setIsCreating(true)
    setIsEditing(true)
    setConfirmingDelete(false)
    setForm(createDraft ?? EMPTY_FORM)
    setFormError('')
    setDrawerOpen(true)
  }

  function openView(e: Entidade) {
    setSelected(e)
    setIsCreating(false)
    setIsEditing(false)
    setConfirmingDelete(false)
    setForm(toForm(e))
    setFormError('')
    setDrawerOpen(true)
  }

  function startEdit() {
    setIsEditing(true)
    setFormError('')
  }

  function cancelEdit() {
    if (isCreating) {
      setCreateDraft(null)
      setIsCreating(false)
      setIsEditing(false)
      setForm(EMPTY_FORM)
      setFormError('')
      setDrawerOpen(false)
      return
    }
    setIsEditing(false)
    setFormError('')
    if (selected) setForm(toForm(selected))
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setConfirmingDelete(false)
  }

  function setField(field: keyof FormData) {
    return (raw: string) => {
      let v = raw
      if (field === 'cnpj') v = fmtCnpj(v)
      if (field === 'cep') v = fmtCep(v)
      if (field === 'estado') v = v.toUpperCase().slice(0, 2)
      setForm(f => ({ ...f, [field]: v }))
      if (isCreating) setCreateDraft(f => ({ ...(f ?? EMPTY_FORM), [field]: v }))
    }
  }

  async function handleCepChange(raw: string) {
    const formatted = fmtCep(raw)
    setField('cep')(raw)
    if (isCreating) setCreateDraft(f => ({ ...(f ?? EMPTY_FORM), cep: formatted }))

    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) return

    setCepLoading(true)
    try {
      const result = await fetchCep(digits)
      if (result) {
        setForm(f => ({
          ...f,
          cep: formatted,
          logradouro: result.logradouro || f.logradouro,
          bairro: result.bairro || f.bairro,
          cidade: result.cidade || f.cidade,
          estado: result.estado || f.estado,
        }))
        if (isCreating) {
          setCreateDraft(f => ({
            ...(f ?? EMPTY_FORM),
            cep: formatted,
            logradouro: result.logradouro || (f?.logradouro ?? ''),
            bairro: result.bairro || (f?.bairro ?? ''),
            cidade: result.cidade || (f?.cidade ?? ''),
            estado: result.estado || (f?.estado ?? ''),
          }))
        }
      }
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSave() {
    setFormError('')
    const req: (keyof FormData)[] = ['razao_social', 'nome_fantasia', 'cnpj', 'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep']
    if (req.some(k => !form[k].trim())) { setFormError('Preencha todos os campos obrigatórios.'); return }

    setSaving(true)
    try {
      const url = isCreating ? '/api/admin/entidades' : `/api/admin/entidades/${selected!.id}`
      const res = await fetch(url, {
        method: isCreating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Erro ao salvar'); return }

      router.refresh()
      if (isCreating) {
        setCreateDraft(null)
        closeDrawer()
      } else {
        const updated = { ...selected!, ...form }
        setSelected(updated)
        setEntidades(prev => prev.map(x => x.id === selected!.id ? updated : x))
        setIsEditing(false)
      }
    } catch {
      setFormError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle() {
    if (!selected) return
    setToggling(true)
    try {
      const res = await fetch(`/api/admin/entidades/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !selected.ativo }),
      })
      if (res.ok) {
        const updated = { ...selected, ativo: !selected.ativo }
        setSelected(updated)
        setEntidades(prev => prev.map(x => x.id === selected.id ? updated : x))
      }
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/entidades/${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Erro ao deletar'); setConfirmingDelete(false); return }
      setEntidades(prev => prev.filter(x => x.id !== selected.id))
      closeDrawer()
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = selected ? selected._count.casas_aposta === 0 : true

  const filteredEntidades = search.trim()
    ? entidades.filter(e =>
        e.razao_social.toLowerCase().includes(search.toLowerCase()) ||
        e.nome_fantasia.toLowerCase().includes(search.toLowerCase()) ||
        e.cnpj.includes(search)
      )
    : entidades

  // ── Drawer title ────────────────────────────────────────────────────────────
  const drawerTitle = (
    <div className="flex flex-col gap-1 min-w-0">
      {isCreating ? (
        <p className="text-headline-sm font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>Nova Entidade</p>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-headline-sm font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>
              {selected?.razao_social}
            </p>
            {selected && (
              <span className={`badge flex-shrink-0 ${selected.ativo ? 'badge-green' : 'badge-gray'}`}>
                <span className={`status-dot ${selected.ativo ? 'status-dot-green' : 'status-dot-gray'}`} />
                {selected.ativo ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
          {selected?.nome_fantasia && (
            <p className="text-xs truncate" style={{ color: 'var(--color-on-surface-variant)' }}>{selected.nome_fantasia}</p>
          )}
        </>
      )}
    </div>
  )

  // ── Drawer footer ───────────────────────────────────────────────────────────
  const drawerFooter = (
    <div className="px-6 py-4">
      {confirmingDelete ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5" style={{ color: 'var(--color-error)' }}>warning</span>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>Confirmar exclusão</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                Esta ação é permanente e não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingDelete(false)}
              className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--color-error)', color: '#fff', border: 'none', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}
            >
              {deleting ? <Spinner /> : null}
              {deleting ? 'Deletando…' : 'Deletar permanentemente'}
            </button>
          </div>
        </div>
      ) : isEditing ? (
        <div className="flex gap-2">
          <button
            onClick={cancelEdit}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Spinner /> : null}
            {saving ? 'Salvando…' : isCreating ? 'Criar entidade' : 'Salvar alterações'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--color-surface-container-high)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Editar
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: selected?.ativo ? 'rgba(34,211,165,0.1)' : 'var(--color-surface-container-high)',
              border: `1px solid ${selected?.ativo ? 'rgba(34,211,165,0.3)' : 'var(--color-outline-variant)'}`,
              color: selected?.ativo ? '#22D3A5' : 'var(--color-on-surface-variant)',
              cursor: toggling ? 'default' : 'pointer',
              opacity: toggling ? 0.7 : 1,
            }}
          >
            {toggling ? <Spinner /> : <span className="material-symbols-outlined text-[16px]">{selected?.ativo ? 'toggle_on' : 'toggle_off'}</span>}
            {selected?.ativo ? 'Desativar' : 'Ativar'}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => canDelete ? setConfirmingDelete(true) : undefined}
            disabled={!canDelete}
            title={canDelete ? 'Deletar entidade' : `Possui ${selected?._count.casas_aposta} casa(s) vinculada(s)`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: canDelete ? 'rgba(239,68,68,0.08)' : 'var(--color-surface-container)',
              border: `1px solid ${canDelete ? 'rgba(239,68,68,0.2)' : 'var(--color-outline-variant)'}`,
              color: canDelete ? 'var(--color-error)' : 'var(--color-outline)',
              cursor: canDelete ? 'pointer' : 'not-allowed',
              opacity: canDelete ? 1 : 0.5,
            }}
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Deletar
          </button>
        </div>
      )}

      {formError && !isEditing && (
        <p className="mt-3 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.15)' }}>
          {formError}
        </p>
      )}
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-[var(--color-on-surface)]">Entidades</h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
            {entidades.length} entidade(s) cadastrada(s)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nova Entidade
          {createDraft && Object.values(createDraft).some(v => v) && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" title="Rascunho salvo" />
          )}
        </button>
      </div>

      {/* Search */}
      {entidades.length > 0 && (
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)' }}
          />
        </div>
      )}

      {/* Table */}
      {entidades.length === 0 ? (
        <div className="glass-card rounded-xl py-16 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] opacity-25" style={{ color: 'var(--color-on-surface-variant)' }}>business</span>
          <p className="text-sm font-medium" style={{ color: 'var(--color-outline)' }}>Nenhuma entidade cadastrada</p>
          <button onClick={openCreate} className="text-sm hover:underline" style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Criar primeira entidade
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="orbit-table w-full">
              <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Razão Social</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>CNPJ</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Casas</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Cadastro</th>
                  <th className="w-8 pr-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-outline-variant)' }}>
                {filteredEntidades.length === 0 && search ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                      Nenhuma entidade encontrada para &ldquo;{search}&rdquo;
                    </td>
                  </tr>
                ) : filteredEntidades.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => openView(e)}
                    className="cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-[var(--color-on-surface)]">{e.razao_social}</p>
                      <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{e.nome_fantasia}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--color-on-surface-variant)]">{e.cnpj}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">
                      {e._count.casas_aposta} casa{e._count.casas_aposta !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${e.ativo ? 'badge-green' : 'badge-gray'}`}>
                        <span className={`status-dot ${e.ativo ? 'status-dot-green' : 'status-dot-gray'}`} />
                        {e.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="pr-4">
                      <div className="flex justify-end">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                          <path d="M6 3l5 5-5 5" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerTitle}
        footer={drawerFooter}
      >
        <div className="p-6 flex flex-col gap-6">
          {isEditing ? (
            /* ── Edit / Create form ─────────────────────────────── */
            <>
              <section className="flex flex-col gap-3">
                <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>Dados da Empresa</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Razão Social" required value={form.razao_social} onChange={setField('razao_social')} placeholder="Empresa Ltda." />
                  <Field label="Nome Fantasia" required value={form.nome_fantasia} onChange={setField('nome_fantasia')} placeholder="Empresa" />
                </div>
                <Field label="CNPJ" required mono value={form.cnpj} onChange={setField('cnpj')} placeholder="00.000.000/0000-00" />
              </section>

              <div className="h-px" style={{ background: 'var(--color-outline-variant)' }} />

              <section className="flex flex-col gap-3">
                <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>Endereço</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative">
                    <Field label="CEP" required value={form.cep} onChange={handleCepChange} placeholder="00000-000" />
                    {cepLoading && (
                      <div className="absolute right-3 top-[30px] flex items-center" style={{ height: 36 }}>
                        <Spinner />
                      </div>
                    )}
                  </div>
                  <Field label="Cidade" required value={form.cidade} onChange={setField('cidade')} placeholder="Cidade" />
                  <Field label="Estado" required value={form.estado} onChange={setField('estado')} placeholder="SP" maxLength={2} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="Logradouro" required value={form.logradouro} onChange={setField('logradouro')} placeholder="Rua, Av., Travessa..." />
                  </div>
                  <Field label="Número" required value={form.numero} onChange={setField('numero')} placeholder="123" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Bairro" required value={form.bairro} onChange={setField('bairro')} placeholder="Bairro" />
                  <Field label="Complemento" value={form.complemento} onChange={setField('complemento')} placeholder="Sala, Andar, Bloco..." />
                </div>
              </section>

              {formError && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  {formError}
                </p>
              )}
            </>
          ) : selected ? (
            /* ── View mode ──────────────────────────────────────── */
            <>
              {/* Summary card */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)' }}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <InfoRow label="Razão Social" value={selected.razao_social} />
                  <InfoRow label="Nome Fantasia" value={selected.nome_fantasia} />
                  <InfoRow label="CNPJ" value={selected.cnpj} />
                  <InfoRow label="Casas de Apostas" value={`${selected._count.casas_aposta} vinculada${selected._count.casas_aposta !== 1 ? 's' : ''}`} />
                </div>
              </div>

              {/* Address card */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)' }}>
                <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>Endereço</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <InfoRow
                      label="Logradouro"
                      value={[selected.logradouro, selected.numero, selected.complemento].filter(Boolean).join(', ')}
                    />
                  </div>
                  <InfoRow label="Bairro" value={selected.bairro} />
                  <InfoRow label="CEP" value={selected.cep} />
                  <InfoRow label="Cidade" value={selected.cidade} />
                  <InfoRow label="Estado" value={selected.estado} />
                </div>
              </div>

              {/* Meta */}
              <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)' }}>
                <InfoRow
                  label="Cadastrado em"
                  value={new Date(selected.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                />
              </div>

              {!canDelete && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }}>info</span>
                  <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
                    Esta entidade possui <strong style={{ color: 'var(--color-on-surface)' }}>{selected._count.casas_aposta} casa(s)</strong> vinculada(s) e não pode ser deletada. Desative-a se necessário.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </Drawer>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="animate-spin" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="17 9" />
    </svg>
  )
}
