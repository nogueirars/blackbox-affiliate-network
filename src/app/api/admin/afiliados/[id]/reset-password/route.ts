import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth-helpers'
import { logActivity } from '@/lib/activity-log'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser || !isAdmin(currentUser.app_metadata)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const profile = await prisma.public_users.findUnique({
      where: { id },
      select: { email: true, nome_completo: true }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const origin = req.nextUrl.origin

    const { error } = await adminClient.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log da ação
    const actorPublicUser = await prisma.public_users.findFirst({
      where: { auth_id: currentUser.id },
      select: { id: true, nome_completo: true, email: true },
    })

    await logActivity({
      actorId:    actorPublicUser?.id ?? currentUser.id,
      actorName:  actorPublicUser?.nome_completo ?? currentUser.email,
      actorEmail: actorPublicUser?.email ?? currentUser.email,
      action:     'RESET_SENHA',
      entityType: 'usuario',
      entityId:   id,
      details: {
        afiliado_nome:  profile.nome_completo,
        afiliado_email: profile.email,
      },
    })

    return NextResponse.json({ success: true, message: 'E-mail de recuperação enviado com sucesso' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
