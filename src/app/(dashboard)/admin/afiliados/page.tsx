import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AfiliadosFilterBar from './AfiliadosFilterBar'
import AfiliadosTableClient from './AfiliadosTableClient'
import type { Prisma } from '@prisma/client'

const ROLE_LABEL: Record<string, string> = {
  INFLUENCER: 'Influenciador',
  INTERMEDIARIO: 'Intermediário',
  GERENTE: 'Gerente',
  ADMIN: 'Admin',
}
const ROLE_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  INFLUENCER: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  GERENTE: { bg: 'rgba(2,117,243,0.12)', color: '#0275F3' },
  INTERMEDIARIO: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
  ADMIN: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  APROVADO: { bg: 'rgba(34,211,165,0.12)', color: '#22D3A5', dot: '#22D3A5', label: 'Aprovado' },
  PENDENTE: { bg: 'rgba(250,204,21,0.12)', color: '#facc15', dot: '#facc15', label: 'Pendente' },
  REPROVADO: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', dot: '#ef4444', label: 'Reprovado' },
  BLOQUEADO: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', dot: '#ef4444', label: 'Bloqueado' },
  BLOQUEADO_TEMPORARIAMENTE: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316', label: 'Bloq. temp.' },
}

function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'há 1 dia'
  if (diffDays < 30) return `há ${diffDays} dias`
  const months = Math.floor(diffDays / 30)
  if (months === 1) return 'há 1 mês'
  if (months < 12) return `há ${months} meses`
  return `há ${Math.floor(months / 12)} ano(s)`
}

