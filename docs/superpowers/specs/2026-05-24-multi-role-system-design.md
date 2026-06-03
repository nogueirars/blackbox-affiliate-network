# Multi-Role System Design

**Date:** 2026-05-24  
**Status:** Approved

## Context

Users on the platform can hold more than one role simultaneously (e.g., INFLUENCER + ADMIN). The system needs to let them switch between role-specific sidebars and enforce route-level access based on all their active roles.

## Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full platform access, admin portal |
| `INFLUENCER` | Influencer portal |
| `GERENTE` | Gestor portal (subset of intermediário features) |
| `INTERMEDIARIO` | Gestor portal (superset — sees everything GERENTE sees, plus extra) |

`INTERMEDIARIO ⊃ GERENTE`: they share the same sidebar. GERENTE sees fewer items.

Any combination of roles is valid (ADMIN + INFLUENCER, INFLUENCER + INTERMEDIARIO, etc.).

## DB

No schema changes. `user_roles` already supports multiple rows per user:

```
user_roles
  id           uuid PK
  id_usuario   uuid FK → public_users.id
  role         user_role enum
  ativo        boolean
  created_at   timestamptz
  updated_at   timestamptz
  inativado_at timestamptz
```

**One migration needed:** partial unique index to prevent duplicate active roles per user:

```sql
CREATE UNIQUE INDEX user_roles_unique_active
ON user_roles (id_usuario, role)
WHERE ativo = true;
```

`contratos.id_user_role → user_roles.id` stays as-is (contract linked to a specific role record).

## JWT Claim

Change `app_metadata` shape:

```
before: { role: "INFLUENCER" }
after:  { roles: ["INFLUENCER", "INTERMEDIARIO"] }
```

The Supabase RPC `sync_user_role_claim` must be updated to:
1. `SELECT role FROM user_roles WHERE id_usuario = $1 AND ativo = true`
2. Write the result as `app_metadata.roles` (array)
3. Remove the old `role` field

Sync is triggered whenever a role is assigned or removed (same as today).

## Service Layer (`profiles.service.ts`)

Replace single-role functions with multi-role equivalents:

```ts
// replaces getCurrentUserRole
getUserRoles(authId: string): Promise<user_role[]>
  → findMany where id_usuario = user.id AND ativo = true
  → return roles[]

// replaces updateProfileRole (split into two)
assignRole(userId: string, role: user_role): Promise<void>
  → create user_roles row (unique index prevents duplicates)
  → call sync_user_role_claim

removeRole(userId: string, role: user_role): Promise<void>
  → set ativo = false, inativado_at = now()
  → call sync_user_role_claim
```

Type change in `types/index.ts`:

```ts
// before
export interface Profile {
  role: Role
}

// after
export interface Profile {
  roles: Role[]
}

export type Role = 'INFLUENCER' | 'GERENTE' | 'INTERMEDIARIO' | 'ADMIN'
```

## Middleware (`proxy.ts`)

Read roles as array. Guards activate when the routes exist:

```ts
const roles: string[] = user.app_metadata?.roles ?? []

// /admin          → ADMIN
// /intermediario  → INTERMEDIARIO | ADMIN
// /gerente        → GERENTE | INTERMEDIARIO | ADMIN
// /influenciador  → INFLUENCER | ADMIN
```

Dashboard `/dashboard` is role-neutral — accessible by any authenticated user.

## Sidebar + Role Switcher

### Switcher

Header/sidebar component reads `roles[]` from session and renders one button per role the user holds. Clicking switches the active nav context (no page reload needed, just re-renders nav).

### Unified Gestor/Intermediário sidebar

Nav items carry an optional `requiredRole` field:

```ts
type NavItemConfig = {
  href: string
  label: string
  icon: string
  requiredRole?: user_role  // if set, only shown to users with that role
}
```

Items visible to GERENTE have no `requiredRole` (or `requiredRole: 'GERENTE'`).  
Items exclusive to INTERMEDIARIO have `requiredRole: 'INTERMEDIARIO'`.

At render time: filter items where `requiredRole` is undefined OR `user.roles.includes(requiredRole)`.

### Nav config change

`gerenteNav` and `intermediarioNav` (currently separate) merge into one `gestorNav` with gated items. `NAV_BY_ROLE` maps both `GERENTE` and `INTERMEDIARIO` to this config.

## Out of Scope

- Per-route RLS policies (future)
- Role hierarchy enforcement at DB level (INTERMEDIARIO implying GERENTE)
- Audit log for role changes
