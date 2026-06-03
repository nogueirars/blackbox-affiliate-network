'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Casa { id: string; nome_exibicao: string }

export default function CsvUploadClient({ casas }: { casas: Casa[] }) {
  const [casaId, setCasaId]   = useState('')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; message: string } | null>(null)
  const inputRef              = useRef<HTMLInputElement>(null)
  const router                = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!casaId || !file) return
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('casa_id', casaId)
      const res  = await fetch('/api/admin/csv-upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: json.error ?? 'Erro no upload' })
      } else {
        setResult({ ok: true, message: `Importado: ${json.inserted ?? 0} inseridos, ${json.updated ?? 0} atualizados, ${json.skipped ?? 0} ignorados.` })
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
        router.refresh()
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Erro' })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-container-high)',
    border: '1px solid var(--color-outline-variant)',
    color: 'var(--color-on-surface)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    colorScheme: 'dark',
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Casa select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-on-surface-variant)]">
          Casa de Aposta <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <select
          style={inputStyle}
          value={casaId}
          onChange={e => setCasaId(e.target.value)}
          required
        >
          <option value="">Selecionar casa…</option>
          {casas.map(c => (
            <option key={c.id} value={c.id}>{c.nome_exibicao}</option>
          ))}
        </select>
      </div>

      {/* File input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-on-surface-variant)]">
          Arquivo CSV <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          style={inputStyle}
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60">
          Colunas obrigatórias: <code>data</code>, <code>affcustomid</code>
        </p>
      </div>

      {/* Result */}
      {result && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: result.ok ? 'rgba(34,211,165,0.1)' : 'rgba(239,68,68,0.1)',
            color: result.ok ? '#22D3A5' : '#ef4444',
            border: `1px solid ${result.ok ? 'rgba(34,211,165,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {result.ok ? '✓ ' : '✗ '}{result.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => history.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
          style={{
            background: 'var(--color-surface-container-high)',
            color: 'var(--color-on-surface-variant)',
            border: '1px solid var(--color-outline-variant)',
          }}
        >
          Voltar
        </button>
        <button
          type="submit"
          disabled={loading || !casaId || !file}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          {loading ? 'Importando…' : 'Importar CSV'}
        </button>
      </div>
    </form>
  )
}
