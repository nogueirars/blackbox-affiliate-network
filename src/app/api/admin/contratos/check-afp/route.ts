import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-helpers'

/** GET /api/admin/contratos/check-afp?afp=NICK01 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const afp = req.nextUrl.searchParams.get('afp')?.trim().toUpperCase()
  if (!afp) return NextResponse.json({ error: 'afp obrigatório' }, { status: 400 })

  const db = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('contratos')
    .select('id')
    .eq('afp', afp)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ exists: data !== null })
}
