import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-helpers'

/** POST /api/admin/contratos — cria novo contrato + historico_contratos inicial */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    id_user_role,
    id_casa,
    afp,
    tipo_contrato,
    data_inicio,
    data_fim,
    cpa_bruto,
    aliquota_imposto,
    revshare_percentual,
    revshare_repasse,
  } = body

  if (!id_user_role || !id_casa || !tipo_contrato || !data_inicio) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: id_user_role, id_casa, tipo_contrato, data_inicio' },
      { status: 400 },
    )
  }

  let afpClean = null
  if (afp) {
    afpClean = String(afp).trim().toUpperCase()
    if (!/^[A-Z0-9]{8}$/.test(afpClean)) {
      return NextResponse.json({ error: 'O código AFP deve conter exatamente 8 letras e/ou números.' }, { status: 400 })
    }
  }
  const valid = ['CPA', 'REVSHARE', 'MISTO']
  if (!valid.includes(tipo_contrato)) {
    return NextResponse.json({ error: `tipo_contrato inválido. Use: ${valid.join(', ')}` }, { status: 400 })
  }

  // Auto-generate link_afiliacao from casa affiliate_url template + AFP
  let linkAfiliacao: string | null = null
  if (afpClean) {
    const casa = await prisma.casas_aposta.findUnique({
      where: { id: id_casa },
      select: { affiliate_url: true },
    })
    if (casa?.affiliate_url) {
      linkAfiliacao = casa.affiliate_url.replace('[AFP]', afpClean)
    }
  }

  const db = createAdminClient()

  // Block duplicate: same (id_user_role + id_casa) active contract
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from('contratos')
    .select('id')
    .eq('id_user_role', id_user_role)
    .eq('id_casa', id_casa)
    .eq('ativo', true)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Já existe um contrato ativo para este perfil nesta casa de aposta.' },
      { status: 409 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contrato, error: contratoError } = await (db as any)
    .from('contratos')
    .insert({
      id_user_role,
      id_casa,
      afp: afpClean,
      tipo_contrato,
      link_afiliacao: linkAfiliacao,
      ativo: true,
    })
    .select('id, afp, tipo_contrato')
    .single()

  if (contratoError) {
    const msg =
      contratoError.message.includes('unique') || contratoError.code === '23505'
        ? `AFP "${afpClean}" já existe`
        : contratoError.message
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: histError } = await (db as any)
    .from('historico_contratos')
    .insert({
      id_contrato:         contrato.id,
      id_casa,
      data_inicio,
      data_fim:            data_fim ?? null,
      cpa_bruto:           cpa_bruto   != null && cpa_bruto   !== '' ? Number(cpa_bruto)   : null,
      aliquota_imposto:    aliquota_imposto != null && aliquota_imposto !== '' ? Number(aliquota_imposto) : null,
      revshare_percentual: revshare_percentual != null && revshare_percentual !== '' ? Number(revshare_percentual) : null,
      revshare_repasse:    revshare_repasse != null && revshare_repasse !== '' ? Number(revshare_repasse) : null,
      ativo: true,
    })

  if (histError) {
    return NextResponse.json({ error: `Contrato criado, mas erro no histórico: ${histError.message}` }, { status: 500 })
  }

  return NextResponse.json({ contrato }, { status: 201 })
}

/** PATCH /api/admin/contratos — encerra contrato */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { id, ativo } = body
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('contratos')
    .update({
      ativo: !!ativo,
      inativado_at: ativo ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
