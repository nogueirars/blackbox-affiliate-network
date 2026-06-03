import { prisma } from '@/lib/prisma'
import { user_role } from '@prisma/client'

export type ProfileType = 'influenciador' | 'gerente' | 'intermediario'

export async function getTransparenciaData(userId: string, profile: ProfileType) {
  // 1. Get user roles
  let role: user_role = 'INFLUENCER'
  if (profile === 'gerente') role = 'GERENTE'
  if (profile === 'intermediario') role = 'INTERMEDIARIO'

  const userRole = await prisma.user_roles.findFirst({
    where: { id_usuario: userId, role },
    select: { id: true, contratos: { select: { id: true, id_casa: true } } }
  })

  if (!userRole) return []

  const contratoIds = userRole.contratos.map(c => c.id)
  if (contratoIds.length === 0) return []

  // 3. Fetch from views based on profile
  let data: any[] = []

  if (profile === 'influenciador') {
    data = await prisma.vw_producao_influencer.findMany({
      where: { id_contrato: { in: contratoIds } },
      orderBy: { data: 'desc' }
    })
  } else if (profile === 'gerente') {
    data = await prisma.vw_producao_gerente.findMany({
      where: { id_contrato: { in: contratoIds } },
      orderBy: { data: 'desc' }
    })
  } else if (profile === 'intermediario') {
    data = await prisma.vw_producao_intermediario.findMany({
      where: { id_contrato: { in: contratoIds } },
      orderBy: { data: 'desc' }
    })
  }

  // 4. Fetch total received per casa for this user (Saques Concluídos/Manuais)
  const saquesItensRaw = await prisma.saques_itens.findMany({
    where: {
      saque: {
        id_usuario: userId,
        status: { in: ['CONCLUIDO', 'MANUAL'] }
      }
    },
    select: {
      id_casa: true,
      montante: true
    }
  })

  const recebidoMap = new Map<string, number>()
  for (const item of saquesItensRaw) {
    const current = recebidoMap.get(item.id_casa) || 0
    recebidoMap.set(item.id_casa, current + Number(item.montante || 0))
  }

  // 5. Group by casa
  const casasData = new Map<string, any>()

  for (const row of data) {
    if (!row.id_casa) continue
    if (!casasData.has(row.id_casa)) {
      casasData.set(row.id_casa, {
        id_casa: row.id_casa,
        vigencias: [],
        resumo: {
          comissao_bruta: 0,
          lucro_rede: 0, // Apenas para gerente/intermediario
          repasse_pago: 0 // Apenas para gerente/intermediario
        }
      })
    }
    const casa = casasData.get(row.id_casa)

    // Agrupamento simples: Cada linha (dia) pode ser consolidada ou exibida separada.
    // Como a view retorna por dia e contrato, vamos adicionar ao array de vigencias/produção.
    casa.vigencias.push(row)
    
    if (profile === 'influenciador') {
      casa.resumo.comissao_bruta += Number(row.receita_total_calculada || 0)
    } else if (profile === 'gerente') {
      casa.resumo.repasse_pago += Number(row.repasse_pago_total || 0)
      casa.resumo.lucro_rede += Number(row.lucro_liquido_total || 0)
      casa.resumo.comissao_bruta += (Number(row.repasse_pago_total || 0) + Number(row.lucro_liquido_total || 0))
    } else if (profile === 'intermediario') {
      // vw_producao_intermediario usa custo_repassado_total (não repasse_pago_total)
      casa.resumo.repasse_pago += Number(row.custo_repassado_total || 0)
      casa.resumo.lucro_rede += Number(row.lucro_liquido_total || 0)
      casa.resumo.comissao_bruta += (Number(row.custo_repassado_total || 0) + Number(row.lucro_liquido_total || 0))
    }
  }

  // Obter nomes e ícones das casas
  const casasDetails = await prisma.casas_aposta.findMany({
    where: { id: { in: Array.from(casasData.keys()) } },
    select: { id: true, nome_exibicao: true, icone_url: true }
  })

  const result = casasDetails.map(c => {
    const d = casasData.get(c.id)
    const recebido = recebidoMap.get(c.id) || 0
    const aReceber = d.resumo.comissao_bruta - recebido

    // Aggregate vigencias by id_contrato or month to be displayed in the UI
    const vigenciasAgrupadas = aggregateVigencias(d.vigencias, profile)

    return {
      casa: c,
      resumo: {
        ...d.resumo,
        recebido,
        a_receber: aReceber < 0 ? 0 : aReceber
      },
      vigencias: vigenciasAgrupadas
    }
  })

  return JSON.parse(JSON.stringify(result, (_, value) => {
    if (typeof value === 'bigint') return Number(value)
    if (value !== null && typeof value === 'object' && value.constructor?.name === 'Decimal') return Number(value)
    return value
  }))
}

function aggregateVigencias(vigencias: any[], profile: ProfileType) {
  // Agrupa os dias trabalhados por id_contrato
  const map = new Map<string, any>()

  for (const v of vigencias) {
    if (!v.id_contrato) continue
    if (!map.has(v.id_contrato)) {
      map.set(v.id_contrato, {
        id_contrato: v.id_contrato,
        data_inicio: v.data,
        data_fim: v.data,
        dias_count: 0,
        total_cpas: 0,
        total_comissao: 0,
        lucro_rede: 0,
        repasse_rede: 0
      })
    }
    const ag = map.get(v.id_contrato)

    if (v.data < ag.data_inicio) ag.data_inicio = v.data
    if (v.data > ag.data_fim) ag.data_fim = v.data

    ag.dias_count += 1
    ag.total_cpas += Number(v.cpas || 0)
    
    if (profile === 'influenciador') {
      ag.total_comissao += Number(v.receita_total_calculada || 0)
    } else if (profile === 'gerente') {
      ag.total_comissao += (Number(v.repasse_pago_total || 0) + Number(v.lucro_liquido_total || 0))
      ag.lucro_rede += Number(v.lucro_liquido_total || 0)
      ag.repasse_rede += Number(v.repasse_pago_total || 0)
    } else if (profile === 'intermediario') {
      ag.total_comissao += (Number(v.custo_repassado_total || 0) + Number(v.lucro_liquido_total || 0))
      ag.lucro_rede += Number(v.lucro_liquido_total || 0)
      ag.repasse_rede += Number(v.custo_repassado_total || 0)
    }
  }

  // Retorna ordenado pela data mais recente
  return Array.from(map.values()).sort((a, b) => b.data_fim.getTime() - a.data_fim.getTime())
}
