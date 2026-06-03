# Mobile Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed mobile topbar (hamburger + logo + avatar) and overlay drawer sidebar to the dashboard, with no changes to desktop behavior.

**Architecture:** Modify `DashboardShell.tsx` to add local `mobileOpen` state, a mobile-only topbar, a backdrop, and a slide-in drawer containing the same nav content. Add `forceExpanded` prop to `UserMenu.tsx` so the drawer always shows the expanded user menu. Desktop sidebar and SidebarContext stay untouched.

**Tech Stack:** React, Tailwind CSS, Next.js App Router, `usePathname` for auto-close on navigation.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/components/layout/DashboardShell.tsx` | All mobile layout: topbar, backdrop, drawer, state |
| Modify | `src/components/ui/UserMenu.tsx` | Add `forceExpanded?: boolean` prop to override context |

---

### Task 1: Add `forceExpanded` prop to `UserMenu`

`UserMenu` reads `isExpanded` from `SidebarContext`. In the drawer it must always render in "expanded" mode regardless of the desktop sidebar state. We add a `forceExpanded` override prop.

**Files:**
- Modify: `src/components/ui/UserMenu.tsx`

- [ ] **Step 1: Update `UserMenuProps` and replace `isExpanded` reads**

Open `src/components/ui/UserMenu.tsx`. Change the interface and the one line that reads from context:

```tsx
interface UserMenuProps {
  email: string
  role: string
  roleLabel: string
  roleBadgeClass: string
  forceExpanded?: boolean   // ← add this
}

export default function UserMenu({ email, roleLabel, roleBadgeClass, forceExpanded }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { isExpanded: ctxExpanded } = useSidebar()
  const isExpanded = forceExpanded ?? ctxExpanded   // ← replace bare `isExpanded`
```

Everything else in the file stays the same — all existing `isExpanded` references now use this derived value.

- [ ] **Step 2: Verify the file renders correctly (no TypeScript errors)**

```bash
cd C:\Users\harry\Documents\GitHub\project-orbit
npx tsc --noEmit
```

Expected: no errors (or same errors as before — no new ones).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/UserMenu.tsx
git commit -m "feat(user-menu): add forceExpanded prop to override sidebar context"
```

---

### Task 2: Add `mobileOpen` state + Escape-key listener to `DashboardShell`

**Files:**
- Modify: `src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/components/layout/DashboardShell.tsx`, update the React import and add `usePathname`:

```tsx
'use client'

import { ReactNode, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'
import { NavItem } from '@/components/ui/NavItem'
import UserMenu from '@/components/ui/UserMenu'
```

- [ ] **Step 2: Add state and effects inside `DashboardShell`**

Inside the `DashboardShell` function, right after the `useSidebar` line:

```tsx
export default function DashboardShell({ children, userEmail, role, isAdmin, roleLabel, roleBadgeClass }: DashboardShellProps) {
  const { isExpanded, toggleSidebar } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
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
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/DashboardShell.tsx
git commit -m "feat(shell): add mobileOpen state, escape-key and pathname close handlers"
```

---

### Task 3: Add mobile topbar

The topbar is `fixed top-0 left-0 right-0 h-14 z-40`, visible only `< md`. It contains: hamburger button (left), ORBIT logo (center), avatar button (right).

The avatar button in the topbar is a self-contained mini dropdown — it does NOT reuse `UserMenu` (which is coupled to sidebar positioning). It shows the initial letter and a dropdown with Meu perfil, Configurações, Sair.

**Files:**
- Modify: `src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Add `TopbarAvatar` inner component at bottom of file (before `export default`)**

Add this component inside `DashboardShell.tsx`, before the `export default` function or just above the return — but since it needs `userEmail`/`roleLabel`/`roleBadgeClass` props, define it as a standalone inner component **after** the main export or as a separate named export at the bottom of the file:

```tsx
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
        className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold"
        style={{
          background: 'rgba(75,142,255,0.15)',
          border: '1px solid rgba(75,142,255,0.2)',
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
                const { createClient } = await import('@/lib/supabase/client')
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
```

Also add `useRef` to the React import: `import { ReactNode, useState, useEffect, useRef } from 'react'`

Add `useRouter` import: `import { usePathname, useRouter } from 'next/navigation'`

- [ ] **Step 2: Add the topbar JSX inside `DashboardShell` return, as first child of the outer `<div>`**

Inside the main return, right after `<div className="min-h-screen flex bg-[var(--color-surface)]">`, add:

```tsx
{/* ── Mobile Topbar (< md only) ── */}
<header
  className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4"
  style={{
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-sidebar-border)',
    boxShadow: 'var(--color-sidebar-shadow)',
  }}
>
  {/* Hamburger */}
  <button
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
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--color-primary)]">
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.6" />
      </svg>
    </div>
    <span className="font-bold text-[var(--color-primary)]" style={{ fontSize: '17px', letterSpacing: '-0.02em' }}>ORBIT</span>
  </div>

  {/* Avatar */}
  <TopbarAvatar email={userEmail} roleLabel={roleLabel} roleBadgeClass={roleBadgeClass} />
