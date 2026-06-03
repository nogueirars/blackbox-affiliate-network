# Mobile Accessibility — Design Spec
Date: 2026-05-22

## Overview

Add mobile-first navigation to the dashboard: fixed topbar with hamburger + overlay drawer sidebar. Desktop behavior unchanged. Breakpoint: `md` (768px).

## Decisions

| Item | Decision |
|------|----------|
| Drawer behavior | Overlay (slides over content, backdrop, close on outside click) |
| Topbar content | Logo + hamburger (left) + avatar quick menu (right) |
| Breakpoint | `md` (768px) |
| UserMenu | Avatar in topbar (quick) + full UserMenu inside drawer |

## Architecture

**Single file change:** `src/components/layout/DashboardShell.tsx`

New local state:
```ts
const [mobileOpen, setMobileOpen] = useState(false)
```

`SidebarContext` unchanged — `mobileOpen` stays local to shell.

## Layout Structure

```
<div>
  {/* Mobile topbar — block md:hidden, fixed top-0, h-14, z-40 */}
  <MobileTopbar onMenuClick={() => setMobileOpen(true)} />

  {/* Backdrop — block md:hidden, fixed inset-0, bg-black/50, z-40 */}
  {mobileOpen && <Backdrop onClick={() => setMobileOpen(false)} />}

  {/* Drawer — block md:hidden, fixed left-0 top-0 h-full w-[260px], z-50 */}
  {/* transition-transform: translate-x-[-260px] → translate-x-0 */}
  <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
    {/* same nav items as desktop + full UserMenu at bottom */}
  </MobileDrawer>

  {/* Desktop sidebar — hidden md:flex (existing, unchanged) */}
  <aside className="hidden md:flex ...">...</aside>

  {/* Main content */}
  {/* pt-14 md:pt-0 to compensate topbar height on mobile */}
  <main className="pt-14 md:pt-0 md:ml-[112px] ...">...</main>
</div>
```

## Topbar (Mobile)

- Height: `h-14` (56px), `fixed top-0 left-0 right-0`
- Z-index: `z-40`
- Background: same as sidebar (`bg-sidebar` token / dark mode compatible)
- Left: hamburger button (`☰`) → `setMobileOpen(true)`
- Center: logo / orbit wordmark
- Right: avatar → opens existing `UserMenu` dropdown

## Drawer (Mobile)

- Width: `w-[260px]` — matches desktop expanded sidebar
- Position: `fixed left-0 top-0 h-full`
- Z-index: `z-50` (above backdrop `z-40`, above topbar `z-40`)
- Animation: `transition-transform duration-300` — `translate-x-[-260px]` → `translate-x-0`
- Content: identical to desktop sidebar (logo, nav items, full `UserMenu`)
- Close triggers:
  - Click on backdrop
  - `Escape` key (`useEffect` keydown listener)
  - Nav item click (navigate and close)

## Z-index Stack

| Layer | z-index | Element |
|-------|---------|---------|
| Content | default | `<main>` |
| Desktop sidebar | z-50 | existing |
| Mobile topbar | z-40 | new |
| Backdrop | z-40 | new |
| Mobile drawer | z-50 | new |

## Responsive Rules

| Class pattern | Behavior |
|---------------|----------|
| `block md:hidden` | Mobile-only elements (topbar, drawer, backdrop) |
| `hidden md:flex` | Desktop-only (existing sidebar) |
| `pt-14 md:pt-0` | Main content top padding compensation |
| `ml-0 md:ml-[112px]` | Main content left margin (no sidebar on mobile) |

## Out of Scope

- Swipe-to-close gesture (phase 2)
- Focus trap inside drawer (phase 2 / headlessui migration)
- Page-specific mobile layout changes (handled by existing responsive grids)
- Tests (no test infrastructure in project)
