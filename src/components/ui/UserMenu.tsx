'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from '@/contexts/SidebarContext'
import { clearImpersonationCookie } from '@/app/actions/impersonation'

const VIEW_BADGE_CLASS: Record<string, string> = {
  admin: 'badge-red',
  gerente: 'badge-orange',
  intermediario: 'badge-orange',
  influenciador: 'badge-gray',
}

const VIEW_ICON: Record<string, React.ReactNode> = {
  admin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 7l4 10h12l4-10-5 3-5-7-5 7-5-3z" />
    </svg>
  ),
  gerente: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  intermediario: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a6 6 0 0 1 12 0v1" />
      <path d="M19 12l2 2-2 2" />
      <path d="M5 12l-2 2 2 2" />
    </svg>
  ),
  influenciador: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
}

const VIEW_ACCENT: Record<string, { bg: string; color: string; border: string }> = {
  admin:        { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.25)' },
  gerente:      { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', border: 'rgba(249,115,22,0.25)' },
  intermediario:{ bg: 'rgba(249,115,22,0.12)', color: '#fb923c', border: 'rgba(249,115,22,0.25)' },
  influenciador:{ bg: 'rgba(148,163,184,0.12)',color: '#94a3b8', border: 'rgba(148,163,184,0.25)' },
}

interface UserMenuProps {
  email: string
  role: string
  roleLabel: string
  roleBadgeClass: string
  forceExpanded?: boolean
  views?: string[]
  activeView?: string
  onViewChange?: (v: string) => void
  getViewLabel?: (v: string) => string
}

export default function UserMenu({
  email,
  roleLabel,
  roleBadgeClass,
  forceExpanded,
  views,
  activeView,
  onViewChange,
  getViewLabel,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, setTheme, systemTheme } = useTheme()
  const { isExpanded: ctxExpanded } = useSidebar()

  useEffect(() => { setMounted(true) }, [])
  const isExpanded = forceExpanded ?? ctxExpanded

  const username = email.split('@')[0] ?? email
  const initial = username[0]?.toUpperCase() ?? '?'

  const hasMultipleViews = views && views.length > 1 && activeView && onViewChange && getViewLabel
  const activeBadgeLabel = hasMultipleViews ? getViewLabel!(activeView!) : roleLabel
  const activeBadgeClass = hasMultipleViews
    ? (VIEW_BADGE_CLASS[activeView!] ?? roleBadgeClass)
    : roleBadgeClass

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  async function handleLogout() {
    setLoggingOut(true)
    await clearImpersonationCookie()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div ref={ref} className="relative mt-auto border-t border-[var(--color-outline-variant)]" style={{ padding: isExpanded ? '12px 16px 14px' : '12px 8px 14px' }}>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute rounded-xl overflow-hidden z-50 ${isExpanded ? 'left-0 right-0' : 'left-[calc(100%+8px)] w-[240px]'}`}
          style={{
            bottom: isExpanded ? 'calc(100% + 8px)' : '0',
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--color-outline-variant)',
            boxShadow: '0 -16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2)',
          }}
        >
          {/* Account header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--color-outline-variant)' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-outline)', marginBottom: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Conta
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
            {!isExpanded && (
              <span className={`badge ${activeBadgeClass} mt-2 inline-block`}>{activeBadgeLabel}</span>
            )}
          </div>

          {/* View switcher */}
          {hasMultipleViews && (
            <div style={{ padding: '8px 6px', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <p style={{ fontSize: '11px', color: 'var(--color-outline)', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '0 8px' }}>
                Alternar perfil
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {views!.map(v => {
                  const isActive = v === activeView
                  const label = getViewLabel!(v)
                  const accent = VIEW_ACCENT[v]
                  const icon = VIEW_ICON[v]
                  return (
                    <button
                      key={v}
                      onClick={() => { onViewChange!(v); setOpen(false) }}
                      className="w-full flex items-center gap-2.5 rounded-lg cursor-pointer transition-all"
                      style={{
                        padding: '8px 10px',
                        border: `1px solid ${isActive ? (accent?.border ?? 'var(--color-outline-variant)') : 'transparent'}`,
                        background: isActive ? (accent?.bg ?? 'rgba(2,117,243,0.1)') : 'transparent',
                        color: isActive ? (accent?.color ?? 'var(--color-primary)') : 'var(--color-on-surface-variant)',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{
                        flexShrink: 0,
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: isActive ? (accent?.bg ?? 'rgba(2,117,243,0.15)') : 'var(--color-surface-container)',
                        border: `1px solid ${isActive ? (accent?.border ?? 'transparent') : 'var(--color-outline-variant)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isActive ? (accent?.color ?? 'var(--color-primary)') : 'var(--color-outline)',
                        transition: 'all 150ms',
                      }}>
                        {icon}
                      </span>
                      <span style={{ flex: 1 }}>{label}</span>
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.8 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '6px' }}>
            <MenuButton
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              }
              label="Meu perfil"
              onClick={() => { setOpen(false); router.push('/perfil') }}
            />
            <MenuButton
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              }
              label="Configurações"
              onClick={() => { setOpen(false); router.push('/configuracoes') }}
            />
            {mounted && <DarkModeToggle theme={theme} systemTheme={systemTheme} setTheme={setTheme} />}
            <div style={{ height: '1px', background: 'var(--color-outline-variant)', margin: '6px 0' }} />
            <MenuButton
              icon={
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" />
                </svg>
              }
              label={loggingOut ? 'Saindo...' : 'Sair da conta'}
              onClick={handleLogout}
              danger
            />
          </div>
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} rounded-xl cursor-pointer transition-colors relative group`}
        style={{
          padding: isExpanded ? '8px 10px' : '8px 0',
          background: open ? 'var(--color-surface-container-high)' : 'transparent',
          border: 'none',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--color-surface-container)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-sm font-semibold select-none transition-all duration-300"
          style={{
            width: isExpanded ? 32 : 36,
            height: isExpanded ? 32 : 36,
            background: 'rgba(2,117,243,0.15)',
            border: '1px solid rgba(2,117,243,0.2)',
            color: 'var(--color-primary)',
          }}
        >
          {initial}
        </div>

        {isExpanded && (
          <div className="flex-1 min-w-0 transition-opacity duration-300">
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </div>
            <span className={`badge ${activeBadgeClass}`} style={{ marginTop: 2 }}>{activeBadgeLabel}</span>
          </div>
        )}

        {isExpanded && (
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{
              flexShrink: 0,
              color: 'var(--color-outline)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms',
            }}
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        )}
      </button>
    </div>
  )
}

function DarkModeToggle({
  theme,
  systemTheme,
  setTheme,
}: {
  theme: string | undefined
  systemTheme: string | undefined
  setTheme: (t: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const currentTheme = theme === 'system' ? systemTheme : theme
  const isDark = currentTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors"
      style={{
        padding: '7px 10px',
        border: 'none',
        background: hovered ? 'var(--color-surface-container-highest)' : 'transparent',
        color: hovered ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
        fontSize: '13px',
        fontWeight: 400,
        textAlign: 'left',
      }}
    >
      <span style={{ flexShrink: 0 }}>
        {isDark ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
          </svg>
        )}
      </span>
      <span style={{ flex: 1 }}>{isDark ? 'Modo escuro' : 'Modo claro'}</span>
      {/* Toggle switch */}
      <span
        style={{
          flexShrink: 0,
          width: 32,
          height: 18,
          borderRadius: 9,
          background: isDark ? 'var(--color-primary)' : 'var(--color-outline-variant)',
          position: 'relative',
          display: 'inline-block',
          transition: 'background 200ms',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: isDark ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: isDark ? 'var(--color-on-primary)' : 'var(--color-outline)',
            transition: 'left 200ms',
          }}
        />
      </span>
    </button>
  )
}

function MenuButton({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors"
      style={{
        padding: '7px 10px',
        border: 'none',
        background: hovered
          ? danger ? 'rgba(255,180,171,0.08)' : 'var(--color-surface-container-highest)'
          : 'transparent',
        color: hovered
          ? danger ? 'var(--color-error)' : 'var(--color-on-surface)'
          : danger ? 'var(--color-error)' : 'var(--color-on-surface-variant)',
        fontSize: '13px',
        fontWeight: 400,
        textAlign: 'left',
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}
