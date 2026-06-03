import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function fmt(v: number | string | null | undefined) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(v: number | string | null | undefined) {
  if (v === null || v === undefined) return '—'
  return `${Number(v).toFixed(1)}%`
}

const TIPO_COLOR: Record<string, string> = {
  CPA:      '#f59e0b',
  REVSHARE: '#06b6d4',
  MISTO:    '#8b5cf6',
}

export default async function InfluenciadorContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: { id: true },
  })

  if (!publicUser) redirect('/login')

  const contrato = await prisma.contratos.findFirst({
    where: {
      id,
      ativo: true,
      user_roles: { id_usuario: publicUser.id, ativo: true },
    },
    select: {
      id: true,
      afp: true,
      tipo_contrato: true,
      created_at: true,
      casas_aposta: {
        select: {
          nome_exibicao: true,
          icone_url: true,
        },
      },
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
  })

  if (!contrato) notFound()

  const histAtivo = contrato.historico_contratos.find(h => h.ativo) ?? contrato.historico_contratos[0]
  const tipoColor = TIPO_COLOR[contrato.tipo_contrato ?? ''] ?? 'var(--color-primary)'

  return (
    <div className="animate-fade-in flex flex-col gap-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/influenciador/contratos"
        className="flex items-center gap-1.5 text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] w-fit transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Voltar aos contratos
      </Link>

      {/* Header */}
      <div className="glass-card rounded-2xl p-6 flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(2,117,243,0.12)', border: '1px solid rgba(2,117,243,0.2)' }}
        >
          <span className="material-symbols-outlined text-[24px] text-[var(--color-primary)]">store</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-display-lg text-[var(--color-on-surface)]">
              {contrato.casas_aposta.nome_exibicao}
            </h1>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ color: tipoColor, background: `${tipoColor}18`, border: `1px solid ${tipoColor}33` }}
            >
              {contrato.tipo_contrato ?? '—'}
            </span>
          </div>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
            AFP: <span className="font-mono font-semibold text-[var(--color-on-surface)]">{contrato.afp ?? '—'}</span>
            <span className="mx-2 opacity-40">·</span>
            Desde {new Date(contrato.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Regras vigentes */}
      {histAtivo && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]" style={{ color: '#22D3A5' }}>verified</span>
              <h2 className="text-headline-md text-[var(--color-on-surface)]">Regras vigentes</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: '#22D3A5', background: 'rgba(34,211,165,0.1)' }}>
                atual
              </span>
            </div>
          </div>
          <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { label: 'CPA Bruto',      value: fmt(histAtivo.cpa_bruto?.toNumber()),              color: '#f59e0b' },
              { label: 'RevShare',        value: fmtPct(histAtivo.revshare_percentual?.toNumber()), color: '#06b6d4' },
              { label: 'Repasse Rev',     value: fmtPct(histAtivo.revshare_repasse?.toNumber()),    color: '#06b6d4' },
              { label: 'Alíquota IR',     value: fmtPct(histAtivo.aliquota_imposto?.toNumber()),    color: '#F43F5E' },
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="text-label-md text-[var(--color-on-surface-variant)]">{f.label}</p>
                <p className="text-headline-md font-bold tabular-nums" style={{ color: f.value === '—' ? 'var(--color-on-surface-variant)' : f.color }}>
                  {f.value}
                </p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-4 text-xs text-[var(--color-on-surface-variant)] opacity-60">
            Vigente desde {new Date(histAtivo.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {histAtivo.data_fim && (
              <> · Até {new Date(histAtivo.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</>
            )}
          </div>
        </div>
      )}

      {/* Histórico de versões */}
      {contrato.historico_contratos.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">history</span>
              <h2 className="text-headline-md text-[var(--color-on-surface)]">Histórico de versões</h2>
            </div>
          </div>
          <div className="divide-y divide-[var(--color-outline-variant)]">
            {contrato.historico_contratos.map((h, idx) => (
              <div
                key={h.id}
                className={`px-5 py-4 grid grid-cols-2 sm:grid-cols-5 gap-4 items-center ${
                  h.ativo ? 'bg-[var(--color-surface-container)]' : 'opacity-60'
                }`}
              >
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-[var(--color-on-surface-variant)]">
                    {new Date(h.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    {' → '}
                    {h.data_fim
                      ? new Date(h.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
                      : <span style={{ color: '#22D3A5' }}>atual</span>}
                  </p>
                </div>
                <div>
                  <p className="text-label-md text-[var(--color-on-surface-variant)]">CPA</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: '#f59e0b' }}>{fmt(h.cpa_bruto?.toNumber())}</p>
                </div>
                <div>
                  <p className="text-label-md text-[var(--color-on-surface-variant)]">RevShare</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: '#06b6d4' }}>{fmtPct(h.revshare_percentual?.toNumber())}</p>
                </div>
                <div>
                  <p className="text-label-md text-[var(--color-on-surface-variant)]">Repasse</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: '#06b6d4' }}>{fmtPct(h.revshare_repasse?.toNumber())}</p>
                </div>
                <div>
                  <p className="text-label-md text-[var(--color-on-surface-variant)]">IR</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: '#F43F5E' }}>{fmtPct(h.aliquota_imposto?.toNumber())}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
