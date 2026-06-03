'use client'

import { useState, useRef } from 'react'

export type SaqueAtivo = {
  id: string
  montante: number
  status: string
  nota_fiscal?: string | null
  motivo_correcao_nf?: string | null
  correcao_nf_solicitada_em?: string | null
  created_at: string
  // dados para emitir NF
  razao_social?: string | null
  cnpj?: string | null
}

type Step = { label: string; done: boolean; active: boolean }

const STATUS_STEPS: Record<string, number> = {
  AGUARDANDO_LIBERACAO: 0,
  AGUARDANDO_NF:        1,
  PROCESSANDO:          2,
  MANUAL:               3,
  CONCLUIDO:            4,
}

const STATUS_MSG: Record<string, string> = {
  AGUARDANDO_LIBERACAO: 'Aguardando análise do financeiro',
  AGUARDANDO_NF:        'Saque aprovado! Emita a NF e anexe abaixo',
  PROCESSANDO:          'NF enviada — aguardando verificação',
  MANUAL:               'NF aprovada — pagamento em processamento',
  CONCLUIDO:            'Pagamento realizado ✓',
  FALHA:                'Saque recusado',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function buildSteps(status: string): Step[] {
  const cur = STATUS_STEPS[status] ?? 0
  return [
    { label: 'Solicitado', done: cur >= 0, active: cur === 0 },
    { label: 'Aprovado',   done: cur >= 1, active: cur === 1 },
    { label: 'NF Anexada', done: cur >= 2, active: cur === 2 },
    { label: 'Pago',       done: cur >= 4, active: cur === 3 || cur === 4 },
  ]
}

// Dados fixos da entidade de faturamento (Black Box Digital)
const ENTIDADE = {
  razao_social: 'Black Box Digital Ltda',
  cnpj:         '42.118.015/0001-07',
  ie:           'Isento',
  endereco:     'Rua Exemplo, 123 — São Paulo / SP — CEP 01310-100',
}

function DadosEntidadeCard({ montante }: { montante: number }) {
  return (
    <div
      className="rounded-xl p-4 text-sm space-y-1.5"
      style={{ background: 'rgba(2,117,243,0.06)', border: '1px solid rgba(2,117,243,0.2)' }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] opacity-60 mb-2">
        Dados para emissão da NF
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {[
          { label: 'Razão Social', value: ENTIDADE.razao_social },
          { label: 'CNPJ',         value: ENTIDADE.cnpj },
          { label: 'IE',           value: ENTIDADE.ie },
          { label: 'Valor da NF',  value: fmt(montante) },
          { label: 'Endereço',     value: ENTIDADE.endereco },
        ].map(r => (
          <div key={r.label}>
            <span className="text-[10px] text-[var(--color-on-surface-variant)] opacity-60">{r.label}</span>
            <p className="text-xs font-semibold text-[var(--color-on-surface)]">{r.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--color-on-surface-variant)] opacity-50 pt-1 leading-relaxed">
        A validação CNPJ-da-NF × titular-do-PIX é feita manualmente pelo financeiro.
        É permitido emitir NF em nome de terceiros, desde que o recebimento seja para a empresa emissora.
      </p>
    </div>
  )
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function UploadNFButton({
  saqueId,
  montante,
  onSuccess,
}: {
  saqueId: string
  montante: number
  onSuccess: () => void
}) {
  const [pending, setPending]   = useState<File | null>(null)   // arquivo aguardando confirmação
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Seleção → apenas valida tipo/tamanho localmente, entra em estado "pending"
  function selectFile(file: File) {
    setError('')
    if (file.type !== 'application/pdf') {
      setError('Apenas arquivos PDF são aceitos')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande (máximo 10 MB)')
      return
    }
    setPending(file)
  }

  // Confirmação → faz o upload de facto
  async function confirmUpload() {
    if (!pending) return
    setUploading(true)
    setError('')

    try {
      const form = new FormData()
      form.append('file', pending)

      const res = await fetch(`/api/saques/${saqueId}/nf`, {
        method: 'POST',
        body: form,
      })

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Erro do servidor (HTTP ${res.status}). Tente novamente ou entre em contato com o suporte.`)
      }

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao registrar NF')

      setPending(null)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar NF')
    } finally {
      setUploading(false)
    }
  }

  function cancelPending() {
    setPending(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!uploading && !pending) setDragging(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setDragging(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setDragging(false)
    if (uploading || pending) return
    const file = e.dataTransfer.files?.[0]
    if (file) selectFile(file)
  }

  // ── Estado: arquivo selecionado aguardando confirmação ──────────────────────
  if (pending) {
    return (
      <div className="space-y-3">
        {/* Preview do arquivo */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--color-primary)' }}>picture_as_pdf</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>
              {pending.name}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>
              {fmtBytes(pending.size)} · PDF
            </p>
          </div>
          <button
            onClick={cancelPending}
            disabled={uploading}
            aria-label="Remover arquivo"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Botões de confirmação */}
        <div className="flex gap-2">
          <button
            onClick={cancelPending}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40"
            style={{ background: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)' }}
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Trocar arquivo
          </button>
          <button
            onClick={confirmUpload}
            disabled={uploading}
            className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            {uploading ? (
              <><span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Enviando…</>
            ) : (
              <><span className="material-symbols-outlined text-[15px]">check_circle</span> Confirmar e enviar</>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-center leading-relaxed" style={{ color: '#F43F5E' }}>{error}</p>
        )}
      </div>
    )
  }

  // ── Estado: idle / dragging ──────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) selectFile(f)
          e.target.value = ''
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-label="Anexar Nota Fiscal — clique ou arraste o PDF aqui"
        className="w-full flex flex-col items-center justify-center gap-1 py-4 rounded-xl text-sm font-semibold transition-all cursor-pointer"
        style={{
          background: dragging ? 'rgba(139,92,246,0.1)' : 'var(--color-primary)',
          color: dragging ? 'var(--color-primary)' : '#fff',
          
          border: dragging ? '2px dashed #8b5cf6' : '2px solid transparent',
          transition: 'all 150ms ease',
        }}
      >
        {dragging ? (
          <>
            <span className="material-symbols-outlined text-[24px]">file_open</span>
            <span>Solte o arquivo aqui</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            <span>Anexar Nota Fiscal (PDF)</span>
            <span className="text-[11px] font-normal opacity-70">clique ou arraste o arquivo</span>
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-center leading-relaxed" style={{ color: '#F43F5E' }}>{error}</p>
      )}
    </div>
  )
}

function SaqueCard({ saque, onRefresh }: { saque: SaqueAtivo; onRefresh: () => void }) {
  const steps = buildSteps(saque.status)
  const msg   = STATUS_MSG[saque.status] ?? saque.status
  const isFalha    = saque.status === 'FALHA'
  const needsNF    = saque.status === 'AGUARDANDO_NF'
  const hasCorrecao = needsNF && !!saque.motivo_correcao_nf
  const isConcluido = saque.status === 'CONCLUIDO'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: isFalha ? '1px solid rgba(244,63,94,0.3)' : '1px solid var(--color-outline-variant)',
        background: isFalha ? 'rgba(244,63,94,0.04)' : 'var(--color-surface-container-low)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isFalha ? 'rgba(244,63,94,0.12)' : isConcluido ? 'rgba(34,211,165,0.12)' : 'rgba(139,92,246,0.12)' }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ color: isFalha ? '#F43F5E' : isConcluido ? '#22D3A5' : 'var(--color-primary)' }}>
              {isFalha ? 'cancel' : isConcluido ? 'check_circle' : 'receipt_long'}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold tabular-nums" style={{ color: isFalha ? '#F43F5E' : isConcluido ? '#22D3A5' : 'var(--color-on-surface)' }}>
              {fmt(saque.montante)}
            </p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] opacity-60">
              Solicitado em {fmtDate(saque.created_at)}
            </p>
          </div>
        </div>
        <p className="text-xs font-medium text-right max-w-[160px]" style={{ color: isFalha ? '#F43F5E' : needsNF ? '#f59e0b' : '#22D3A5' }}>
          {msg}
        </p>
      </div>

      {/* Progress bar */}
      {!isFalha && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                    style={s.done
                      ? { background: '#22D3A5', color: '#000' }
                      : s.active
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : { background: 'var(--color-surface-container-highest)', color: 'var(--color-on-surface-variant)' }
                    }
                  >
                    {s.done && !s.active
                      ? <span className="material-symbols-outlined text-[12px]">check</span>
                      : i + 1}
                  </div>
                  <span className="text-[10px] text-[var(--color-on-surface-variant)] opacity-60 whitespace-nowrap">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mb-4 mx-1"
                    style={{ background: s.done ? '#22D3A5' : 'var(--color-outline-variant)' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction notice */}
      {hasCorrecao && (
        <div className="mx-5 mb-4 rounded-xl p-4" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
          <div className="flex items-start gap-2 mb-3">
            <span className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5" style={{ color: '#F43F5E' }}>warning</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F43F5E' }}>Correção solicitada</p>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 leading-relaxed">{saque.motivo_correcao_nf}</p>
              <p className="text-[10px] opacity-50 mt-1">Seu saldo permanece reservado até aprovação da NF corrigida.</p>
            </div>
          </div>
        </div>
      )}

      {/* NF upload section */}
      {needsNF && (
        <div className="px-5 pb-5 space-y-4">
          <DadosEntidadeCard montante={saque.montante} />
          <UploadNFButton saqueId={saque.id} montante={saque.montante} onSuccess={onRefresh} />
        </div>
      )}

      {/* NF already sent */}
      {saque.nota_fiscal && saque.status === 'PROCESSANDO' && (
        <div className="px-5 pb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]" style={{ color: '#22D3A5' }}>check_circle</span>
          <a
            href={`/api/saques/${saque.id}/nf`}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
            style={{ color: '#22D3A5' }}
          >
            Ver NF enviada
          </a>
        </div>
      )}
    </div>
  )
}

export function SaqueProgressTracker({ saques: initial }: { saques: SaqueAtivo[] }) {
  const [saques, setSaques] = useState(initial)

  async function refresh() {
    try {
      const res = await fetch('/api/saques?limit=50')
      if (!res.ok) return
      const json = await res.json()
      const ATIVOS = ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF', 'PROCESSANDO', 'MANUAL']
      const fresh = (json.data ?? json)
        .filter((s: SaqueAtivo) => ATIVOS.includes(s.status))
        .map((s: { id: string; montante?: number; valor?: number; status: string; nota_fiscal?: string; motivo_correcao_nf?: string; correcao_nf_solicitada_em?: string; created_at: string; razao_social?: string; cnpj?: string }) => ({
          id:                       s.id,
          montante:                 s.montante ?? s.valor ?? 0,
          status:                   s.status,
          nota_fiscal:              s.nota_fiscal,
          motivo_correcao_nf:       s.motivo_correcao_nf,
          correcao_nf_solicitada_em: s.correcao_nf_solicitada_em,
          created_at:               s.created_at,
        }))
      setSaques(fresh)
    } catch { /* noop */ }
  }

  if (saques.length === 0) return null

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div
        className="px-5 py-3 border-b flex items-center gap-2"
        style={{ background: 'var(--color-surface-container-low)', borderColor: 'var(--color-outline-variant)' }}
      >
        <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--color-primary)' }}>receipt_long</span>
        <span className="text-label-md font-semibold text-[var(--color-on-surface)]">Acompanhamento de Saques</span>
        <span
          className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--color-primary)' }}
        >
          {saques.length}
        </span>
      </div>
      <div className="p-5 flex flex-col gap-4">
        {saques.map(s => (
          <SaqueCard key={s.id} saque={s} onRefresh={refresh} />
        ))}
      </div>
    </div>
  )
}
