import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: acordoId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const intermediarioUser = await prisma.public_users.findUnique({ where: { auth_id: user.id } })
  if (!intermediarioUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const intermediarioRole = await prisma.user_roles.findFirst({
    where: { id_usuario: intermediarioUser.id, role: 'INTERMEDIARIO', ativo: true },
  })
  if (!intermediarioRole) {
    return NextResponse.json({ error: 'Papel INTERMEDIARIO ativo não encontrado' }, { status: 403 })
  }

  const acordo = await prisma.contratos.findUnique({ where: { id: acordoId } })
  if (!acordo || acordo.id_user_role !== intermediarioRole.id) {
    return NextResponse.json({ error: 'Acordo não encontrado ou sem permissão' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { data_inicio, cpa_bruto, revshare_percentual, sub_contrato_ids } = body

  if (!data_inicio) {
    return NextResponse.json({ error: 'Campo obrigatório: data_inicio' }, { status: 400 })
  }

  const historicoPaiAtivo = await prisma.historico_contratos.findFirst({
    where: { id_contrato: acordoId, ativo: true },
    orderBy: { created_at: 'desc' },
  })

  if (historicoPaiAtivo) {
    if (cpa_bruto != null && historicoPaiAtivo.cpa_bruto != null && Number(cpa_bruto) > Number(historicoPaiAtivo.cpa_bruto)) {
      return NextResponse.json({ error: 'cpa_bruto excede o teto do acordo' }, { status: 422 })
    }
    if (revshare_percentual != null && historicoPaiAtivo.revshare_percentual != null && Number(revshare_percentual) > Number(historicoPaiAtivo.revshare_percentual)) {
      return NextResponse.json({ error: 'revshare_percentual excede o teto do acordo' }, { status: 422 })
    }
  }

  const ids = Array.isArray(sub_contrato_ids) && sub_contrato_ids.length > 0 ? sub_contrato_ids : null

  if (!ids) {
    return NextResponse.json({ error: 'Selecione pelo menos 1 gerente' }, { status: 400 })
  }

  const subContratos = await prisma.contratos.findMany({
    where: { id_contrato_pai: acordoId, ativo: true, id: { in: ids } },
    include: {
      historico_contratos: {
        where: { ativo: true },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  })

  if (subContratos.length === 0) {
    return NextResponse.json({ afetados: 0 })
  }

  const dataInicio = new Date(data_inicio)
  const dataFim = new Date(dataInicio)
  dataFim.setDate(dataFim.getDate() - 1)
  const dataFimStr = dataFim.toISOString().slice(0, 10)

  const db = createAdminClient()
  const now = new Date().toISOString()
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  let afetados = 0

  for (const sub of subContratos) {
    const historicoAtivo = sub.historico_contratos[0]
    const idCasa = historicoAtivo?.id_casa ?? acordo.id_casa

    const ativoDataInicio = historicoAtivo ? new Date(historicoAtivo.data_inicio) : null
    const isFuturoMesmoDia =
      ativoDataInicio &&
      ativoDataInicio > hoje &&
      ativoDataInicio.toISOString().slice(0, 10) === dataInicio.toISOString().slice(0, 10)

    if (isFuturoMesmoDia && historicoAtivo) {
      // Histórico futuro com mesma data → só atualiza valores, sem criar novo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db as any)
        .from('historico_contratos')
        .update({
          cpa_bruto: cpa_bruto != null ? Number(cpa_bruto) : null,
          revshare_percentual: revshare_percentual != null ? Number(revshare_percentual) : null,
          updated_at: now,
        })
        .eq('id', historicoAtivo.id)
      if (!error) afetados++
      continue
    }

    if (historicoAtivo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: closeError } = await (db as any)
        .from('historico_contratos')
        .update({ data_fim: dataFimStr, ativo: false, updated_at: now })
        .eq('id', historicoAtivo.id)

      if (closeError) continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (db as any)
      .from('historico_contratos')
      .insert({
        id_contrato: sub.id,
        id_casa: idCasa,
        data_inicio,
        cpa_bruto: cpa_bruto != null ? Number(cpa_bruto) : null,
        revshare_percentual: revshare_percentual != null ? Number(revshare_percentual) : null,
        aliquota_imposto: null,
        revshare_repasse: null,
        ativo: true,
      })

    if (!insertError) afetados++
  }

  return NextResponse.json({ afetados })
}
