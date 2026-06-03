import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function CasaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const { id } = await params

  // 1. Fetch Casa details
  const casa = await prisma.casas_aposta.findUnique({
    where: { id }
  })
  if (!casa) redirect('/admin/casas')

  // 2. Fetch Aggregated Production
  const production = await prisma.producao_dados.aggregate({
    where: { id_casa: id },
    _sum: {
      cadastros: true,
      ftds: true,
      valor_depositos: true,
      receita_bruta: true,
      receita_cpa: true,
      receita_rev: true,
      ngr: true
    }
  })

  // 3. Fetch Recent Saques associated with this casa
  const saquesItens = await prisma.saques_itens.findMany({
    where: { id_casa: id },
    include: {
      saque: {
        select: {
          id: true,
          status: true,
          created_at: true,
          id_usuario: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: 8
  })

  // Get user names for saques
  const userIds = [...new Set(saquesItens.map(si => si.saque?.id_usuario).filter(Boolean))]
  const users = userIds.length > 0 ? await prisma.public_users.findMany({
    where: { id: { in: userIds as string[] } },
    select: { id: true, nome_completo: true, email: true }
  }) : []
  const userMap = new Map(users.map(u => [u.id, u.nome_completo ?? u.email]))

  // 3b. Fetch Top Contratos for this casa
  const topContratosRaw = await prisma.contratos.findMany({
    where: { id_casa: id, ativo: true },
    include: {
      user_roles: {
        include: {
          users: { select: { nome_completo: true, email: true } }
        }
      }
    },
    take: 5
  })

  // 4. Set up Cards
  const totalNGR = Number(production._sum.ngr ?? 0)
  const totalDeposits = Number(production._sum.valor_depositos ?? 0)
  const totalFtds = Number(production._sum.ftds ?? 0)
  const totalCadastros = Number(production._sum.cadastros ?? 0)
  const totalLucro = Number(production._sum.receita_bruta ?? 0)
  
  const ftdConversion = totalCadastros > 0 ? Math.round((totalFtds / totalCadastros) * 100) : 0

  const cards = [
    { label: 'Receita Bruta (Plataforma)', value: fmt(totalLucro), sub: 'gerado total', icon: 'account_balance_wallet' },
    { label: 'NGR Total', value: fmt(totalNGR), sub: 'net gaming revenue', icon: 'payments' },
    { label: 'Volume de Depósitos', value: fmt(totalDeposits), sub: 'total depositado', icon: 'monitoring' },
    { label: 'Conversão Cad → FTD', value: `${ftdConversion}%`, sub: `${totalCadastros} cadastros, ${totalFtds} FTDs`, icon: 'filter_alt' },
  ]

  const statusMap: Record<string, { label: string; bc: string }> = {
    AGUARDANDO_NF: { label: 'Aguardando NF', bc: 'badge-yellow' },
    PROCESSANDO:   { label: 'Processando',   bc: 'badge-blue'   },
    CONCLUIDO:     { label: 'Pago',          bc: 'badge-green'  },
    FALHA:         { label: 'Falha',         bc: 'badge-red'    },
    MANUAL:        { label: 'Manual',        bc: 'badge-orange' },
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-3">
          <Link
            href="/admin/casas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors self-start"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Voltar para Casas de Aposta
          </Link>
          <div className="flex items-center gap-4 mt-2">
            {casa.icone_url ? (
              <img src={casa.icone_url} alt={casa.nome_exibicao} className="w-12 h-12 rounded-xl object-cover border border-[var(--color-outline-variant)]" />
            ) : (
              <div className="w-12 h-12 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-[var(--color-primary)]">casino</span>
              </div>
            )}
            <div>
              <h2 className="text-display-lg text-[var(--color-on-surface)] mb-1">{casa.nome_exibicao}</h2>
              <p className="text-body-md text-[var(--color-on-surface-variant)]">Relatório de Performance da Casa</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--color-surface-container-high)] rounded-lg p-1 border border-[var(--color-outline-variant)]">
            <button className="px-3 py-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] text-label-md rounded-sm">7D</button>
            <button className="px-3 py-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] text-label-md">30D</button>
            <button className="px-3 py-1 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] text-label-md">Todo o Período</button>
          </div>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cards.map((c, i) => (
          <div key={i} className="glass-card p-6 rounded-3xl flex flex-col gap-1 group hover:border-[var(--color-primary)] transition-colors duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-md text-[var(--color-on-surface-variant)] uppercase tracking-wider">{c.label}</span>
              <span className="text-[var(--color-primary)] material-symbols-outlined text-[20px]">{c.icon}</span>
            </div>
            <div className="text-headline-lg text-[var(--color-on-surface)] truncate">{c.value}</div>
            {c.sub && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-label-md text-[var(--color-on-surface-variant)] opacity-60">{c.sub}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visualization Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 flex flex-col gap-6 min-h-[400px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-headline-md text-[var(--color-on-surface)]">Trajetória de FTDs</h3>
              <p className="text-label-md text-[var(--color-on-surface-variant)] opacity-60">Performance histórica da conversão (Exemplo)</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></span>
                <span className="text-label-md text-[var(--color-on-surface-variant)]">Realizado</span>
              </div>
            </div>
          </div>
          <div className="flex-1 chart-grid relative overflow-hidden flex items-end justify-between px-1 pt-10">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
              <defs>
                <linearGradient id="areaGradientCasa" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              <path d="M0,280 C100,250 200,200 300,220 C400,160 500,80 600,120 C700,60 800,40 800,40 L800,300 L0,300 Z" fill="url(#areaGradientCasa)"></path>
              <path d="M0,280 C100,250 200,200 300,220 C400,160 500,80 600,120 C700,60 800,40 800,40" fill="none" stroke="var(--color-primary)" strokeWidth="3"></path>
            </svg>
            <div className="absolute bottom-0 left-0 w-full flex justify-between px-6 pb-1 text-[var(--color-on-surface-variant)] text-label-md opacity-40">
              <span>JAN</span><span>FEV</span><span>MAR</span><span>ABR</span><span>MAI</span><span>JUN</span><span>JUL</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 flex flex-col gap-6 h-full">
          <h3 className="text-headline-md text-[var(--color-on-surface)]">Funil de Ativação</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <svg className="w-48 h-48 -rotate-90">
              <circle cx="96" cy="96" fill="transparent" r="80" stroke="#1E1E1E" strokeWidth="16"></circle>
              <circle cx="96" cy="96" fill="transparent" r="80" stroke="var(--color-primary)" strokeDasharray="502" strokeDashoffset={`${502 - (502 * ftdConversion) / 100}`} strokeWidth="16"></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-headline-lg text-[var(--color-on-surface)]">{ftdConversion}%</span>
              <span className="text-label-md text-[var(--color-on-surface-variant)]">Ativação</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-[var(--color-outline-variant)] pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-surface-container-highest)]"></span>
                <span className="text-label-md">Cadastros (100%)</span>
              </div>
              <span className="text-label-md text-[var(--color-on-surface)]">{totalCadastros}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
                <span className="text-label-md">FTDs</span>
              </div>
              <span className="text-label-md text-[var(--color-on-surface)]">{totalFtds}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabelas Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pagamentos Recentes */}
        <div className="glass-card rounded-3xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[var(--color-outline-variant)] flex items-center justify-between bg-[var(--color-surface-container-low)]">
            <h3 className="text-headline-md text-[var(--color-on-surface)]">Pagamentos Recentes</h3>
            <Link href={`/admin/saques`} className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Ver todos <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          {!saquesItens.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-[32px] opacity-40">receipt_long</span>
              <p className="text-sm">Nenhum saque envolvendo saldos desta casa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="orbit-table w-full">
                <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Afiliado</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Valor Rateado</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Data</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-outline-variant)]">
                  {saquesItens.map((si) => {
                    if (!si.saque) return null
                    const st = statusMap[si.saque.status] ?? { label: si.saque.status, bc: 'badge-gray' }
                    return (
                      <tr key={si.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                        <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                          {si.saque.id_usuario ? userMap.get(si.saque.id_usuario) ?? 'Desconhecido' : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--color-on-surface)]">
                          {Number(si.montante).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-on-surface-variant)] text-xs whitespace-nowrap">
                          {new Date(si.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3"><span className={`badge ${st.bc}`}>{st.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Contratos */}
        <div className="glass-card rounded-3xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[var(--color-outline-variant)] flex items-center justify-between bg-[var(--color-surface-container-low)]">
            <h3 className="text-headline-md text-[var(--color-on-surface)]">Contratos Ativos (Recentes)</h3>
            <Link href={`/admin/contratos?casa_id=${id}`} className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              Ver todos <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          {!topContratosRaw.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-[32px] opacity-40">description</span>
              <p className="text-sm">Nenhum contrato ativo para esta casa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="orbit-table w-full">
                <thead style={{ background: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-outline-variant)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Afiliado</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Papel</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-outline-variant)]">
                  {topContratosRaw.map((ct) => (
                    <tr key={ct.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                      <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">
                        {ct.user_roles?.users?.nome_completo ?? ct.user_roles?.users?.email ?? 'Desconhecido'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase">
                        {ct.user_roles?.role ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-on-surface-variant)] text-xs whitespace-nowrap">
                        {new Date(ct.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
