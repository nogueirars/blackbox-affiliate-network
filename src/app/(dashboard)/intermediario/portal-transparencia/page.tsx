import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type ProdRow = {
  data: string
  cadastros: number
  ftds: number
  cpas: number
  receita_cpa: number
  receita_rev: number
  receita_bruta: number
  casas_aposta: { nome_exibicao: string } | null
}

export default async function IntermediarioPortalTransparenciaPage() {
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

  // ── Nível 1: gerentes ───────────────────────────────────────────────────
  const { data: gerentes } = myId
    ? await db
        .from('users')
        .select('id, status_aprovacao')
        .eq('id_intermediario', myId)
        .eq('ativo', true)
    : { data: [] }

  const gerenteIdsAprovados = (gerentes ?? [])
    .filter((u: { status_aprovacao: string }) => u.status_aprovacao === 'APROVADO')
    .map((u: { id: string }) => u.id)

  // ── Nível 2: influencers ────────────────────────────────────────────────
  let influencerIds: string[] = []
  if (gerenteIdsAprovados.length > 0) {
    const { data: influencers } = await db
      .from('users')
      .select('id')
      .in('id_gerente', gerenteIdsAprovados)
      .eq('ativo', true)
      .eq('status_aprovacao', 'APROVADO')
    influencerIds = (influencers ?? []).map((u: { id: string }) => u.id)
  }

  // ── Produção da rede (via influencers) ──────────────────────────────────
  let producaoRede: ProdRow[] = []
  if (influencerIds.length > 0) {
    const { data } = await db
      .from('producao_dados')
      .select('data, cadastros, ftds, cpas, receita_cpa, receita_rev, receita_bruta, casas_aposta(nome_exibicao)')
      .in('id_usuario', influencerIds)
      .order('data', { ascending: false })
    producaoRede = (data ?? []) as unknown as ProdRow[]
  }

  // ── Saques deste intermediário ──────────────────────────────────────────
  const { data: meusSaques } = myId
    ? await db
        .from('saques')
        .select('montante, status')
        .eq('id_usuario', myId)
    : { data: [] }

  const saques = meusSaques ?? []

  // ── Totais ──────────────────────────────────────────────────────────────
  const totalComissao = producaoRede.reduce((a, r) => a + Number(r.receita_bruta ?? 0), 0)

  // Saques com FALHA = valor perdido/estornado (único proxy disponível no DB)
  const totalEstornado = saques
    .filter((s: { status: string }) => s.status === 'FALHA')
    .reduce((a: number, s: { montante: string | number }) => a + Number(s.montante ?? 0), 0)

  const totalRecebido = saques
    .filter((s: { status: string }) => s.status === 'CONCLUIDO')
    .reduce((a: number, s: { montante: string | number }) => a + Number(s.montante ?? 0), 0)
  const totalAReceber = Math.max(0, totalComissao - totalRecebido)

  // ── Totais produção ─────────────────────────────────────────────────────
  const totProd = producaoRede.reduce(
    (acc, r) => ({
      cadastros:     acc.cadastros    + (r.cadastros    ?? 0),
      ftds:          acc.ftds         + (r.ftds         ?? 0),
      cpas:          acc.cpas         + (r.cpas         ?? 0),
      receita_cpa:   acc.receita_cpa  + Number(r.receita_cpa  ?? 0),
      receita_rev:   acc.receita_rev  + Number(r.receita_rev  ?? 0),
      receita_bruta: acc.receita_bruta + Number(r.receita_bruta ?? 0),
    }),
    { cadastros: 0, ftds: 0, cpas: 0, receita_cpa: 0, receita_rev: 0, receita_bruta: 0 }
  )

  return (
    <div className="animate-fade-in flex flex-col gap-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ color: '#8b5cf6' }}>shield</span>
          </div>
          <div>
            <h1 className="text-display-lg text-[var(--color-on-surface)]">Portal de Transparência</h1>
            <p className="text-body-md text-[var(--color-on-surface-variant)] mt-0.5">
              Visualização completa e detalhada de toda sua atividade financeira
            </p>
          </div>
        </div>
        <button
          disabled
          title="Em breve"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] opacity-50 cursor-not-allowed flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Exportar PDF
        </button>
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Comissão',  value: fmt(totalComissao),  icon: 'attach_money', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)'  },
          { label: 'Total Estornado', value: fmt(totalEstornado), icon: 'warning',      color: '#F43F5E', bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.3)'  },
          { label: 'Total Recebido',  value: fmt(totalRecebido),  icon: 'payments',     color: '#22D3A5', bg: 'rgba(34,211,165,0.10)', border: 'rgba(34,211,165,0.3)' },
          { label: 'Total a Receber', value: fmt(totalAReceber),  icon: 'schedule',     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)' },
        ].map((c, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl flex flex-col gap-1"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[16px]" style={{ color: c.color }}>{c.icon}</span>
              <span className="text-label-md text-[var(--color-on-surface-variant)]">{c.label}</span>
            </div>
            <span className="text-headline-lg font-bold tabular-nums" style={{ color: c.color }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Produção Própria / Rede */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[16px]" style={{ color: '#22D3A5' }}>trending_up</span>
          <span className="text-label-md font-bold tracking-wider uppercase text-[var(--color-on-surface)]">
            Produção da Rede
          </span>
          <span className="text-label-md font-bold tabular-nums" style={{ color: '#22D3A5' }}>
            {fmt(totProd.receita_bruta)}
          </span>
        </div>

        {producaoRede.length === 0 ? (
          <div
            className="rounded-2xl py-16 flex items-center justify-center border"
            style={{ background: 'var(--color-surface-container)', borderColor: 'var(--color-outline-variant)' }}
          >
            <p className="text-sm text-[var(--color-on-surface-variant)] opacity-60">
              Nenhum dado de produção encontrado.
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Resumo produção */}
            <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-[var(--color-outline-variant)]">
              {[
                { label: 'Cadastros',    value: String(totProd.cadastros),       color: 'var(--color-primary)' },
                { label: 'FTDs',         value: String(totProd.ftds),            color: '#22D3A5' },
                { label: 'CPAs',         value: String(totProd.cpas),            color: '#f59e0b' },
                { label: 'CPA (R$)',     value: fmt(totProd.receita_cpa),        color: '#f59e0b' },
                { label: 'Rev (R$)',     value: fmt(totProd.receita_rev),        color: '#06b6d4' },
                { label: 'Bruto',        value: fmt(totProd.receita_bruta),      color: '#22D3A5' },
              ].map((s, i) => (
                <div key={i} className="p-4 text-center border-r border-[var(--color-outline-variant)] last:border-r-0">
                  <p className="text-label-md text-[var(--color-on-surface-variant)] mb-1">{s.label}</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Tabela de linhas */}
            <div className="overflow-x-auto">
              <table className="orbit-table w-full">
                <thead className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)]">
                  <tr>
                    <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Data</th>
                    <th className="text-left px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Casa</th>
                    <th className="text-right px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Regs</th>
                    <th className="text-right px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">FTDs</th>
                    <th className="text-right px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">CPAs</th>
                    <th className="text-right px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">CPA (R$)</th>
                    <th className="text-right px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Rev (R$)</th>
                    <th className="text-right px-5 py-3 text-label-md text-[var(--color-on-surface-variant)]">Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-outline-variant)]">
                  {producaoRede.map((r, i) => (
                    <tr key={i} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                      <td className="px-5 py-3 text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                        {new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--color-on-surface-variant)]">
                        {r.casas_aposta?.nome_exibicao ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-sm tabular-nums text-right text-[var(--color-on-surface)]">{r.cadastros}</td>
                      <td className="px-5 py-3 text-sm tabular-nums text-right text-[var(--color-on-surface)]">{r.ftds}</td>
                      <td className="px-5 py-3 text-sm tabular-nums text-right text-[var(--color-on-surface)]">{r.cpas}</td>
                      <td className="px-5 py-3 text-sm tabular-nums text-right" style={{ color: '#f59e0b' }}>{fmt(Number(r.receita_cpa))}</td>
                      <td className="px-5 py-3 text-sm tabular-nums text-right" style={{ color: '#06b6d4' }}>{fmt(Number(r.receita_rev))}</td>
                      <td className="px-5 py-3 text-sm tabular-nums text-right font-semibold" style={{ color: '#22D3A5' }}>{fmt(Number(r.receita_bruta))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] opacity-50">
        <span className="material-symbols-outlined text-[14px]">info</span>
        <span>
          Portal de Transparência — Todos os dados são calculados automaticamente com base na produção real registrada no sistema.
        </span>
      </div>
    </div>
  )
}
