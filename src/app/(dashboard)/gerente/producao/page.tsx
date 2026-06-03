import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ProducaoFilters } from './ProducaoFilters'
import { ProducaoTable } from './ProducaoTable'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtNum(v: number) {
  return v.toLocaleString('pt-BR')
}
function n(v: unknown) {
  return Number(v ?? 0)
}

type VwRow = {
  id_contrato: string
  data: Date
  id_casa: string
  cadastros: string
  ftds: string
  cpas: string
  ngr: string
  custo_repassado_cpa: string
  custo_repassado_revshare: string
  custo_repassado_total: string
  lucro_liquido_cpa: string
  lucro_liquido_revshare: string
  lucro_liquido_total: string
  // joined
  casa_nome: string
  gerente_nome: string
  gerente_id: string
}

export default async function GerenteProducaoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; influenciador?: string; casa?: string; agrupamento?: string; dataInicio?: string; dataFim?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { periodo = '30', influenciador: filterInfluenciador, casa: filterCasa, agrupamento = 'diaria', dataInicio, dataFim } = await searchParams

  // Resolve o public_users do usuário logado
  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: { id: true },
  })

  const myId = publicUser?.id ?? null

  const since = new Date()
  let until: Date | undefined = undefined

  if (dataInicio) {
    since.setTime(new Date(dataInicio).getTime() + new Date().getTimezoneOffset() * 60000)
  } else {
    const dias = parseInt(periodo)
    since.setDate(since.getDate() - dias)
  }
  
  if (dataFim) {
    until = new Date(dataFim)
    until.setTime(until.getTime() + new Date().getTimezoneOffset() * 60000)
  }

  const sinceDate = since.toISOString().slice(0, 10)

  let rows: VwRow[] = []
  let casasParaFiltro: [string, string][] = []

  if (myId) {
    // 1. Encontrar o user_role de GERENTE para o usuário logado
    const userRole = await prisma.user_roles.findFirst({
      where: {
        id_usuario: myId,
        role: 'GERENTE',
        ativo: true
      },
      select: { id: true }
    })

    if (userRole) {
      // 2. Encontrar todos os contratos vinculados a esse user_role
      const contratos = await prisma.contratos.findMany({
        where: {
          id_user_role: userRole.id,
          ativo: true
        },
        select: {
          id: true,
          casas_aposta: {
            select: {
              id: true,
              nome_exibicao: true
            }
          }
        }
      })

      const contractIds = contratos.map(c => c.id)

      // Criar mapa de ID da casa -> Nome da casa para os contratos do usuário
      const contractCasasMap = new Map<string, string>()
      for (const c of contratos) {
        if (c.casas_aposta) {
          contractCasasMap.set(c.casas_aposta.id, c.casas_aposta.nome_exibicao)
        }
      }

      casasParaFiltro = [...contractCasasMap.entries()]

      if (contractIds.length > 0) {
        // 3. Buscar dados da view vw_producao_gerente
        const viewRows = await prisma.vw_producao_gerente.findMany({
          where: {
            id_contrato: {
              in: contractIds
            },
            data: {
              gte: since,
              ...(until ? { lte: until } : {})
            },
            id_casa: filterCasa ? filterCasa : undefined
          },
          orderBy: {
            data: 'desc'
          }
        })

        // 4. Mapear as linhas para a estrutura VwRow esperada pela UI
        rows = viewRows.map(r => ({
          id_contrato: r.id_contrato ?? '',
          data: r.data ?? new Date(),
          id_casa: r.id_casa ?? '',
          cadastros: r.cadastros?.toString() ?? '0',
          ftds: r.ftds?.toString() ?? '0',
          cpas: r.cpas?.toString() ?? '0',
          ngr: r.ngr?.toString() ?? '0',
          custo_repassado_cpa: r.repasse_pago_cpa?.toString() ?? '0',
          custo_repassado_revshare: r.repasse_pago_revshare?.toString() ?? '0',
          custo_repassado_total: r.repasse_pago_total?.toString() ?? '0',
          lucro_liquido_cpa: r.lucro_liquido_cpa?.toString() ?? '0',
          lucro_liquido_revshare: r.lucro_liquido_revshare?.toString() ?? '0',
          lucro_liquido_total: r.lucro_liquido_total?.toString() ?? '0',
          casa_nome: r.id_casa ? contractCasasMap.get(r.id_casa) ?? '—' : '—',
          gerente_nome: '—',
          gerente_id: ''
        }))

        if (agrupamento === 'acumulada') {
          const grouped = new Map<string, VwRow>()
          for (const r of rows) {
            const dateKey = r.data instanceof Date ? r.data.toISOString().slice(0, 10) : String(r.data)
            const existing = grouped.get(dateKey)
            if (existing) {
              existing.cadastros = (Number(existing.cadastros) + Number(r.cadastros)).toString()
              existing.ftds = (Number(existing.ftds) + Number(r.ftds)).toString()
              existing.cpas = (Number(existing.cpas) + Number(r.cpas)).toString()
              existing.ngr = (Number(existing.ngr) + Number(r.ngr)).toString()
              existing.custo_repassado_cpa = (Number(existing.custo_repassado_cpa) + Number(r.custo_repassado_cpa)).toString()
              existing.custo_repassado_revshare = (Number(existing.custo_repassado_revshare) + Number(r.custo_repassado_revshare)).toString()
              existing.custo_repassado_total = (Number(existing.custo_repassado_total) + Number(r.custo_repassado_total)).toString()
              existing.lucro_liquido_cpa = (Number(existing.lucro_liquido_cpa) + Number(r.lucro_liquido_cpa)).toString()
              existing.lucro_liquido_revshare = (Number(existing.lucro_liquido_revshare) + Number(r.lucro_liquido_revshare)).toString()
              existing.lucro_liquido_total = (Number(existing.lucro_liquido_total) + Number(r.lucro_liquido_total)).toString()
              existing.casa_nome = 'Múltiplas Casas'
            } else {
              grouped.set(dateKey, { ...r, casa_nome: filterCasa ? r.casa_nome : 'Múltiplas Casas' })
            }
          }
          rows = Array.from(grouped.values())
        }
      }
    }
  }

  let influenciadoresLista: { id: string; nome_completo: string }[] = []
  
  if (myId) {
    const influenciadores = await prisma.public_users.findMany({
      where: {
        id_gerente: myId,
      },
      select: {
        id: true,
        nome_completo: true
      },
      orderBy: {
        nome_completo: 'asc'
      }
    })
    influenciadoresLista = influenciadores
  }

  // Totais
  const totals = rows.reduce(
    (acc, r) => ({
      cadastros: acc.cadastros + n(r.cadastros),
      ftds: acc.ftds + n(r.ftds),
      cpas: acc.cpas + n(r.cpas),
      ngr: acc.ngr + n(r.ngr),
      custo_repassado_total: acc.custo_repassado_total + n(r.custo_repassado_total),
      lucro_cpa: acc.lucro_cpa + n(r.lucro_liquido_cpa),
      lucro_rev: acc.lucro_rev + n(r.lucro_liquido_revshare),
      lucro_total: acc.lucro_total + n(r.lucro_liquido_total),
    }),
    { cadastros: 0, ftds: 0, cpas: 0, ngr: 0, custo_repassado_total: 0, lucro_cpa: 0, lucro_rev: 0, lucro_total: 0 }
  )

  const summaryCards = [
    { label: 'Cadastros', value: fmtNum(totals.cadastros), icon: 'person_add', color: 'var(--color-primary)' },
    { label: 'FTDs', value: fmtNum(totals.ftds), icon: 'trending_up', color: '#22D3A5' },
    { label: 'CPAs', value: fmtNum(totals.cpas), icon: 'target', color: '#f59e0b' },
    { label: 'NGR', value: fmt(totals.ngr), icon: 'ssid_chart', color: '#8b5cf6' },
    { label: 'Repasse Pago', value: fmt(totals.custo_repassado_total), icon: 'payments', color: '#F43F5E' },
    { label: 'Lucro Líq.', value: fmt(totals.lucro_total), icon: 'lan', color: '#22D3A5' },
  ]

  return (
    <div className="animate-fade-in flex flex-col gap-6 min-w-0 w-full max-w-full">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Produção</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Analytics de produção da rede (gerente → influencers)
        </p>
      </div>

      {/* Filters */}
      <ProducaoFilters
        influenciadores={influenciadoresLista}
        casas={casasParaFiltro}
        periodo={periodo}
        filterInfluenciador={filterInfluenciador}
        filterCasa={filterCasa}
        agrupamento={agrupamento}
        dataInicio={dataInicio}
        dataFim={dataFim}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
        {summaryCards.map((c, i) => (
          <div key={i} className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col gap-2 border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/50 transition-colors">
            <div className="flex items-center mb-1">
              <span className="material-symbols-outlined text-[22px]" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <span className="text-headline-lg font-bold tabular-nums tracking-tight leading-none" style={{ color: 'var(--color-on-surface)' }}>{c.value}</span>
            <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-widest">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Lucro split */}
      {totals.lucro_total > 0 && (
        <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
          <h3 className="text-headline-md text-[var(--color-on-surface)]">Lucro Líquido — CPA vs RevShare</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-[var(--color-surface-container-highest)] flex">
              <div className="h-full rounded-l-full" style={{ width: `${Math.round((totals.lucro_cpa / totals.lucro_total) * 100)}%`, background: '#f59e0b' }} />
              <div className="h-full rounded-r-full" style={{ width: `${Math.round((totals.lucro_rev / totals.lucro_total) * 100)}%`, background: '#06b6d4' }} />
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
              <span className="text-[var(--color-on-surface-variant)]">CPA:</span>
              <span className="font-semibold text-[var(--color-on-surface)]">{fmt(totals.lucro_cpa)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#06b6d4' }} />
              <span className="text-[var(--color-on-surface-variant)]">RevShare:</span>
              <span className="font-semibold text-[var(--color-on-surface)]">{fmt(totals.lucro_rev)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#F43F5E' }} />
              <span className="text-[var(--color-on-surface-variant)]">Repasse Pago:</span>
              <span className="font-semibold" style={{ color: '#F43F5E' }}>{fmt(totals.custo_repassado_total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Data table */}
      <ProducaoTable rows={rows} totals={totals} myId={myId} />
    </div>
  )
}
