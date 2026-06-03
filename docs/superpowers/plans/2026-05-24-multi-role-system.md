# Multi-Role System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-role JWT claim and service layer with multi-role support, add a sidebar role switcher (admin / gestor / influenciador), and unify the gerente/intermediário nav into one gated config.

**Architecture:** JWT `app_metadata.roles` carries all active roles as a string array (set by `sync_user_role_claim` RPC). `DashboardShell` derives available "views" (admin/gestor/influenciador) from the array and renders a switcher + filtered nav. INTERMEDIÁRIO ⊃ GERENTE — same gestorNav, items with `requiredRole: 'intermediario'` are hidden from GERENTE users.

**Tech Stack:** Next.js 15, Prisma, Supabase Auth (PostgreSQL), TypeScript, Tailwind CSS

> **Note:** This project has no test runner configured. Each task includes a TypeScript compile check + manual verification step instead of unit tests.

---

## File Map

| File | Change |
|------|--------|
| `prisma/migrations/add_user_roles_unique.sql` | Create — partial unique index |
| `src/lib/auth-helpers.ts` | Create — shared `isAdmin` / `hasRole` helpers |
| `src/types/index.ts` | Modify — `Profile.roles: Role[]`, update `Role` type |
| `src/services/profiles.service.ts` | Modify — `getUserRoles`, `assignRole`, `removeRole` |
| `src/config/nav.ts` | Modify — `NavItemConfig.requiredRole`, `gestorNav`, `NAV_BY_VIEW` |
| `src/components/layout/DashboardShell.tsx` | Modify — role switcher, filtered nav rendering |
| `src/app/(dashboard)/layout.tsx` | Modify — read `app_metadata.roles` array |
| `src/app/api/admin/afiliados/[id]/route.ts` | Modify — multi-role assign/remove PATCH |
| `src/app/api/admin/contratos/route.ts` | Modify — admin check |
| `src/app/api/admin/csv-upload/route.ts` | Modify — admin check |
| `src/app/api/admin/financeiro/por-casa/route.ts` | Modify — admin check |
| `src/app/api/admin/producao/route.ts` | Modify — admin check |
| `src/app/api/admin/saques/[id]/route.ts` | Modify — admin check |
| `src/app/api/admin/sync/route.ts` | Modify — admin check |
| `src/app/api/saques/route.ts` | Modify — role checks |
| `src/app/api/saldo/gerente/[id]/route.ts` | Modify — role checks |
| `src/app/api/saldo/intermediario/[id]/route.ts` | Modify — role checks |
| `src/app/api/saldo/influenciador/[id]/route.ts` | Modify — role checks |
| `src/proxy.ts` | Modify — `roles[]` array route guards |

---

### Task 1: DB migration — partial unique index

Prevents two active rows with the same role for the same user.

**Files:**
- Create: `prisma/migrations/add_user_roles_unique.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- prisma/migrations/add_user_roles_unique.sql
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_active
  ON public.user_roles (id_usuario, role)
  WHERE ativo = true;
```

- [ ] **Step 2: Apply in Supabase Dashboard → SQL Editor**

Paste and run the SQL above.
Expected output: `CREATE INDEX`

- [ ] **Step 3: Verify index exists**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_roles' AND schemaname = 'public';
```
Expected: a row with `user_roles_unique_active`.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/add_user_roles_unique.sql
git commit -m "feat(db): partial unique index on user_roles(id_usuario, role) where ativo"
```

---

### Task 2: Update Supabase RPC `sync_user_role_claim`

Changes the JWT claim shape from `{ role: "INFLUENCER" }` to `{ roles: ["INFLUENCER"] }`.

**Files:**
- Supabase Dashboard → SQL Editor only (no local file)

- [ ] **Step 1: Replace the RPC in Supabase SQL Editor**

```sql
CREATE OR REPLACE FUNCTION public.sync_user_role_claim(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles text[];
BEGIN
  SELECT array_agg(ur.role::text) INTO v_roles
  FROM public.user_roles ur
  WHERE ur.id_usuario = (
    SELECT id FROM public.users WHERE auth_id = p_user_id
  )
  AND ur.ativo = true;

  UPDATE auth.users
  SET raw_app_meta_data =
    (raw_app_meta_data - 'role') ||
    jsonb_build_object('roles', COALESCE(to_jsonb(v_roles), '[]'::jsonb))
  WHERE id = p_user_id;
END;
$$;
```

