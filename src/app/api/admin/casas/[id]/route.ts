import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const db = createAdminClient()

  // Toggle ativo only
  if ('ativo' in body && Object.keys(body).length === 1) {
    const { data, error } = await db
      .from('casas_aposta')
      .update({ ativo: body.ativo })
      .eq('id', id)
      .select('id, ativo')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ casa: data })
  }

  // Full update
  const {
    nome_exibicao, razao_social, icone_url, affiliate_url,
    id_entidade,
  } = body

  if (!nome_exibicao || !razao_social || !id_entidade) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    nome_exibicao: nome_exibicao.trim(),
    razao_social: razao_social.trim(),
    icone_url: icone_url?.trim() || null,
    affiliate_url: affiliate_url?.trim() || null,
    id_entidade,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('casas_aposta')
    .update(updateData)
    .eq('id', id)
    .select('id, nome_exibicao, razao_social, icone_url, affiliate_url, ativo, id_entidade')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ casa: data })
}
