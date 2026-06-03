'use client'

import { BlackboxLogo } from '@/components/ui/BlackboxLogo'
import { SaqueNotificacaoBanner } from '@/components/saques/SaqueNotificacaoBanner'

import { ReactNode, useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSidebar } from '@/contexts/SidebarContext'
import { NavItem } from '@/components/ui/NavItem'
import { NavGroup, DrawerNavGroup } from '@/components/ui/NavGroup'
import UserMenu from '@/components/ui/UserMenu'
import { createClient } from '@/lib/supabase/client'
import { ICONS } from '@/config/icons'
import {
  NAV_BY_VIEW,
  VIEW_DISPLAY_LABEL,
  type NavEntry,
  type NavItemConfig,
  type RoleNavConfig,
} from '@/config/nav'
import { stopImpersonation, clearImpersonationCookie } from '@/app/actions/impersonation'

type ViewKey = 'admin' | 'intermediario' | 'gerente' | 'influenciador'

function deriveAvailableViews(roles: string[]): ViewKey[] {
  const views: ViewKey[] = []
  if (roles.includes('admin')) views.push('admin')
  if (roles.includes('intermediario')) views.push('intermediario')
  if (roles.includes('gerente')) views.push('gerente')
  if (roles.includes('influenciador')) views.push('influenciador')
  return views
}

function filterNavSections(config: RoleNavConfig, roles: string[]): RoleNavConfig {
  return config
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.type !== 'item') return true
        const navItem = item as NavItemConfig
        return !navItem.requiredRole || roles.includes(navItem.requiredRole)
      }),
    }))
    .filter(section => section.items.length > 0)
}

interface DashboardShellProps {
  children: ReactNode
  userEmail: string
  roles: string[]
  isAdmin: boolean
  roleLabel: string
  roleBadgeClass: string
  isImpersonating?: boolean
  impersonatedEmail?: string
  impersonatedName?: string
}

/* ── Admin icons (kept inline — admin nav not config-driven) ── */
const iconDashboard = ICONS.dashboard
const iconSaques = ICONS.saques
const iconFinanceiro = ICONS.financeiro
const iconAfiliados = ICONS.afiliados
const iconContratos = ICONS.contratos
const iconCasas = ICONS.casas
const iconEntidades = ICONS.entidades
const iconIncentivos = ICONS.incentivos
const iconLogs = ICONS.logs
const iconProducao = ICONS.producao
const iconUsuarios = ICONS.usuarios

/* ── Config-driven nav renderers ── */

function renderNavEntry(entry: NavEntry, isExpanded: boolean) {
  if (entry.type === 'group') {
    return (
      <NavGroup
        key={entry.label}
        icon={ICONS[entry.icon] ?? null}
        label={entry.label}
        items={entry.items}
      />
    )
  }
  return (
    <NavItem
      key={entry.href}
      href={entry.href}
      label={entry.label}
      icon={ICONS[entry.icon] ?? null}
    />
  )
}

function renderDrawerNavEntry(entry: NavEntry) {
  if (entry.type === 'group') {
    return (
      <DrawerNavGroup
        key={entry.label}
        icon={ICONS[entry.icon] ?? null}
        label={entry.label}
        items={entry.items}
      />
    )
  }
  return (
    <DrawerNavLink
      key={entry.href}
      href={entry.href}
      label={entry.label}
      icon={ICONS[entry.icon] ?? null}
    />
  )
}

function SectionLabel({ label, isExpanded }: { label: string; isExpanded: boolean }) {
  return (
    <p className={`text-label-md text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 whitespace-nowrap transition-all duration-300 ${isExpanded ? 'px-4 text-left' : 'px-0 text-center text-[10px]'}`}>
      {isExpanded ? label : label.slice(0, 4).toUpperCase() + '.'}
    </p>
  )
}

