import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueRefCode } from '@/lib/ref-code'
import { syncClaim } from '@/services/profiles.service'
import { user_role } from '@prisma/client'

const ROLE_INVITE_MAP: Partial<Record<user_role, user_role>> = {
  INTERMEDIARIO: 'GERENTE',
  GERENTE: 'INFLUENCER',
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    ref_code,
    email,
    password,
    nome_completo,
    cpf,
    data_nascimento,
    telefone,
    instagram,
    telegram_canal,
    whatsapp_canal,
  } = body

  if (!email || !password || !nome_completo || !data_nascimento || !telefone) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  let papelDestino: user_role = 'INFLUENCER'
  let idGerente: string | null = null
  let idIntermediario: string | null = null

  if (ref_code) {
    const userRole = await prisma.user_roles.findUnique({
      where: { ref_code: ref_code.toUpperCase() },
      select: {
        role: true,
        ativo: true,
        users: { select: { id: true } },
      },
    })

    if (!userRole || !userRole.ativo) {
      return NextResponse.json({ error: 'Código de convite inválido.' }, { status: 400 })
    }

    const destino = ROLE_INVITE_MAP[userRole.role]
    if (!destino) {
      return NextResponse.json({ error: 'Este código não permite convites.' }, { status: 400 })
    }

    papelDestino = destino
    const idConvidante = userRole.users.id
    if (papelDestino === 'INFLUENCER') idGerente = idConvidante
    else if (papelDestino === 'GERENTE') idIntermediario = idConvidante
  }

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário.' }, { status: 400 })
  }

  const authId = authData.user.id

  try {
    const novoRefCode = await generateUniqueRefCode()

    // M1: todas as escritas Prisma em uma única transação
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.public_users.create({
        data: {
          auth_id: authId,
          nome_completo,
          cpf: cpf ?? null,
          data_nascimento: new Date(data_nascimento),
          telefone,
          email,
          id_gerente: idGerente,
          id_intermediario: idIntermediario,
        },
      })

      await tx.user_roles.create({
        data: { id_usuario: user.id, role: papelDestino, ref_code: novoRefCode },
      })

      if (instagram || telegram_canal || whatsapp_canal) {
        await tx.user_socials.create({
          data: {
            user_id: user.id,
            instagram: instagram ?? null,
            telegram_canal: telegram_canal ?? null,
            whatsapp_canal: whatsapp_canal ?? null,
          },
        })
      }

      return user
    })

    // syncClaim fora da transação (opera no Supabase Auth, não no DB)
    syncClaim(newUser.id).catch(err =>
      console.error('[register] syncClaim falhou — JWT sem role:', err)
    )

    return NextResponse.json({
      success: true,
      user_id: newUser.id,
      papel: papelDestino,
      ref_code: novoRefCode,
    })
  } catch (err) {
    await admin.auth.admin.deleteUser(authId)
    console.error('[register] erro ao criar usuário:', err)
    return NextResponse.json({ error: 'Erro interno ao criar cadastro.' }, { status: 500 })
  }
}
