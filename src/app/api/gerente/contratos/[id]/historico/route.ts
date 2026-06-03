import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const gerenteUser = await prisma.public_users.findUnique({ where: { auth_id: user.id } })
  if (!gerenteUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const gerenteRole = await prisma.user_roles.findFirst({
    where: { id_usuario: gerenteUser.id, role: 'GERENTE', ativo: true },
  })
  if (!gerenteRole) {
    return NextResponse.json({ error: 'Papel GERENTE ativo não encontrado' }, { status: 403 })
  }

  const subContrato = await prisma.contratos.findUnique({ where: { id } })
  if (!subContrato || !subContrato.id_contrato_pai) {
    return NextResponse.json({ error: 'Sub-contrato não encontrado ou sem contrato pai' }, { status: 404 })
  }

  const contratoPai = await prisma.contratos.findUnique({ where: { id: subContrato.id_contrato_pai } })
  if (!contratoPai || contratoPai.id_user_role !== gerenteRole.id) {
    return NextResponse.json({ error: 'Contrato pai não pertence a este gerente' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { data_inicio, cpa_bruto, revshare_percentual } = body

  if (!data_inicio) {
    return NextResponse.json({ error: 'Campo obrigatório: data_inicio' }, { status: 400 })
  }

  const hojeStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

  const historicoPaiAtivo = await prisma.historico_contratos.findFirst({
    where: { id_contrato: contratoPai.id, ativo: true },
    orderBy: { created_at: 'desc' },
  })

  if (historicoPaiAtivo) {
    if (cpa_bruto != null && historicoPaiAtivo.cpa_bruto != null && Number(cpa_bruto) > Number(historicoPaiAtivo.cpa_bruto)) {
      return NextResponse.json({ error: 'cpa_bruto excede o teto do contrato pai' }, { status: 422 })
    }
    if (revshare_percentual != null && historicoPaiAtivo.revshare_percentual != null && Number(revshare_percentual) > Number(historicoPaiAtivo.revshare_percentual)) {
      return NextResponse.json({ error: 'revshare_percentual excede o teto do contrato pai' }, { status: 422 })
    }
  }

  const historicoAtivoSub = await prisma.historico_contratos.findFirst({
    where: { id_contrato: id, ativo: true },
    orderBy: { created_at: 'desc' },
  })

  const dataInicio = new Date(data_inicio)
  const dataFim = new Date(dataInicio)
  dataFim.setDate(dataFim.getDate() - 1)
  const dataFimStr = dataFim.toISOString().slice(0, 10)

  const idCasa = historicoAtivoSub?.id_casa ?? historicoPaiAtivo?.id_casa
  if (!idCasa) {
    return NextResponse.json({ error: 'Não foi possível determinar id_casa' }, { status: 422 })
  }

  const db = createAdminClient()
  const now = new Date().toISOString()

  // Se o historico ativo ainda não entrou em vigor E a data_inicio é a mesma →
  // atualiza os valores no lugar, sem criar novo registro
  const ativoDataInicioStr = historicoAtivoSub
    ? historicoAtivoSub.data_inicio.toISOString().slice(0, 10)
    : null
  if (
    historicoAtivoSub &&
    ativoDataInicioStr &&
    ativoDataInicioStr > hojeStr &&
    ativoDataInicioStr === dataInicio.toISOString().slice(0, 10)
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('historico_contratos')
      .update({
        cpa_bruto: cpa_bruto != null ? Number(cpa_bruto) : null,
        revshare_percentual: revshare_percentual != null ? Number(revshare_percentual) : null,
        updated_at: now,
      })
      .eq('id', historicoAtivoSub.id)

    if (updateError) {
      return NextResponse.json({ error: `Erro ao atualizar histórico futuro: ${updateError.message}` }, { status: 500 })
    }
    return NextResponse.json({ ok: true, updated: true }, { status: 200 })
  }

  // Fluxo normal: fecha ativo + insere novo
  if (historicoAtivoSub) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: closeError } = await (db as any)
      .from('historico_contratos')
      .update({ data_fim: dataFimStr, ativo: false, updated_at: now })
      .eq('id', historicoAtivoSub.id)

    if (closeError) {
      return NextResponse.json({ error: `Erro ao fechar histórico ativo: ${closeError.message}` }, { status: 500 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (db as any)
    .from('historico_contratos')
    .insert({
      id_contrato: id,
      id_casa: idCasa,
      data_inicio,
      cpa_bruto: cpa_bruto != null ? Number(cpa_bruto) : null,
      revshare_percentual: revshare_percentual != null ? Number(revshare_percentual) : null,
      aliquota_imposto: null,
      revshare_repasse: null,
      ativo: true,
    })

  if (insertError) {
    return NextResponse.json({ error: `Erro ao inserir novo histórico: ${insertError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
