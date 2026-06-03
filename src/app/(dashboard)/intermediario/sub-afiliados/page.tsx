import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import InviteLinkCard from './InviteLinkCard'

const STATUS_MAP: Record<string, { label: string; bc: string }> = {
  APROVADO:                { label: 'Aprovado',     bc: 'badge-green'  },
  PENDENTE:                { label: 'Pendente',     bc: 'badge-yellow' },
  REPROVADO:               { label: 'Reprovado',    bc: 'badge-red'    },
  BLOQUEADO:               { label: 'Bloqueado',    bc: 'badge-red'    },
  BLOQUEADO_TEMPORARIAMENTE: { label: 'Bloq. temp.', bc: 'badge-orange' },
}

export default async function SubAfiliadosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status: filterStatus, q: search } = await searchParams

  const db = createAdminClient()

  const { data: publicUser } = await db
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  const myId = publicUser?.id ?? null

  type SubAfiliado = {
    id: string
    nome_completo: string
    email: string
    telefone: string
    status_aprovacao: string
    premium: boolean
    created_at: string
    id_gerente: string | null
    user_roles: { role: string; ativo: boolean }[]
    _count?: { contratos: number }
  }

  let subs: SubAfiliado[] = []
  let refCode: string | null = null

  if (myId) {
    let query = db
      .from('users')
      .select('id, nome_completo, email, telefone, status_aprovacao, premium, created_at, id_gerente, user_roles(role, ativo)')
      .eq('id_intermediario', myId)
      .eq('ativo', true)
      .order('created_at', { ascending: false })

    if (filterStatus && filterStatus !== 'TODOS') {
      query = query.eq('status_aprovacao', filterStatus)
    }

    if (search) {
      query = query.or(`nome_completo.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const [{ data }, intermediarioRole] = await Promise.all([
      query,
      prisma.user_roles.findFirst({
        where: { id_usuario: myId, role: 'INTERMEDIARIO', ativo: true },
        select: { ref_code: true },
      }),
    ])
    subs = (data ?? []) as SubAfiliado[]
    refCode = intermediarioRole?.ref_code ?? null
  }

  // Get contrato counts per user
  const subIds = subs.map(s => s.id)
  let contratoMap: Record<string, number> = {}
  if (subIds.length > 0) {
    const { data: contratos } = await db
      .from('contratos')
      .select('user_roles!inner(id_usuario)')
      .eq('ativo', true)
      .in('user_roles.id_usuario', subIds)
    // Count per user_id
    for (const c of contratos ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uid = (c.user_roles as any)?.id_usuario
      if (uid) contratoMap[uid] = (contratoMap[uid] ?? 0) + 1
    }
  }

  const counts = {
    total:     subs.length,
    aprovados: subs.filter(s => s.status_aprovacao === 'APROVADO').length,
    pendentes: subs.filter(s => s.status_aprovacao === 'PENDENTE').length,
    bloqueados: subs.filter(s => ['BLOQUEADO', 'BLOQUEADO_TEMPORARIAMENTE'].includes(s.status_aprovacao)).length,
  }

  const FILTERS = [
    { value: 'TODOS',   label: 'Todos',     count: counts.total },
    { value: 'APROVADO', label: 'Aprovados', count: counts.aprovados },
    { value: 'PENDENTE', label: 'Pendentes', count: counts.pendentes },
    { value: 'BLOQUEADO', label: 'Bloqueados', count: counts.bloqueados },
  ]

  const active = filterStatus ?? 'TODOS'

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Gerentes</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Gerencie os gerentes da sua rede
        </p>
      </div>

      {/* Link de Convite */}
      <InviteLinkCard refCode={refCode} />

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: counts.total,     color: 'var(--color-primary)' },
          { label: 'Aprovados', value: counts.aprovados, color: '#22D3A5' },
          { label: 'Pendentes', value: counts.pendentes, color: '#f59e0b' },
          { label: 'Bloqueados',value: counts.bloqueados,color: '#F43F5E' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 rounded-2xl flex flex-col gap-1">
            <span className="text-label-md text-[var(--color-on-surface-variant)]">{s.label}</span>
            <span className="text-headline-lg font-bold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters & search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <Link
              key={f.value}
              href={`?status=${f.value}${search ? `&q=${search}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-label-md border transition-colors ${
                active === f.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-outline)]'
              }`}
            >
              {f.label} <span className="opacity-60 ml-1">({f.count})</span>
            </Link>
          ))}
        </div>
        <form method="GET" className="flex items-center gap-2 glass-card rounded-xl px-3 py-2 border border-[var(--color-outline-variant)] w-full">
          <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">search</span>
          <input
            name="q"
            defaultValue={search ?? ''}
            placeholder="Buscar por nome ou e-mail…"
            className="bg-transparent outline-none text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] flex-1"
          />
          {search && (
            <Link href={`?status=${active}`} className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">close</Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {subs.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
            <span className="material-symbols-outlined text-[48px] opacity-30">group</span>
            <p className="text-sm font-medium opacity-60">
              {myId ? 'Nenhum gerente encontrado' : 'Perfil de intermediário não configurado'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="orbit-table w-full">
              <thead className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)]">
                <tr>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Nome</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Contato</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Contratos</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Cadastro</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Status</th>
                  <th className="w-8 pr-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-outline-variant)]">
                {subs.map(s => {
                  const st = STATUS_MAP[s.status_aprovacao] ?? { label: s.status_aprovacao, bc: 'badge-gray' }
                  const nContratos = contratoMap[s.id] ?? 0
                  const initials = s.nome_completo.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                  return (
                    <tr key={s.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(2,117,243,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(2,117,243,0.2)' }}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--color-on-surface)]">{s.nome_completo}</p>
                            {s.premium && (
                              <span className="text-[10px] font-semibold" style={{ color: '#f59e0b' }}>⭐ Premium</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-[var(--color-on-surface-variant)]">{s.email}</p>
                        <p className="text-xs text-[var(--color-on-surface-variant)] opacity-60">{s.telefone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold tabular-nums text-[var(--color-on-surface)]">
                          {nContratos}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ${st.bc}`}>{st.label}</span>
                      </td>
                      <td className="pr-4 text-right">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                          <path d="M6 3l5 5-5 5" />
                        </svg>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
