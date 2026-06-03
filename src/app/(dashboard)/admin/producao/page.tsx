import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProducaoFilters from './ProducaoFilters'
import { AdminProducaoTable, AdminProducaoRow, AdminProducaoTotals } from './AdminProducaoTable'

export default async function AdminProducaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo   = now.toISOString().slice(0, 10)

  const from        = params.from       ?? defaultFrom
  const to          = params.to         ?? defaultTo
  const casaId      = params.casa_id    ?? ''
  const usuarioId   = params.usuario_id ?? ''
  const visao       = params.visao      ?? 'geral'
  const agrupamento = params.agrupamento ?? 'diaria'

  const db = createAdminClient()

  // ── Load filter dropdown data ──────────────────────────────────────────────
  let roleFilter: any = undefined
  if (visao === 'influenciador') roleFilter = 'INFLUENCER'
  if (visao === 'gerente') roleFilter = 'GERENTE'
  if (visao === 'intermediario') roleFilter = 'INTERMEDIARIO'

  const [casasResult, usuariosRaw, contratosRaw] = await Promise.all([
    db.from('casas_aposta').select('id, nome_exibicao').eq('ativo', true).order('nome_exibicao'),
    prisma.public_users.findMany({
      where: {
        ativo: true,
        ...(roleFilter ? { user_roles: { some: { role: roleFilter, ativo: true } } } : {})
      },
      select: { 
        id: true, 
        nome_completo: true, 
        email: true,
        user_roles: {
          where: { ativo: true },
          select: { role: true }
        }
      },
      orderBy: { nome_completo: 'asc' },
    }),
    prisma.contratos.findMany({
      select: {
        id: true,
        user_roles: {
          select: {
            users: {
              select: { id: true, nome_completo: true, email: true }
            }
          }
        }
      }
    })
  ])
  const casas   = casasResult.data ?? []
  const usuarios = usuariosRaw

  // Maps for joining names
  const casaMap = new Map<string, string>()
  for (const c of casas) casaMap.set(c.id, c.nome_exibicao)

  const userMap = new Map<string, string>()
  for (const u of usuarios) userMap.set(u.id, u.nome_completo ?? u.email)

  const contractUserMap = new Map<string, { id: string, name: string }>()
  for (const c of contratosRaw) {
    if (c.user_roles?.users) {
      contractUserMap.set(c.id, {
        id: c.user_roles.users.id,
        name: c.user_roles.users.nome_completo ?? c.user_roles.users.email
      })
    }
  }

  // ── Load production rows based on visao ────────────────────────────────────
  let rawRows: any[] = []

  const since = new Date(from)
  since.setTime(since.getTime() + new Date().getTimezoneOffset() * 60000)
  const until = new Date(to)
  until.setTime(until.getTime() + new Date().getTimezoneOffset() * 60000)

  // Fetch logic
  let filterContractIds: string[] | undefined = undefined

  if (usuarioId && visao !== 'geral') {
    const userRoles = await prisma.user_roles.findMany({
      where: {
        id_usuario: usuarioId,
        role: roleFilter
      },
      select: { id: true }
    })
    const userContracts = await prisma.contratos.findMany({
      where: { id_user_role: { in: userRoles.map(ur => ur.id) } },
      select: { id: true }
    })
    filterContractIds = userContracts.map(c => c.id)
  }

  if (visao === 'influenciador') {
    rawRows = await prisma.vw_producao_influencer.findMany({
      where: {
        data: { gte: since, lte: until },
        ...(casaId ? { id_casa: casaId } : {}),
        ...(filterContractIds !== undefined ? { id_contrato: { in: filterContractIds } } : {}),
      },
      orderBy: { data: 'desc' }
    })
  } else if (visao === 'gerente') {
    rawRows = await prisma.vw_producao_gerente.findMany({
      where: {
        data: { gte: since, lte: until },
        ...(casaId ? { id_casa: casaId } : {}),
        ...(filterContractIds !== undefined ? { id_contrato: { in: filterContractIds } } : {}),
      },
      orderBy: { data: 'desc' }
    })
  } else if (visao === 'intermediario') {
    rawRows = await prisma.vw_producao_intermediario.findMany({
      where: {
        data: { gte: since, lte: until },
        ...(casaId ? { id_casa: casaId } : {}),
        ...(filterContractIds !== undefined ? { id_contrato: { in: filterContractIds } } : {}),
      },
      orderBy: { data: 'desc' }
    })
  } else {
    // Geral -> producao_dados table
    rawRows = await prisma.producao_dados.findMany({
      where: {
        data: { gte: since, lte: until },
        ...(casaId ? { id_casa: casaId } : {}),
        ...(usuarioId ? { id_usuario: usuarioId } : {}),
      },
      orderBy: { data: 'desc' }
    })
  }

  // Filter specific user from views if needed (views might not have id_usuario directly in prisma mapped schema, wait, do they?
  // Our prisma views might not have id_usuario. Let's check: vw_producao_* uses id_contrato.
  // Actually, for admin, filtering by usuario on a view is tricky if the view doesn't return id_usuario.
  // The views (influencer, gerente, intermediario) group by id_contrato.
  // For now, if visao != geral, we skip the usuario filter unless we manually filter by contract.
  // Let's implement client-side mapping for the table first.

  let mappedRows: AdminProducaoRow[] = rawRows.map(r => {
    // Se for da tabela bruta, tem id_usuario direto. Senão, tenta achar pelo id_contrato.
    const cInfo = r.id_contrato ? contractUserMap.get(r.id_contrato) : null
    const uId = r.id_usuario ?? cInfo?.id ?? ''
    const uName = r.id_usuario ? (userMap.get(r.id_usuario) ?? r.id_usuario) : (cInfo?.name ?? '—')
    
    return {
      id_contrato: r.id_contrato ?? '',
      data: r.data ?? new Date(),
      id_casa: r.id_casa ?? '',
      cadastros: r.cadastros?.toString() ?? '0',
      ftds: r.ftds?.toString() ?? '0',
      valor_depositos: r.valor_depositos?.toString() ?? '0',
      redepositos: r.redepositos?.toString() ?? '0',
      valor_redepositos: r.valor_redepositos?.toString() ?? '0',
      cpas: r.cpas?.toString() ?? '0',
      ngr: r.ngr?.toString() ?? '0',

      receita_total_calculada: r.receita_total_calculada?.toString() ?? '0',
      repasse_pago_total: r.repasse_pago_total?.toString() ?? '0',
      custo_repassado_total: r.custo_repassado_total?.toString() ?? '0',
      lucro_liquido_total: r.lucro_liquido_total?.toString() ?? '0',
      receita_bruta: r.receita_bruta?.toString() ?? '0',

      casa_nome: r.id_casa ? (casaMap.get(r.id_casa) ?? r.id_casa) : '—',
      usuario_nome: uName
    }
  })

  // Agrupamento Acumulado
  if (agrupamento === 'acumulada') {
    const grouped = new Map<string, AdminProducaoRow>()
    for (const r of mappedRows) {
      const dateKey = r.data instanceof Date ? r.data.toISOString().slice(0, 10) : String(r.data)
      const existing = grouped.get(dateKey)
      if (existing) {
        existing.cadastros = (Number(existing.cadastros) + Number(r.cadastros)).toString()
        existing.ftds = (Number(existing.ftds) + Number(r.ftds)).toString()
        existing.valor_depositos = (Number(existing.valor_depositos) + Number(r.valor_depositos)).toString()
        existing.redepositos = (Number(existing.redepositos) + Number(r.redepositos)).toString()
        existing.valor_redepositos = (Number(existing.valor_redepositos) + Number(r.valor_redepositos)).toString()
        existing.cpas = (Number(existing.cpas) + Number(r.cpas)).toString()
        existing.ngr = (Number(existing.ngr) + Number(r.ngr)).toString()
        
        existing.receita_total_calculada = (Number(existing.receita_total_calculada) + Number(r.receita_total_calculada)).toString()
        existing.repasse_pago_total = (Number(existing.repasse_pago_total) + Number(r.repasse_pago_total)).toString()
        existing.custo_repassado_total = (Number(existing.custo_repassado_total) + Number(r.custo_repassado_total)).toString()
        existing.lucro_liquido_total = (Number(existing.lucro_liquido_total) + Number(r.lucro_liquido_total)).toString()
        existing.receita_bruta = (Number(existing.receita_bruta) + Number(r.receita_bruta)).toString()

        existing.casa_nome = 'Múltiplas Casas'
        existing.usuario_nome = 'Múltiplos Usuários'
      } else {
        grouped.set(dateKey, { ...r, casa_nome: casaId ? r.casa_nome : 'Múltiplas Casas', usuario_nome: usuarioId ? r.usuario_nome : 'Múltiplos Usuários' })
      }
    }
    mappedRows = Array.from(grouped.values())
  }

  // Totals
  const totals: AdminProducaoTotals = {
    cadastros: 0, ftds: 0, valor_depositos: 0, redepositos: 0, valor_redepositos: 0, cpas: 0, ngr: 0,
    receita_total_calculada: 0, repasse_pago_total: 0, custo_repassado_total: 0, lucro_liquido_total: 0, receita_bruta: 0
  }

  for (const r of mappedRows) {
    totals.cadastros += Number(r.cadastros)
    totals.ftds += Number(r.ftds)
    totals.valor_depositos += Number(r.valor_depositos)
    totals.redepositos += Number(r.redepositos)
    totals.valor_redepositos += Number(r.valor_redepositos)
    totals.cpas += Number(r.cpas)
    totals.ngr += Number(r.ngr)
    totals.receita_total_calculada! += Number(r.receita_total_calculada)
    totals.repasse_pago_total! += Number(r.repasse_pago_total)
    totals.custo_repassado_total! += Number(r.custo_repassado_total)
    totals.lucro_liquido_total! += Number(r.lucro_liquido_total)
    totals.receita_bruta! += Number(r.receita_bruta)
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-lg text-[var(--color-on-surface)]">Produção</h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)] mt-0.5">
            Relatório de produção unificado e comissões do sistema
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        </div>
      </div>

      {/* Filters */}
      <ProducaoFilters
        from={from}
        to={to}
        casaId={casaId}
        usuarioId={usuarioId}
        visao={visao}
        agrupamento={agrupamento}
        casas={casas ?? []}
        usuarios={usuarios as any[]}
        totalRows={rawRows.length}
      />

      {/* Table */}
      <AdminProducaoTable 
        visao={visao}
        rows={mappedRows}
        totals={totals}
      />
    </div>
  )
}