- [ ] **Step 2: Backfill all existing users**

```sql
SELECT public.sync_user_role_claim(u.auth_id)
FROM public.users u
WHERE u.auth_id IS NOT NULL;
```

- [ ] **Step 3: Verify a user's claim was updated**

```sql
SELECT email, raw_app_meta_data
FROM auth.users
WHERE email = 'influencer@orbit.dev';
```
Expected: `raw_app_meta_data` contains `"roles": ["INFLUENCER"]` and no `"role"` key.

---

### Task 3: Create shared auth helpers

Single source of truth for reading `roles[]` from JWT metadata across all API routes.

**Files:**
- Create: `src/lib/auth-helpers.ts`

- [ ] **Step 1: Create the file**

```ts
type AppMeta = Record<string, unknown> | undefined

function extractRoles(meta: AppMeta): string[] {
  if (!meta) return []
  // New format: roles[]
  if (Array.isArray(meta.roles)) return (meta.roles as string[]).map(r => r.toUpperCase())
  // Backward compat: single role string
  if (typeof meta.role === 'string') return [meta.role.toUpperCase()]
  return []
}

export function isAdmin(meta: AppMeta): boolean {
  return extractRoles(meta).includes('ADMIN')
}

export function hasAnyRole(meta: AppMeta, ...roles: string[]): boolean {
  const userRoles = extractRoles(meta)
  return roles.some(r => userRoles.includes(r.toUpperCase()))
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-helpers.ts
git commit -m "feat(auth): shared isAdmin/hasAnyRole helpers reading roles[] array with backward compat"
```

---

### Task 4: Update service layer

Replace single-role functions with multi-role `getUserRoles`, `assignRole`, `removeRole`.

**Files:**
- Modify: `src/services/profiles.service.ts`

- [ ] **Step 1: Rewrite `profiles.service.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { user_role } from '@prisma/client'

export async function getProfileById(authId: string) {
  return prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true, nome_completo: true, email: true, created_at: true },
  })
}

export async function getProfilesByIds(authIds: string[]) {
  return prisma.public_users.findMany({
    where: { auth_id: { in: authIds } },
    select: { id: true, auth_id: true, nome_completo: true, email: true },
  })
}

export async function getProfilesCount() {
  return prisma.public_users.count()
}

export async function getUserRoles(authId: string): Promise<user_role[]> {
  const user = await prisma.public_users.findUnique({
    where: { auth_id: authId },
    select: { id: true },
  })
  if (!user) return []

  const rows = await prisma.user_roles.findMany({
    where: { id_usuario: user.id, ativo: true },
    select: { role: true },
  })
  return rows.map(r => r.role)
}

export async function assignRole(publicUserId: string, role: user_role): Promise<void> {
  const existing = await prisma.user_roles.findFirst({
    where: { id_usuario: publicUserId, role, ativo: true },
  })
  if (!existing) {
    await prisma.user_roles.create({
      data: { id_usuario: publicUserId, role },
    })
  }
  await syncClaim(publicUserId)
}

export async function removeRole(publicUserId: string, role: user_role): Promise<void> {
  await prisma.user_roles.updateMany({
    where: { id_usuario: publicUserId, role, ativo: true },
    data: { ativo: false, inativado_at: new Date() },
  })
  await syncClaim(publicUserId)
}

async function syncClaim(publicUserId: string): Promise<void> {
  const user = await prisma.public_users.findUnique({
    where: { id: publicUserId },
    select: { auth_id: true },
  })
  if (!user?.auth_id) return
  const db = createAdminClient()
  const { error } = await db.rpc('sync_user_role_claim' as never, { p_user_id: user.auth_id } as never)
  if (error) console.error('[profiles] sync claim error', error)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/services/profiles.service.ts
git commit -m "feat(service): getUserRoles, assignRole, removeRole replace single-role functions"
```

---

### Task 5: Update types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update `Role`, add `RoleKey`, update `Profile`**

Replace the entire `src/types/index.ts`:

