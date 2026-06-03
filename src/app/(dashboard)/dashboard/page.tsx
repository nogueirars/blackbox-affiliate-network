import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSaldoInfluenciador } from '@/lib/finance/saldo-influenciador'
import { getSaldoGerente } from '@/lib/finance/saldo-gerente'
import { getSaldoIntermediario } from '@/lib/finance/saldo-intermediario'
import { getTransparenciaData } from '@/services/transparencia.service'
import { SummaryCard } from '@/components/ui/StatCard'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtNum(v: number) {
  return v.toLocaleString('pt-BR')
}
function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const statusMap: Record<string, { label: string; bc: string }> = {
  AGUARDANDO_NF: { label: 'Aguardando NF', bc: 'badge-yellow' },
  PROCESSANDO:   { label: 'Processando',   bc: 'badge-blue'   },
  CONCLUIDO:     { label: 'Concluído',      bc: 'badge-green'  },
  FALHA:         { label: 'Falha',          bc: 'badge-red'    },
  MANUAL:        { label: 'Manual',         bc: 'badge-orange' },
}

type StatCard = { label: string; value: string; sub?: string; icon: string; accent?: string }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.app_metadata?.role ?? 'influenciador') as string
  console.log('[dashboard] role:', role, 'user:', user.email)
  const db = createAdminClient()

  // ── Admin path ────────────────────────────────────────────────────────────
  if (role === 'admin') {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const inicio30d = new Date(Date.now() - 30 * 86400_000).toISOString()

    const [
      saquesPendentes,
      totalUsuarios,
      totalContratos,
      saquesProcessando,
      usuariosPendentes,
      saquesConcluidos,
      saquesFalha,
      novosAfiliados,
    ] = await Promise.all([
      db.from('saques').select('id, montante', { count: 'exact' }).eq('status', 'AGUARDANDO_NF'),
      db.from('users').select('id', { count: 'exact' }).eq('ativo', true),
      db.from('contratos').select('id', { count: 'exact' }).eq('ativo', true),
      db.from('saques').select('id', { count: 'exact' }).eq('status', 'PROCESSANDO'),
      db.from('users').select('id', { count: 'exact' }).eq('status_aprovacao', 'PENDENTE'),
      db.from('saques').select('id, montante').eq('status', 'CONCLUIDO').gte('created_at', inicioMes),
      db.from('saques').select('id', { count: 'exact' }).eq('status', 'FALHA').gte('created_at', inicio30d),
      db.from('users').select('id, nome_completo, email, status_aprovacao, created_at').order('created_at', { ascending: false }).limit(5),
    ])

    const valorPendente = (saquesPendentes.data ?? []).reduce((acc, r) => acc + Number(r.montante), 0)
    const valorConcluidoMes = (saquesConcluidos.data ?? []).reduce((acc, r: { id: string; montante: string | number }) => acc + Number(r.montante), 0)

    const { data: recentAdmin } = await db
      .from('saques')
      .select('id, montante, status, created_at, id_usuario')
      .order('created_at', { ascending: false })
      .limit(8)
    const adminUserIds = [...new Set((recentAdmin ?? []).map((r: { id_usuario: string }) => r.id_usuario))]
    let adminUserMap: Record<string, string> = {}
    if (adminUserIds.length > 0) {
      const { data: uNames } = await db.from('users').select('id, nome_completo').in('id', adminUserIds)
      adminUserMap = Object.fromEntries((uNames ?? []).map((u: { id: string; nome_completo: string }) => [u.id, u.nome_completo]))
    }

    function diasAtras(iso: string): string {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
      if (diff === 0) return 'hoje'
      if (diff === 1) return 'há 1 dia'
      return `há ${diff} dias`
    }

    return (
      <div className="animate-fade-in flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-display-lg text-[var(--color-on-surface)] mb-1">{greet()}</h2>
            <p className="text-body-md text-[var(--color-on-surface-variant)]">{user.email}</p>
          </div>
        </div>

        {/* KPI row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SummaryCard
            label="Saques aguardando NF"
            value={fmt(valorPendente)}
            icon="payments"
            sub={`${saquesPendentes.count ?? 0} pendentes`}
            accent="#0275F3"
          />
          <SummaryCard
            label="Usuários ativos"
            value={String(totalUsuarios.count ?? 0)}
            icon="person"
            sub="na plataforma"
            accent="#0275F3"
          />
          <SummaryCard
            label="Afiliados pendentes"
            value={String(usuariosPendentes.count ?? 0)}
            icon="schedule"
            sub="aguardando aprovação"
            accent="#F59E0B"
          />
        </div>

        {/* KPI row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SummaryCard
            label="Contratos ativos"
            value={String(totalContratos.count ?? 0)}
            icon="description"
            sub="na rede"
            accent="#0275F3"
          />
          <SummaryCard
            label="Saques concluídos (mês)"
            value={fmt(valorConcluidoMes)}
            icon="check_circle"
            sub={`${(saquesConcluidos.data ?? []).length} saques`}
            accent="#22D3A5"
          />
          <SummaryCard
            label="Em processamento"
            value={String(saquesProcessando.count ?? 0)}
            icon="pending_actions"
            sub="NF em análise"
            accent="#0275F3"
          />
        </div>

        {/* Bottom row: tabela + novos afiliados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saques recentes */}
          <div className="lg:col-span-2 glass-card rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex items-center justify-between">
              <h3 className="text-headline-md text-[var(--color-on-surface)]">Saques recentes</h3>
              <Link href="/admin/saques" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Ver todos <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="orbit-table w-full">
                <thead className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)]">
                  <tr>
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Usuário</th>
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Valor</th>
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Data</th>
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-outline-variant)]">
                  {(recentAdmin ?? []).map((s: { id: string; montante: string | number; status: string; created_at: string; id_usuario: string }) => {
                    const st = statusMap[s.status] ?? { label: s.status, bc: 'badge-gray' }
                    return (
                      <tr key={s.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                        <td className="px-6 py-4 text-sm text-[var(--color-on-surface)]">
                          {adminUserMap[s.id_usuario] ?? s.id_usuario?.slice(0, 8) + '…'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[var(--color-on-surface)]">
                          {Number(s.montante).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-6 py-4 text-xs text-[var(--color-on-surface-variant)]">
                          {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-6 py-4"><span className={`badge ${st.bc}`}>{st.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Novos afiliados */}
          <div className="lg:col-span-1 glass-card rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex items-center justify-between">
              <h3 className="text-headline-md text-[var(--color-on-surface)]">Novos afiliados</h3>
              <Link href="/admin/usuarios" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Ver todos <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-[var(--color-outline-variant)]">
              {(novosAfiliados.data ?? []).length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-[var(--color-on-surface-variant)]">
                  <span className="material-symbols-outlined text-[40px] opacity-30">group</span>
                  <p className="text-sm opacity-60">Nenhum afiliado recente</p>
                </div>
              ) : (novosAfiliados.data ?? []).map((u: { id: string; nome_completo: string; email: string; status_aprovacao: string; created_at: string }) => {
                const initial = (u.nome_completo ?? u.email ?? '?')[0].toUpperCase()
                return (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-container-high)] transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm text-white" style={{ background: '#0275F3' }}>
                      {initial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-[var(--color-on-surface)] truncate">{u.nome_completo ?? '—'}</span>
                      <span className="text-xs text-[var(--color-on-surface-variant)] truncate">{u.email}</span>
                    </div>
                    <span className="ml-auto text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap flex-shrink-0">{diasAtras(u.created_at)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Non-admin ─────────────────────────────────────────────────────────────
  const { data: publicUser } = await db
    .from('users')
    .select('id, nome_completo, premium')
    .eq('auth_id', user.id)
    .single()
  const myId: string | null = publicUser?.id ?? null

  let kpiCards: StatCard[] = []
  let prodStats = { registros: 0, ftds: 0, cpas: 0 }
  let totalSacado = 0
  let pendentes = 0
  let bloqueados = 0
  let subRoleLabelSingle = ''
  let subRoleLabelPlural = ''
  let subRoleHref = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let casas: any[] = []
  let financeiroHref = `/${role}/financeiro`

  const since30dStr = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)

  // ── Influenciador ─────────────────────────────────────────────────────────
  if (role === 'influenciador') {
    const saldo = await getSaldoInfluenciador(user.id).catch(() => ({
      saldo_disponivel: 0, comissao_bruta: 0, pag_recebidos: 0,
      saques_ativos: 0, estornos: 0, influenciador_id: '',
    }))
    totalSacado = saldo.pag_recebidos

    if (myId) {
      try {
        const userRoleRow = await prisma.user_roles.findFirst({
          where: { id_usuario: myId, role: 'INFLUENCER', ativo: true },
          select: { id: true }
        })
        if (userRoleRow) {
          const contratos = await prisma.contratos.findMany({
            where: { id_user_role: userRoleRow.id, ativo: true },
            select: { id: true }
          })
          const contractIds = contratos.map(c => c.id)
          if (contractIds.length > 0) {
            const viewRows = await prisma.vw_producao_influencer.findMany({
              where: { id_contrato: { in: contractIds }, data: { gte: new Date(since30dStr) } }
            })
            for (const row of viewRows) {
              prodStats.registros += Number(row.cadastros ?? 0)
              prodStats.ftds      += Number(row.ftds ?? 0)
              prodStats.cpas      += Number(row.cpas ?? 0)
            }
          }
        }
      } catch (e) { console.error('[dashboard] prisma influenciador:', e) }
      casas = await getTransparenciaData(myId, 'influenciador').catch(() => [])
    }

    kpiCards = [
      { label: 'Saldo disponível', value: fmt(saldo.saldo_disponivel), icon: 'account_balance_wallet', accent: saldo.saldo_disponivel > 0 ? '#22D3A5' : undefined },
      { label: 'Comissão bruta',   value: fmt(saldo.comissao_bruta),   icon: 'payments' },
      { label: 'Sacado',           value: fmt(totalSacado),             icon: 'arrow_upward', accent: '#22D3A5' },
      { label: 'Registros (30d)',  value: fmtNum(prodStats.registros), icon: 'person_add',   sub: 'novos cadastros' },
    ]

  // ── Gerente ───────────────────────────────────────────────────────────────
  } else if (role === 'gerente') {
    const saldo = await getSaldoGerente(user.id).catch(() => ({
      saldo_disponivel: 0, comissao_propria: 0, lucro_rede: 0,
      saques_ativos: 0, incentivo: 0, consumido: 0, gerente_id: '',
    }))

    subRoleLabelSingle = 'influenciador'
    subRoleLabelPlural = 'influenciadores'
    subRoleHref = '/gerente/sub-afiliados'

    let totalInfluenciadores = 0
    let totalReceita = 0

    if (myId) {
      const { data: infs } = await db
        .from('users')
        .select('id, status_aprovacao')
        .eq('id_gerente', myId)
        .eq('ativo', true)
      
      const influencerIds: string[] = []
      for (const u of infs ?? []) {
        if (u.status_aprovacao === 'APROVADO') {
          totalInfluenciadores++
          influencerIds.push(u.id)
        } else if (u.status_aprovacao === 'PENDENTE') {
          pendentes++
        } else if (u.status_aprovacao === 'BLOQUEADO') {
          bloqueados++
        }
      }

      const { data: sqData } = await db
        .from('saques')
        .select('montante')
        .eq('id_usuario', myId)
        .eq('status', 'CONCLUIDO')
      totalSacado = (sqData ?? []).reduce((acc, r: { montante: string | number }) => acc + Number(r.montante ?? 0), 0)

      try {
        const userRoleRow = await prisma.user_roles.findFirst({
          where: { id_usuario: myId, role: 'GERENTE', ativo: true },
          select: { id: true }
        })
        if (userRoleRow) {
          const contratos = await prisma.contratos.findMany({
            where: { id_user_role: userRoleRow.id, ativo: true },
            select: { id: true }
          })
          const contractIds = contratos.map(c => c.id)
          if (contractIds.length > 0) {
            const viewRows = await prisma.vw_producao_gerente.findMany({
              where: { id_contrato: { in: contractIds }, data: { gte: new Date(since30dStr) } }
            })
            for (const row of viewRows) {
              prodStats.registros += Number(row.cadastros ?? 0)
              prodStats.ftds      += Number(row.ftds ?? 0)
              prodStats.cpas      += Number(row.cpas ?? 0)
              totalReceita += Number(row.lucro_liquido_total ?? 0) + Number(row.repasse_pago_total ?? 0)
            }
          }
        }
      } catch (e) { console.error('[dashboard] prisma gerente:', e) }

      casas = await getTransparenciaData(myId, 'gerente').catch(() => [])
    }

    kpiCards = [
      { label: 'Saldo disponível',   value: fmt(saldo.saldo_disponivel), icon: 'account_balance_wallet', accent: saldo.saldo_disponivel > 0 ? '#22D3A5' : undefined },
      { label: 'Influenciadores',    value: fmtNum(totalInfluenciadores), icon: 'group',   sub: 'aprovados na rede', accent: 'var(--color-primary)' },
      { label: 'Receita rede (30d)', value: fmt(totalReceita),            icon: 'lan',     accent: totalReceita > 0 ? '#f59e0b' : undefined },
      { label: 'Sacado',             value: fmt(totalSacado),             icon: 'arrow_upward', accent: '#22D3A5' },
    ]

  // ── Intermediário ─────────────────────────────────────────────────────────
  } else if (role === 'intermediario') {
    const saldo = await getSaldoIntermediario(user.id).catch(() => ({
      saldo_disponivel: 0, comissao_bruta: 0, repasse_devido: 0,
      saques_ativos: 0, consumido: 0, intermediario_id: '',
    }))

    subRoleLabelSingle = 'gerente'
    subRoleLabelPlural = 'gerentes'
    subRoleHref = '/intermediario/sub-afiliados'

    let totalGerentes = 0
    let totalInfluenciadores = 0
    let totalReceita = 0

    if (myId) {
      const { data: gers } = await db
        .from('users')
        .select('id, status_aprovacao')
        .eq('id_intermediario', myId)
        .eq('ativo', true)
      
      const gerenteIds: string[] = []
      for (const u of gers ?? []) {
        if (u.status_aprovacao === 'APROVADO') {
          totalGerentes++
          gerenteIds.push(u.id)
        } else if (u.status_aprovacao === 'PENDENTE') {
          pendentes++
        } else if (u.status_aprovacao === 'BLOQUEADO') {
          bloqueados++
        }
      }

      let influencerIds: string[] = []
      if (gerenteIds.length > 0) {
        const { data: infs, count: iCnt } = await db
          .from('users')
          .select('id', { count: 'exact' })
          .in('id_gerente', gerenteIds)
          .eq('ativo', true)
          .eq('status_aprovacao', 'APROVADO')
        totalInfluenciadores = iCnt ?? 0
        influencerIds = (infs ?? []).map((u: { id: string }) => u.id)
      }

      const { data: sqData } = await db
        .from('saques')
        .select('montante')
        .eq('id_usuario', myId)
        .eq('status', 'CONCLUIDO')
      totalSacado = (sqData ?? []).reduce((acc, r: { montante: string | number }) => acc + Number(r.montante ?? 0), 0)

      try {
        const userRoleRow = await prisma.user_roles.findFirst({
          where: { id_usuario: myId, role: 'INTERMEDIARIO', ativo: true },
          select: { id: true }
        })
        if (userRoleRow) {
          const contratos = await prisma.contratos.findMany({
            where: { id_user_role: userRoleRow.id, ativo: true },
            select: { id: true }
          })
          const contractIds = contratos.map(c => c.id)
          if (contractIds.length > 0) {
            const viewRows = await prisma.vw_producao_intermediario.findMany({
              where: { id_contrato: { in: contractIds }, data: { gte: new Date(since30dStr) } }
            })
            for (const row of viewRows) {
              prodStats.registros += Number(row.cadastros ?? 0)
              prodStats.ftds      += Number(row.ftds ?? 0)
              prodStats.cpas      += Number(row.cpas ?? 0)
              totalReceita += Number(row.lucro_liquido_total ?? 0) + Number(row.custo_repassado_total ?? 0)
            }
          }
        }
      } catch (e) { console.error('[dashboard] prisma intermediario:', e) }

      casas = await getTransparenciaData(myId, 'intermediario').catch(() => [])
    }

    kpiCards = [
      { label: 'Saldo disponível',   value: fmt(saldo.saldo_disponivel), icon: 'account_balance_wallet', accent: saldo.saldo_disponivel > 0 ? '#22D3A5' : undefined },
      { label: 'Gerentes',           value: fmtNum(totalGerentes),       icon: 'manage_accounts', sub: 'aprovados', accent: 'var(--color-primary)' },
      { label: 'Influenciadores',    value: fmtNum(totalInfluenciadores), icon: 'group',           sub: 'na rede',   accent: '#8b5cf6' },
      { label: 'Receita rede (30d)', value: fmt(totalReceita),            icon: 'lan',             accent: totalReceita > 0 ? '#f59e0b' : undefined },
    ]
  }

  // ── Recent saques ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentSaques: any[] = []
  if (myId) {
    const { data: sq } = await db
      .from('saques')
      .select('id, montante, status, created_at')
      .eq('id_usuario', myId)
      .order('created_at', { ascending: false })
      .limit(5)
    recentSaques = sq ?? []
  }

  // ── Quick actions ─────────────────────────────────────────────────────────
  const quickActions =
    role === 'gerente'
      ? [
          { href: '/gerente/sub-afiliados', label: 'Influenciadores', icon: 'group',          accent: 'var(--color-primary)' },
          { href: '/gerente/financeiro',     label: 'Solicitar saque', icon: 'payments',       accent: 'var(--color-success)' },
          { href: '/gerente/producao',       label: 'Produção',        icon: 'bar_chart',      accent: '#22D3A5'              },
          { href: '/gerente/transparencia',  label: 'Transparência',   icon: 'visibility',     accent: '#8b5cf6'              },
        ]
      : role === 'intermediario'
      ? [
          { href: '/intermediario/sub-afiliados', label: 'Gerentes',        icon: 'manage_accounts', accent: 'var(--color-primary)' },
          { href: '/intermediario/financeiro',    label: 'Solicitar saque', icon: 'payments',        accent: 'var(--color-success)' },
          { href: '/intermediario/producao',      label: 'Produção',        icon: 'bar_chart',       accent: '#22D3A5'              },
          { href: '/intermediario/transparencia', label: 'Transparência',   icon: 'visibility',      accent: '#8b5cf6'              },
        ]
      : [
          { href: '/influenciador/financeiro',   label: 'Solicitar saque', icon: 'arrow_upward', accent: 'var(--color-success)' },
          { href: '/influenciador/producao',     label: 'Produção',        icon: 'bar_chart',    accent: 'var(--color-primary)' },
          { href: '/influenciador/contratos',    label: 'Contratos',       icon: 'description',  accent: 'var(--color-info)'    },
          { href: '/influenciador/transparencia',label: 'Transparência',   icon: 'visibility',   accent: '#8b5cf6'              },
        ]

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-display-lg text-[var(--color-on-surface)] mb-1">{greet()}</h2>
          <p className="text-body-md text-[var(--color-on-surface-variant)]">{user.email}</p>
        </div>
        {publicUser?.premium && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
            <span className="material-symbols-outlined text-[16px]" style={{ color: '#f59e0b' }}>workspace_premium</span>
            <span className="text-label-md font-semibold" style={{ color: '#f59e0b' }}>Premium</span>
          </div>
        )}
      </div>

      {/* Avisos */}
      {(pendentes > 0 || bloqueados > 0) && (
        <div className="flex flex-col gap-2">
          {pendentes > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}>
              <span className="material-symbols-outlined text-[18px]" style={{ color: '#f59e0b' }}>schedule</span>
              <p className="text-sm text-[var(--color-on-surface)]">
                <span className="font-semibold">{pendentes} {pendentes > 1 ? subRoleLabelPlural : subRoleLabelSingle}</span> aguardando aprovação na sua rede.
              </p>
              <Link href={subRoleHref} className="ml-auto text-xs font-semibold" style={{ color: '#f59e0b' }}>Ver →</Link>
            </div>
          )}
          {bloqueados > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.25)' }}>
              <span className="material-symbols-outlined text-[18px]" style={{ color: '#F43F5E' }}>block</span>
              <p className="text-sm text-[var(--color-on-surface)]">
                <span className="font-semibold">{bloqueados} {bloqueados > 1 ? subRoleLabelPlural : subRoleLabelSingle}</span> bloqueado{bloqueados > 1 ? 's' : ''} na sua rede.
              </p>
              <Link href={`${subRoleHref}?status=BLOQUEADO`} className="ml-auto text-xs font-semibold" style={{ color: '#F43F5E' }}>Ver →</Link>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c, i) => (
          <SummaryCard key={i} label={c.label} value={c.value} icon={c.icon} sub={c.sub} accent={c.accent?.startsWith('#') ? c.accent : '#0275F3'} />
        ))}
      </div>

      {/* Produção + Sacado */}
      <div>
        <p className="text-label-md text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-3">Produção — últimos 30 dias</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Registros', value: fmtNum(prodStats.registros), icon: 'person_add',   accent: '#22D3A5', sub: 'novos cadastros'   },
            { label: 'FTDs',      value: fmtNum(prodStats.ftds),      icon: 'trending_up',  accent: '#F59E0B', sub: 'primeiro depósito' },
            { label: 'CPAs',      value: fmtNum(prodStats.cpas),      icon: 'target',       accent: '#8B5CF6', sub: 'custo por ação'    },
            { label: 'Sacado',    value: fmt(totalSacado),             icon: 'arrow_upward', accent: '#22D3A5', sub: 'total recebido'    },
          ].map((s, i) => (
            <SummaryCard key={i} label={s.label} value={s.value} icon={s.icon} sub={s.sub} accent={s.accent} />
          ))}
        </div>
      </div>

      {/* Casas de aposta */}
      {casas.length > 0 && (
        <div>
          <p className="text-label-md text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-3">Trabalho nas casas de aposta</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {casas.map((c: any, i: number) => (
              <div key={i} className="glass-card p-5 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {c.casa.icone_url ? (
                    <img
                      src={c.casa.icone_url}
                      alt={c.casa.nome_exibicao}
                      className="w-8 h-8 rounded-lg object-contain bg-[var(--color-surface-container-highest)]"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-lg bg-[var(--color-surface-container-highest)] flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">casino</span>
                    </span>
                  )}
                  <span className="text-sm font-semibold text-[var(--color-on-surface)] truncate">{c.casa.nome_exibicao}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-outline-variant)] pt-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--color-on-surface-variant)] opacity-60 uppercase tracking-wider">Ganho</span>
                    <span className="text-sm font-bold tabular-nums text-[var(--color-on-surface)]">{fmt(c.resumo.comissao_bruta)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--color-on-surface-variant)] opacity-60 uppercase tracking-wider">Sacado</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: '#22D3A5' }}>{fmt(c.resumo.recebido)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--color-on-surface-variant)] opacity-60 uppercase tracking-wider">A receber</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: c.resumo.a_receber > 0 ? '#f59e0b' : 'var(--color-on-surface-variant)' }}>
                      {fmt(c.resumo.a_receber)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saques recentes */}
        <div className="lg:col-span-2 glass-card rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex items-center justify-between">
            <h3 className="text-headline-md text-[var(--color-on-surface)]">Saques recentes</h3>
            <Link href={financeiroHref} className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Ver todos <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          {recentSaques.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-[40px] opacity-30">receipt_long</span>
              <p className="text-sm opacity-60">Nenhum saque registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="orbit-table w-full">
                <thead className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)]">
                  <tr>
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Valor</th>
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Data</th>
                    <th className="text-left px-6 py-3 text-label-md text-[var(--color-on-surface-variant)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-outline-variant)]">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {recentSaques.map((s: any) => {
                    const st = statusMap[s.status] ?? { label: s.status, bc: 'badge-gray' }
                    return (
                      <tr key={s.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                        <td className="px-6 py-4 font-semibold text-[var(--color-on-surface)]">
                          {Number(s.montante).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-6 py-4 text-xs text-[var(--color-on-surface-variant)]">
                          {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-6 py-4"><span className={`badge ${st.bc}`}>{st.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="glass-card rounded-3xl p-6 flex flex-col gap-4">
          <h3 className="text-headline-md text-[var(--color-on-surface)]">Ações rápidas</h3>
          <div className="flex flex-col gap-2">
            {quickActions.map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] border border-transparent hover:border-[var(--color-outline-variant)]"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)]">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: a.accent }}>{a.icon}</span>
                </span>
                <span className="text-sm font-medium text-[var(--color-on-surface)]">{a.label}</span>
                <span className="material-symbols-outlined ml-auto text-[16px] text-[var(--color-on-surface-variant)] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-2 px-6 py-3 border-t border-[var(--color-outline-variant)] flex items-center justify-between bg-[var(--color-surface-container-lowest)] opacity-60 rounded-3xl">
        <div className="flex items-center gap-6">
          <span className="text-label-md text-[var(--color-on-surface-variant)] uppercase">Engine v4.2.1-stable</span>
          <span className="text-label-md text-[var(--color-on-surface-variant)] uppercase">Load: 0.12ms</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--color-primary)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
          <span className="text-label-md uppercase tracking-tighter">Live System Connection</span>
        </div>
      </footer>
    </div>
  )
}
