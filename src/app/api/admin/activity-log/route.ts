import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth-helpers'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const entityType = searchParams.get('entityType')
  const entityId   = searchParams.get('entityId')
  const action     = searchParams.get('action')
  const limit      = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  const logs = await prisma.activity_log.findMany({
    where: {
      ...(entityType ? { entity_type: entityType } : {}),
      ...(entityId   ? { entity_id:   entityId }   : {}),
      ...(action     ? { action }                   : {}),
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  })

  return NextResponse.json(logs)
}
