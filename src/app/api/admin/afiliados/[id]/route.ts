import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { assignRole, removeRole } from '@/services/profiles.service'
import { isAdmin } from '@/lib/auth-helpers'
import { user_role } from '@prisma/client'
import { logActivity } from '@/lib/activity-log'

const VALID_ROLES = Object.values(user_role)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const db = createAdminClient()

  const [profileRaw, contratosRaw, saquesRes] = await Promise.all([
    prisma.public_users.findUnique({
      where: { id },
      select: {
        id: true,
        auth_id: true,
        nome_completo: true,
        email: true,
        created_at: true,
        user_roles: {
          where: { ativo: true },
          select: { id: true, role: true },
          orderBy: { created_at: 'desc' },
        },
      },
    }),
    prisma.contratos.findMany({
      where: { user_roles: { id_usuario: id } },
      select: { id: true, id_casa: true, afp: true, tipo_contrato: true, ativo: true, created_at: true, casas_aposta: { select: { nome_exibicao: true } } },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),
    db.from('saques')
      .select('id, montante, status, created_at')
      .eq('id_usuario', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!profileRaw) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const roles = profileRaw.user_roles.map(ur => ur.role)

  return NextResponse.json({
    profile: { ...profileRaw, user_roles: undefined },
    roles,
    saques: saquesRes.data ?? [],
    contratos: contratosRaw,
  })
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
  const { role, action = 'assign', roles } = body

  // Buscar actor e target para o log
  const [actorPublicUser, targetUser] = await Promise.all([
    prisma.public_users.findFirst({
      where: { auth_id: user.id },
      select: { id: true, nome_completo: true, email: true },
    }),
    prisma.public_users.findUnique({
      where: { id },
      select: { nome_completo: true, email: true },
    }),
  ])

  if (roles && Array.isArray(roles)) {
    const invalidRole = roles.find(r => !VALID_ROLES.includes(r))
    if (invalidRole) {
      return NextResponse.json(
        { error: `Role inválido: ${invalidRole}. Use: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    const currentActiveRows = await prisma.user_roles.findMany({
      where: { id_usuario: id, ativo: true },
      select: { role: true },
    })
    const currentRoles = currentActiveRows.map(r => r.role)

    const toAdd = roles.filter(r => !currentRoles.includes(r))
    const toRemove = currentRoles.filter(r => !roles.includes(r))

    for (const r of toAdd) {
      await assignRole(id, r as user_role)
    }
    for (const r of toRemove) {
      await removeRole(id, r as user_role)
    }

    await logActivity({
      actorId:    actorPublicUser?.id ?? user.id,
      actorName:  actorPublicUser?.nome_completo ?? user.email,
      actorEmail: actorPublicUser?.email ?? user.email,
      action:     'ALTERACAO_ROLES',
      entityType: 'usuario',
      entityId:   id,
      details: {
        afiliado_nome:  targetUser?.nome_completo,
        afiliado_email: targetUser?.email,
        roles_anteriores: currentRoles,
        roles_novos:      roles,
        adicionados:      toAdd,
        removidos:        toRemove,
      },
    })

    return NextResponse.json({ success: true, roles })
  }

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Role inválido. Use: ' + VALID_ROLES.join(', ') },
      { status: 400 }
    )
  }

  if (!['assign', 'remove'].includes(action)) {
    return NextResponse.json(
      { error: 'Action inválido. Use: assign | remove' },
      { status: 400 }
    )
  }

  if (action === 'assign') {
    await assignRole(id, role as user_role)
  } else {
    await removeRole(id, role as user_role)
  }

  await logActivity({
    actorId:    actorPublicUser?.id ?? user.id,
    actorName:  actorPublicUser?.nome_completo ?? user.email,
    actorEmail: actorPublicUser?.email ?? user.email,
    action:     'ALTERACAO_ROLES',
    entityType: 'usuario',
    entityId:   id,
    details: {
      afiliado_nome:  targetUser?.nome_completo,
      afiliado_email: targetUser?.email,
      role,
      action,
    },
  })

  return NextResponse.json({ success: true, role, action })
}