function RoleSection({ config, isExpanded, roleLabel }: { config: RoleNavConfig; isExpanded: boolean; roleLabel?: string }) {
  return (
    <>
      {roleLabel && (
        <p className={`text-label-md text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 whitespace-nowrap transition-all duration-300 ${isExpanded ? 'px-4 text-left' : 'px-0 text-center text-[10px]'}`}>
          {isExpanded ? roleLabel : roleLabel.slice(0, 4).toUpperCase() + '.'}
        </p>
      )}
      {config.map((section, i) => (
        <div key={i}>
          {section.sectionLabel && (
            <SectionLabel label={section.sectionLabel} isExpanded={isExpanded} />
          )}
          {section.items.map(entry => renderNavEntry(entry, isExpanded))}
        </div>
      ))}
    </>
  )
}

function DrawerRoleSection({ config, roleLabel }: { config: RoleNavConfig; roleLabel?: string }) {
  return (
    <>
      {roleLabel && (
        <p className="text-[11px] text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 uppercase tracking-widest px-4">
          {roleLabel}
        </p>
      )}
      {config.map((section, i) => (
        <div key={i}>
          {section.sectionLabel && (
            <p className="text-[11px] text-[var(--color-on-surface-variant)] pt-4 pb-2 opacity-60 uppercase tracking-widest px-4">
              {section.sectionLabel}
            </p>
          )}
          {section.items.map(entry => renderDrawerNavEntry(entry))}
        </div>
      ))}
    </>
  )
}