</header>
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/DashboardShell.tsx
git commit -m "feat(shell): add mobile topbar with hamburger, logo, and avatar dropdown"
```

---

### Task 4: Add backdrop and mobile drawer

**Files:**
- Modify: `src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Add backdrop JSX after the topbar `<header>`**

```tsx
{/* ── Backdrop (< md, when drawer open) ── */}
{mobileOpen && (
  <div
    className="md:hidden fixed inset-0 z-40 bg-black/50"
    onClick={() => setMobileOpen(false)}
    aria-hidden="true"
  />
)}
```

- [ ] **Step 2: Add drawer JSX after the backdrop**

The drawer always renders in the DOM (for CSS transition to work). It slides in/out via `transform`.

```tsx
{/* ── Mobile Drawer (< md) ── */}
<div
  className="md:hidden fixed left-0 top-0 h-full w-[260px] z-50 flex flex-col transition-transform duration-300"
  style={{
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-260px)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-sidebar-border)',
    boxShadow: mobileOpen ? 'var(--color-sidebar-shadow)' : 'none',
  }}
  aria-hidden={!mobileOpen}
>
  {/* Scrollable content: logo + nav */}
  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pt-6 overflow-x-hidden">
    {/* Logo */}
    <div className="px-6 mb-8 mt-2">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[var(--color-primary)]">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.6" />
          </svg>
        </div>
        <div className="flex-1 overflow-hidden">
          <h1 className="font-bold text-[var(--color-primary)] leading-tight" style={{ fontSize: '18px', letterSpacing: '-0.02em' }}>ORBIT</h1>
          <p className="text-[11px] font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-0.5">Network</p>
        </div>
      </div>
    </div>

    {/* Nav — same items as desktop */}
    <nav className="flex flex-col gap-1 px-1 pb-4">
      {isAdmin ? (
        <>
          <NavItem href="/dashboard" label="Dashboard" icon={iconDashboard} />
          <p className="text-label-md text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 whitespace-nowrap px-4 text-left">Gestão</p>
          <NavItem href="/admin/usuarios" label="Usuários" icon={iconAfiliados} />
          <NavItem href="/admin/contratos" label="Contratos" icon={iconContratos} />
          <NavItem href="/admin/producao" label="Produção" icon={iconProducao} />
          <NavItem href="/admin/saques" label="Saques" icon={iconSaques} />
          <NavItem href="/admin/pagamentos" label="Pagamentos" icon={iconPagamentos} />
          <NavItem href="/admin/casas" label="Casas de Apostas" icon={iconCasas} />
          <NavItem href="/admin/entidades" label="Entidades" icon={iconEntidades} />
          <NavItem href="/admin/incentivos" label="Incentivos" icon={iconIncentivos} />
          <p className="text-label-md text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 whitespace-nowrap px-4 text-left">Sistema</p>
          <NavItem href="/admin/sincronizacao" label="Sincronização" icon={iconSync} />
          <NavItem href="/admin/logs" label="Logs" icon={iconLogs} />
        </>
      ) : (
        <>
          <NavItem href="/dashboard" label="Início" icon={iconDashboard} />
          <NavItem href="/financeiro" label="Financeiro" icon={iconSaques} />
          <NavItem href="/producao" label="Produção" icon={iconProducao} />
          {role === 'gerente' && <NavItem href="/rede" label="Minha Rede" icon={iconRede} />}
          {role === 'intermediario' && <NavItem href="/rede" label="Rede de Gerentes" icon={iconRede} />}
          <NavItem href="/historico" label="Histórico" icon={iconHistorico} />
        </>
      )}
    </nav>
  </div>

  {/* Sticky bottom: full UserMenu, always expanded */}
  <UserMenu
    email={userEmail}
    role={role}
    roleLabel={roleLabel}
    roleBadgeClass={roleBadgeClass}
    forceExpanded={true}
  />
</div>
```

