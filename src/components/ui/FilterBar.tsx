'use client'

import { useRef } from 'react'

interface FilterBarProps {
  roleFilter: string
  q: string
  action: string
}

const ROLE_OPTIONS = [
  { value: '',              label: 'Todos os perfis' },
  { value: 'AFILIADO',   label: 'Afiliado' },
  { value: 'GERENTE',      label: 'Gerente' },
  { value: 'INTERMEDIARIO',label: 'Intermediário' },
  { value: 'ADMIN',        label: 'Agência' },
]

export default function FilterBar({ roleFilter, q, action }: FilterBarProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const hasFilters = roleFilter !== '' || q !== ''

  function submitForm() {
    formRef.current?.submit()
  }

  return (
    <form ref={formRef} method="GET" action={action}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative" style={{ flex: '1', minWidth: '220px', maxWidth: '380px' }}>
          <span
            className="material-symbols-outlined absolute text-[18px]"
            style={{ left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', pointerEvents: 'none' }}
          >
            search
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou email…"
            className="w-full outline-none"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-outline-variant)',
              borderRadius: '10px',
              color: 'var(--color-on-surface)',
              fontSize: '13px',
              padding: '9px 12px 9px 36px',
            }}
          />
        </div>

        {/* Role select */}
        <div className="relative">
          <span
            className="material-symbols-outlined absolute text-[16px] pointer-events-none"
            style={{ left: '11px', top: '50%', transform: 'translateY(-50%)', color: roleFilter ? 'var(--color-primary)' : 'var(--color-outline)' }}
          >
            person
          </span>
          <select
            name="role"
            defaultValue={roleFilter}
            onChange={submitForm}
            className="outline-none cursor-pointer appearance-none"
            style={{
              background: roleFilter
                ? 'rgba(2,117,243,0.1)'
                : 'var(--color-surface-container)',
              border: roleFilter
                ? '1px solid rgba(2,117,243,0.3)'
                : '1px solid var(--color-outline-variant)',
              borderRadius: '10px',
              color: roleFilter ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontSize: '13px',
              padding: '9px 32px 9px 34px',
              minWidth: '160px',
            }}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: '#1c1b1b', color: '#e5e2e1' }}>
                {o.label}
              </option>
            ))}
          </select>
          {/* Chevron */}
          <span
            className="material-symbols-outlined absolute pointer-events-none text-[16px]"
            style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }}
          >
            expand_more
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="cursor-pointer transition-opacity"
          style={{
            background: 'var(--color-primary-container)',
            color: 'var(--color-on-primary)',
            border: 'none',
            borderRadius: '10px',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Filtrar
        </button>

        {/* Clear */}
        {hasFilters && (
          <a
            href={action}
            className="inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            style={{
              background: 'var(--color-surface-container-high)',
              color: 'var(--color-on-surface-variant)',
              border: '1px solid var(--color-outline-variant)',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
            Limpar
          </a>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-label-md" style={{ color: 'var(--color-outline)' }}>Filtros ativos:</span>
          {roleFilter && (
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md"
              style={{ background: 'rgba(2,117,243,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(2,117,243,0.25)' }}
            >
              Perfil: {ROLE_OPTIONS.find(o => o.value === roleFilter)?.label ?? roleFilter}
            </span>
          )}
          {q && (
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md"
              style={{ background: 'rgba(2,117,243,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(2,117,243,0.25)' }}
            >
              Busca: &quot;{q}&quot;
            </span>
          )}
        </div>
      )}
    </form>
  )
}
