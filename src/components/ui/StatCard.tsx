'use client'

import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: ReactNode | string          // string = material-symbol name
  accent?: string                   // hex/rgba color — default: primary blue
  onClick?: () => void
  active?: boolean
  extra?: ReactNode
  className?: string
}

const DEFAULT_ACCENT = '#0275F3'

function hexToRgba(hex: string, alpha: number) {
  // handle rgba passthrough
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex.replace(/[\d.]+\)$/, `${alpha})`)
  }
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = DEFAULT_ACCENT,
  onClick,
  active = false,
  extra,
  className = '',
}: StatCardProps) {
  const bg    = hexToRgba(accent, 0.12)
  const glow  = hexToRgba(accent, 0.14)
  const border = active ? hexToRgba(accent, 0.45) : 'var(--color-outline-variant)'

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={`relative rounded-2xl p-5 text-left transition-all duration-200 overflow-hidden ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} ${className}`}
      style={{
        background: active
          ? `linear-gradient(135deg, ${bg} 0%, var(--color-surface-container) 100%)`
          : 'var(--color-surface-container)',
        border: `1px solid ${border}`,
        boxShadow: 'none',
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl transition-opacity duration-200"
        style={{
          background: `linear-gradient(90deg, ${accent}, ${hexToRgba(accent, 0.4)})`,
          opacity: active ? 1 : 0.25,
        }}
      />

      <div className="flex items-start justify-between mb-3 mt-1">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bg, border: '1px solid var(--color-outline-variant)' }}
        >
          {typeof icon === 'string' ? (
            <span className="material-symbols-outlined text-[18px]" style={{ color: accent }}>{icon}</span>
          ) : (
            <span style={{ color: accent }}>{icon}</span>
          )}
        </div>

        {/* Value */}
        <span
          className="text-3xl font-bold tabular-nums leading-none"
          style={{ color: accent }}
        >
          {value}
        </span>
      </div>

      {/* Label */}
      <p
        className="text-[11px] font-semibold uppercase tracking-wider leading-tight mb-1"
        style={{ color: 'var(--color-on-surface-variant)' }}
      >
        {label}
      </p>

      {/* Sub */}
      {sub && (
        <p
          className="text-sm font-medium tabular-nums"
          style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}
        >
          {sub}
        </p>
      )}

      {/* Extra slot */}
      {extra}
    </Tag>
  )
}

/** Variant: value left-aligned (large), icon top-right — for dashboard summary cards */
export function SummaryCard({
  label,
  value,
  sub,
  icon,
  accent = DEFAULT_ACCENT,
  className = '',
}: Omit<StatCardProps, 'onClick' | 'active' | 'extra'>) {
  const bg = hexToRgba(accent, 0.12)

  return (
    <div
      className={`relative rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:scale-[1.01] group ${className}`}
      style={{
        background: 'var(--color-surface-container)',
        border: '1px solid var(--color-outline-variant)',
        boxShadow: 'none',
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${accent}, ${hexToRgba(accent, 0.3)})`,
          opacity: 0.5,
          transition: 'opacity 200ms',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: `linear-gradient(90deg, ${accent}, ${hexToRgba(accent, 0.3)})`,
          opacity: 0,
        }}
      />

      <div className="flex items-center justify-between mb-3 mt-1">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bg, border: '1px solid var(--color-outline-variant)' }}
        >
          {typeof icon === 'string' ? (
            <span className="material-symbols-outlined text-[17px]" style={{ color: accent }}>{icon}</span>
          ) : (
            <span style={{ color: accent }}>{icon}</span>
          )}
        </div>
      </div>

      <p className="text-3xl font-bold tabular-nums leading-none mb-1" style={{ color: 'var(--color-on-surface)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>
          {sub}
        </p>
      )}
    </div>
  )
}
