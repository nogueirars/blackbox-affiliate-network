import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSaldoGerente } from '@/lib/finance/saldo-gerente'
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

  if (!hasAnyRole(user.app_metadata, 'ADMIN', 'INTERMEDIARIO') && user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const saldo = await getSaldoGerente(id)
    return NextResponse.json(saldo)
  } catch (err) {
    console.error('[saldo/gerente]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
