'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Drawer from '@/components/ui/Drawer'
import { SaqueProgressTracker } from '@/components/saques/SaqueProgressTracker'
import type { SaqueAtivo } from '@/components/saques/SaqueProgressTracker'
import { StatCard } from '@/components/ui/StatCard'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const inputCls: React.CSSProperties = {
  background:   'var(--color-surface-container-highest)',
  border:       '1px solid var(--color-outline-variant)',
  color:        'var(--color-on-surface)',
  borderRadius: '0.625rem',
  padding:      '0.625rem 0.875rem',
  fontSize:     '0.875rem',
  outline:      'none',
  width:        '100%',
}

const STATUS_MAP: Record<string, { label: string; bc: string }> = {
  AGUARDANDO_LIBERACAO: { label: 'Ag. Liberação', bc: 'badge-gray'   },
  AGUARDANDO_NF:        { label: 'Aguardando NF', bc: 'badge-yellow' },
  PROCESSANDO:          { label: 'Processando',   bc: 'badge-blue'   },
  CONCLUIDO:            { label: 'Concluído',      bc: 'badge-green'  },
  FALHA:                { label: 'Falha',          bc: 'badge-red'    },
  MANUAL:               { label: 'Manual',         bc: 'badge-gray'   },
}

function isValidCnpj(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length !== 14) return false
  if (/^(\d)\1+$/.test(d)) return false // all same digits
  const calc = (digits: string, weights: number[]) =>
    digits.split('').reduce((sum, n, i) => sum + Number(n) * weights[i], 0)
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2]
  const r1 = calc(d.slice(0,12), w1) % 11
  const dig1 = r1 < 2 ? 0 : 11 - r1
  if (Number(d[12]) !== dig1) return false
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]
  const r2 = calc(d.slice(0,13), w2) % 11
  const dig2 = r2 < 2 ? 0 : 11 - r2
  return Number(d[13]) === dig2
}

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2)  return d
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function isValidPhone(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length < 10 || d.length > 11) return false
  if (/^(\d)\1+$/.test(d)) return false // all same digits
  const ddd = Number(d.slice(0, 2))
  if (ddd < 11 || ddd > 99) return false
  // celular (11 dígitos): 9 obrigatório como primeiro dígito
  if (d.length === 11 && d[2] !== '9') return false
  return true
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return d.length ? `(${d}` : ''
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

// CPF (11 dígitos) ou CNPJ (14 dígitos) — detecta pelo tamanho
function maskCpfCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 3)  return d
  if (d.length <= 6)  return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9)  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  if (d.length <= 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  // a partir do 12º dígito → formato CNPJ
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  if (d.length <= 13) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function isValidCpf(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length !== 11) return false
  if (/^(\d)\1+$/.test(d)) return false
  const calc = (digits: string, weights: number[]) =>
    digits.split('').reduce((sum, n, i) => sum + Number(n) * weights[i], 0)
  const r1 = calc(d.slice(0,9), [10,9,8,7,6,5,4,3,2]) % 11
  if (Number(d[9])  !== (r1  < 2 ? 0 : 11 - r1))  return false
  const r2 = calc(d.slice(0,10), [11,10,9,8,7,6,5,4,3,2]) % 11
  return Number(d[10]) === (r2 < 2 ? 0 : 11 - r2)
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
}

const TIPO_LABEL: Record<string, string> = {
  QUINZENAL: 'Liberação quinzenal (50%+50%)',
  MENSAL:    'Liberação mensal',
  SEMANAL:   'Liberação semanal',
  DIARIO:    'Liberação diária',
}

export type SaqueItem = {
  id: string
  valor: number
  status: string
  pix_key?: string
  nota_fiscal?: string
  created_at: string
  efetivado_at?: string
}

export type PrevisaoRow = {
  contratoId: string
  casaId: string
  casaNome: string
  tipoLiberacao: string | null
  proximaLiberacao: string | null
  liberadoValor: number
  suspendedValor: number
}

