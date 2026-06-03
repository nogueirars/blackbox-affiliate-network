import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Casa, EntidadeOption, RegrasCasa, MaterialPublicidade } from '../types'
import { fmtDateLong, initials, Spinner, Field, Select, InfoRow } from '../utils'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

interface Props {
  casa: Casa
  entidades: EntidadeOption[]
  onUpdateCasa: (updated: Casa) => void
}

export default function CasaDrawerContent({ casa, entidades, onUpdateCasa }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [regras, setRegras] = useState<RegrasCasa | null>(null)
  const [loadingRegras, setLoadingRegras] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/casas/${casa.id}/regras`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setRegras(data)
      })
      .finally(() => setLoadingRegras(false))
  }, [casa.id])

  async function handleToggle() {
    setToggling(true)
    try {
      const res = await fetch(`/api/admin/casas/${casa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !casa.ativo }),
      })
      if (res.ok) {
        onUpdateCasa({ ...casa, ativo: !casa.ativo })
      }
    } finally { setToggling(false) }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] text-[var(--color-on-surface)] relative">
      {/* Header Info */}
      <div className="p-6 pb-4 flex flex-col gap-4 border-b border-[var(--color-outline-variant)] sticky top-0 bg-[var(--color-surface)] z-10">
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm"
            style={{ background: casa.icone_url ? 'transparent' : 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)', overflow: 'hidden' }}
          >
            {casa.icone_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={casa.icone_url.startsWith('/') ? `/s3${casa.icone_url}` : casa.icone_url} alt={casa.nome_exibicao} className="w-full h-full object-cover" />
              : initials(casa.nome_exibicao)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-xl leading-tight truncate">{casa.nome_exibicao}</h2>
            {casa.razao_social && <p className="text-xs text-[var(--color-on-surface-variant)] opacity-70 truncate mt-0.5">{casa.razao_social}</p>}
            
            <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
              {casa.entidades?.nome ? (
                <div className="flex items-center gap-1 text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-md">
                   <span className="material-symbols-outlined text-[12px]">domain</span>
                   <span className="truncate max-w-[120px]">{casa.entidades.nome}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                   <span className="material-symbols-outlined text-[12px]">warning</span>
                   Sem entidade
                </div>
              )}
              <div className="flex items-center gap-1 opacity-70">
                 <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                 {fmtDateLong(casa.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {isEditing ? (
          <EditMode 
            casa={casa} 
            entidades={entidades} 
            regras={regras}
            onUpdateCasa={(c, r) => {
              onUpdateCasa(c)
              setRegras(r)
            }}
            onCancel={() => setIsEditing(false)} 
          />
        ) : (
          <div className="p-6 flex flex-col gap-8">
            {casa.affiliate_url && (
              <section>
                <h3 className="font-semibold mb-3 text-[var(--color-primary)] flex items-center gap-2 text-sm uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]">link</span>
                  URL de Afiliação
                </h3>
                <a
                  href={casa.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-sm text-[var(--color-primary)] hover:underline break-all"
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0">open_in_new</span>
                  {casa.affiliate_url}
                </a>
              </section>
            )}

            {casa.affiliate_url && <hr className="border-[var(--color-outline-variant)]" />}

            <section>
              <h3 className="font-semibold mb-3 text-[var(--color-primary)] flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">rule_folder</span>
                Regras da Casa
              </h3>
              {loadingRegras ? <Spinner /> : <ViewRegras casa={casa} regras={regras} />}
            </section>
            
            <hr className="border-[var(--color-outline-variant)]" />
            
            <section>
              <h3 className="font-semibold mb-3 text-[var(--color-primary)] flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">campaign</span>
                Materiais de Publicidade
              </h3>
              <MateriaisSection casa={casa} onUpdateCasa={onUpdateCasa} />
            </section>
          </div>
        )}
      </div>

      {/* View Mode Footer */}
      {!isEditing && (
        <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] sticky bottom-0 z-20 flex items-center justify-between">
          <button onClick={handleToggle} disabled={toggling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: casa.ativo ? 'rgba(34,211,165,0.1)' : 'var(--color-surface-container-high)',
              border: `1px solid ${casa.ativo ? 'rgba(34,211,165,0.3)' : 'var(--color-outline-variant)'}`,
              color: casa.ativo ? '#22D3A5' : 'var(--color-on-surface-variant)'
            }}>
            {toggling ? <Spinner /> : <span className="material-symbols-outlined text-[16px]">{casa.ativo ? 'toggle_on' : 'toggle_off'}</span>}
            {casa.ativo ? 'Desativar Casa' : 'Ativar Casa'}
          </button>
          
          <div className="flex items-center gap-3">
            <Link href={`/admin/casas/${casa.id}`}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors">
              <span className="material-symbols-outlined text-[18px]">visibility</span> Ver Produção
            </Link>

            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md"
              style={{ background: 'var(--color-primary)' }}>
              <span className="material-symbols-outlined text-[18px]">edit</span> Editar Casa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ViewRegras({ casa, regras }: { casa: Casa; regras: RegrasCasa | null }) {
  if (!casa.tem_regras || !regras) {
    return (
      <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl flex gap-2 items-start text-sm">
        <span className="material-symbols-outlined text-[18px]">warning</span>
        Esta casa não possui regras cadastradas. Edite a casa para adicioná-las.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {regras.regras_cpa && (
         <div className="p-4 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] shadow-sm">
           <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-on-surface-variant)] opacity-70 mb-2">Validação do CPA</p>
           <p className="text-sm whitespace-pre-wrap leading-relaxed">{regras.regras_cpa}</p>
         </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {regras.tempo_atualizacao && (
          <div className="p-3 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-on-surface-variant)] opacity-70 mb-1">Atualização</p>
            <p className="text-sm font-medium text-[var(--color-on-surface)]">{regras.tempo_atualizacao}</p>
          </div>
        )}
        {regras.exige_documentacao && (
          <div className="p-3 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-on-surface-variant)] opacity-70 mb-1">Documentação</p>
            <p className="text-sm font-medium text-[var(--color-on-surface)]">{regras.exige_documentacao}</p>
          </div>
        )}
        {regras.deposito_minimo !== null && (
          <div className="p-3 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-on-surface-variant)] opacity-70 mb-1">Depósito Mínimo</p>
            <p className="text-sm font-medium text-[#22D3A5]">R$ {regras.deposito_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        )}
      </div>

      {regras.observacoes && (
         <div className="p-4 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
           <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-on-surface-variant)] opacity-70 mb-1">Observações Adicionais</p>
           <p className="text-sm text-[var(--color-on-surface-variant)]">{regras.observacoes}</p>
         </div>
      )}
    </div>
  )
}

function EditMode({ casa, entidades, regras, onUpdateCasa, onCancel }: { casa: Casa; entidades: EntidadeOption[]; regras: RegrasCasa | null; onUpdateCasa: (c: Casa, r: RegrasCasa) => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Dados Gerais Form
  const [gerais, setGerais] = useState({
    nome_exibicao: casa.nome_exibicao,
    razao_social: casa.razao_social || '',
    icone_url: casa.icone_url || '',
    affiliate_url: casa.affiliate_url || '',
    id_entidade: casa.id_entidade || '',
  })
  const setGer = (k: keyof typeof gerais) => (v: string) => setGerais(p => ({ ...p, [k]: v }))

  // Regras Form
  const [regrasForm, setRegrasForm] = useState({
    regras_cpa: regras?.regras_cpa || '',
    tempo_atualizacao: regras?.tempo_atualizacao || '',
    exige_documentacao: regras?.exige_documentacao || '',
    deposito_minimo: regras?.deposito_minimo?.toString() || '',
    observacoes: regras?.observacoes || '',
  })
  const setReg = (k: keyof typeof regrasForm) => (v: string) => setRegrasForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!gerais.nome_exibicao || !gerais.id_entidade) {
      setError('Preencha Nome de Exibição e Entidade.'); return
    }
    setSaving(true); setError('')

    try {
      // 1. Salvar Dados Gerais
      const res1 = await fetch(`/api/admin/casas/${casa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gerais),
      })
      if (!res1.ok) throw new Error('Erro ao salvar dados gerais')
      
      // 2. Salvar Regras
      const res2 = await fetch(`/api/admin/casas/${casa.id}/regras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regrasForm,
          deposito_minimo: regrasForm.deposito_minimo ? parseFloat(regrasForm.deposito_minimo) : null,
        }),
      })
      if (!res2.ok) throw new Error('Erro ao salvar regras')
      const regrasData = await res2.json()

      // 3. Atualizar Estado Pai
      const updatedCasa: Casa = {
        ...casa,
        nome_exibicao: gerais.nome_exibicao.trim(),
        razao_social: gerais.razao_social.trim(),
        icone_url: gerais.icone_url.trim() || null,
        affiliate_url: gerais.affiliate_url.trim() || null,
        id_entidade: gerais.id_entidade || null,
        entidades: entidades.find(e => e.id === gerais.id_entidade) ?? casa.entidades,
        tem_regras: true,
      }
      onUpdateCasa(updatedCasa, regrasData)
      onCancel()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      <div className="p-6 flex flex-col gap-8 flex-1">
        {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">{error}</div>}
        
        <section className="flex flex-col gap-4">
          <h3 className="font-semibold text-[var(--color-primary)] text-sm uppercase tracking-wider">Dados Principais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome de Exibição *" value={gerais.nome_exibicao} onChange={setGer('nome_exibicao')} placeholder="Ex: Betano" />
            <Field label="Razão Social" value={gerais.razao_social} onChange={setGer('razao_social')} placeholder="Ex: Empresa Ltda." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Ícone da Casa</label>
            <div className="flex items-center gap-4">
              {gerais.icone_url && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--color-outline-variant)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gerais.icone_url.startsWith('/') ? `/s3${gerais.icone_url}` : gerais.icone_url} alt="Icon preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const fd = new FormData()
                    fd.append('file', file)
                    fd.append('type', 'icon')
                    try {
                      const res = await fetch(`/api/admin/casas/${casa.id}/upload`, { method: 'POST', body: fd })
                      const data = await res.json()
                      if (data.success) setGer('icone_url')(data.path)
                    } catch (err) { alert('Erro no upload') }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)]">
                  Enviar nova imagem...
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-on-surface-variant)] opacity-70">Envia a imagem para o S3 imediatamente. Salve para confirmar as outras alterações.</p>
          </div>
          <Field label="URL de Afiliação" value={gerais.affiliate_url} onChange={setGer('affiliate_url')} placeholder="https://..." />
          <Select
            label="Entidade vinculada *"
            value={gerais.id_entidade}
            onChange={setGer('id_entidade')}
            options={entidades.map(e => ({ value: e.id, label: e.nome }))}
          />
        </section>

        <hr className="border-[var(--color-outline-variant)]" />

        <section className="flex flex-col gap-4">
          <h3 className="font-semibold text-[var(--color-primary)] text-sm uppercase tracking-wider">Regras de Negócio</h3>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Validação do CPA</label>
            <textarea
              value={regrasForm.regras_cpa}
              onChange={e => setReg('regras_cpa')(e.target.value)}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 h-20 resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              placeholder="Ex: Depósito mínimo de R$ 30 + 1 aposta de R$ 10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tempo de Atualização" value={regrasForm.tempo_atualizacao} onChange={setReg('tempo_atualizacao')} placeholder="Ex: A cada 24h" />
            <Field label="Exige Documentação?" value={regrasForm.exige_documentacao} onChange={setReg('exige_documentacao')} placeholder="Ex: Após depósito" />
            <Field label="Depósito Mínimo (R$)" value={regrasForm.deposito_minimo} onChange={setReg('deposito_minimo')} type="number" placeholder="Ex: 30" />
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Observações</label>
            <textarea
              value={regrasForm.observacoes}
              onChange={e => setReg('observacoes')(e.target.value)}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 h-16 resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
              placeholder="Notas adicionais..."
            />
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] sticky bottom-0 z-20 flex items-center gap-3">
        <button onClick={onCancel} className="px-6 py-2 rounded-xl text-sm font-medium bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)]">
          Cancelar
        </button>
        <div className="flex-1" />
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90">
          {saving ? <Spinner /> : <span className="material-symbols-outlined text-[18px]">save</span>}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  )
}

