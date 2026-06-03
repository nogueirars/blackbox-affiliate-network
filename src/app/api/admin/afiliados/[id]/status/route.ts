import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth-helpers'
import { approval_status } from '@prisma/client'
import { logActivity } from '@/lib/activity-log'

const VALID_STATUSES: approval_status[] = ['APROVADO', 'REPROVADO', 'BLOQUEADO', 'BLOQUEADO_TEMPORARIAMENTE', 'PENDENTE']

const STATUS_TO_ACTION: Record<string, string> = {
  APROVADO:                 'APROVACAO_CADASTRO',
  REPROVADO:                'REPROVACAO_CADASTRO',
  BLOQUEADO:                'BLOQUEIO_USUARIO',
  BLOQUEADO_TEMPORARIAMENTE:'BLOQUEIO_TEMPORARIO',
  PENDENTE:                 'ALTERACAO_STATUS',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { status } = body as { status: approval_status }

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'Status inválido. Use: ' + VALID_STATUSES.join(', ') },
      { status: 400 }
    )
  }

  const now = new Date()
  const update: Record<string, unknown> = { status_aprovacao: status }

  if (status === 'APROVADO') update.aprovado_at = now
  else if (status === 'REPROVADO') update.reprovado_at = now
  else if (status === 'BLOQUEADO' || status === 'BLOQUEADO_TEMPORARIAMENTE') update.bloqueado_at = now

  // Buscar nome do afiliado para o log
  const target = await prisma.public_users.findUnique({
    where: { id },
    select: { nome_completo: true, email: true },
  })

  await prisma.public_users.update({
    where: { id },
    data: update,
  })

  // Log da ação
  const actorPublicUser = await prisma.public_users.findFirst({
    where: { auth_id: user.id },
    select: { id: true, nome_completo: true, email: true },
  })

  await logActivity({
    actorId:    actorPublicUser?.id ?? user.id,
    actorName:  actorPublicUser?.nome_completo ?? user.email,
    actorEmail: actorPublicUser?.email ?? user.email,
    action:     STATUS_TO_ACTION[status] ?? 'ALTERACAO_STATUS',
    entityType: 'usuario',
    entityId:   id,
    details: {
      novo_status:     status,
      afiliado_nome:   target?.nome_completo,
      afiliado_email:  target?.email,
    },
  })

  return NextResponse.json({ success: true, status })
}
