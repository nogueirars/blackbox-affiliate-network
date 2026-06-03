import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Toggle ativo
  if ('ativo' in body && Object.keys(body).length === 1) {
    const entidade = await prisma.entidades.update({
      where: { id },
      data: {
        ativo: body.ativo,
        inativado_at: body.ativo ? null : new Date(),
        updated_at: new Date(),
      },
    })
    return NextResponse.json({ entidade })
  }

  // Full update
  const { razao_social, nome_fantasia, cnpj, logradouro, numero, complemento, bairro, cidade, estado, cep } = body

  if (!razao_social || !nome_fantasia || !cnpj || !logradouro || !numero || !bairro || !cidade || !estado || !cep) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  try {
    const entidade = await prisma.entidades.update({
      where: { id },
      data: {
        razao_social: razao_social.trim(),
        nome_fantasia: nome_fantasia.trim(),
        cnpj: cnpj.trim(),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        complemento: complemento?.trim() || null,
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim().toUpperCase().slice(0, 2),
        cep: cep.trim(),
        updated_at: new Date(),
      },
    })
    return NextResponse.json({ entidade })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'CNPJ já cadastrado em outra entidade' }, { status: 409 })
    }
    console.error('[PATCH /api/admin/entidades/[id]]', e)
    return NextResponse.json({ error: 'Erro ao atualizar entidade' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const casasCount = await prisma.casas_aposta.count({ where: { id_entidade: id } })
  if (casasCount > 0) {
    return NextResponse.json(
      { error: `Entidade possui ${casasCount} casa(s) de apostas vinculada(s). Remova os vínculos primeiro.` },
      { status: 409 }
    )
  }

  await prisma.entidades.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
