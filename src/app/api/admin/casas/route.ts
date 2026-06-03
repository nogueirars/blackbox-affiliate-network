import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  try {
    const body = await req.json()
    const {
      nome_exibicao,
      razao_social,
      icone_url,
      affiliate_url,
      id_entidade,
      ativo = true,
    } = body

    if (!nome_exibicao || !razao_social || !id_entidade) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const db = createAdminClient()

    const insertData = {
      nome_exibicao: nome_exibicao.trim(),
      razao_social: razao_social.trim(),
      icone_url: icone_url?.trim() || null,
      affiliate_url: affiliate_url?.trim() || null,
      id_entidade,
      ativo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await db
      .from('casas_aposta')
      .insert(insertData)
      .select('id, nome_exibicao, razao_social, icone_url, affiliate_url, ativo, created_at, id_entidade')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ casa: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
