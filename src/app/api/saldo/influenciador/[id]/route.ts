import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSaldoInfluenciador } from '@/lib/finance/saldo-influenciador'
import { hasAnyRole } from '@/lib/auth-helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only self, gerente do afiliado, intermediario, or admin
  if (!hasAnyRole(user.app_metadata, 'ADMIN', 'INTERMEDIARIO', 'GERENTE') && user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const saldo = await getSaldoInfluenciador(id)
    return NextResponse.json(saldo)
  } catch (err) {
    console.error('[saldo/influenciador]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
