'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type SaqueAtivo = {
  id: string
  montante?: number
  valor?: number
  status: string
  motivo_correcao_nf?: string | null
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function SaqueNotificacaoBanner() {
  const router   = useRouter()
  const pathname = usePathname()

  // Derive role prefix: /influenciador | /gerente | /intermediario
  const rolePrefix = (['influenciador', 'gerente', 'intermediario'] as const)
    .map(r => `/${r}`)
    .find(p => pathname.startsWith(p)) ?? '/influenciador'

  const [saques, setSaques] = useState<SaqueAtivo[]>([])

  async function fetchSaques() {
    try {
      const res = await fetch('/api/saques?limit=50')
      if (!res.ok) return
      const json = await res.json()
      const items: SaqueAtivo[] = json.data ?? json
      setSaques(items.filter(s => s.status === 'AGUARDANDO_NF'))
    } catch { /* noop */ }
  }

  useEffect(() => {
    fetchSaques()
    const interval = setInterval(fetchSaques, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (saques.length === 0) return null

  const hasCorrecao = saques.some(s => s.motivo_correcao_nf)

  return (
    <div
      className="w-full rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
      style={{
        background: hasCorrecao ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
        border: `1px solid ${hasCorrecao ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
      }}
    >
      <span
        className="material-symbols-outlined text-[18px] flex-shrink-0"
        style={{ color: hasCorrecao ? '#F43F5E' : '#f59e0b' }}
      >
        {hasCorrecao ? 'warning' : 'receipt_long'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: hasCorrecao ? '#F43F5E' : '#f59e0b' }}>
          {hasCorrecao
            ? `NF com correção pendente — ${saques.length} saque(s) aguardando`
            : `${saques.length} saque(s) aguardando Nota Fiscal`}
        </p>
        {hasCorrecao && (
          <p className="text-xs text-[var(--color-on-surface-variant)] opacity-70 mt-0.5">
            {saques.find(s => s.motivo_correcao_nf)?.motivo_correcao_nf}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {saques.map(s => {
          const val = s.montante ?? s.valor ?? 0
          return (
            <button
              key={s.id}
              onClick={() => router.push(`${rolePrefix}/financeiro`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{ background: hasCorrecao ? '#F43F5E' : '#f59e0b', color: '#000' }}
            >
              <span className="material-symbols-outlined text-[13px]">upload_file</span>
              {saques.length === 1 ? 'Anexar NF' : `NF ${fmt(val)}`}
            </button>
          )
        })}
      </div>

    </div>
  )
}
