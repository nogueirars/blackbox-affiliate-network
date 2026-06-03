import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import FinanceiroVisaoGeralClient from './FinanceiroVisaoGeralClient'

export default async function AdminFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const periodo = (params.periodo ?? 'mes_atual') as 'mes_atual' | 'acumulado' | 'por_periodo'

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)

  let dateFrom: Date
  let dateTo: Date = now

  if (periodo === 'mes_atual') {
    dateFrom = defaultFrom
  } else if (periodo === 'acumulado') {
    dateFrom = new Date(2020, 0, 1)
  } else {
    dateFrom = params.from ? new Date(params.from) : defaultFrom
    dateTo   = params.to   ? new Date(params.to)   : now
  }

  const dateFilter: Prisma.producao_dadosWhereInput = periodo === 'acumulado'
    ? {}
    : { data: { gte: dateFrom, lte: dateTo } }

  const [
    roleCounts,
    producaoStats,
    producaoAtivos,
    saquesStats,
    influencersRaw,
    casas,
  ] = await Promise.all([
    prisma.user_roles.groupBy({
      by: ['role'],
      where: { ativo: true },
      _count: { id: true },
    }),
    prisma.producao_dados.aggregate({
      where: dateFilter,
      _sum: {
        cadastros: true, ftds: true, cpas: true,
        ngr: true, receita_bruta: true, receita_cpa: true, receita_rev: true,
      },
    }),
    prisma.producao_dados.aggregate({
      where: { ...dateFilter, contratos: { user_roles: { ativo: true } } },
      _sum: { receita_bruta: true },
    }),
    prisma.saques.groupBy({
      by: ['status'],
      where: { ativo: true },
      _sum: { montante: true },
      _count: { id: true },
    }),
    prisma.public_users.findMany({
      where: {
        ativo: true,
        user_roles: { some: { role: 'AFILIADO' as never, ativo: true } },
      },
      select: {
        id: true,
        nome_completo: true,
        email: true,
        user_roles: {
          where: { role: 'AFILIADO' as never, ativo: true },
          select: {
            contratos: {
              where: { ativo: true },
              select: {
                tipo_contrato: true,
                producao_dados: {
                  where: dateFilter,
                  select: { receita_bruta: true },
                },
              },
            },
          },
          take: 1,
        },
        saques: {
          where: { ativo: true },
          select: { montante: true, status: true },
        },
      },
      orderBy: { nome_completo: 'asc' },
    }),
    prisma.casas_aposta.findMany({
      where: { ativo: true },
      select: { id: true, nome_exibicao: true },
      orderBy: { nome_exibicao: 'asc' },
    }),
  ])

  const countInfluencer    = roleCounts.find(r => r.role === 'AFILIADO')?._count.id    ?? 0
  const countIntermediario = roleCounts.find(r => r.role === 'INTERMEDIARIO')?._count.id ?? 0
  const countGerente       = roleCounts.find(r => r.role === 'GERENTE')?._count.id       ?? 0

  const cadastros    = Number(producaoStats._sum.cadastros    ?? 0)
  const ftds         = Number(producaoStats._sum.ftds         ?? 0)
  const cpas         = Number(producaoStats._sum.cpas         ?? 0)
  const ngr          = Number(producaoStats._sum.ngr          ?? 0)
  const receitaBruta = Number(producaoStats._sum.receita_bruta ?? 0)
  const receitaCpa   = Number(producaoStats._sum.receita_cpa  ?? 0)
  const receitaRev   = Number(producaoStats._sum.receita_rev  ?? 0)
  const receitaAtivos   = Number(producaoAtivos._sum.receita_bruta ?? 0)
  const receitaInativos = receitaBruta - receitaAtivos

  const pendenteStat = saquesStats.filter(s =>
    ['AGUARDANDO_NF', 'PROCESSANDO'].includes(s.status as string)
  )
  const totalPendente = pendenteStat.reduce((a, s) => a + Number(s._sum.montante ?? 0), 0)
  const concluidoStat = saquesStats.find(s => s.status === 'CONCLUIDO')
  const totalPago     = Number(concluidoStat?._sum.montante ?? 0)

  const influencers = influencersRaw.map(u => {
    const producaoTotal = (u.user_roles[0]?.contratos ?? [])
      .flatMap(c => c.producao_dados)
      .reduce((a, p) => a + Number(p.receita_bruta), 0)
    const saquesPagos   = u.saques
      .filter(s => s.status === 'CONCLUIDO')
      .reduce((a, s) => a + Number(s.montante), 0)
    const saquesLiberados = u.saques
      .filter(s => ['AGUARDANDO_NF', 'PROCESSANDO'].includes(s.status as string))
      .reduce((a, s) => a + Number(s.montante), 0)
    const tipo = u.user_roles[0]?.contratos[0]?.tipo_contrato
    return {
      id:              u.id,
      nome:            u.nome_completo,
      email:           u.email,
      tipo:            tipo ? String(tipo) : null,
      producaoTotal,
      comissaoLiberada: saquesLiberados + saquesPagos,
      comissaoPaga:     saquesPagos,
      saldo:            saquesLiberados,
    }
  })

  return (
    <FinanceiroVisaoGeralClient
      periodo={periodo}
      fromStr={params.from ?? ''}
      toStr={params.to ?? ''}
      countInfluencer={countInfluencer}
      countIntermediario={countIntermediario}
      countGerente={countGerente}
      cadastros={cadastros}
      ftds={ftds}
      cpas={cpas}
      ngr={ngr}
      receitaBruta={receitaBruta}
      receitaCpa={receitaCpa}
      receitaRev={receitaRev}
      receitaAtivos={receitaAtivos}
      receitaInativos={receitaInativos}
      totalPendente={totalPendente}
      totalPago={totalPago}
      influencers={influencers}
      casas={casas}
    />
  )
}
