import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-helpers'

/** GET /api/admin/contratos/usuarios?role=INFLUENCER&search=xyz */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.app_metadata)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = req.nextUrl
    const role   = searchParams.get('role')?.toUpperCase()
    const search = searchParams.get('search')?.trim() ?? ''

    const validRoles = ['INFLUENCER', 'INTERMEDIARIO', 'GERENTE']
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'role inválido' }, { status: 400 })
    }

    const db = createAdminClient()

    // Single join query — avoids passing large .in() arrays that hit PostgREST URL limits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from('user_roles')
      .select('id, id_usuario, users!inner(id, nome_completo, email, cpf)')
      .eq('role', role)
      .eq('ativo', true)
      .eq('users.ativo', true)
      .limit(50)

    if (search) {
      const like = `%${search}%`
      query = query.or(
        `nome_completo.ilike.${like},email.ilike.${like},cpf.ilike.${like}`,
        { referencedTable: 'users' }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await query

    if (error) {
      console.error('[usuarios] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usuarios = (data ?? []).map((r: any) => ({
      id_user_role:  r.id,
      id_usuario:    r.id_usuario,
      nome_completo: r.users?.nome_completo ?? null,
      email:         r.users?.email ?? null,
      cpf:           r.users?.cpf ?? null,
    }))

    return NextResponse.json({ usuarios })
  } catch (err) {
    console.error('[usuarios] unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
