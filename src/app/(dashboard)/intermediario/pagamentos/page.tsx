import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  AGUARDANDO_NF: { label: 'Aguardando NF', color: '#f59e0b' },
  PROCESSANDO:   { label: 'Processando',   color: '#3b82f6' },
  CONCLUIDO:     { label: 'Concluído',      color: '#22D3A5' },
  FALHA:         { label: 'Falha',          color: '#F43F5E' },
  MANUAL:        { label: 'Manual',         color: '#8b5cf6' },
}

type Saque = {
  id: string
  montante: string | number
  status: string
  pix_key: string | null
  created_at: string
  efetivado_at: string | null
  users: { nome_completo: string } | null
}

export default async function IntermediarioPagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tipo = 'recebidos' } = await searchParams

  const db = createAdminClient()

  const { data: publicUser } = await db
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  const myId = publicUser?.id ?? null

  // ── Nível 1: gerentes do intermediário ──────────────────────────────────
  const { data: gerentes } = myId
    ? await db
        .from('users')
        .select('id')
        .eq('id_intermediario', myId)
        .eq('ativo', true)
    : { data: [] }

  const gerenteIds = (gerentes ?? []).map((u: { id: string }) => u.id)

  // ── Nível 2: influencers dos gerentes ───────────────────────────────────
  let influencerIds: string[] = []
  if (gerenteIds.length > 0) {
    const { data: influencers } = await db
      .from('users')
      .select('id')
      .in('id_gerente', gerenteIds)
      .eq('ativo', true)
    influencerIds = (influencers ?? []).map((u: { id: string }) => u.id)
  }

  const redeIds = [...gerenteIds, ...influencerIds]

  // ── Produção total da rede (receita_bruta) ──────────────────────────────
  let comissaoTotalRede = 0
  if (influencerIds.length > 0) {
    const { data: prod } = await db
      .from('producao_dados')
      .select('receita_bruta')
      .in('id_usuario', influencerIds)
    for (const r of prod ?? []) comissaoTotalRede += Number(r.receita_bruta ?? 0)
  }

  // ── Saques dos influencers (repassados à rede) ──────────────────────────
  let comissaoInfluencers = 0
  if (influencerIds.length > 0) {
    const { data: saqInf } = await db
      .from('saques')
      .select('montante')
      .in('id_usuario', influencerIds)
      .eq('status', 'CONCLUIDO')
    for (const s of saqInf ?? []) comissaoInfluencers += Number(s.montante ?? 0)
  }

  const minhaComissao = comissaoTotalRede - comissaoInfluencers

  // ── Meus saques (recebidos da BLACKBOX) ─────────────────────────────────
  const { data: meusSaquesRaw } = myId
    ? await db
        .from('saques')
        .select('id, montante, status, pix_key, created_at, efetivado_at')
        .eq('id_usuario', myId)
        .order('created_at', { ascending: false })
    : { data: [] }

  const meusSaques = (meusSaquesRaw ?? []) as Omit<Saque, 'users'>[]

  // ── Saques da rede (gerentes + influencers) ─────────────────────────────
  const { data: saquesRedeRaw } = redeIds.length > 0
    ? await db
        .from('saques')
        .select('id, montante, status, pix_key, created_at, efetivado_at, users(nome_completo)')
        .in('id_usuario', redeIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const saquesRede = (saquesRedeRaw ?? []) as unknown as Saque[]

  // ── Histórico stats ──────────────────────────────────────────────────────
  const totalComissaoPaga = meusSaques
    .filter(s => s.status === 'CONCLUIDO')
    .reduce((a, s) => a + Number(s.montante), 0)

  const subsReceberam = saquesRede
    .filter(s => s.status === 'CONCLUIDO')
    .reduce((a, s) => a + Number(s.montante), 0)

  const saldoRecebido = totalComissaoPaga - subsReceberam

  const pendenteBB = meusSaques
    .filter(s => ['AGUARDANDO_NF', 'PROCESSANDO'].includes(s.status))
    .reduce((a, s) => a + Number(s.montante), 0)

  // ── Lista atual pela aba ─────────────────────────────────────────────────
  const listaAtual = tipo === 'repassados' ? saquesRede : meusSaques
  const countRecebidos  = meusSaques.length
  const countRepassados = saquesRede.length

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Histórico de Pagamentos</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Acompanhe todos os pagamentos recebidos e repassados
        </p>
      </div>

      {/* ── Comissões da Rede ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">group</span>
          <h2 className="text-headline-md text-[var(--color-on-surface)]">Comissões da Rede</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Comissão Total da Rede"       value={fmt(comissaoTotalRede)}  icon="group"              accent="#8B5CF6" sub="Produção de toda a rede" />
          <StatCard label="Comissão dos Afiliados" value={fmt(comissaoInfluencers)} icon="trending_up"        accent="#F59E0B" sub="Parte dos afiliados(as)" />
          <StatCard label="Sua Comissão (Intermediário)" value={fmt(minhaComissao)}       icon="workspace_premium"  accent="#22D3A5" sub="Total da Rede – Parte dos Afiliados(as)" />
        </div>
      </div>

      {/* ── Histórico de Pagamentos ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">payments</span>
          <h2 className="text-headline-md text-[var(--color-on-surface)]">Histórico de Pagamentos</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Comissão Paga" value={fmt(totalComissaoPaga)} sub="Da BLACKBOX"                    icon="download"                accent="#8B5CF6" />
          <StatCard label="Subs Receberam"      value={fmt(subsReceberam)}     sub="Pagos aos Afiliados(as)"  icon="upload"                  accent="#F59E0B" />
          <StatCard label="Saldo Recebido"      value={fmt(saldoRecebido)}     sub="Recebido – Repassado"           icon="account_balance_wallet"  accent="#22D3A5" />
          <StatCard label="Pendente BLACKBOX"   value={fmt(pendenteBB)}        sub="Ainda não pago"                 icon="schedule"                accent="#F59E0B" />
        </div>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 glass-card rounded-xl p-1 border border-[var(--color-outline-variant)] self-start">
        <Link
          href="?tipo=recebidos"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-label-md transition-colors ${
            tipo !== 'repassados'
              ? 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">download</span>
          Recebidos ({countRecebidos})
        </Link>
        <Link
          href="?tipo=repassados"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-label-md transition-colors ${
            tipo === 'repassados'
              ? 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]'
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">upload</span>
          Repassados ({countRepassados})
        </Link>
      </div>

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]" style={{ color: '#22D3A5' }}>
            {tipo === 'repassados' ? 'upload' : 'download'}
          </span>
          <h2 className="text-headline-md text-[var(--color-on-surface)]">
            {tipo === 'repassados' ? 'Pagamentos Repassados à Rede' : 'Pagamentos Recebidos da BLACKBOX'}
          </h2>
        </div>

        {listaAtual.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface-container-high)' }}>
              <span className="material-symbols-outlined text-[28px] opacity-40">inbox</span>
            </div>
            <p className="text-sm font-medium opacity-70">
              {tipo === 'repassados' ? 'Nenhum pagamento repassado ainda' : 'Nenhum pagamento recebido ainda'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="orbit-table w-full">
              <thead className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)]">
                <tr>
                  {tipo === 'repassados' && (
                    <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Afiliado</th>
                  )}
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Valor</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Chave PIX</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Solicitado</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Efetivado</th>
                  <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-outline-variant)]">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(listaAtual as any[]).map(s => {
                  const st = STATUS_MAP[s.status] ?? { label: s.status, color: '#64748b' }
                  return (
                    <tr key={s.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                      {tipo === 'repassados' && (
                        <td className="px-5 py-3 text-sm text-[var(--color-on-surface)]">
                          {s.users?.nome_completo ?? '—'}
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <span className="text-sm font-semibold tabular-nums text-[var(--color-on-surface)]">
                          {fmt(Number(s.montante))}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-[var(--color-on-surface-variant)] max-w-[140px] truncate">
                        {s.pix_key ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                        {s.efetivado_at
                          ? new Date(s.efetivado_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: st.color, background: `${st.color}18`, border: `1px solid ${st.color}33` }}
                        >
                          {st.label}
                        </span>
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
