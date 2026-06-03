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
