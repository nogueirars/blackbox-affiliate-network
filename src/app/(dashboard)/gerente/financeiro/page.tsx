import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { FinanceiroClient } from '@/app/(dashboard)/influenciador/financeiro/FinanceiroClient'

type RegraLiberacao = {
  tipo_liberacao: string
  delay_dias: number
  dia_semana?: string | null
  dia_mes?: number | null
}

function computeProximaLiberacao(r: RegraLiberacao): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const delay = r.delay_dias ?? 0

  switch (r.tipo_liberacao) {
    case 'DIARIO': {
      const d = new Date(today)
      d.setDate(d.getDate() + 1 + delay)
      return d.toISOString().split('T')[0]
    }
    case 'SEMANAL': {
      const DOW: Record<string, number> = { SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5 }
      const target = DOW[r.dia_semana ?? 'SEGUNDA'] ?? 1
      const cur = today.getDay()
      let diff = (target - cur + 7) % 7
      if (diff === 0) diff = 7
      const d = new Date(today)
      d.setDate(d.getDate() + diff + delay)
      return d.toISOString().split('T')[0]
    }
    case 'QUINZENAL': {
      const d = new Date(today)
      const day = d.getDate()
      if (day < 15) d.setDate(15)
      else          d.setMonth(d.getMonth() + 1, 1)
      d.setDate(d.getDate() + delay)
      return d.toISOString().split('T')[0]
    }
    case 'MENSAL': {
      const targetDay = r.dia_mes ?? 1
      const d = new Date(today)
      if (today.getDate() >= targetDay) d.setMonth(d.getMonth() + 1)
      d.setDate(targetDay)
      d.setDate(d.getDate() + delay)
      return d.toISOString().split('T')[0]
    }
    default:
      return today.toISOString().split('T')[0]
  }
}