> **Note:** `NavItem` reads `isExpanded` from `SidebarContext`. In the drawer it will use whatever the desktop sidebar state is. Since the drawer always shows labels, we need `NavItem` to always render in "expanded" mode here. The `usePathname` effect in Task 2 already closes the drawer on navigation, so the label display will be correct. However, `NavItem` controls label visibility via `isExpanded` — on mobile, the context's `isExpanded` might be `false` (collapsed state). To fix: the drawer's `NavItem` calls need `isExpanded=true`. Since `NavItem` reads from context, we need to force it. The simplest fix: ensure the SidebarContext defaults to `true` on first render, OR wrap the drawer nav in an inline override. The cleanest approach: in `NavItem`, show the label whenever `isExpanded` OR when the component is inside the drawer. Since we can't easily detect "inside drawer", pass `forceExpanded` to `NavItem` too — but that changes its interface.

> **Pragmatic fix:** In the drawer's `<nav>`, replace `<NavItem>` with inline `<Link>` components that always show the label. This avoids changing `NavItem`'s interface and is self-contained.

Replace the drawer `<nav>` block above with this version using inline Links:

```tsx
{/* Nav — inline Links so drawer always shows labels regardless of sidebar context */}
<nav className="flex flex-col gap-1 px-1 pb-4">
  {isAdmin ? (
    <>
      <DrawerNavLink href="/dashboard" label="Dashboard" icon={iconDashboard} />
      <p className="text-[11px] text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 uppercase tracking-widest px-4">Gestão</p>
      <DrawerNavLink href="/admin/usuarios" label="Usuários" icon={iconAfiliados} />
      <DrawerNavLink href="/admin/contratos" label="Contratos" icon={iconContratos} />
      <DrawerNavLink href="/admin/producao" label="Produção" icon={iconProducao} />
      <DrawerNavLink href="/admin/saques" label="Saques" icon={iconSaques} />
      <DrawerNavLink href="/admin/pagamentos" label="Pagamentos" icon={iconPagamentos} />
      <DrawerNavLink href="/admin/casas" label="Casas de Apostas" icon={iconCasas} />
      <DrawerNavLink href="/admin/entidades" label="Entidades" icon={iconEntidades} />
      <DrawerNavLink href="/admin/incentivos" label="Incentivos" icon={iconIncentivos} />
      <p className="text-[11px] text-[var(--color-on-surface-variant)] pt-6 pb-2 opacity-60 uppercase tracking-widest px-4">Sistema</p>
      <DrawerNavLink href="/admin/sincronizacao" label="Sincronização" icon={iconSync} />
      <DrawerNavLink href="/admin/logs" label="Logs" icon={iconLogs} />
    </>
  ) : (
    <>
      <DrawerNavLink href="/dashboard" label="Início" icon={iconDashboard} />
      <DrawerNavLink href="/financeiro" label="Financeiro" icon={iconSaques} />
      <DrawerNavLink href="/producao" label="Produção" icon={iconProducao} />
      {role === 'gerente' && <DrawerNavLink href="/rede" label="Minha Rede" icon={iconRede} />}
      {role === 'intermediario' && <DrawerNavLink href="/rede" label="Rede de Gerentes" icon={iconRede} />}
      <DrawerNavLink href="/historico" label="Histórico" icon={iconHistorico} />
    </>
  )}
</nav>
```