function MateriaisSection({ casa, onUpdateCasa }: { casa: Casa; onUpdateCasa: (c: Casa) => void }) {
  const [materiais, setMateriais] = useState<MaterialPublicidade[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [file])
  
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
  })
  const setField = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch(`/api/admin/casas/${casa.id}/materiais`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMateriais(data)
        } else {
          setMateriais([])
        }
      })
      .catch(() => setMateriais([]))
      .finally(() => setLoading(false))
  }, [casa.id])

  async function handleAdd() {
    if (!form.nome || !file) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'material')
      fd.append('nome', form.nome)
      if (form.descricao) fd.append('descricao', form.descricao)

      const res = await fetch(`/api/admin/casas/${casa.id}/upload`, {
        method: 'POST',
        body: fd
      })
      if (!res.ok) throw new Error('Failed to create')
      const data = await res.json()
      if (data.success && data.material) {
        setMateriais(prev => [data.material, ...prev])
        onUpdateCasa({ ...casa, materiais_count: (casa.materiais_count || 0) + 1 })
        setIsAdding(false)
        setForm({ nome: '', descricao: '' })
        setFile(null)
      }
    } catch {
      alert('Erro ao enviar material')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-10 flex justify-center"><Spinner /></div>

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-on-surface-variant)]">{materiais.length} materiais cadastrados</p>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] shadow-sm">
            <span className="material-symbols-outlined text-[14px]">add</span> Novo Material
          </button>
        )}
      </div>

      {isAdding && mounted && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          {/* Backdrop */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setIsAdding(false)} />
          
          {/* Modal Content */}
          <div 
            className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-outline-variant)] flex flex-col overflow-hidden animate-fade-in shrink-0"
            style={{ width: '100%', maxWidth: '500px', minWidth: '320px' }}
          >
            <div className="p-4 border-b border-[var(--color-outline-variant)] flex items-center justify-between bg-[var(--color-surface-container-low)]">
              <h3 className="font-bold text-lg text-[var(--color-on-surface)]">Novo Material</h3>
              <button onClick={() => { setIsAdding(false); setFile(null) }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <Field label="Nome do Material *" value={form.nome} onChange={setField('nome')} required placeholder="Ex: Banner Stories Março" />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setField('descricao')(e.target.value)}
                  className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 h-20 resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                  placeholder="Detalhes sobre o material..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Arquivo *</label>
                <div className="flex items-center gap-3 relative">
                  <input
                    type="file"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:brightness-110 pointer-events-none">
                    Escolher arquivo
                  </button>
                  <span className="text-sm text-[var(--color-on-surface-variant)] truncate max-w-[200px]">
                    {file ? file.name : 'Nenhum arquivo escolhido'}
                  </span>
                </div>
                {previewUrl && (
                  <div className="mt-3 w-full h-40 rounded-xl overflow-hidden border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex items-center justify-center relative shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview do arquivo" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-2 opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-medium uppercase tracking-wider">{file?.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex items-center justify-end gap-3">
              <button onClick={() => { setIsAdding(false); setFile(null) }} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)]">Cancelar</button>
              <button onClick={handleAdd} disabled={saving || !file} className="disabled:opacity-50 px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-[#a855f7] text-white hover:bg-[#9333ea] shadow-md transition-all active:scale-[0.98]">
                {saving ? <Spinner /> : <span className="material-symbols-outlined text-[18px]">upload</span>}
                {saving ? 'Enviando...' : 'Enviar Material'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {materiais.length === 0 && !isAdding ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-2 opacity-50 bg-[var(--color-surface-container)] rounded-xl border border-dashed border-[var(--color-outline-variant)]">
          <span className="material-symbols-outlined text-[40px]">imagesmode</span>
          <p className="text-sm">Nenhum material de publicidade disponível.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {materiais.map(m => {
            const isImage = m.file_path?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || m.file_type?.startsWith('image/')
            return (
              <div key={m.id} className="p-3 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex gap-3 items-center group shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-[var(--color-surface)] flex items-center justify-center border border-[var(--color-outline-variant)] overflow-hidden shrink-0">
                  {isImage && m.file_path && m.file_path !== '/placeholder/path.png' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.file_path.startsWith('/') ? `/s3${m.file_path}` : m.file_path} alt={m.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px] text-[var(--color-on-surface-variant)]">
                      {isImage || m.file_path === '/placeholder/path.png' ? 'image' : 'insert_drive_file'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[var(--color-on-surface)] truncate leading-tight">{m.nome}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                    {m.descricao && <span className="truncate max-w-[200px]">{m.descricao}</span>}
                    {m.descricao && <span>•</span>}
                    {m.file_size && <span>{formatBytes(Number(m.file_size))}</span>}
                  </div>
                </div>
                <a href={`/s3${m.file_path}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all shadow-sm" title="Baixar material">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