export default async function GerenteFinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.app_metadata?.role ?? 'GERENTE') as string

  type ContratoRow = {
    id: string
    afp: string | null
    tipo_contrato: string
    casas_aposta: {
      id: string
      nome_exibicao: string
      historico_regras_casas: { tipo_liberacao: string; delay_dias: number }[]
    }
  }
  type SaqueItem = { id_casa: string; montante: Prisma.Decimal }
  type SaqueRow = {
    id: string
    montante: Prisma.Decimal
    status: string
    pix_key: string | null
    nota_fiscal: string | null
    motivo_correcao_nf: string | null
    correcao_nf_solicitada_em: Date | null
    created_at: Date
    efetivado_at: Date | null
  }

  let contratos: ContratoRow[] = []
  let totalComissao = 0
  let perContratoTotais: Array<{ id_contrato: string; receita_total: string }> = []
  let saquesItensAtivos: SaqueItem[] = []
  let saquesItensConcluidos: SaqueItem[] = []
  let saques: SaqueRow[] = []

  try {
    const publicUser = await prisma.public_users.findUnique({
      where: { auth_id: user.id },
      select: { id: true },
    })

    // ── Contracts + casa + release rules ─────────────────────────────────────
    contratos = publicUser
      ? await prisma.contratos.findMany({
          where: {
            ativo: true,
            user_roles: { id_usuario: publicUser.id, role: 'GERENTE', ativo: true },
          },
          select: {
            id: true,
            afp: true,
            tipo_contrato: true,
            casas_aposta: {
              select: {
                id: true,
                nome_exibicao: true,
                historico_regras_casas: {
                  where: { ativo: true },
                  orderBy: { data_inicio: 'desc' },
                  take: 1,
                  select: { tipo_liberacao: true, delay_dias: true },
                },
              },
            },
          },
        })
      : []

    const contratoIds = contratos.map(c => c.id)

    // ── Aggregate all-time comissão (lucro_liquido_total) ────────────────────
    if (contratoIds.length > 0) {
      const rows = await prisma.$queryRaw<[{ total: string }]>(
        Prisma.sql`
          SELECT COALESCE(SUM(lucro_liquido_total), 0)::text AS total
          FROM public.vw_producao_gerente
          WHERE id_contrato = ANY(${contratoIds}::uuid[])
        `
      )
      totalComissao = Number(rows[0]?.total ?? 0)
    }

    // ── Per-contract totals for Previsão table ────────────────────────────────
    perContratoTotais = contratoIds.length > 0
      ? await prisma.$queryRaw<Array<{ id_contrato: string; receita_total: string }>>(
          Prisma.sql`
            SELECT id_contrato::text,
                   COALESCE(SUM(lucro_liquido_total), 0)::text AS receita_total
            FROM public.vw_producao_gerente
            WHERE id_contrato = ANY(${contratoIds}::uuid[])
            GROUP BY id_contrato
          `
        )
      : []

    // ── Per-casa suspended (active) and paid amounts via saques_itens ─────────
    ;[saquesItensAtivos, saquesItensConcluidos] = publicUser
      ? await Promise.all([
          prisma.saques_itens.findMany({
            where: {
              saque: {
                id_usuario: publicUser.id,
                status: { in: ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF', 'PROCESSANDO'] },
              },
            },
            select: { id_casa: true, montante: true },
          }),
          prisma.saques_itens.findMany({
            where: {
              saque: { id_usuario: publicUser.id, status: 'CONCLUIDO' },
            },
            select: { id_casa: true, montante: true },
          }),
        ])
      : [[], []]

    // ── Saques ──────────────────────────────────────────────────────────────
    saques = publicUser
      ? await prisma.saques.findMany({
          where: { id_usuario: publicUser.id },
          orderBy: { created_at: 'desc' },
          take: 100,
          select: {
            id: true,
            montante: true,
            status: true,
            pix_key: true,
            nota_fiscal: true,
            motivo_correcao_nf: true,
            correcao_nf_solicitada_em: true,
            created_at: true,
            efetivado_at: true,
          },
        })
      : []
  } catch (e) {
    console.error('[gerente/financeiro] prisma error:', e)
    // Fall through with empty data → renders zeroed financeiro state below
  }

  const suspendedPerCasa: Record<string, number> = {}
  for (const item of saquesItensAtivos) {
    suspendedPerCasa[item.id_casa] = (suspendedPerCasa[item.id_casa] ?? 0) + Number(item.montante)
  }
  const paidPerCasa: Record<string, number> = {}
  for (const item of saquesItensConcluidos) {
    paidPerCasa[item.id_casa] = (paidPerCasa[item.id_casa] ?? 0) + Number(item.montante)
  }

  const previsaoRows = contratos.map(c => {
    const v        = perContratoTotais.find(r => r.id_contrato === c.id)
    const regra    = c.casas_aposta.historico_regras_casas[0]
    const casaId   = c.casas_aposta.id
    const rawValue = Number(v?.receita_total ?? 0)
    const paid     = paidPerCasa[casaId]      ?? 0
    const suspended = suspendedPerCasa[casaId] ?? 0
    return {
      contratoId:       c.id,
      casaId,
      casaNome:         c.casas_aposta.nome_exibicao,
      tipoLiberacao:    (regra?.tipo_liberacao ?? null) as string | null,
      proximaLiberacao: regra ? computeProximaLiberacao(regra as RegraLiberacao) : null,
      liberadoValor:    Math.max(0, rawValue - paid - suspended),
      suspendedValor:   suspended,
    }
  })

  const ATIVOS_STATUS = ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF', 'PROCESSANDO', 'MANUAL']

  const totalPago = saques
    .filter(s => s.status === 'CONCLUIDO')
    .reduce((acc, s) => acc + Number(s.montante), 0)

  const totalEstornado = saques
    .filter(s => s.status === 'FALHA')
    .reduce((acc, s) => acc + Number(s.montante), 0)

  const saquesAtivos = saques
    .filter(s => ATIVOS_STATUS.includes(s.status))
    .reduce((acc, s) => acc + Number(s.montante), 0)

  const temSaqueAtivo = saques.some(s => ATIVOS_STATUS.includes(s.status))
  const totalAReceber = Math.max(0, totalComissao - totalPago - saquesAtivos)
  const saldoDisponivel = Math.max(0, totalComissao - totalPago - saquesAtivos)

  const contratosForSaque = contratos.map(c => ({
    id: c.id,
    afp: c.afp ?? '—',
    tipo_contrato: c.tipo_contrato ?? '—',
    casa_nome: c.casas_aposta.nome_exibicao,
  }))

  const saquesSerial = saques.map(s => ({
    id: s.id,
    valor: Number(s.montante),
    status: s.status as string,
    pix_key: s.pix_key ?? undefined,
    nota_fiscal: s.nota_fiscal ?? undefined,
    created_at: s.created_at.toISOString(),
    efetivado_at: s.efetivado_at?.toISOString() ?? undefined,
  }))

  const ATIVOS_TRACKER = ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF', 'PROCESSANDO', 'MANUAL']
  const saquesParaTracker = saques
    .filter(s => ATIVOS_TRACKER.includes(s.status))
    .map(s => ({
      id: s.id,
      montante: Number(s.montante),
      status: s.status as string,
      nota_fiscal: s.nota_fiscal ?? null,
      motivo_correcao_nf: s.motivo_correcao_nf ?? null,
      correcao_nf_solicitada_em: s.correcao_nf_solicitada_em?.toISOString() ?? null,
      created_at: s.created_at.toISOString(),
    }))

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Financeiro</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Acompanhe seus pagamentos e saldo
        </p>
      </div>

      <FinanceiroClient
        data={{
          totalComissao,
          totalEstornado,
          totalPago,
          totalAReceber,
          saquesAtivos,
          saldoDisponivel,
          saques: saquesSerial,
          previsaoRows,
          temSaqueAtivo,
          role,
          contratosForSaque,
          saquesParaTracker,
        }}
      />
    </div>
  )
}
