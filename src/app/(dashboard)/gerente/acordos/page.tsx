import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AcordosClient from './components/AcordosClient'

export type HistoricoTermos = {
  id: string
  data_inicio: string
  data_fim: string | null
  cpa_bruto: number | null
  revshare_percentual: number | null
}

export type SubContrato = {
  id: string
  historico: HistoricoTermos | null
  historicoList: HistoricoTermos[]
}

export type Acordo = {
  id: string
  tipo_contrato: string
  casa: { id: string; nome_exibicao: string; icone_url: string | null }
  historico: HistoricoTermos | null
  historicoList: HistoricoTermos[]
}

export type Influencer = {
  id: string
  nome_completo: string
  email: string
  user_role_id: string
  subContratos: Record<string, SubContrato>
}

export default async function GerenteAcordosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const emptyState = (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)] mb-1">Acordos Comerciais</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)]">
          Contratos com a BLACKBOX e repasses para sua rede de influenciadores
        </p>
      </div>
      <AcordosClient acordos={[]} influencers={[]} />
    </div>
  )

  function serializeH(h: { id: string; data_inicio: Date; data_fim: Date | null; cpa_bruto: { toNumber(): number } | null; revshare_percentual: { toNumber(): number } | null }): HistoricoTermos {
    return {
      id: h.id,
      data_inicio: h.data_inicio.toISOString(),
      data_fim: h.data_fim ? h.data_fim.toISOString() : null,
      cpa_bruto: h.cpa_bruto ? h.cpa_bruto.toNumber() : null,
      revshare_percentual: h.revshare_percentual ? h.revshare_percentual.toNumber() : null,
    }
  }

  let acordos: Acordo[] = []
  let influencers: Influencer[] = []

  try {
    const gerente = await prisma.public_users.findUnique({
      where: { auth_id: user.id },
      select: { id: true }
    })

    if (!gerente) {
      return emptyState
    }

    const gerenteRole = await prisma.user_roles.findFirst({
      where: { id_usuario: gerente.id, role: 'GERENTE', ativo: true },
      select: { id: true }
    })

    if (!gerenteRole) {
      return emptyState
    }

    const rawContratos = await prisma.contratos.findMany({
      where: { id_user_role: gerenteRole.id, ativo: true },
      include: {
        casas_aposta: { select: { id: true, nome_exibicao: true, icone_url: true } },
        historico_contratos: {
          orderBy: { data_inicio: 'desc' }
        }
      }
    })

    acordos = rawContratos.map(c => {
      const ativo = c.historico_contratos.find(h => h.ativo) ?? null
      return {
        id: c.id,
        tipo_contrato: c.tipo_contrato,
        casa: {
          id: c.casas_aposta.id,
          nome_exibicao: c.casas_aposta.nome_exibicao,
          icone_url: c.casas_aposta.icone_url ?? null
        },
        historico: ativo ? serializeH(ativo) : null,
        historicoList: c.historico_contratos.map(serializeH),
      }
    })

    const acordoIds = acordos.map(a => a.id)

    const rawInfluencers = await prisma.public_users.findMany({
      where: { id_gerente: gerente.id, ativo: true },
      select: {
        id: true,
        nome_completo: true,
        email: true,
        user_roles: {
          where: { role: 'INFLUENCER', ativo: true },
          select: { id: true }
        }
      }
    })

    const filteredInfluencers = rawInfluencers.filter(u => u.user_roles.length > 0)

    influencers = await Promise.all(
      filteredInfluencers.map(async u => {
        const influencerRoleId = u.user_roles[0].id

        const subContratosRaw = acordoIds.length > 0
          ? await prisma.contratos.findMany({
              where: {
                id_contrato_pai: { in: acordoIds },
                id_user_role: influencerRoleId,
                ativo: true
              },
              include: {
                historico_contratos: {
                  orderBy: { data_inicio: 'desc' }
                }
              }
            })
          : []

        const subContratos: Record<string, SubContrato> = {}
        for (const sc of subContratosRaw) {
          if (!sc.id_contrato_pai) continue
          const ativo = sc.historico_contratos.find(h => h.ativo) ?? null
          subContratos[sc.id_contrato_pai] = {
            id: sc.id,
            historico: ativo ? serializeH(ativo) : null,
            historicoList: sc.historico_contratos.map(serializeH),
          }
        }

        return {
          id: u.id,
          nome_completo: u.nome_completo,
          email: u.email,
          user_role_id: influencerRoleId,
          subContratos
        }
      })
    )
  } catch (e) {
    console.error('[gerente/acordos] prisma error:', e)
    return emptyState
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)] mb-1">Acordos Comerciais</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)]">
          Contratos com a BLACKBOX e repasses para sua rede de influenciadores
        </p>
      </div>
      <AcordosClient acordos={acordos} influencers={influencers} />
    </div>
  )
}
