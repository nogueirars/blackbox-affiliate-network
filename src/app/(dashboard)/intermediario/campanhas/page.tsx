import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CopyButton } from './CopyButton'

const BASE_URL = 'https://aff.blackboxinfluencers.com/auth?ref='

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function IntermediarioCampanhasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  const { data: publicUser } = await db
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  const myId = publicUser?.id ?? null
  const refCode = publicUser?.id?.slice(0, 8) ?? ''
  const linkPadrao = `${BASE_URL}${refCode}`

  // Nível 1: todos os gerentes (todas as aprovações)
  const { data: gerentes } = myId
    ? await db
        .from('users')
        .select('id, status_aprovacao')
        .eq('id_intermediario', myId)
        .eq('ativo', true)
    : { data: [] }

  const totalCadastros = (gerentes ?? []).length
  const cadastrosAprovados = (gerentes ?? []).filter(
    (u: { status_aprovacao: string }) => u.status_aprovacao === 'APROVADO'
  ).length

  // Nível 2: influencers dos gerentes aprovados
  const gerenteIdsAprovados = (gerentes ?? [])
    .filter((u: { status_aprovacao: string }) => u.status_aprovacao === 'APROVADO')
    .map((u: { id: string }) => u.id)

  let totalCPAs = 0
  let totalReceita = 0

  if (gerenteIdsAprovados.length > 0) {
    const { data: influencers } = await db
      .from('users')
      .select('id')
      .in('id_gerente', gerenteIdsAprovados)
      .eq('ativo', true)
      .eq('status_aprovacao', 'APROVADO')

    const influencerIds = (influencers ?? []).map((u: { id: string }) => u.id)

    if (influencerIds.length > 0) {
      const { data: prod } = await db
        .from('producao_dados')
        .select('cpas, receita_bruta')
        .in('id_usuario', influencerIds)

      for (const row of prod ?? []) {
        totalCPAs    += row.cpas ?? 0
        totalReceita += Number(row.receita_bruta ?? 0)
      }
    }
  }

  const metricCards = [
    {
      label: 'Total Campanhas',
      value: '0',
      sub: 'campanhas ativas',
      icon: 'campaign',
    },
    {
      label: 'Total Cadastros',
      value: String(totalCadastros),
      sub: `${cadastrosAprovados} aprovados`,
      icon: 'group_add',
    },
    {
      label: 'CPAs Gerados',
      value: String(totalCPAs),
      sub: 'conversões totais',
      icon: 'trending_up',
    },
    {
      label: 'Ganho Estimado',
      value: fmt(totalReceita),
      sub: 'diferença de comissão',
      icon: 'attach_money',
    },
  ]

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Campanhas</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Gerencie suas campanhas de recrutamento e acompanhe métricas
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((c, i) => (
          <div key={i} className="glass-card p-5 rounded-2xl flex flex-col gap-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-md text-[var(--color-on-surface-variant)]">{c.label}</span>
              <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">{c.icon}</span>
            </div>
            <div className="text-headline-lg font-bold tabular-nums text-[var(--color-on-surface)]">
              {c.value}
            </div>
            <p className="text-label-md text-[var(--color-on-surface-variant)] opacity-70">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Suas Campanhas header */}
      <div className="flex items-center justify-between">
        <h2 className="text-headline-md text-[var(--color-on-surface)]">Suas Campanhas</h2>
        <button
          disabled
          title="Em breve"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white opacity-50 cursor-not-allowed"
          style={{ background: 'var(--color-primary)' }}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nova Campanha
        </button>
      </div>

      {/* Link Padrão */}
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(2,117,243,0.12)', border: '1px solid rgba(2,117,243,0.2)' }}
          >
            <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">link</span>
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-on-surface)]">Link Padrão (sem campanha)</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">Use para convites sem rastreamento específico</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]">
          <span className="text-xs font-mono text-[var(--color-on-surface-variant)] truncate flex-1 select-all">
            {linkPadrao}
          </span>
          <CopyButton text={linkPadrao} />
        </div>
      </div>

      {/* Empty state */}
      <div className="glass-card rounded-2xl py-20 flex flex-col items-center gap-4 text-center px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-surface-container-high)' }}
        >
          <span className="material-symbols-outlined text-[32px] text-[var(--color-on-surface-variant)] opacity-50">
            inbox
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-on-surface)]">Nenhuma campanha criada</p>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 max-w-xs">
            Crie campanhas para rastrear a origem dos seus sub-afiliados
          </p>
        </div>
        <button
          disabled
          title="Em breve"
          className="px-5 py-2 rounded-xl text-sm font-medium border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] opacity-50 cursor-not-allowed"
        >
          Criar Primeira Campanha
        </button>
      </div>
    </div>
  )
}