export default function DashboardShell({ children, userEmail, roles, isAdmin, roleLabel, roleBadgeClass, isImpersonating, impersonatedEmail, impersonatedName }: DashboardShellProps) {
  const { isExpanded, toggleSidebar } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close drawer on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    if (mobileOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // Focus management: move focus into drawer on open, return to hamburger on close
  useEffect(() => {
    if (mobileOpen) {
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
        'a, button, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    } else {
      hamburgerRef.current?.focus()
    }
  }, [mobileOpen])

  const availableViews = deriveAvailableViews(roles)
  const [activeView, setActiveView] = useState<ViewKey>(availableViews[0] ?? 'influenciador')

  // Prevent activeView from being stuck on an unavailable view after navigation/impersonation
  const rolesStr = roles.join(',')
  useEffect(() => {
    if (!availableViews.includes(activeView) && availableViews.length > 0) {
      setActiveView(availableViews[0])
    }
  }, [rolesStr, activeView])

  const activeNavConfig = activeView === 'admin'
    ? null
    : filterNavSections(NAV_BY_VIEW[activeView] ?? [], roles)

  const getViewLabel = (v: ViewKey): string => {
    return VIEW_DISPLAY_LABEL[v] ?? v
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-surface)]">
      {/* ── Impersonation Banner (fixed top bar) ── */}
      {isImpersonating && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] h-10 flex items-center justify-between px-4 md:px-6"
          style={{
            background: 'linear-gradient(90deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 80%, #6ea8ff) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 2px 16px rgba(2,117,243,0.35)',
          }}
        >
          {/* Left: icon + label + user pill */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-[15px] opacity-80" style={{ color: 'rgba(255,255,255,0.9)' }}>admin_panel_settings</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70 hidden sm:block" style={{ color: 'rgba(255,255,255,0.9)' }}>Modo Admin</span>
            <span className="opacity-40 hidden sm:block" style={{ color: 'white', fontSize: '10px' }}>·</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                {(impersonatedName ?? impersonatedEmail)?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs font-medium truncate" style={{ color: 'white' }}>
                <span className="hidden sm:inline">{impersonatedName} · </span>
                <span className="opacity-80">{impersonatedEmail}</span>
              </span>
            </div>
          </div>

          {/* Right: exit button */}
          <button
            onClick={() => {
              setActiveView('admin')
              stopImpersonation()
            }}
            className="flex items-center gap-1.5 flex-shrink-0 transition-all cursor-pointer border-none"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'white',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '6px',
              padding: '3px 10px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            <span className="material-symbols-outlined text-[13px]">logout</span>
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      )}

      {/* ── Mobile Topbar (< md only) ── */}
      <header
        className={`md:hidden fixed ${isImpersonating ? 'top-10' : 'top-0'} left-0 right-0 h-14 z-40 flex items-center justify-between px-4`}
        style={{
          background: 'var(--color-surface-container-lowest)',
          borderBottom: '1px solid var(--color-sidebar-border)',
          boxShadow: 'var(--color-sidebar-shadow)',
        }}
      >
        {/* Hamburger */}
        <button
          ref={hamburgerRef}
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <BlackboxLogo size={28} className="text-[var(--color-primary)] flex-shrink-0" />
          <span className="font-bold" style={{ fontSize: '17px', letterSpacing: '-0.02em' }}><span style={{ color: 'var(--color-on-surface)' }}>BLACK</span><span style={{ color: 'var(--color-primary)' }}>BOX</span></span>
        </div>

        {/* Avatar */}
        <TopbarAvatar email={userEmail} roleLabel={roleLabel} roleBadgeClass={roleBadgeClass} />
      </header>

      {/* ── Backdrop (< md, when drawer open) ── */}
      {mobileOpen && (
        <div
          role="presentation"
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer (< md) ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className="md:hidden fixed left-0 top-0 h-full w-[260px] z-50 flex flex-col transition-transform duration-300"
        style={{
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-260px)',
          background: 'var(--color-surface-container-lowest)',
          border: '1px solid var(--color-sidebar-border)',
          boxShadow: mobileOpen ? 'var(--color-sidebar-shadow)' : 'none',
        }}
        aria-hidden={!mobileOpen}
      >
        {/* Fixed logo */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 mt-2">
          <div className="flex items-center gap-3">
            <BlackboxLogo size={32} className="text-[var(--color-primary)] flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <h1 className="font-bold leading-tight" style={{ fontSize: '18px', letterSpacing: '-0.02em' }}><span style={{ color: 'var(--color-on-surface)' }}>BLACK</span><span style={{ color: 'var(--color-primary)' }}>BOX</span></h1>
              <p className="text-[11px] font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-0.5">AFFILIATES</p>
            </div>
          </div>
        </div>

        {/* Scrollable nav only */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-hidden">
          <nav className="flex flex-col gap-1 px-1 pb-4">
            {activeView === 'admin' ? (
              /* ── ADMIN DRAWER NAV ── */
              <>
                <DrawerNavLink href="/dashboard" label="Dashboard" icon={iconDashboard} />
                <p className="text-[11px] text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 uppercase tracking-widest px-4">Gestão</p>
                <DrawerNavLink href="/admin/afiliados" label="Afiliados" icon={iconAfiliados} />
                <DrawerNavLink href="/admin/contratos" label="Contratos" icon={iconContratos} />
                <DrawerNavLink href="/admin/producao" label="Produção" icon={iconProducao} />
                <DrawerNavLink href="/admin/saques" label="Saques" icon={iconSaques} />
                <DrawerNavGroup
                  icon={iconFinanceiro}
                  label="Financeiro"
                  items={[
                    { href: '/admin/financeiro', label: 'Visão Geral' },
                    { href: '/admin/financeiro/intermediarios', label: 'Pagam. Intermediários' },
                    { href: '/admin/financeiro/gerentes', label: 'Pagam. Gerentes' },
                  ]}
                />
                <DrawerNavLink href="/admin/casas" label="Casas de Apostas" icon={iconCasas} />
                <DrawerNavLink href="/admin/entidades" label="Entidades" icon={iconEntidades} />
                <DrawerNavLink href="/admin/incentivos" label="Incentivos" icon={iconIncentivos} />
                <p className="text-[11px] text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 uppercase tracking-widest px-4">Sistema</p>
                <DrawerNavLink href="/admin/usuarios" label="Usuários" icon={iconUsuarios} />
                <DrawerNavLink href="/admin/logs" label="Logs" icon={iconLogs} />
              </>
            ) : (
              activeNavConfig && <DrawerRoleSection config={activeNavConfig} />
            )}
          </nav>
        </div>

        {/* Sticky bottom: full UserMenu, always expanded */}
        <UserMenu
          email={userEmail}
          role={roles[0] ?? 'influenciador'}
          roleLabel={roleLabel}
          roleBadgeClass={roleBadgeClass}
          forceExpanded={true}
          views={availableViews}
          activeView={activeView}
          onViewChange={(v) => setActiveView(v as ViewKey)}
          getViewLabel={(v) => getViewLabel(v as ViewKey)}
        />
      </div>

      {/* Sidebar Shell */}
      <aside
        className={`hidden md:flex fixed left-4 ${isImpersonating ? 'top-[56px]' : 'top-4'} bottom-4 rounded-3xl bg-[var(--color-surface-container-lowest)] md:flex-col z-50 transition-all duration-300 ${isExpanded ? 'w-[260px]' : 'w-[80px]'
          }`}
        style={{
          border: '1px solid var(--color-sidebar-border)',
          boxShadow: 'var(--color-sidebar-shadow)',
        }}
      >
        {/* Toggle Expand/Collapse Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-7 w-7 h-7 flex cursor-pointer items-center justify-center bg-[var(--color-surface-container-lowest)] rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors z-50 outline-none focus:outline-none focus:ring-0"
          style={{ border: '1px solid var(--color-sidebar-border)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', WebkitTapHighlightColor: 'transparent' }}
          title={isExpanded ? "Recolher menu" : "Expandir menu"}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-300 ${isExpanded ? '' : 'rotate-180'}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Fixed logo */}
        <div className={`flex-shrink-0 pt-6 pb-4 mt-2 transition-all duration-300 ${isExpanded ? 'px-6' : 'px-0 flex justify-center'}`}>
          <div className={`flex items-center gap-3 ${isExpanded ? '' : 'justify-center'}`}>
            <BlackboxLogo size={32} className="text-[var(--color-primary)] flex-shrink-0" />
            {isExpanded && (
              <div className="flex-1 overflow-hidden transition-opacity duration-300">
                <h1 className="font-bold leading-tight" style={{ fontSize: '18px', letterSpacing: '-0.02em' }}><span style={{ color: 'var(--color-on-surface)' }}>BLACK</span><span style={{ color: 'var(--color-primary)' }}>BOX</span></h1>
                <p className="text-[11px] font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-0.5">AFFILIATES</p>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable nav only */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-hidden">
          <nav className="flex flex-col gap-1 px-1 pb-4">
            {activeView === 'admin' ? (
              /* ── ADMIN NAV ── */
              <>
                <NavItem href="/dashboard" label="Dashboard" icon={iconDashboard} />
                <p className={`text-label-md text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 whitespace-nowrap transition-all duration-300 ${isExpanded ? 'px-4 text-left' : 'px-0 text-center text-[10px]'}`}>
                  {isExpanded ? 'Gestão' : 'GEST.'}
                </p>
                <NavItem href="/admin/afiliados" label="Afiliados" icon={iconAfiliados} />
                <NavItem href="/admin/contratos" label="Contratos" icon={iconContratos} />
                <NavItem href="/admin/producao" label="Produção" icon={iconProducao} />
                <NavItem href="/admin/saques" label="Saques" icon={iconSaques} />
                <NavGroup
                  icon={iconFinanceiro}
                  label="Financeiro"
                  items={[
                    { href: '/admin/financeiro', label: 'Visão Geral' },
                    { href: '/admin/financeiro/intermediarios', label: 'Pagam. Intermediários' },
                    { href: '/admin/financeiro/gerentes', label: 'Pagam. Gerentes' },
                  ]}
                />
                <NavItem href="/admin/casas" label="Casas de Apostas" icon={iconCasas} />
                <NavItem href="/admin/entidades" label="Entidades" icon={iconEntidades} />
                <NavItem href="/admin/incentivos" label="Incentivos" icon={iconIncentivos} />
                <p className={`text-label-md text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 whitespace-nowrap transition-all duration-300 ${isExpanded ? 'px-4 text-left' : 'px-0 text-center text-[10px]'}`}>
                  {isExpanded ? 'Sistema' : 'SIST.'}
                </p>
                <NavItem href="/admin/usuarios" label="Usuários" icon={iconUsuarios} />
                <NavItem href="/admin/logs" label="Logs" icon={iconLogs} />
              </>
            ) : (
              /* ── ROLE NAV ── */
              activeNavConfig && (
                <RoleSection config={activeNavConfig} isExpanded={isExpanded} />
              )
            )}
          </nav>
        </div>

        {/* Sticky bottom: user menu */}
        <UserMenu
          email={userEmail}
          role={roles[0] ?? 'influenciador'}
          roleLabel={roleLabel}
          roleBadgeClass={roleBadgeClass}
          views={availableViews}
          activeView={activeView}
          onViewChange={(v) => setActiveView(v as ViewKey)}
          getViewLabel={(v) => getViewLabel(v as ViewKey)}
        />
      </aside>

      {/* Main Content Canvas */}
      <main
        className={`flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden pb-8 pr-4 md:pr-8 pl-4 md:pl-8 transition-all duration-300 ${isImpersonating ? 'pt-[calc(56px+40px+24px)] md:pt-[calc(40px+24px)]' : 'pt-[calc(56px+24px)] md:pt-6'} ml-0 ${isExpanded ? 'md:ml-[292px]' : 'md:ml-[112px]'
          }`}
        style={{ background: 'var(--color-surface)' }}
      >
        <div className="w-full max-w-full flex flex-col min-w-0 gap-6">
          {!isAdmin && <SaqueNotificacaoBanner />}
          {children}
        </div>
      </main>
    </div>
  )
}

function TopbarAvatar({
  email,
  roleLabel,
  roleBadgeClass,
}: {
  email: string
  roleLabel: string
  roleBadgeClass: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const username = email.split('@')[0] ?? email
  const initial = username[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
        style={{
          background: 'rgba(2,117,243,0.15)',
          border: '1px solid rgba(2,117,243,0.2)',
          color: 'var(--color-primary)',
        }}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-[220px] rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--color-surface-container-high)',
            border: '1px solid var(--color-outline-variant)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--color-outline-variant)' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-outline)', marginBottom: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Conta
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
            <span className={`badge ${roleBadgeClass} mt-2 inline-block`}>{roleLabel}</span>
          </div>
          {/* Actions */}
          <div style={{ padding: '6px' }}>
            <button
              onClick={() => { setOpen(false); router.push('/perfil') }}
              className="w-full flex items-center gap-2.5 rounded-lg text-left"
              style={{ padding: '7px 10px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontSize: '13px', cursor: 'pointer' }}
            >
              Meu perfil
            </button>
            <button
              onClick={() => { setOpen(false); router.push('/configuracoes') }}
              className="w-full flex items-center gap-2.5 rounded-lg text-left"
              style={{ padding: '7px 10px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontSize: '13px', cursor: 'pointer' }}
            >
              Configurações
            </button>
            <div style={{ height: '1px', background: 'var(--color-outline-variant)', margin: '6px 0' }} />
            <button
              onClick={async () => {
                setOpen(false)
                await clearImpersonationCookie()
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/login')
                router.refresh()
              }}
              className="w-full flex items-center gap-2.5 rounded-lg text-left"
              style={{ padding: '7px 10px', background: 'transparent', border: 'none', color: 'var(--color-error)', fontSize: '13px', cursor: 'pointer' }}
            >
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ViewSwitcher({
  views,
  activeView,
  onSwitch,
  isExpanded,
  getLabel,
}: {
  views: ViewKey[]
  activeView: ViewKey
  onSwitch: (v: ViewKey) => void
  isExpanded: boolean
  getLabel: (v: ViewKey) => string
}) {
  if (views.length <= 1) return null
  return (
    <div className={`flex gap-1 px-2 pt-4 pb-1 ${isExpanded ? 'flex-row' : 'flex-col items-center'}`}>
      {views.map(v => {
        const label = getLabel(v)
        return (
          <button
            key={v}
            onClick={() => onSwitch(v)}
            title={label}
            className={`rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer border-none ${activeView === v
              ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
              : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]'
              } ${isExpanded ? 'px-3 py-1.5 flex-1' : 'w-10 h-8 flex items-center justify-center'}`}
          >
            {isExpanded ? label : label.slice(0, 2).toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

function DrawerNavLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname()
  const isActive = href.includes('/', 1)
    ? pathname === href || pathname.startsWith(href + '/')
    : pathname === href

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 mx-2 py-3 rounded-lg transition-all duration-200 border-l-3 ${isActive
        ? 'text-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
        : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] border-transparent'
        }`}
    >
      <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>
      <span className="text-[12px] font-medium tracking-[0.05em] uppercase whitespace-nowrap">{label}</span>
    </Link>
  )
}
