'use client'

import { useState, useEffect, useRef } from 'react'
import Drawer from '@/components/ui/Drawer'

interface Casa { id: string; nome_exibicao: string }
interface UserRole { id: string; role: string; ref_code: string | null }

interface Props {
  open: boolean
  casas: Casa[]
  userRoles: UserRole[]
  onClose: () => void
  onCreated: () => void
}

type TipoContrato = 'CPA' | 'REVSHARE' | 'MISTO'

const ROLE_LABELS: Record<string, string> = {
  INFLUENCER: 'Influenciador',
  INTERMEDIARIO: 'Intermediário',
  GERENTE: 'Gerente',
  ADMIN: 'Admin',
}

const TIPOS: TipoContrato[] = ['CPA', 'REVSHARE', 'MISTO']

function tipoBadgeStyle(tipo: string, selected: boolean) {
  if (!selected) return {
    background: 'var(--color-surface-container-high)',
    color: 'var(--color-on-surface-variant)',
    border: '1px solid var(--color-outline-variant)',
  }
  switch (tipo) {
    case 'CPA':      return { background: 'rgba(34,211,165,0.15)', color: '#22D3A5', border: '1px solid rgba(34,211,165,0.4)' }
    case 'REVSHARE': return { background: 'var(--color-primary-container, rgba(2,117,243,0.12))', color: 'var(--color-primary)', border: '1px solid var(--color-outline)' }
    case 'MISTO':    return { background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.4)' }
    default:         return {}
  }
}

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)] transition-colors'
const labelCls = 'text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]'

