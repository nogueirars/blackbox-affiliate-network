import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSaqueById, updateSaqueStatus } from '@/services/saques.service'
import { isAdmin } from '@/lib/auth-helpers'
import { logActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'

const VALID_TRANSITIONS: Record<string, string[]> = {
  AGUARDANDO_LIBERACAO: ['AGUARDANDO_NF', 'MANUAL', 'FALHA'],
  AGUARDANDO_NF:        ['PROCESSANDO', 'FALHA'],
  PROCESSANDO:          ['MANUAL', 'AGUARDANDO_NF', 'FALHA'],
  MANUAL:               ['CONCLUIDO', 'FALHA'],
  FALHA:                ['AGUARDANDO_LIBERACAO', 'AGUARDANDO_NF'],
  CONCLUIDO:            [],
}

function resolveAction(prev: string, next: string): string {
  if (next === 'CONCLUIDO')       return 'SAQUE_APROVADO'
  if (next === 'FALHA')           return 'SAQUE_FALHA'
  if (next === 'MANUAL')          return 'SAQUE_MANUAL'
  if (next === 'AGUARDANDO_NF' && prev === 'AGUARDANDO_LIBERACAO') return 'SAQUE_LIBERADO'
  if (next === 'AGUARDANDO_NF' && prev === 'PROCESSANDO')          return 'SAQUE_CORRECAO_NF'
  if (next === 'AGUARDANDO_LIBERACAO')                              return 'SAQUE_REPROCESSADO'
  return 'SAQUE_STATUS_ALTERADO'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { status: nextStatus, motivo } = body

  if (!nextStatus) {
    return NextResponse.json({ error: 'status obrigatório' }, { status: 400 })
  }

  const saque = await getSaqueById(id)
  if (!saque) {
    return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
  }

  const allowed = VALID_TRANSITIONS[saque.status] ?? []
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Transição inválida: ${saque.status} → ${nextStatus}` },
      { status: 400 }
    )
  }

  const updates: Parameters<typeof updateSaqueStatus>[1] = { status: nextStatus }
  if (nextStatus === 'CONCLUIDO') updates.efetivado_at = new Date()
  if (nextStatus === 'AGUARDANDO_NF' && saque.status === 'PROCESSANDO' && motivo) {
    updates.motivo_correcao_nf = motivo
    updates.correcao_nf_solicitada_em = new Date()
  }
  if (nextStatus === 'AGUARDANDO_NF' && saque.status === 'AGUARDANDO_LIBERACAO') {
    updates.motivo_correcao_nf = null
    updates.correcao_nf_solicitada_em = null
  }

  const updated = await updateSaqueStatus(id, updates)

  // Log da ação
  const actorPublicUser = await prisma.public_users.findFirst({
    where: { auth_id: user.id },
    select: { id: true, nome_completo: true, email: true },
  })

  await logActivity({
    actorId:    actorPublicUser?.id ?? user.id,
    actorName:  actorPublicUser?.nome_completo ?? user.email,
    actorEmail: actorPublicUser?.email ?? user.email,
    action:     resolveAction(saque.status, nextStatus),
    entityType: 'saque',
    entityId:   id,
    details: {
      status_anterior: saque.status,
      novo_status:     nextStatus,
      montante:        saque.montante,
      id_usuario:      saque.id_usuario,
      ...(motivo ? { motivo } : {}),
    },
  })

  return NextResponse.json(updated)
}