Add `DrawerNavLink` component at the bottom of `DashboardShell.tsx` (after `TopbarAvatar`):

```tsx
import Link from 'next/link'

function DrawerNavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = href.includes('/', 1)
    ? pathname === href || pathname.startsWith(href + '/')
    : pathname === href

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 mx-2 py-3 rounded-lg transition-all duration-200 border-l-3 ${
        isActive
          ? 'text-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
          : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] border-transparent'
      }`}
    >
      <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>
      <span className="text-[12px] font-medium tracking-[0.05em] uppercase whitespace-nowrap">{label}</span>
    </Link>
  )
}
```

> `Link` is already imported in `NavItem.tsx` but not in `DashboardShell.tsx`. Add the import at the top: `import Link from 'next/link'`

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/DashboardShell.tsx
git commit -m "feat(shell): add mobile drawer overlay with backdrop and nav content"
```

---

### Task 5: Fix `<main>` and desktop `<aside>` responsive classes

**Files:**
- Modify: `src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Update desktop `<aside>` to hide on mobile**

Find the desktop `<aside>` tag (line ~113 in original). Add `hidden md:flex` and remove `flex` from the base classes. The current class starts with `fixed left-4 top-4...` — it doesn't have `flex` in the className, but it's a flex column via `flex flex-col`. Update:

```tsx
<aside
  className={`hidden md:flex fixed left-4 top-4 bottom-4 rounded-3xl bg-[var(--color-surface)] flex-col z-50 transition-all duration-300 ${
    isExpanded ? 'w-[260px]' : 'w-[80px]'
  }`}
  style={{
    border: '1px solid var(--color-sidebar-border)',
    boxShadow: 'var(--color-sidebar-shadow)',
  }}
>
```

- [ ] **Step 2: Update `<main>` to add `pt-14 md:pt-0` and fix left margin on mobile**

Find the `<main>` tag (line ~200 in original). Update:

```tsx
<main
  className={`flex-1 flex flex-col min-h-screen pb-8 pr-4 md:pr-8 pt-6 pl-4 md:pl-8 transition-all duration-300 pt-[calc(56px+24px)] md:pt-6 ${
    isExpanded ? 'md:ml-[292px]' : 'md:ml-[112px]'
  } ml-0`}
  style={{ background: 'var(--color-surface)' }}
>
```

> This sets `ml-0` on mobile (no sidebar offset), `md:ml-[112px]` or `md:ml-[292px]` on desktop. Also adds top padding on mobile to clear the 56px topbar + original 24px page top padding, reverting to normal `pt-6` on desktop.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/DashboardShell.tsx
git commit -m "feat(shell): hide desktop sidebar on mobile, fix main padding and margin"
```

---

### Task 6: Smoke test in browser

**Files:** none

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open http://localhost:3000 and log in**

- [ ] **Step 3: Resize browser to < 768px (or use DevTools mobile emulation)**

Verify:
- Desktop sidebar is hidden
- Topbar appears at top: hamburger left, ORBIT logo center, avatar right
- Tapping hamburger opens drawer from left with all nav items and UserMenu
- Tapping backdrop closes drawer
- Pressing Escape closes drawer
- Navigating to a page closes drawer
- Desktop (> 768px): topbar hidden, sidebar visible and collapsible as before

- [ ] **Step 4: Check dark mode**

Toggle theme. Verify topbar and drawer use correct CSS variables (no hardcoded colors).

---

### Task 7: Final commit

- [ ] **Step 1: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: mobile navigation — topbar, hamburger drawer, responsive layout"
```