function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function AdminAfiliadosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; origem?: string; page?: string; q?: string; role?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const statusFilter = params.status ?? 'TODOS'
  const origemFilter = params.origem ?? 'TODOS'
  const roleFilter = params.role ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const q = params.q ?? ''
  const limit = 30
  const offset = (page - 1) * limit

  // ── Where clause ────────────────────────────────────────────────────────────
  const where: Prisma.public_usersWhereInput = {}

  if (q) {
    const qClean = q.replace(/[^\d]/g, '')
    where.OR = [
      { nome_completo: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
    if (qClean.length > 0) where.OR.push({ cpf: { contains: qClean } })
  }

  if (roleFilter) {
    where.user_roles = { some: { role: roleFilter as never, ativo: true } }
  }

  const redeCondition: Prisma.public_usersWhereInput = {
    OR: [{ id_gerente: { not: null } }, { id_intermediario: { not: null } }],
  }
  const diretoCondition: Prisma.public_usersWhereInput = {
    id_gerente: null,
    id_intermediario: null,
  }

  // Status filter
  if (statusFilter === 'APROVADOS') where.status_aprovacao = 'APROVADO'
  else if (statusFilter === 'PENDENTES_D') where.status_aprovacao = 'PENDENTE'
  else if (statusFilter === 'PENDENTES_S') where.status_aprovacao = 'PENDENTE'
  else if (statusFilter === 'BLOQUEADOS') where.status_aprovacao = { in: ['BLOQUEADO', 'BLOQUEADO_TEMPORARIAMENTE'] }

  // Origem / sub-tab filter
  const andClauses: Prisma.public_usersWhereInput[] = []

  if (origemFilter === 'REDE') andClauses.push(redeCondition)
  else if (origemFilter === 'DIRETO') andClauses.push(diretoCondition)
  else if (origemFilter === 'PREMIUM') andClauses.push({ premium: true })

  if (statusFilter === 'PENDENTES_D') andClauses.push(diretoCondition)
  else if (statusFilter === 'PENDENTES_S') andClauses.push(redeCondition)

  if (andClauses.length > 0) where.AND = andClauses

  // ── Phase 1: Users + counts (parallel) ──────────────────────────────────────
  const [
    users,
    count,
    countTotal,
    countAprovados,
    countPendentesDireto,
    countPendentesSubs,
    countBloqueados,
    countDireto,
    countRede,
    countPremium,
  ] = await Promise.all([
    prisma.public_users.findMany({
      where,
      select: {
        id: true,
        auth_id: true,
        nome_completo: true,
        email: true,
        status_aprovacao: true,
        id_gerente: true,
        id_intermediario: true,
        created_at: true,
        updated_at: true,
        premium: true,
        telefone: true,
        socials: {
          select: {
            instagram: true,
            tiktok: true,
            facebook: true,
            telegram_canal: true,
            whatsapp_canal: true,
          }
        },
        users_users_id_gerenteTousers: {
          select: { nome_completo: true },
        },
        users_users_id_intermediarioTousers: {
          select: { nome_completo: true },
        },
        user_roles: {
          where: { ativo: true },
          select: { id: true, role: true, ref_code: true },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: [{ status_aprovacao: 'asc' }, { created_at: 'desc' }],
      skip: offset,
      take: limit,
    }),
    prisma.public_users.count({ where }),
    prisma.public_users.count({}),
    prisma.public_users.count({ where: { status_aprovacao: 'APROVADO' } }),
    prisma.public_users.count({ where: { status_aprovacao: 'PENDENTE', AND: [diretoCondition] } }),
    prisma.public_users.count({ where: { status_aprovacao: 'PENDENTE', AND: [redeCondition] } }),
    prisma.public_users.count({ where: { status_aprovacao: { in: ['BLOQUEADO', 'BLOQUEADO_TEMPORARIAMENTE'] } } }),
    prisma.public_users.count({ where: diretoCondition }),
    prisma.public_users.count({ where: redeCondition }),
    prisma.public_users.count({ where: { premium: true } }),
  ])

  // ── Phase 2: Production data aggregated by user_role ────────────────────────
  const userRoleIds = users.flatMap(u => u.user_roles.map(r => r.id))

  // Get all contratos for these user_roles
  const contratos = userRoleIds.length > 0
    ? await prisma.contratos.findMany({
      where: { id_user_role: { in: userRoleIds } },
      select: { id: true, id_user_role: true },
    })
    : []

  const contratoIds = contratos.map(c => c.id)

  // Aggregate producao_dados grouped by contrato via raw SQL
  type ProdAggregate = {
    id_contrato: string
    total_ftds: bigint
    total_cpas: bigint
    total_receita: string
    last_date: Date | null
  }

  const prodAggregate: ProdAggregate[] = contratoIds.length > 0
    ? await prisma.$queryRaw<ProdAggregate[]>`
        SELECT
          id_contrato,
          COALESCE(SUM(ftds), 0)::bigint           AS total_ftds,
          COALESCE(SUM(cpas), 0)::bigint           AS total_cpas,
          COALESCE(SUM(receita_bruta), 0)::text    AS total_receita,
          MAX(data)                                AS last_date
        FROM public.producao_dados
        WHERE id_contrato = ANY(${contratoIds}::uuid[])
        GROUP BY id_contrato
      `
    : []

  // Build lookup: userRoleId → { ftds, cpas, receita, lastDate }
  const contrtoToRole = new Map(contratos.map(c => [c.id, c.id_user_role]))
  const roleProd = new Map<string, { ftds: number; cpas: number; receita: number; lastDate: Date | null }>()

  for (const agg of prodAggregate) {
    const roleId = contrtoToRole.get(agg.id_contrato)
    if (!roleId) continue
    const existing = roleProd.get(roleId)
    const ftds = Number(agg.total_ftds ?? 0)
    const cpas = Number(agg.total_cpas ?? 0)
    const receita = parseFloat(agg.total_receita ?? '0')
    const lastDate = agg.last_date ?? null
    if (existing) {
      roleProd.set(roleId, {
        ftds: existing.ftds + ftds,
        cpas: existing.cpas + cpas,
        receita: existing.receita + receita,
        lastDate: lastDate && (!existing.lastDate || lastDate > existing.lastDate)
          ? lastDate
          : existing.lastDate,
      })
    } else {
      roleProd.set(roleId, { ftds, cpas, receita, lastDate })
    }
  }

  // Build per-user aggregates
  const userProd = new Map<string, { ftds: number; cpas: number; receita: number; lastDate: Date | null }>()
  for (const u of users) {
    let ftds = 0, cpas = 0, receita = 0
    let lastDate: Date | null = null
    for (const role of u.user_roles) {
      const rp = roleProd.get(role.id)
      if (rp) {
        ftds += rp.ftds
        cpas += rp.cpas
        receita += rp.receita
        if (rp.lastDate && (!lastDate || rp.lastDate > lastDate)) {
          lastDate = rp.lastDate
        }
      }
    }
    userProd.set(u.id, { ftds, cpas, receita, lastDate })
  }

  const userProdObj: Record<string, { ftds: number; cpas: number; receita: number; lastDate: string | null; contratosCount: number }> = {}
  for (const [userId, val] of userProd.entries()) {
    const u = users.find(x => x.id === userId)
    let contratosCount = 0
    if (u) {
      const uRoleIds = u.user_roles.map(r => r.id)
      contratosCount = contratos.filter(c => uRoleIds.includes(c.id_user_role)).length
    }
    userProdObj[userId] = {
      ftds: val.ftds,
      cpas: val.cpas,
      receita: val.receita,
      lastDate: val.lastDate ? val.lastDate.toISOString() : null,
      contratosCount,
    }
  }

  const totalPages = Math.ceil(count / limit)

  const buildHref = (overrides: Record<string, string>) => {
    const p: Record<string, string> = { status: statusFilter, origem: origemFilter }
    if (roleFilter) p.role = roleFilter
    if (q) p.q = encodeURIComponent(q)
    Object.assign(p, overrides)
    const qs = Object.entries(p)
      .filter(([, v]) => v && v !== 'TODOS' && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
    return `/admin/afiliados${qs ? '?' + qs : ''}`
  }

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const STAT_CARDS = [
    { key: 'TODOS', label: 'Total', count: countTotal, color: '#0275F3', bg: 'rgba(2,117,243,' },
    { key: 'PENDENTES_D', label: 'Pendentes (diretos)', count: countPendentesDireto, color: '#facc15', bg: 'rgba(250,204,21,' },
    { key: 'PENDENTES_S', label: 'Pendentes (subs)', count: countPendentesSubs, color: '#f97316', bg: 'rgba(249,115,22,' },
    { key: 'APROVADOS', label: 'Aprovados', count: countAprovados, color: '#22D3A5', bg: 'rgba(34,211,165,' },
    { key: 'BLOQUEADOS', label: 'Bloqueados', count: countBloqueados, color: '#ef4444', bg: 'rgba(239,68,68,' },
  ]

  const STATUS_TABS = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'PENDENTES_D', label: 'Pendentes (diretos)' },
    { key: 'PENDENTES_S', label: 'Pendentes (subs)' },
    { key: 'APROVADOS', label: 'Aprovados' },
    { key: 'BLOQUEADOS', label: 'Bloqueados' },
  ]

  const ORIGEM_TABS = [
    { key: 'DIRETO', label: 'Diretos', count: countDireto, icon: 'person' },
    { key: 'REDE', label: 'Rede', count: countRede, icon: 'hub' },
    { key: 'PREMIUM', label: 'Premium', count: countPremium, icon: 'star' },
  ]

  const isOrigemActive = (key: string) => {
    if (key === 'DIRETO') return origemFilter === 'TODOS' || origemFilter === 'DIRETO'
    return origemFilter === key
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">
          Gestão de Afiliados
        </h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          {countTotal.toLocaleString('pt-BR')} afiliado(s) cadastrado(s) · Aprove e gerencie
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map(stat => {
          const isActive = statusFilter === stat.key
          return (
            <Link
              key={stat.key}
              href={buildHref({ status: stat.key, page: '1' })}
              className="rounded-xl p-4 flex flex-col gap-1 cursor-pointer transition-all duration-200 hover:scale-[1.02] overflow-hidden relative"
              style={{
                background: isActive ? `${stat.bg}0.12)` : 'var(--color-surface-container-high)',
                border: '1px solid ' + (isActive ? stat.color : 'var(--color-outline-variant)'),
                boxShadow: 'none',
              }}
            >
              {/* Colored top stripe */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: stat.color, opacity: isActive ? 1 : 0.35 }}
              />
              <p
                className="text-[28px] font-bold leading-none tabular-nums mt-1"
                style={{ color: stat.color }}
              >
                {stat.count.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                {stat.label}
              </p>
            </Link>
          )
        })}
      </div>

      {/* ── Status Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_TABS.map(tab => {
          const isActive = statusFilter === tab.key
          return (
            <Link
              key={tab.key}
              href={buildHref({ status: tab.key, page: '1' })}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap"
              style={
                isActive
                  ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' }
                  : {
                    background: 'var(--color-surface-container)',
                    color: 'var(--color-on-surface-variant)',
                    border: '1px solid var(--color-outline-variant)',
                  }
              }
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <AfiliadosFilterBar q={q} role={roleFilter} status={statusFilter} origem={origemFilter} />

      {/* ── Origem Sub-Tabs ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-end overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {ORIGEM_TABS.map((tab) => {
            const isActive = isOrigemActive(tab.key)
            const href = tab.key === 'DIRETO'
              ? buildHref({ origem: 'TODOS', page: '1' })
              : buildHref({ origem: tab.key, page: '1' })
            return (
              <Link
                key={tab.key}
                href={href}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap border-b-2 flex-shrink-0"
                style={
                  isActive
                    ? {
                      color: 'var(--color-primary)',
                      borderBottomColor: 'var(--color-primary)',
                      background: 'rgba(2,117,243,0.06)',
                      borderRadius: '8px 8px 0 0',
                    }
                    : {
                      color: 'var(--color-on-surface-variant)',
                      borderBottomColor: 'transparent',
                    }
                }
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                {tab.label}
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                  style={{
                    background: isActive ? 'rgba(2,117,243,0.15)' : 'var(--color-surface-container-highest)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  {tab.count.toLocaleString('pt-BR')}
                </span>
              </Link>
            )
          })}
          <div className="flex-1 min-w-4 border-b-2" style={{ borderBottomColor: 'var(--color-outline-variant)' }} />
        </div>

        {/* Description text below tabs */}
        {origemFilter === 'TODOS' || origemFilter === 'DIRETO' ? (
          <p className="text-xs mt-2 px-1" style={{ color: 'var(--color-on-surface-variant)' }}>
            Usuários que se cadastraram diretamente no sistema. Você pode aprovar, gerenciar contratos e alterar funções.
          </p>
        ) : origemFilter === 'REDE' ? (
          <p className="text-xs mt-2 px-1" style={{ color: 'var(--color-on-surface-variant)' }}>
            Usuários que foram indicados via rede de gerentes ou intermediários.
          </p>
        ) : (
          <p className="text-xs mt-2 px-1" style={{ color: 'var(--color-on-surface-variant)' }}>
            Usuários com status premium ativo.
          </p>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {users.length === 0 ? (
        <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[48px] opacity-30" style={{ color: 'var(--color-on-surface-variant)' }}>
            person_off
          </span>
          <p className="text-body-md" style={{ color: 'var(--color-outline)' }}>Nenhum afiliado encontrado</p>
        </div>
      ) : (
        <AfiliadosTableClient users={users as any} userProdObj={userProdObj} />
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-label-md" style={{ color: 'var(--color-outline)' }}>
            Página {page} de {totalPages} · {count.toLocaleString('pt-BR')} afiliados
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildHref({ page: String(page - 1) })}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-label-md transition-colors cursor-pointer"
                style={{
                  background: 'var(--color-surface-container-high)',
                  color: 'var(--color-on-surface)',
                  border: '1px solid var(--color-outline-variant)',
                }}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildHref({ page: String(page + 1) })}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-label-md transition-colors cursor-pointer"
                style={{
                  background: 'var(--color-surface-container-high)',
                  color: 'var(--color-on-surface)',
                  border: '1px solid var(--color-outline-variant)',
                }}
              >
                Próxima
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