```ts
// ─── Roles ────────────────────────────────────────────────────────────────────
// DB/JWT enum values (uppercase)
export type Role = 'INFLUENCER' | 'GERENTE' | 'INTERMEDIARIO' | 'ADMIN'

// UI-facing lowercase keys used in nav/labels
export type RoleKey = 'influenciador' | 'gerente' | 'intermediario' | 'admin'

// ─── Status financeiro ────────────────────────────────────────────────────────
export type StatusFinanceiro = 'liberado' | 'parcial_liberado' | 'pendente_liberacao'

export const FATOR_STATUS: Record<StatusFinanceiro, number> = {
  liberado: 1.0,
  parcial_liberado: 0.5,
  pendente_liberacao: 0.0,
}

// ─── Tipo de comissão ─────────────────────────────────────────────────────────
export type TipoComissao = 'CPA' | 'REVSHARE'

// ─── Tipo de cadeia (commission_ledger) ──────────────────────────────────────
export type TipoCadeia = 'direto' | 'sub' | 'intermediario' | 'intermediario_proprio'

// ─── Profiles ────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  nome: string
  email: string
  roles: Role[]
  created_at: string
}

// ─── Contrato ────────────────────────────────────────────────────────────────
export interface Contrato {
  id: string
  afiliado_id: string
  casa_id: string
  tipo_comissao: TipoComissao
  valor_cpa: number | null
  percentual_revshare: number | null
  data_inicio: string
  data_fim: string | null
  ativo: boolean
}

// ─── Saldo results ────────────────────────────────────────────────────────────
export interface SaldoInfluenciador {
  influenciador_id: string
  comissao_bruta: number
  pag_recebidos: number
  estornos: number
  saques_ativos: number
  saldo_disponivel: number
}

export interface SaldoGerente {
  gerente_id: string
  comissao_propria: number
  lucro_rede: number
  incentivo: number
  consumido: number
  saques_ativos: number
  saldo_disponivel: number
}

export interface SaldoIntermediario {
  intermediario_id: string
  comissao_bruta: number
  repasse_devido: number
  consumido: number
  saques_ativos: number
  saldo_disponivel: number
}
```

- [ ] **Step 2: Fix `me.service.ts` — change param type from `Role` to `RoleKey`**

`me.service.ts` compares against lowercase UI strings (`'influenciador'`, `'gerente'`). After the `Role` type change to uppercase, the param type must be `RoleKey` instead. Replace the file:

```ts
import { RoleKey } from '@/types'
import { getProfileById } from './profiles.service'
import { getSaldoInfluenciador, getSaldoGerente, getSaldoIntermediario } from './saldo.service'

export async function getMe(userId: string, role: RoleKey) {
  const [profile, saldo] = await Promise.all([
    getProfileById(userId),
    role === 'influenciador'
      ? getSaldoInfluenciador(userId)
      : role === 'gerente'
        ? getSaldoGerente(userId)
        : role === 'intermediario'
          ? getSaldoIntermediario(userId)
          : null,
  ])

  return { profile, saldo }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Fix any type errors that reference `profile.role` (singular) — change to `profile.roles[0]` or `profile.roles`.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/services/me.service.ts
git commit -m "feat(types): Profile.roles array, Role uppercase, add RoleKey for UI strings"
```

---

### Task 6: Update nav config

Add `requiredRole` to `NavItemConfig`, create `gestorNav`, replace separate gerente/intermediário navs.

**Files:**
- Modify: `src/config/nav.ts`

- [ ] **Step 1: Rewrite `src/config/nav.ts`**

