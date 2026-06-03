import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const contrato = await prisma.contratos.findUnique({ where: { id } })
  if (!contrato) {
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { data_inicio, data_fim, cpa_bruto, aliquota_imposto, revshare_percentual, revshare_repasse } = body

  if (!data_inicio) {
    return NextResponse.json({ error: 'Campo obrigatório: data_inicio' }, { status: 400 })
  }

  const hojeStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

  const historicoAtivo = await prisma.historico_contratos.findFirst({
    where: { id_contrato: id, ativo: true },
    orderBy: { created_at: 'desc' },
  })

  const dataInicio = new Date(data_inicio)
  const dataFimAnterior = new Date(dataInicio)
  dataFimAnterior.setDate(dataFimAnterior.getDate() - 1)
  const dataFimAnteriorStr = dataFimAnterior.toISOString().slice(0, 10)

  const db = createAdminClient()
  const now = new Date().toISOString()

  const ativoDataInicioStr = historicoAtivo
    ? historicoAtivo.data_inicio.toISOString().slice(0, 10)
    : null

  // Se o historico ativo ainda não vigente e mesma data_inicio → update no lugar
  if (
    historicoAtivo &&
    ativoDataInicioStr &&
    ativoDataInicioStr > hojeStr &&
    ativoDataInicioStr === dataInicio.toISOString().slice(0, 10)
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('historico_contratos')
      .update({
        data_fim: data_fim ?? null,
        cpa_bruto: cpa_bruto != null && cpa_bruto !== '' ? Number(cpa_bruto) : null,
        aliquota_imposto: aliquota_imposto != null && aliquota_imposto !== '' ? Number(aliquota_imposto) : null,
        revshare_percentual: revshare_percentual != null && revshare_percentual !== '' ? Number(revshare_percentual) : null,
        revshare_repasse: revshare_repasse != null && revshare_repasse !== '' ? Number(revshare_repasse) : null,
        updated_at: now,
      })
      .eq('id', historicoAtivo.id)

    if (updateError) {
      return NextResponse.json({ error: `Erro ao atualizar histórico: ${updateError.message}` }, { status: 500 })
    }
    return NextResponse.json({ ok: true, updated: true })
  }

  // Fluxo normal: fecha ativo + insere novo
  if (historicoAtivo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: closeError } = await (db as any)
      .from('historico_contratos')
      .update({ data_fim: dataFimAnteriorStr, ativo: false, updated_at: now })
      .eq('id', historicoAtivo.id)

    if (closeError) {
      return NextResponse.json({ error: `Erro ao fechar histórico ativo: ${closeError.message}` }, { status: 500 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (db as any)
    .from('historico_contratos')
    .insert({
      id_contrato: id,
      id_casa: contrato.id_casa,
      data_inicio,
      data_fim: data_fim ?? null,
      cpa_bruto: cpa_bruto != null && cpa_bruto !== '' ? Number(cpa_bruto) : null,
      aliquota_imposto: aliquota_imposto != null && aliquota_imposto !== '' ? Number(aliquota_imposto) : null,
      revshare_percentual: revshare_percentual != null && revshare_percentual !== '' ? Number(revshare_percentual) : null,
      revshare_repasse: revshare_repasse != null && revshare_repasse !== '' ? Number(revshare_repasse) : null,
      ativo: true,
    })

  if (insertError) {
    return NextResponse.json({ error: `Erro ao inserir novo histórico: ${insertError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
