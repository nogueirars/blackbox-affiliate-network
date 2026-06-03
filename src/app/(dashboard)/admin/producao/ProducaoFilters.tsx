'use client'

import { useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Props {
  from: string
  to: string
  casaId: string
  usuarioId: string
  visao: string
  agrupamento: string
  casas: { id: string; nome_exibicao: string }[]
  usuarios: { id: string; nome_completo: string | null; email: string, user_roles?: { role: string }[] }[]
  totalRows?: number
}

export default function ProducaoFilters({
  from, to, casaId, usuarioId, visao, agrupamento, casas, usuarios, totalRows,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function submit() {
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      const params = new URLSearchParams()
      // Preserve visao which is outside the form but passed as prop
      params.set('visao', visao)
      for (const [k, v] of formData.entries()) {
        if (v && k !== 'visao') params.set(k, v.toString())
      }
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit()
  }

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--color-surface-container-high)',
    border: '1px solid var(--color-outline-variant)',
    color: 'var(--color-on-surface)',
    ...extra,
  })

  const selActive = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(2,117,243,0.1)' : 'var(--color-surface-container-high)',
    border: active ? '1px solid rgba(2,117,243,0.3)' : '1px solid var(--color-outline-variant)',
    color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
    minWidth: '150px',
  })

  return (
    <div className="flex flex-col gap-4">
      {/* TABS para Nível de Visão */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'geral', label: 'Visão Geral', icon: 'bar_chart' },
          { id: 'afiliado', label: 'Afiliados', icon: 'groups' },
          { id: 'gerente', label: 'Gerentes', icon: 'manage_accounts' },
          { id: 'intermediario', label: 'Intermediários', icon: 'account_tree' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set('visao', t.id)
              params.delete('usuario_id')
              router.push(`${pathname}?${params.toString()}`)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all"
            style={{
              background: visao === t.id
                ? 'var(--color-primary)'
                : 'transparent',
              color: visao === t.id ? '#fff' : 'var(--color-on-surface-variant)',
              border: visao === t.id
                ? '1px solid transparent'
                : '1px solid var(--color-outline-variant)',
              
            }}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <form ref={formRef} onSubmit={onSubmit}>
        {/* Removed hidden visao input since we handle it in submit() */}
        <div className="glass-card rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">

        {/* Date from */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">calendar_today</span>
          <input
            type="date" name="from" defaultValue={from}
            className="outline-none text-sm rounded-lg px-3 py-2 cursor-pointer"
            style={inp()}
          />
        </div>

        <span className="text-sm text-[var(--color-on-surface-variant)]">até</span>

        {/* Date to */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">calendar_today</span>
          <input
            type="date" name="to" defaultValue={to}
            className="outline-none text-sm rounded-lg px-3 py-2 cursor-pointer"
            style={inp()}
          />
        </div>



        {/* User filter */}
        <select
          name="usuario_id" defaultValue={usuarioId} onChange={submit}
          className="outline-none cursor-pointer text-sm rounded-lg px-3 py-2 appearance-none"
          style={selActive(!!usuarioId)}
        >
          <option value="">
            {usuarioId ? 'Usuário Específico' : `Todos Usuários${usuarios.length ? ` (${usuarios.length})` : ''}`}
          </option>
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{u.nome_completo ?? u.email}</option>
          ))}
        </select>

        {/* Casa filter */}
        <select
          name="casa_id" defaultValue={casaId} onChange={submit}
          className="outline-none cursor-pointer text-sm rounded-lg px-3 py-2 appearance-none"
          style={selActive(!!casaId)}
        >
          <option value="">Todas casas</option>
          {casas.map(c => (
            <option key={c.id} value={c.id}>{c.nome_exibicao}</option>
          ))}
        </select>

        {/* Total rows badge */}
        {typeof totalRows === 'number' && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2"
            style={{
              background: 'var(--color-surface-container-high)',
              border: '1px solid var(--color-outline-variant)',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined text-[14px]">dataset</span>
            Todos ({totalRows.toLocaleString('pt-BR')})
          </span>
        )}

        {/* Acumulada / Diário */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--color-outline-variant)' }}
        >
          {(['acumulada', 'diaria'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => {
                const el = formRef.current?.querySelector<HTMLInputElement>('input[name="agrupamento"]')
                if (el) { el.value = m; submit() }
              }}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 transition-colors"
              style={{
                background: agrupamento === m ? 'var(--color-primary)' : 'var(--color-surface-container-high)',
                color: agrupamento === m ? '#ffffff' : 'var(--color-on-surface-variant)',
                fontWeight: agrupamento === m ? 600 : 400,
              }}
            >
              <span className="material-symbols-outlined text-[15px]">
                {m === 'acumulada' ? 'stacked_bar_chart' : 'view_list'}
              </span>
              {m === 'acumulada' ? 'Acumulada' : 'Diária'}
            </button>
          ))}
        </div>

        <input type="hidden" name="agrupamento" defaultValue={agrupamento} />

        {/* Apply */}
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2 transition-opacity hover:opacity-80 cursor-pointer"
          style={{
            background: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          <span className="material-symbols-outlined text-[16px]">filter_alt</span>
          Aplicar
        </button>

        {/* Clear */}
        {(casaId || usuarioId) && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.delete('casa_id')
              params.delete('usuario_id')
              router.push(`${pathname}?${params.toString()}`)
            }}
            className="inline-flex items-center gap-1 text-sm rounded-lg px-3 py-2 transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-surface-container-high)',
              color: 'var(--color-on-surface-variant)',
              border: '1px solid var(--color-outline-variant)',
            }}
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        )}
        </div>
      </form>
    </div>
  )
}