export default function NovoContratoAfiliadoDrawer({ open, casas, userRoles, onClose, onCreated }: Props) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    userRoles.length === 1 ? userRoles[0].id : ''
  )
  const [idCasa, setIdCasa] = useState('')
  const [tipo, setTipo] = useState<TipoContrato>('CPA')
  const [definirAfp, setDefinirAfp] = useState(false)
  const [afp, setAfp] = useState('')
  const [afpStatus, setAfpStatus] = useState<'idle' | 'loading' | 'ok' | 'taken'>('idle')
  const today = new Date().toISOString().slice(0, 10)
  const [dataInicio, setDataInicio] = useState(today)
  const [dataFimIndefinido, setDataFimIndefinido] = useState(true)
  const [dataFim, setDataFim] = useState('')
  const [cpaBruto, setCpaBruto] = useState('')
  const [aliquota, setAliquota] = useState('14.5')
  const [revsharePerc, setRevsharePerc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const afpCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!definirAfp || !afp || !/^[A-Z0-9]{8}$/.test(afp)) {
      setAfpStatus('idle'); return
    }
    setAfpStatus('loading')
    if (afpCheckTimer.current) clearTimeout(afpCheckTimer.current)
    afpCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/contratos/check-afp?afp=${encodeURIComponent(afp)}`)
        const json = await res.json()
        setAfpStatus(json.exists ? 'taken' : 'ok')
      } catch {
        setAfpStatus('idle')
      }
    }, 400)
    return () => { if (afpCheckTimer.current) clearTimeout(afpCheckTimer.current) }
  }, [afp, definirAfp])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoleId || !idCasa) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_user_role: selectedRoleId,
          id_casa: idCasa,
          afp: (definirAfp && afp) ? afp : null,
          tipo_contrato: tipo,
          data_inicio: dataInicio,
          data_fim: dataFimIndefinido ? null : (dataFim || null),
          cpa_bruto: cpaBruto !== '' ? cpaBruto : null,
          aliquota_imposto: aliquota !== '' ? aliquota : null,
          revshare_percentual: revsharePerc !== '' ? revsharePerc : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao criar contrato'); return }
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  const isValidAfp = definirAfp ? (afp && /^[A-Z0-9]{8}$/.test(afp) && afpStatus === 'ok') : true
  const canSubmit = !!selectedRoleId && !!idCasa && !!isValidAfp && !!dataInicio && !saving

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="font-bold text-base text-[var(--color-on-surface)]">Novo Contrato</p>
          <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60 mt-0.5">
            Vincula usuário a casa de aposta
          </p>
        </div>
      }
      size="md"
    >
      <form onSubmit={submit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-7">

          {error && (
            <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Role */}
          {userRoles.length > 1 && (
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                Papel do Contrato
              </h3>
              <div className="flex flex-col gap-2">
                {userRoles.map(ur => (
                  <button
                    key={ur.id} type="button"
                    onClick={() => setSelectedRoleId(ur.id)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all border"
                    style={
                      selectedRoleId === ur.id
                        ? { background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', borderColor: 'var(--color-primary)' }
                        : { background: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)', borderColor: 'var(--color-outline-variant)' }
                    }
                  >
                    <span className="font-medium">{ROLE_LABELS[ur.role] ?? ur.role}</span>
                    {ur.ref_code && <span className="font-mono text-xs opacity-70">{ur.ref_code}</span>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {userRoles.length === 1 && (
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
              style={{ background: 'var(--color-surface-container)', borderColor: 'var(--color-outline-variant)' }}
            >
              <span className="text-sm font-medium text-[var(--color-on-surface)]">
                {ROLE_LABELS[userRoles[0].role] ?? userRoles[0].role}
              </span>
              {userRoles[0].ref_code && (
                <span className="font-mono text-xs text-[var(--color-on-surface-variant)] opacity-70">
                  {userRoles[0].ref_code}
                </span>
              )}
            </div>
          )}

          <hr className="border-[var(--color-outline-variant)]" />

          {/* Contrato */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">contract</span>
              Contrato
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Casa de Aposta <span className="text-red-400">*</span></label>
              <select
                className={inputCls + ' cursor-pointer'}
                style={{ colorScheme: 'dark' }}
                value={idCasa}
                onChange={e => setIdCasa(e.target.value)}
                required
              >
                <option value="">Selecionar casa…</option>
                {casas.map(c => <option key={c.id} value={c.id}>{c.nome_exibicao}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Tipo de Contrato <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                {TIPOS.map(t => (
                  <button key={t} type="button" onClick={() => setTipo(t)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={tipoBadgeStyle(t, tipo === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] cursor-pointer select-none">
                <input type="checkbox" checked={definirAfp}
                  onChange={e => { setDefinirAfp(e.target.checked); if (!e.target.checked) { setAfp(''); setAfpStatus('idle') } }}
                  className="rounded"
                />
                Definir AFP manualmente
              </label>
              {definirAfp && (
                <>
                  <input type="text" className={inputCls}
                    value={afp}
                    onChange={e => setAfp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    maxLength={8} placeholder="Ex: NICK1234"
                  />
                  {afpStatus === 'loading' && <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60">Verificando…</p>}
                  {afpStatus === 'ok' && <p className="text-xs text-emerald-400 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span>AFP disponível</p>}
                  {afpStatus === 'taken' && <p className="text-xs text-red-400 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cancel</span>AFP já existe</p>}
                  {afp.length > 0 && afp.length < 8 && <p className="text-xs text-amber-400">AFP deve ter exatamente 8 caracteres.</p>}
                </>
              )}
            </div>
          </section>

          <hr className="border-[var(--color-outline-variant)]" />

          {/* Histórico inicial */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">history</span>
              Condições Financeiras Iniciais
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Data de Início <span className="text-red-400">*</span></label>
                <input type="date" className={inputCls} style={{ colorScheme: 'dark' }}
                  value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Data de Fim</label>
                {dataFimIndefinido ? (
                  <div className="flex items-center h-9 px-3 rounded-xl text-xs text-[var(--color-on-surface-variant)] opacity-60 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">Indefinido</div>
                ) : (
                  <input type="date" className={inputCls} style={{ colorScheme: 'dark' }}
                    value={dataFim} onChange={e => setDataFim(e.target.value)} min={dataInicio} />
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] cursor-pointer select-none -mt-1">
              <input type="checkbox" checked={dataFimIndefinido} onChange={e => setDataFimIndefinido(e.target.checked)} className="rounded" />
              Sem data de fim definida
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>CPA Bruto (R$)</label>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={cpaBruto} onChange={e => setCpaBruto(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Alíquota Imposto (%)</label>
                <input type="number" min="0" max="100" step="0.01" className={inputCls} placeholder="14.5" value={aliquota} onChange={e => setAliquota(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>RevShare (%)</label>
                <input type="number" min="0" max="100" step="0.01" className={inputCls} placeholder="0.00" value={revsharePerc} onChange={e => setRevsharePerc(e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-6 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-outline-variant)', background: 'var(--color-surface-container-high)' }}
        >
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
          >
            Cancelar
          </button>
          <button type="submit" disabled={!canSubmit}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving
              ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Criando…</>
              : <><span className="material-symbols-outlined text-[16px]">add_task</span>Criar Contrato</>
            }
          </button>
        </div>
      </form>
    </Drawer>
  )
}