export type ContratoPagamento = {
  id: string
  afp: string
  tipo_contrato: string
  casa_nome: string
}

export type FinanceiroData = {
  totalComissao: number
  totalEstornado: number
  totalPago: number
  totalAReceber: number
  saquesAtivos: number
  saldoDisponivel: number
  saques: SaqueItem[]
  previsaoRows: PrevisaoRow[]
  temSaqueAtivo: boolean
  role: string
  contratosForSaque: ContratoPagamento[]
  saquesParaTracker?: SaqueAtivo[]
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function SaqueModal({
  open,
  data,
  onClose,
  initialSelectedId,
}: {
  open: boolean
  data: FinanceiroData
  onClose: () => void
  initialSelectedId: string | null
}) {
  const { saldoDisponivel, previsaoRows, contratosForSaque, temSaqueAtivo, role } = data

  const isImpersonating = !['influencer', 'influenciador', 'gerente', 'intermediario'].includes(role?.toLowerCase() ?? '')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [cnpj, setCnpj]               = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [telefone, setTelefone]       = useState('')
  const [pixKey, setPixKey]           = useState('')
  const [pixKeyType, setPixKeyType]   = useState<string>('CPF_CNPJ')

  function handlePixKeyTypeChange(type: string) {
    setPixKeyType(type)
    setPixKey('') // limpa ao trocar tipo
  }

  function handlePixKeyChange(raw: string) {
    if (pixKeyType === 'CPF_CNPJ') setPixKey(maskCpfCnpj(raw))
    else if (pixKeyType === 'TELEFONE') setPixKey(maskPhone(raw))
    else setPixKey(raw)
  }
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSelectedIds(
        initialSelectedId
          ? new Set([initialSelectedId])
          : new Set(previsaoRows.filter(r => r.liberadoValor > 0).map(r => r.contratoId))
      )
      setCnpj('')
      setRazaoSocial('')
      setTelefone('')
      setPixKey('')
      setPixKeyType('CPF_CNPJ')
      setError('')
      setSuccess(false)
    }
  }, [open, initialSelectedId, previsaoRows])

  const selectedRows    = previsaoRows.filter(r => selectedIds.has(r.contratoId))
  const selectedTotal   = selectedRows.reduce((acc, r) => acc + r.liberadoValor, 0)
  const allSelected     = selectedIds.size === previsaoRows.filter(r => r.liberadoValor > 0).length
  const roundingDiff    = allSelected ? Math.abs(selectedTotal - saldoDisponivel) : 0
  const showRounding    = roundingDiff > 0.01

  function toggleRow(id: string) {
    const row = previsaoRows.find(r => r.contratoId === id)
    if (!row || row.liberadoValor <= 0) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (selectedIds.size === 0)   { setError('Selecione pelo menos uma casa'); return }
    if (selectedTotal <= 0)        { setError('Saldo zerado nas casas selecionadas'); return }
    if (!cnpj.trim())              { setError('Informe o CNPJ'); return }
    if (!isValidCnpj(cnpj))        { setError('CNPJ inválido'); return }
    if (!razaoSocial.trim())       { setError('Informe a razão social'); return }
    if (!telefone.trim())          { setError('Informe o telefone'); return }
    if (!isValidPhone(telefone))   { setError('Telefone inválido — use DDD + número'); return }
    if (!pixKey.trim())            { setError('Informe a chave PIX'); return }
    if (pixKeyType === 'CPF_CNPJ') {
      const d = pixKey.replace(/\D/g, '')
      if (d.length === 11 && !isValidCpf(pixKey))   { setError('CPF da chave PIX inválido'); return }
      if (d.length === 14 && !isValidCnpj(pixKey))   { setError('CNPJ da chave PIX inválido'); return }
      if (d.length !== 11 && d.length !== 14)         { setError('Chave PIX CPF/CNPJ incompleta'); return }
    }
    if (pixKeyType === 'TELEFONE' && !isValidPhone(pixKey)) { setError('Telefone da chave PIX inválido'); return }
    if (pixKeyType === 'EMAIL'    && !isValidEmail(pixKey))  { setError('E-mail da chave PIX inválido'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/saques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj,
          razao_social: razaoSocial,
          telefone,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          montante: selectedTotal,
          itens: selectedRows.map(r => ({
            id_casa: r.casaId,
            montante: r.liberadoValor,
          })),
        }),
      })
      const json = await res.json().catch(() => ({ error: 'Resposta inválida do servidor' }))
      if (!res.ok) { setError(json.detail ?? json.error ?? 'Erro ao solicitar saque'); return }
      setSuccess(true)
      setTimeout(() => { onClose(); window.location.reload() }, 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Erro de conexão: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const titleContent = (
    <div>
      <h2 className="text-base font-bold text-[var(--color-on-surface)]">Solicitar Saque</h2>
      <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5 opacity-70">
        Faturar para: Black Box Digital Ltda
      </p>
    </div>
  )

  const footerContent = !success && (
    <div className="p-4 w-full bg-[var(--color-surface-container-low)]">
      {temSaqueAtivo ? (
        <div
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
          Saque em andamento
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={isImpersonating || loading || selectedIds.size === 0 || selectedTotal <= 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          style={isImpersonating
            ? { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
            : { background: 'var(--color-primary)', color: '#fff' }
          }
        >
          {loading ? (
            <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Enviando…</>
          ) : isImpersonating ? (
            <>
              <span className="material-symbols-outlined text-[16px]">block</span>
              Indisponível em Personificação
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">check</span>
              Confirmar solicitação
            </>
          )}
        </button>
      )}
    </div>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={titleContent}
      footer={footerContent}
      size="md"
    >
      <div className="p-5 flex flex-col gap-4">
        {/* Impersonation warning */}
        {isImpersonating && (
          <div
            className="flex gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }}>warning</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Saque bloqueado em Modo Personificação</p>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 opacity-80 leading-relaxed">
                Por segurança, administradores não podem solicitar saques em nome de outros usuários. Saia da personificação para que o próprio titular solicite, ou registre um pagamento manual pelo painel admin.
              </p>
            </div>
          </div>
        )}

        {/* Valor do Saque */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[var(--color-on-surface-variant)] opacity-60 uppercase tracking-wider">Valor do Saque</span>
            <div className="flex items-center gap-1" style={{ color: '#22D3A5' }}>
              <span className="material-symbols-outlined text-[12px]">verified</span>
              <span className="text-[11px] font-medium">Validado pelo servidor</span>
            </div>
          </div>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: 'var(--color-primary)', textShadow: '0 0 24px rgba(139,92,246,0.3)' }}
          >
            {fmt(selectedTotal)}
          </p>
        </div>

        {/* Casa selection */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[13px] text-[var(--color-on-surface-variant)] opacity-60">store</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] opacity-60">
              De quais casas vem este saldo
            </span>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}
          >
            {previsaoRows.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--color-on-surface-variant)] opacity-50">
                Nenhuma casa com produção
              </div>
            ) : (
              <>
                {previsaoRows.map((r, i) => {
                  const checked           = selectedIds.has(r.contratoId)
                  const isFullySuspended  = r.liberadoValor <= 0 && r.suspendedValor > 0
                  const isPartialSuspended = r.liberadoValor > 0 && r.suspendedValor > 0
                  return (
                    <div
                      key={r.contratoId}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${!isFullySuspended ? 'cursor-pointer' : 'cursor-default'}`}
                      style={{
                        borderBottom: i < previsaoRows.length - 1 ? '1px solid var(--color-outline-variant)' : undefined,
                        background: isFullySuspended
                          ? 'rgba(245,158,11,0.04)'
                          : checked ? 'rgba(139,92,246,0.04)' : undefined,
                      }}
                      onClick={() => toggleRow(r.contratoId)}
                    >
                      {/* Checkbox / Lock */}
                      <div
                        className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                        style={isFullySuspended
                          ? { background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.4)' }
                          : checked
                            ? { background: 'var(--color-primary)', border: 'none' }
                            : { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)' }
                        }
                      >
                        {isFullySuspended ? (
                          <span className="material-symbols-outlined text-[13px]" style={{ color: '#f59e0b' }}>lock</span>
                        ) : checked ? (
                          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                            <path d="M1.5 4L4.5 7L10.5 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-on-surface)]">{r.casaNome}</p>
                        {isFullySuspended ? (
                          <p className="text-[11px] font-medium" style={{ color: '#f59e0b' }}>
                            Saque pendente — aguardando aprovação
                          </p>
                        ) : isPartialSuspended ? (
                          <p className="text-[11px]" style={{ color: '#f59e0b' }}>
                            {fmt(r.suspendedValor)} em saque pendente
                          </p>
                        ) : r.proximaLiberacao ? (
                          <p className="text-[11px] text-[var(--color-on-surface-variant)] opacity-55">
                            Próxima liberação: {fmtDate(r.proximaLiberacao)}
                          </p>
                        ) : null}
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        {isFullySuspended ? (
                          <span className="text-sm font-semibold tabular-nums" style={{ color: '#f59e0b' }}>
                            {fmt(r.suspendedValor)}
                          </span>
                        ) : (
                          <>
                            <span className="text-sm font-semibold tabular-nums block"
                              style={{ color: checked ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                              {fmt(r.liberadoValor)}
                            </span>
                            {isPartialSuspended && (
                              <span className="text-[11px] tabular-nums" style={{ color: '#f59e0b' }}>
                                +{fmt(r.suspendedValor)} bloq.
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Total row */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: 'var(--color-surface-container)', borderTop: '1px solid var(--color-outline-variant)' }}
                >
                  <span className="text-sm font-bold text-[var(--color-on-surface)]">TOTAL</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>{fmt(selectedTotal)}</span>
                </div>
              </>
            )}
          </div>

          {/* Rounding note */}
          {showRounding && (
            <p className="text-[11px] text-[var(--color-on-surface-variant)] opacity-50 mt-2 leading-relaxed">
              Pequena diferença de {fmt(roundingDiff)} entre a soma das casas e o saldo total — devido a ajustes de arredondamento ou compensações cruzadas.
            </p>
          )}
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-[var(--color-on-surface-variant)]">CNPJ *</label>
            <input
              value={cnpj}
              onChange={e => setCnpj(maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              style={inputCls}
              inputMode="numeric"
              maxLength={18}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-[var(--color-on-surface-variant)]">Nome da Empresa (Razão Social) *</label>
            <input
              value={razaoSocial}
              onChange={e => setRazaoSocial(e.target.value)}
              placeholder="Empresa Ltda"
              style={inputCls}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-[var(--color-on-surface-variant)]">Telefone *</label>
            <input
              value={telefone}
              onChange={e => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              style={inputCls}
              inputMode="tel"
              maxLength={15}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-[var(--color-on-surface-variant)]">Tipo de Chave PIX *</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'CPF_CNPJ', label: 'CPF / CNPJ' },
                { value: 'EMAIL',    label: 'E-mail' },
                { value: 'TELEFONE', label: 'Telefone' },
                { value: 'ALEATORIA', label: 'Chave aleatória' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handlePixKeyTypeChange(opt.value)}
                  className="py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer text-left"
                  style={pixKeyType === opt.value
                    ? { background: 'rgba(139,92,246,0.15)', color: 'var(--color-primary)', border: '1.5px solid rgba(139,92,246,0.4)' }
                    : { background: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)', border: '1px solid var(--color-outline-variant)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-[var(--color-on-surface-variant)]">Chave PIX (nominal à empresa) *</label>
            <input
              value={pixKey}
              onChange={e => handlePixKeyChange(e.target.value)}
              placeholder={
                pixKeyType === 'CPF_CNPJ'  ? '000.000.000-00 ou 00.000.000/0001-00' :
                pixKeyType === 'EMAIL'     ? 'empresa@email.com'                    :
                pixKeyType === 'TELEFONE'  ? '(00) 00000-0000'                      :
                'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
              }
              inputMode={pixKeyType === 'CPF_CNPJ' || pixKeyType === 'TELEFONE' ? 'numeric' : 'text'}
              maxLength={
                pixKeyType === 'CPF_CNPJ' ? 18 :
                pixKeyType === 'TELEFONE' ? 15 : undefined
              }
              style={inputCls}
              required
            />
            <p className="text-[11px] text-[var(--color-on-surface-variant)] opacity-50">
              A chave PIX deve ser nominal à empresa informada.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
            style={{ background: 'rgba(244,63,94,0.08)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.2)' }}
          >
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            className="flex flex-col items-center gap-3 py-6 rounded-xl text-center"
            style={{ background: 'rgba(34,211,165,0.06)', border: '1px solid rgba(34,211,165,0.2)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,211,165,0.15)' }}>
              <span className="material-symbols-outlined text-[24px]" style={{ color: '#22D3A5' }}>check_circle</span>
            </div>
            <p className="font-semibold text-[var(--color-on-surface)]">Saque solicitado com sucesso!</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60">Atualizando…</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function FinanceiroClient({ data }: { data: FinanceiroData }) {
  const [tab, setTab]               = useState<'resumo' | 'historico'>('resumo')
  const [calcOpen, setCalcOpen]     = useState(false)
  const [expandedCasas, setExpandedCasas] = useState<Set<number>>(new Set())

  // Modal
  const [mounted, setMounted]                     = useState(false)
  const [modalOpen, setModalOpen]                 = useState(false)
  const [modalInitialId, setModalInitialId]       = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  function openModal(contratoId: string | null = null) {
    setModalInitialId(contratoId)
    setModalOpen(true)
  }

  const toggleCasa = (i: number) =>
    setExpandedCasas(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const {
    totalComissao,
    totalEstornado,
    totalPago,
    totalAReceber,
    saquesAtivos,
    saldoDisponivel,
    saques,
    previsaoRows,
    temSaqueAtivo,
    contratosForSaque,
    saquesParaTracker,
  } = data

  const totalLiberado = previsaoRows.reduce((acc, r) => acc + r.liberadoValor, 0)

  const cards = [
    { label: 'Total de Comissão',    sub: 'Liberada + Aguardando liberação',   value: totalComissao,   icon: 'trending_up',            iconColor: 'var(--color-primary)',                       iconBg: 'rgba(139,92,246,0.12)',  highlight: false },
    { label: 'Estornos',             sub: 'Estornos e valores excedentes',      value: totalEstornado,  icon: 'security',               iconColor: 'var(--color-on-surface-variant)', iconBg: 'rgba(255,255,255,0.06)', highlight: false },
    { label: 'Total Pago',           sub: 'Comissão recebida',                 value: totalPago,       icon: 'paid',                   iconColor: 'var(--color-primary)',                        iconBg: 'rgba(2,117,243,0.15)', highlight: true  },
    { label: 'Total a Receber',      sub: 'Aguardando ciclo e auditoria',       value: totalAReceber,   icon: 'schedule',               iconColor: 'var(--color-on-surface-variant)', iconBg: 'rgba(255,255,255,0.06)', highlight: false },
    { label: 'Saldo Disponível',     sub: 'Resultado final — liberado para saque', value: saldoDisponivel, icon: 'calendar_today',      iconColor: '#22D3A5',                       iconBg: 'rgba(34,211,165,0.12)', highlight: false, green: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}
      >
        {(['resumo', 'historico'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={
              tab === t
                ? { background: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface)' }
                : { color: 'var(--color-on-surface-variant)' }
            }
          >
            {t === 'resumo' ? 'Resumo' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'resumo' && (
        <>
          {/* Saque progress tracker */}
          {saquesParaTracker && saquesParaTracker.length > 0 && (
            <SaqueProgressTracker saques={saquesParaTracker} />
          )}

          {/* 5 metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((c, i) => {
              const accentColor = (c as { green?: boolean }).green && c.value > 0 ? '#22D3A5'
                : c.highlight ? 'var(--color-primary)'
                : '#94A3B8'
              return (
                <StatCard
                  key={i}
                  label={c.label}
                  value={fmt(c.value)}
                  icon={c.icon}
                  sub={c.sub}
                  accent={accentColor}
                  className={i === 4 ? 'col-span-2 md:col-span-1' : ''}
                />
              )
            })}
          </div>

          {/* ── Saldo por Empresa ─────────────────────────────────────────────── */}
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div
              className="px-5 py-3 border-b flex items-center gap-2"
              style={{ background: 'var(--color-surface-container-low)', borderColor: 'var(--color-outline-variant)' }}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--color-primary)' }}>account_balance</span>
              <span className="text-label-md font-semibold text-[var(--color-on-surface)]">Saldo por Empresa</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--color-on-surface-variant)] opacity-60">Saldo total disponível</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>{fmt(saldoDisponivel)}</span>
              </div>
            </div>

            {/* Entity row */}
            {contratosForSaque.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-2 text-[var(--color-on-surface-variant)]">
                <span className="material-symbols-outlined text-[40px] opacity-25">description</span>
                <p className="text-sm opacity-50">Nenhum contrato ativo</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-5 py-4">
                {/* Entity icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--color-primary)' }}>business</span>
                </div>

                {/* Name + CNPJ */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-on-surface)]">Black Box Digital Ltda</p>
                  <p className="text-[11px] font-mono text-[var(--color-on-surface-variant)] opacity-55 mt-0.5">CNPJ 42.118.015/0001-07</p>
                </div>

                {/* Saldo */}
                <div className="text-right flex-shrink-0 mr-2 hidden sm:block">
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] opacity-55 uppercase tracking-wider">Saldo</p>
                  <p className="text-base font-bold tabular-nums" style={{ color: saldoDisponivel > 0 ? '#22D3A5' : 'var(--color-on-surface-variant)' }}>
                    {fmt(saldoDisponivel)}
                  </p>
                </div>

                {/* Button */}
                {temSaqueAtivo ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] flex-shrink-0" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                    Em andamento
                  </div>
                ) : saldoDisponivel < 50 ? (
                  <div className="text-[11px] text-[var(--color-on-surface-variant)] opacity-40 px-2 flex-shrink-0">Saldo insuficiente</div>
                ) : (
                  <button
                    onClick={() => openModal(null)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-shrink-0 hover:shadow-lg"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Sacar
                  </button>
                )}
              </div>
            )}

            {/* Footer note */}
            {contratosForSaque.length > 0 && (
              <div
                className="px-5 py-3 border-t flex items-center gap-2"
                style={{ background: 'var(--color-surface-container-low)', borderColor: 'var(--color-outline-variant)' }}
              >
                <span className="material-symbols-outlined text-[13px] text-[var(--color-on-surface-variant)] opacity-40">info</span>
                <p className="text-[11px] text-[var(--color-on-surface-variant)] opacity-45">
                  Emita a NF para Black Box Digital Ltda (CNPJ 42.118.015/0001-07) ao solicitar seu saque
                </p>
              </div>
            )}
          </div>

          {/* ── Previsão de Liberação por Casa ───────────────────────────────── */}
          {previsaoRows.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div
                className="px-5 py-3 border-b flex items-center gap-2"
                style={{ background: 'var(--color-surface-container-low)', borderColor: 'var(--color-outline-variant)' }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: '#f59e0b' }}>emoji_events</span>
                <span className="text-label-md font-semibold text-[var(--color-on-surface)]">Previsão de Liberação por Casa</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                      <th className="text-left px-5 py-2 text-label-md text-[var(--color-on-surface-variant)]" rowSpan={2}>Casa</th>
                      <th className="text-center px-5 py-2 text-label-md border-b" style={{ color: '#f59e0b', borderColor: 'var(--color-outline-variant)' }} colSpan={2}>
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: '#f59e0b' }} />
                        Aguardando Liberação
                      </th>
                      <th className="text-right px-5 py-2 text-label-md" style={{ color: '#22D3A5' }} rowSpan={2}>
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: '#22D3A5' }} />
                        Produção Liberada
                      </th>
                    </tr>
                    <tr style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                      <th className="text-right px-5 py-2 text-[11px] text-[var(--color-on-surface-variant)]">Valor</th>
                      <th className="text-right px-5 py-2 text-[11px] text-[var(--color-on-surface-variant)]">Previsão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-outline-variant)]">
                    {previsaoRows.map((r, i) => {
                      const isQuinzenal = r.tipoLiberacao === 'QUINZENAL'
                      const expanded    = expandedCasas.has(i)
                      const label       = r.tipoLiberacao ? TIPO_LABEL[r.tipoLiberacao] : null
                      return (
                        <React.Fragment key={i}>
                          <tr className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {isQuinzenal && (
                                  <button
                                    onClick={() => toggleCasa(i)}
                                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--color-surface-container-highest)] transition-colors flex-shrink-0 cursor-pointer"
                                  >
                                    <span
                                      className="material-symbols-outlined text-[14px] text-[var(--color-on-surface-variant)] transition-transform"
                                      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                    >
                                      chevron_right
                                    </span>
                                  </button>
                                )}
                                <div>
                                  <span className="text-sm font-medium text-[var(--color-on-surface)]">{r.casaNome}</span>
                                  {label && (
                                    <p className="text-[11px] text-[var(--color-on-surface-variant)] opacity-60">
                                      {label}{isQuinzenal && ' • clique para detalhes'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-[var(--color-on-surface-variant)]">—</td>
                            <td className="px-5 py-3 text-right text-sm text-[var(--color-on-surface-variant)]">
                              {r.proximaLiberacao ? fmtDate(r.proximaLiberacao) : '—'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="tabular-nums text-sm font-semibold block" style={{ color: '#22D3A5' }}>
                                {fmt(r.liberadoValor)}
                              </span>
                              {r.suspendedValor > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
                                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
                                >
                                  <span className="material-symbols-outlined text-[10px]">lock</span>
                                  {fmt(r.suspendedValor)} em saque
                                </span>
                              )}
                            </td>
                          </tr>
                          {isQuinzenal && expanded && (
                            <>
                              <tr style={{ background: 'rgba(34,211,165,0.03)' }}>
                                <td className="pl-12 pr-5 py-2 text-xs text-[var(--color-on-surface-variant)]">1ª parcela (50%)</td>
                                <td className="px-5 py-2 text-right text-xs tabular-nums" style={{ color: '#22D3A5' }}>{fmt(r.liberadoValor * 0.5)}</td>
                                <td className="px-5 py-2 text-right text-xs text-[var(--color-on-surface-variant)]">—</td>
                                <td className="px-5 py-2" />
                              </tr>
                              <tr style={{ background: 'rgba(34,211,165,0.03)' }}>
                                <td className="pl-12 pr-5 py-2 text-xs text-[var(--color-on-surface-variant)]">2ª parcela (50%)</td>
                                <td className="px-5 py-2 text-right text-xs tabular-nums" style={{ color: '#22D3A5' }}>{fmt(r.liberadoValor * 0.5)}</td>
                                <td className="px-5 py-2 text-right text-xs text-[var(--color-on-surface-variant)]">—</td>
                                <td className="px-5 py-2" />
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--color-surface-container-low)', borderTop: '1px solid var(--color-outline-variant)' }}>
                      <td className="px-5 py-3 text-label-md font-semibold text-[var(--color-on-surface)]" colSpan={1}>TOTAL</td>
                      <td className="px-5 py-3 text-right tabular-nums text-sm font-semibold" style={{ color: '#f59e0b' }}>R$ 0,00</td>
                      <td className="px-5 py-3" />
                      <td className="px-5 py-3 text-right tabular-nums text-sm font-bold" style={{ color: '#22D3A5' }}>{fmt(totalLiberado)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Resumo do Cálculo accordion ───────────────────────────────────── */}
          <div className="glass-card rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(34,211,165,0.2)' }}>
            <button
              className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer"
              onClick={() => setCalcOpen(o => !o)}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: '#22D3A5' }}>calculate</span>
              <span className="text-sm font-semibold text-[var(--color-on-surface)]">Resumo do Cálculo</span>
              <span className="text-xs text-[var(--color-on-surface-variant)] opacity-60">— detalhamento do saldo</span>
              <span className="ml-auto text-headline-md font-bold tabular-nums" style={{ color: saldoDisponivel > 0 ? '#22D3A5' : 'var(--color-on-surface-variant)' }}>
                {fmt(saldoDisponivel)}
              </span>
              <span
                className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)] transition-transform"
                style={{ transform: calcOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                expand_more
              </span>
            </button>
            {calcOpen && (
              <div
                className="border-t px-5 pb-5 pt-4 flex flex-col gap-2"
                style={{ borderColor: 'var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}
              >
                {[
                  { label: 'Total de Comissão',   value: totalComissao,  sign: '',  color: 'var(--color-on-surface)' },
                  { label: 'Estornos',             value: totalEstornado, sign: '−', color: '#F43F5E' },
                  { label: 'Total Pago',           value: totalPago,      sign: '−', color: '#F43F5E' },
                  { label: 'Saques em andamento',  value: saquesAtivos,   sign: '−', color: '#f59e0b' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-on-surface-variant)]">
                      {row.sign && <span className="mr-1 font-semibold" style={{ color: row.color }}>{row.sign}</span>}
                      {row.label}
                    </span>
                    <span className="tabular-nums font-semibold" style={{ color: row.color === 'var(--color-on-surface)' ? 'var(--color-on-surface)' : row.color }}>
                      {fmt(row.value)}
                    </span>
                  </div>
                ))}
                <div className="h-px my-1" style={{ background: 'var(--color-outline-variant)' }} />
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-[var(--color-on-surface)]">= Saldo Disponível</span>
                  <span className="tabular-nums" style={{ color: saldoDisponivel > 0 ? '#22D3A5' : 'var(--color-on-surface-variant)' }}>
                    {fmt(Math.max(0, saldoDisponivel))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Histórico tab ─────────────────────────────────────────────────── */}
      {tab === 'historico' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ background: 'var(--color-surface-container-low)', borderColor: 'var(--color-outline-variant)' }}>
            <h2 className="text-headline-md text-[var(--color-on-surface)]">Histórico de saques</h2>
          </div>
          {saques.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-[48px] opacity-30">payments</span>
              <p className="text-sm opacity-60">Nenhum saque registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="orbit-table w-full">
                <thead style={{ background: 'var(--color-surface-container-low)' }}>
                  <tr>
                    <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Valor</th>
                    <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Solicitado</th>
                    <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Efetivado</th>
                    <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-outline-variant)]">
                  {saques.map(s => {
                    const st = STATUS_MAP[s.status] ?? { label: s.status, bc: 'badge-gray' }
                    return (
                      <tr key={s.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold tabular-nums text-[var(--color-on-surface)]">{fmt(s.valor)}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                          {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                          {s.efetivado_at
                            ? new Date(s.efetivado_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`badge ${st.bc}`}>{st.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal portal ──────────────────────────────────────────────────── */}
      {mounted && (
        <SaqueModal
          open={modalOpen}
          data={data}
          onClose={() => setModalOpen(false)}
          initialSelectedId={modalInitialId}
        />
      )}
    </div>
  )
}
