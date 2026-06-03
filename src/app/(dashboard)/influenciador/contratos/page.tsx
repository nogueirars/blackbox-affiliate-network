import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ContratosClient } from './ContratosClient'

export default async function InfluenciadorContratosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contratosQuery = (publicUserId: string) => prisma.contratos.findMany({
    where: {
      ativo: true,
      user_roles: { id_usuario: publicUserId, ativo: true },
    },
    select: {
      id: true,
      afp: true,
      link_afiliacao: true,
      tipo_contrato: true,
      created_at: true,
      id_casa: true,
      casas_aposta: { select: { id: true, nome_exibicao: true, icone_url: true, affiliate_url: true } },
      historico_contratos: {
        orderBy: { data_inicio: 'desc' },
        select: {
          id: true,
          data_inicio: true,
          data_fim: true,
          cpa_bruto: true,
          aliquota_imposto: true,
          revshare_percentual: true,
          revshare_repasse: true,
          ativo: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  let contratos: Awaited<ReturnType<typeof contratosQuery>> = []

  try {
    const publicUser = await prisma.public_users.findUnique({
      where: { auth_id: user.id },
      select: { id: true },
    })

    contratos = publicUser ? await contratosQuery(publicUser.id) : []
  } catch (e) {
    console.error('[influenciador/contratos] prisma error:', e)
    contratos = []
  }

  // Serialize Decimal/Date fields for client component
  const contratosSerial = contratos.map(c => ({
    ...c,
    link_afiliacao: c.link_afiliacao ?? null,
    created_at: c.created_at.toISOString(),
    historico_contratos: c.historico_contratos.map(h => ({
      ...h,
      data_inicio: h.data_inicio.toISOString(),
      data_fim: h.data_fim?.toISOString() ?? null,
      cpa_bruto: h.cpa_bruto ? Number(h.cpa_bruto) : null,
      aliquota_imposto: h.aliquota_imposto ? Number(h.aliquota_imposto) : null,
      revshare_percentual: h.revshare_percentual ? Number(h.revshare_percentual) : null,
      revshare_repasse: h.revshare_repasse ? Number(h.revshare_repasse) : null,
    })),
  }))

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Contratos</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Seus contratos ativos com casas de apostas
        </p>
      </div>

      {contratos.length === 0 ? (
        <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[48px] opacity-30">description</span>
          <p className="text-sm font-medium opacity-60">Nenhum contrato ativo</p>
          <p className="text-xs opacity-40">Seus contratos com casas de apostas aparecerão aqui.</p>
        </div>
      ) : (
        <ContratosClient contratos={contratosSerial} />
      )}
    </div>
  )
}
