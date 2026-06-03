'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Override max width at xl (1280px+). Default: md = 50% */
  size?: 'sm' | 'md' | 'lg' | 'full'
  /** Accent color for top bar. Default: primary blue */
  accent?: string
}

const SIZE_CLASS: Record<string, string> = {
  sm:   'xl:w-[40%]',
  md:   'xl:w-[50%]',
  lg:   'xl:w-[60%]',
  full: 'xl:w-full',
}

export default function Drawer({ open, onClose, title, children, footer, size = 'md', accent = '#0275F3' }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      const t = setTimeout(() => {
        setVisible(true)
      }, 10)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  function handleClose() {
    onClose()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        first?.focus({ preventScroll: true })
      }, 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const drawer = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: open ? 'auto' : 'none' }}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: visible ? 'blur(6px)' : 'none',
          WebkitBackdropFilter: visible ? 'blur(6px)' : 'none',
          transition: 'opacity 300ms',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={[
          'w-full sm:w-[90%] md:w-[75%] lg:w-[60%]',
          SIZE_CLASS[size] ?? SIZE_CLASS.md,
        ].join(' ')}
        style={{
          minWidth: 320,
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-outline-variant)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.7), -4px 0 16px rgba(0,0,0,0.4)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(.32,.72,0,1)',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          height: 2,
          flexShrink: 0,
          background: `linear-gradient(90deg, ${accent}, ${accent}60, transparent)`,
        }} />

        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-outline-variant)',
            background: 'var(--color-surface-container-low)',
            minHeight: 68,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>{title}</div>

          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Fechar"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid var(--color-outline-variant)',
              background: 'var(--color-surface-container)',
              color: 'var(--color-on-surface-variant)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-surface-container-high)'
              e.currentTarget.style.borderColor = 'var(--color-outline)'
              e.currentTarget.style.color = 'var(--color-on-surface)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--color-surface-container)'
              e.currentTarget.style.borderColor = 'var(--color-outline-variant)'
              e.currentTarget.style.color = 'var(--color-on-surface-variant)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}
          className="[&::-webkit-scrollbar]:hidden">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid var(--color-outline-variant)',
            background: 'var(--color-surface-container-low)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  if (!mounted || !shouldRender) return null
  return createPortal(drawer, document.body)
}