```ts
export type NavItemConfig = {
  type: 'item'
  href: string
  label: string
  icon: string
  requiredRole?: string  // lowercase RoleKey — item hidden if user lacks this role
}

export type NavGroupConfig = {
  type: 'group'
  label: string
  icon: string
  items: { href: string; label: string }[]
}

export type NavEntry = NavItemConfig | NavGroupConfig

export type NavSection = {
  sectionLabel?: string
  items: NavEntry[]
}

export type RoleNavConfig = NavSection[]

// Shared nav for GERENTE and INTERMEDIARIO.
// Items with requiredRole: 'intermediario' are hidden from GERENTE-only users.
export const gestorNav: RoleNavConfig = [
  {
    items: [
      { type: 'item', href: '/gerente', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    sectionLabel: 'Gestão',
    items: [
      { type: 'item', href: '/gerente/sub-afiliados', label: 'Influenciadores', icon: 'afiliados' },
      { type: 'item', href: '/gerente/producao', label: 'Produção', icon: 'producao' },
      { type: 'item', href: '/gerente/financeiro', label: 'Financeiro', icon: 'financeiro' },
      { type: 'item', href: '/gerente/pagamentos', label: 'Pagamentos', icon: 'pagamentos' },
      { type: 'item', href: '/gerente/campanhas', label: 'Campanhas', icon: 'campanhas' },
      { type: 'item', href: '/gerente/acordos', label: 'Acordos', icon: 'contratos' },
      { type: 'item', href: '/gerente/programas-incentivo', label: 'Incentivos', icon: 'incentivos' },
      { type: 'item', href: '/intermediario/gerentes', label: 'Meus Gerentes', icon: 'rede', requiredRole: 'intermediario' },
      { type: 'item', href: '/intermediario/contratos', label: 'Contratos Rede', icon: 'contratos', requiredRole: 'intermediario' },
      { type: 'item', href: '/intermediario/financeiro', label: 'Financeiro Rede', icon: 'financeiro', requiredRole: 'intermediario' },
    ],
  },
  {
    sectionLabel: 'Mais',
    items: [
      { type: 'item', href: '/gerente/recadastramento', label: 'Recadastramento', icon: 'recadastramento' },
      { type: 'item', href: '/gerente/materiais', label: 'Materiais', icon: 'materiais' },
      { type: 'item', href: '/gerente/transparencia', label: 'Transparência', icon: 'transparencia' },
    ],
  },
]

export const influenciadorNav: RoleNavConfig = [
  {
    items: [
      { type: 'item', href: '/influenciador', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    sectionLabel: 'Minha Conta',
    items: [
      { type: 'item', href: '/influenciador/contratos', label: 'Contratos', icon: 'contratos' },
      { type: 'item', href: '/influenciador/producao', label: 'Produção', icon: 'producao' },
      { type: 'item', href: '/influenciador/financeiro', label: 'Financeiro', icon: 'financeiro' },
      { type: 'item', href: '/influenciador/programas-incentivo', label: 'Incentivos', icon: 'incentivos' },
    ],
  },
  {
    sectionLabel: 'Mais',
    items: [
      { type: 'item', href: '/influenciador/materiais', label: 'Materiais', icon: 'materiais' },
      { type: 'item', href: '/influenciador/transparencia', label: 'Transparência', icon: 'transparencia' },
    ],
  },
]

// Keyed by view name (admin nav is hardcoded in DashboardShell)
export const NAV_BY_VIEW: Record<string, RoleNavConfig> = {
  gestor: gestorNav,
  influenciador: influenciadorNav,
}

export const VIEW_DISPLAY_LABEL: Record<string, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  influenciador: 'Influenciador',
}

// Legacy aliases — remove after all callers are updated
export const NAV_BY_ROLE = NAV_BY_VIEW
export const ROLE_DISPLAY_LABEL = VIEW_DISPLAY_LABEL
export const NON_ADMIN_ROLES = ['intermediario', 'gerente', 'influenciador'] as const
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/config/nav.ts
git commit -m "feat(nav): gestorNav with requiredRole gating, NAV_BY_VIEW replaces separate role navs"
```

---

### Task 7: Update DashboardShell — role switcher

Replace stacked role sections with a single active-view switcher.

**Files:**
- Modify: `src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Update imports at the top of `DashboardShell.tsx`**

Replace the existing nav imports:
```ts
import {
  NAV_BY_VIEW,
  VIEW_DISPLAY_LABEL,
  type NavEntry,
  type NavItemConfig,
  type RoleNavConfig,
} from '@/config/nav'
```

- [ ] **Step 2: Add view helpers above the component (after imports)**

```ts
type ViewKey = 'admin' | 'gestor' | 'influenciador'

