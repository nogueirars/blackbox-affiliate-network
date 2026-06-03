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

export const gerenteNav: RoleNavConfig = [
  {
    items: [
      { type: 'item', href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    sectionLabel: 'Gestão',
    items: [
      { type: 'item', href: '/gerente/sub-afiliados', label: 'Influenciadores', icon: 'afiliados' },
      { type: 'item', href: '/gerente/campanhas', label: 'Campanhas', icon: 'campanhas' },
      { type: 'item', href: '/gerente/acordos', label: 'Acordos', icon: 'contratos' },
      { type: 'item', href: '/gerente/producao', label: 'Produção', icon: 'producao' },
      { type: 'item', href: '/gerente/financeiro', label: 'Financeiro', icon: 'financeiro' },
      { type: 'item', href: '/gerente/pagamentos', label: 'Pagamentos', icon: 'pagamentos' },
      { type: 'item', href: '/gerente/programas-incentivo', label: 'Incentivos', icon: 'incentivos' },
    ],
  },
  {
    sectionLabel: 'Mais',
    items: [
      { type: 'item', href: '/gerente/materiais', label: 'Materiais', icon: 'materiais' },
      { type: 'item', href: '/gerente/transparencia', label: 'Transparência', icon: 'transparencia' },
    ],
  },
]

export const intermediarioNav: RoleNavConfig = [
  {
    items: [
      { type: 'item', href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    sectionLabel: 'Gestão',
    items: [
      { type: 'item', href: '/intermediario/sub-afiliados', label: 'Gerentes', icon: 'afiliados' },
      // { type: 'item', href: '/intermediario/campanhas', label: 'Campanhas', icon: 'campanhas' }, // módulo em desenvolvimento
      { type: 'item', href: '/intermediario/acordos', label: 'Acordos', icon: 'contratos' },
      { type: 'item', href: '/intermediario/producao', label: 'Produção', icon: 'producao' },
      { type: 'item', href: '/intermediario/financeiro', label: 'Financeiro', icon: 'financeiro' },
      { type: 'item', href: '/intermediario/pagamentos', label: 'Pagamentos', icon: 'pagamentos' },
    ],
  },
  {
    sectionLabel: 'Mais',
    items: [
      { type: 'item', href: '/intermediario/materiais', label: 'Materiais', icon: 'materiais' },
      // { type: 'item', href: '/intermediario/programas-incentivo', label: 'Programas de Incentivo', icon: 'incentivos' }, // módulo em desenvolvimento
      { type: 'item', href: '/intermediario/transparencia', label: 'Transparência', icon: 'transparencia' },
    ],
  },
]

export const influenciadorNav: RoleNavConfig = [
  {
    items: [
      { type: 'item', href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
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
  gerente: gerenteNav,
  intermediario: intermediarioNav,
  influenciador: influenciadorNav,
}

export const VIEW_DISPLAY_LABEL: Record<string, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  intermediario: 'Intermediário',
  influenciador: 'Influenciador',
}

// Legacy aliases — kept for any remaining callers during migration
export const NAV_BY_ROLE = NAV_BY_VIEW
export const ROLE_DISPLAY_LABEL = VIEW_DISPLAY_LABEL
export const NON_ADMIN_ROLES = ['intermediario', 'gerente', 'influenciador'] as const
