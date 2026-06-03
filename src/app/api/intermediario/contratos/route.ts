import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => ({}))
  const { id_contrato_pai, id_user_role_gerente, id_casa, cpa_bruto, revshare_percentual, data_inicio } = body

  if (!id_contrato_pai || !id_user_role_gerente || !id_casa || !data_inicio) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: id_contrato_pai, id_user_role_gerente, id_casa, data_inicio' },
      { status: 400 },
    )
  }

  const contratoPai = await prisma.contratos.findUnique({ where: { id: id_contrato_pai } })
  if (!contratoPai) {
    return NextResponse.json({ error: 'Contrato pai não encontrado' }, { status: 404 })
  }
  if (contratoPai.id_user_role !== intermediarioRole.id) {
    return NextResponse.json({ error: 'Contrato pai não pertence a este intermediário' }, { status: 403 })
  }

  const historicoAtivo = await prisma.historico_contratos.findFirst({
    where: { id_contrato: id_contrato_pai, ativo: true },
    orderBy: { created_at: 'desc' },
  })

  if (historicoAtivo) {
    if (cpa_bruto != null && historicoAtivo.cpa_bruto != null && Number(cpa_bruto) > Number(historicoAtivo.cpa_bruto)) {
      return NextResponse.json({ error: 'cpa_bruto excede o teto do contrato pai' }, { status: 422 })
    }
    if (revshare_percentual != null && historicoAtivo.revshare_percentual != null && Number(revshare_percentual) > Number(historicoAtivo.revshare_percentual)) {
      return NextResponse.json({ error: 'revshare_percentual excede o teto do contrato pai' }, { status: 422 })
    }
  }

  const gerenteRoleTgt = await prisma.user_roles.findUnique({ where: { id: id_user_role_gerente } })
  if (!gerenteRoleTgt || gerenteRoleTgt.role !== 'GERENTE' || !gerenteRoleTgt.ativo) {
    return NextResponse.json({ error: 'id_user_role_gerente inválido ou não é um gerente ativo' }, { status: 422 })
  }

  const gerenteUserTgt = await prisma.public_users.findUnique({ where: { id: gerenteRoleTgt.id_usuario } })
  if (!gerenteUserTgt || gerenteUserTgt.id_intermediario !== intermediarioUser.id) {
    return NextResponse.json({ error: 'Gerente não pertence a este intermediário' }, { status: 403 })
  }

  const duplicata = await prisma.contratos.findFirst({
    where: { id_contrato_pai, id_user_role: id_user_role_gerente, ativo: true },
  })
  if (duplicata) {
    return NextResponse.json({ error: 'Já existe um contrato ativo para este gerente neste acordo' }, { status: 409 })
  }

  const db = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: afpData, error: afpError } = await (db as any).rpc('generate_unique_afp')
  if (afpError) {
    return NextResponse.json({ error: `Erro ao gerar AFP: ${afpError.message}` }, { status: 500 })
  }
  const afp = afpData as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: novoContrato, error: contratoError } = await (db as any)
    .from('contratos')
    .insert({
      id_user_role: id_user_role_gerente,
      id_casa,
      afp,
      tipo_contrato: contratoPai.tipo_contrato,
      id_contrato_pai,
      ativo: true,
    })
    .select('id, afp, tipo_contrato, id_contrato_pai')
    .single()

  if (contratoError) {
    return NextResponse.json({ error: contratoError.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: histError } = await (db as any)
    .from('historico_contratos')
    .insert({
      id_contrato: novoContrato.id,
      id_casa,
      data_inicio,
      cpa_bruto: cpa_bruto != null ? Number(cpa_bruto) : null,
      revshare_percentual: revshare_percentual != null ? Number(revshare_percentual) : null,
      aliquota_imposto: null,
      revshare_repasse: null,
      ativo: true,
    })

  if (histError) {
    return NextResponse.json({ error: `Contrato criado, mas erro no histórico: ${histError.message}` }, { status: 500 })
  }

  return NextResponse.json({ contrato: novoContrato }, { status: 201 })
}