function deriveAvailableViews(roles: string[]): ViewKey[] {
  const views: ViewKey[] = []
  if (roles.includes('admin')) views.push('admin')
  if (roles.some(r => ['gerente', 'intermediario'].includes(r))) views.push('gestor')
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
```

- [ ] **Step 3: Add `ViewSwitcher` component (add before `DrawerNavLink` at bottom of file)**

```tsx
function ViewSwitcher({
  views,
  activeView,
  onSwitch,
  isExpanded,
}: {
  views: ViewKey[]
  activeView: ViewKey
  onSwitch: (v: ViewKey) => void
  isExpanded: boolean
}) {
  if (views.length <= 1) return null
  return (
    <div className={`flex gap-1 px-2 pt-4 pb-1 ${isExpanded ? 'flex-row' : 'flex-col items-center'}`}>
      {views.map(v => (
        <button
          key={v}
          onClick={() => onSwitch(v)}
          title={VIEW_DISPLAY_LABEL[v]}
          className={`rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer border-none ${
            activeView === v
              ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
              : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]'
          } ${isExpanded ? 'px-3 py-1.5 flex-1' : 'w-10 h-8 flex items-center justify-center'}`}
        >
          {isExpanded ? VIEW_DISPLAY_LABEL[v] : VIEW_DISPLAY_LABEL[v].slice(0, 2).toUpperCase()}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Update DashboardShell body — replace activeNonAdminRoles/isMultiRole with new state**

Inside `DashboardShell` component, replace:
```ts
const activeNonAdminRoles = NON_ADMIN_ROLES.filter(r => roles.includes(r))
const isMultiRole = activeNonAdminRoles.length > 1
```

With:
```ts
const availableViews = deriveAvailableViews(roles)
const [activeView, setActiveView] = useState<ViewKey>(availableViews[0] ?? 'influenciador')

const activeNavConfig = activeView === 'admin'
  ? null
  : filterNavSections(NAV_BY_VIEW[activeView] ?? [], roles)
```

- [ ] **Step 5: Update desktop sidebar nav block**

In the desktop `<nav>` section, replace the non-admin block:
```tsx
{/* before */}
{activeNonAdminRoles.map(role => (
  <RoleSection
    key={role}
    config={NAV_BY_ROLE[role] ?? []}
    isExpanded={isExpanded}
    roleLabel={isMultiRole ? ROLE_DISPLAY_LABEL[role] : undefined}
  />
))}

{/* after */}
<ViewSwitcher
  views={availableViews}
  activeView={activeView}
  onSwitch={setActiveView}
  isExpanded={isExpanded}
/>
{activeNavConfig && (
  <RoleSection config={activeNavConfig} isExpanded={isExpanded} />
)}
```

- [ ] **Step 6: Update mobile drawer nav block**

In the mobile drawer `<nav>` section, replace the non-admin block:
```tsx
{/* before */}
{activeNonAdminRoles.map(role => (
  <DrawerRoleSection
    key={role}
    config={NAV_BY_ROLE[role] ?? []}
    roleLabel={isMultiRole ? ROLE_DISPLAY_LABEL[role] : undefined}
  />
))}

{/* after */}
<div className="flex gap-1 px-2 pt-4 pb-1">
  {availableViews.length > 1 && availableViews.map(v => (
    <button
      key={v}
      onClick={() => setActiveView(v)}
      className={`rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer border-none flex-1 px-3 py-1.5 ${
        activeView === v
          ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
          : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]'
      }`}
    >
      {VIEW_DISPLAY_LABEL[v]}
    </button>
  ))}
</div>
{activeNavConfig && <DrawerRoleSection config={activeNavConfig} />}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Verify visually**

```bash
npm run dev
```
- Log in as influencer → no switcher, correct nav
- Log in as gerente → no switcher, gestor nav without intermediário items
- Log in as intermediário → no switcher, gestor nav WITH Meus Gerentes / Contratos Rede / Financeiro Rede

- [ ] **Step 9: Commit**

```bash
git add src/components/layout/DashboardShell.tsx
git commit -m "feat(shell): role switcher — admin/gestor/influenciador views with filtered gestorNav"
```

---

### Task 8: Update dashboard layout

Read `app_metadata.roles` array; allow admin to also hold non-admin roles.

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace the role-resolution block in layout**

The full updated `DashboardLayout` function:

```ts
const DB_ROLE_MAP: Record<string, string> = {
  ADMIN: 'admin',
  INFLUENCER: 'influenciador',
  INTERMEDIARIO: 'intermediario',
  GERENTE: 'gerente',
}

const ROLE_LABEL: Record<string, string> = {
  influenciador: 'Influenciador',
  gerente: 'Gerente',
  intermediario: 'Intermediário',
  admin: 'Admin',
}

const ROLE_BADGE: Record<string, string> = {
  influenciador: 'badge-gray',
  gerente: 'badge-blue',
  intermediario: 'badge-orange',
  admin: 'badge-red',
}

const ROLE_HIERARCHY = ['admin', 'intermediario', 'gerente', 'influenciador']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Read roles array from JWT — backward compat with old single role string
  const metaRoles: string[] = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as string[]).map((r: string) => r.toUpperCase())
    : user.app_metadata?.role
      ? [(user.app_metadata.role as string).toUpperCase()]
      : []

  const isAdminByMeta = metaRoles.includes('ADMIN')
  const roles: string[] = isAdminByMeta ? ['admin'] : []

  // DB lookup for non-admin roles (admins without public_users record still work)
  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: { id: true },
  })

  if (publicUser) {
    const userRolesData = await prisma.user_roles.findMany({
      where: { id_usuario: publicUser.id, ativo: true },
      select: { role: true },
    })
    const dbRoles = userRolesData
      .map(r => DB_ROLE_MAP[r.role] ?? r.role.toLowerCase())
      .filter(r => r !== 'admin')
    roles.push(...dbRoles)
  }

  if (roles.length === 0) roles.push('influenciador')

  const isAdmin = roles.includes('admin')
  const primaryRole = ROLE_HIERARCHY.find(r => roles.includes(r)) ?? 'influenciador'

  return (
    <SidebarProvider>
      <DashboardShell
        userEmail={user.email ?? ''}
        roles={roles}
        isAdmin={isAdmin}
        roleLabel={ROLE_LABEL[primaryRole] ?? primaryRole}
        roleBadgeClass={ROLE_BADGE[primaryRole] ?? 'badge-gray'}
      >
        {children}
      </DashboardShell>
    </SidebarProvider>
  )
}
```

- [ ] **Step 2: Verify compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/layout.tsx"
git commit -m "feat(layout): read roles[] array from JWT, merge admin flag with DB non-admin roles"
```

---

### Task 9: Update API routes — admin checks

Replace `app_metadata?.role !== 'admin'` with `isAdmin()` helper across all routes.

**Files:**
- Modify: `src/app/api/admin/contratos/route.ts`
- Modify: `src/app/api/admin/csv-upload/route.ts`
- Modify: `src/app/api/admin/financeiro/por-casa/route.ts`
- Modify: `src/app/api/admin/producao/route.ts`
- Modify: `src/app/api/admin/saques/[id]/route.ts`
- Modify: `src/app/api/admin/sync/route.ts`

- [ ] **Step 1: In each of the 6 files above, add the import at the top**

```ts
import { isAdmin } from '@/lib/auth-helpers'
```

- [ ] **Step 2: Replace every admin guard in those files**

Pattern to find (all 6 files):
```ts
if (!user || user.app_metadata?.role !== 'admin') {
```

Replace with:
```ts
if (!user || !isAdmin(user.app_metadata)) {
```

- [ ] **Step 3: Update `src/app/api/admin/afiliados/[id]/route.ts`**

This file also needs `assignRole`/`removeRole` for the PATCH. Replace the entire file:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { assignRole, removeRole } from '@/services/profiles.service'
import { isAdmin } from '@/lib/auth-helpers'
import { user_role } from '@prisma/client'

const VALID_ROLES = Object.values(user_role)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const db = createAdminClient()

  const [profileRaw, contratosRaw, saquesRes] = await Promise.all([
    prisma.public_users.findUnique({
      where: { id },
      select: {
        id: true,
        auth_id: true,
        nome_completo: true,
        email: true,
        created_at: true,
        user_roles: {
          where: { ativo: true },
          select: { id: true, role: true },
          orderBy: { created_at: 'desc' },
        },
      },
    }),
    prisma.contratos.findMany({
      where: { user_roles: { id_usuario: id } },
      select: { id: true, id_casa: true, afp: true, tipo_contrato: true, ativo: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),
    db.from('saques')
      .select('id, valor, status, created_at')
      .eq('id_usuario', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!profileRaw) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const roles = profileRaw.user_roles.map(ur => ur.role)

  return NextResponse.json({
    profile: { ...profileRaw, user_roles: undefined },
    roles,
    saques: saquesRes.data ?? [],
    contratos: contratosRaw,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { role, action = 'assign' } = body

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Role inválido. Use: ' + VALID_ROLES.join(', ') },
      { status: 400 }
    )
  }

  if (!['assign', 'remove'].includes(action)) {
    return NextResponse.json(
      { error: 'Action inválido. Use: assign | remove' },
      { status: 400 }
    )
  }

  if (action === 'assign') {
    await assignRole(id, role as user_role)
  } else {
    await removeRole(id, role as user_role)
  }

  return NextResponse.json({ success: true, role, action })
}
```

- [ ] **Step 4: Update saldo routes — role-based authorization**

In `src/app/api/saldo/gerente/[id]/route.ts`, replace:
```ts
const role = user.app_metadata?.role
if (role !== 'admin' && role !== 'intermediario' && user.id !== id) {
```
With:
```ts
import { hasAnyRole } from '@/lib/auth-helpers'
// ...
if (!hasAnyRole(user.app_metadata, 'ADMIN', 'INTERMEDIARIO') && user.id !== id) {
```

In `src/app/api/saldo/intermediario/[id]/route.ts`, replace:
```ts
const role = user.app_metadata?.role
if (role !== 'admin' && user.id !== id) {
```
With:
```ts
import { isAdmin } from '@/lib/auth-helpers'
// ...
if (!isAdmin(user.app_metadata) && user.id !== id) {
```

In `src/app/api/saldo/influenciador/[id]/route.ts`, replace:
```ts
const role = user.app_metadata?.role
// Only self, gerente do afiliado, intermediario, or admin
if (role !== 'admin' && role !== 'intermediario' && role !== 'gerente' && user.id !== id) {
```
With:
```ts
import { hasAnyRole } from '@/lib/auth-helpers'
// ...
if (!hasAnyRole(user.app_metadata, 'ADMIN', 'INTERMEDIARIO', 'GERENTE') && user.id !== id) {
```

In `src/app/api/saques/route.ts`, replace:
```ts
const role = (user.app_metadata?.role ?? 'influenciador') as string
if (role === 'admin') {
```
With:
```ts
import { isAdmin } from '@/lib/auth-helpers'
// ...
if (isAdmin(user.app_metadata)) {
```
And further down:
```ts
if (user.app_metadata?.role === 'admin') {
```
With:
```ts
if (isAdmin(user.app_metadata)) {
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git commit -m "feat(api): use isAdmin/hasAnyRole helpers, afiliados PATCH supports assign/remove"
```

---

### Task 10: Update proxy middleware

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Replace the role guard block**

Replace the `if (user) { ... }` block with:

```ts
if (user) {
  const metaRoles: string[] = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as string[]).map((r: string) => r.toUpperCase())
    : user.app_metadata?.role
      ? [(user.app_metadata.role as string).toUpperCase()]
      : []

  const has = (...allowed: string[]) => allowed.some(r => metaRoles.includes(r))

  if (pathname.startsWith('/admin') && !has('ADMIN')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/intermediario') && !has('INTERMEDIARIO', 'ADMIN')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/gerente') && !has('GERENTE', 'INTERMEDIARIO', 'ADMIN')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/influenciador') && !has('INFLUENCER', 'ADMIN')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
```

- [ ] **Step 2: Verify compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(proxy): route guards use roles[] array with backward compat"
```

---

### Task 11: End-to-end manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Single-role user — influencer**

Log in as `influencer@orbit.dev`. Expected: influenciador sidebar, no switcher.

- [ ] **Step 3: Single-role user — gerente**

Log in as `gerente@orbit.dev`. Expected: gestor sidebar, "Meus Gerentes / Contratos Rede / Financeiro Rede" NOT shown, no switcher.

- [ ] **Step 4: Single-role user — intermediário**

Log in as `intermediario@orbit.dev`. Expected: gestor sidebar WITH "Meus Gerentes / Contratos Rede / Financeiro Rede" shown, no switcher.

- [ ] **Step 5: Multi-role user — assign second role**

In Supabase SQL editor or via admin API:
```sql
-- Get the public user id for influencer test user
SELECT id FROM public.users WHERE email = 'influencer@orbit.dev';

-- Assign INTERMEDIARIO role to that user (replace <uuid> with the id above)
INSERT INTO public.user_roles (id_usuario, role)
VALUES ('<uuid>', 'INTERMEDIARIO');

-- Sync JWT
SELECT public.sync_user_role_claim(
  (SELECT auth_id FROM public.users WHERE email = 'influencer@orbit.dev')
);
```

Log in as `influencer@orbit.dev`. Expected: role switcher appears with "Influenciador" and "Gestor" buttons, switching between them renders the correct nav.

- [ ] **Step 6: Admin user**

Log in as admin. Expected: admin sidebar, no switcher (unless admin also has a non-admin role assigned).
