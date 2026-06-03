import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return null
  return user
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { razao_social, nome_fantasia, cnpj, logradouro, numero, complemento, bairro, cidade, estado, cep } = body

  if (!razao_social || !nome_fantasia || !cnpj || !logradouro || !numero || !bairro || !cidade || !estado || !cep) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  try {
    const entidade = await prisma.entidades.create({
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
        ativo: true,
      },
    })
    return NextResponse.json({ entidade }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 409 })
    }
    console.error('[POST /api/admin/entidades]', e)
    return NextResponse.json({ error: 'Erro ao criar entidade' }, { status: 500 })
  }
}
