import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignRole, removeRole } from '@/services/profiles.service'

export async function POST(req: NextRequest) {
  // 1. Guard check: only admins can manage admins
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { nome_completo, email, password, telefone, data_nascimento } = body

  if (!nome_completo || !email || !password || !telefone || !data_nascimento) {
    return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser fornecidos.' }, { status: 400 })
  }

  // 2. Create the user in Supabase Auth via Admin Client
  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário de autenticação.' }, { status: 400 })
  }

  const authId = authData.user.id

  try {
    // 3. Create the user in public_users table
    const newUser = await prisma.public_users.create({
      data: {
        auth_id: authId,
        nome_completo,
        email,
        telefone,
        data_nascimento: new Date(data_nascimento),
        status_aprovacao: 'APROVADO',
        ativo: true,
      },
    })

    // 4. Assign ADMIN role (handles user_roles record creation and syncs auth metadata)
    await assignRole(newUser.id, 'ADMIN')

    return NextResponse.json({ success: true, id: newUser.id })
  } catch (err) {
    // Rollback: delete Auth user if db insert fails
    await adminClient.auth.admin.deleteUser(authId)
    console.error('[create admin error]', err)
    return NextResponse.json({ error: 'Erro interno ao salvar os dados do administrador no banco de dados.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  // Guard check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id, action, ativo, nome_completo, telefone, data_nascimento, password } = body

  if (!id) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 })
  }

  // Edit details or password
  if (nome_completo !== undefined || telefone !== undefined || data_nascimento !== undefined || password !== undefined) {
    const updateData: any = {}
    if (nome_completo !== undefined) updateData.nome_completo = nome_completo
    if (telefone !== undefined) updateData.telefone = telefone
    if (data_nascimento !== undefined) updateData.data_nascimento = new Date(data_nascimento)

    if (Object.keys(updateData).length > 0) {
      await prisma.public_users.update({
        where: { id },
        data: updateData,
      })
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
      }
      const targetUser = await prisma.public_users.findUnique({
        where: { id },
        select: { auth_id: true },
      })
      if (!targetUser?.auth_id) {
        return NextResponse.json({ error: 'Usuário não vinculado à autenticação.' }, { status: 400 })
      }

      const adminClient = createAdminClient()
      const { error: authError } = await adminClient.auth.admin.updateUserById(targetUser.auth_id, {
        password,
      })

      if (authError) {
        return NextResponse.json({ error: authError.message ?? 'Erro ao atualizar a senha.' }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  }

  // Prevent locking out the system if removing the last active admin
  if (action === 'remove' || (typeof ativo === 'boolean' && !ativo)) {
    // Count active admins
    const activeAdminsCount = await prisma.user_roles.count({
      where: {
        role: 'ADMIN',
        ativo: true,
      },
    })

    // Check if the user being updated is one of the active admins
    const isTargetActiveAdmin = await prisma.user_roles.findFirst({
      where: {
        id_usuario: id,
        role: 'ADMIN',
        ativo: true,
      },
    })

    if (isTargetActiveAdmin && activeAdminsCount <= 1) {
      return NextResponse.json(
        { error: 'Operação cancelada. Não é permitido desativar o único administrador ativo do sistema.' },
        { status: 400 }
      )
    }
  }

  // Toggle admin active status completely (suspend user)
  if (typeof ativo === 'boolean') {
    await prisma.public_users.update({
      where: { id },
      data: {
        ativo,
        status_aprovacao: ativo ? 'APROVADO' : 'BLOQUEADO',
      },
    })

    if (!ativo) {
      await removeRole(id, 'ADMIN')
    } else {
      await assignRole(id, 'ADMIN')
    }

    return NextResponse.json({ success: true })
  }

  // Toggle role only
  if (action === 'assign') {
    await assignRole(id, 'ADMIN')
  } else if (action === 'remove') {
    await removeRole(id, 'ADMIN')
  } else {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
