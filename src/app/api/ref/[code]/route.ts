import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { user_role } from '@prisma/client'

// Mapa: papel de quem convida → papel que o novo usuário terá
const ROLE_INVITE_MAP: Partial<Record<user_role, user_role>> = {
  INTERMEDIARIO: 'GERENTE',
  GERENTE: 'AFILIADO',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const userRole = await prisma.user_roles.findUnique({
    where: { ref_code: code.toUpperCase() },
    select: {
      id: true,
      role: true,
      ativo: true,
      users: {
        select: {
          id: true,
          nome_completo: true,
        },
      },
    },
  })

  if (!userRole || !userRole.ativo) {
    return NextResponse.json({ error: 'Código de convite inválido ou expirado.' }, { status: 404 })
  }

  const rolePapelDestino = ROLE_INVITE_MAP[userRole.role]
  if (!rolePapelDestino) {
    return NextResponse.json({ error: 'Este código não permite convites.' }, { status: 400 })
  }

  return NextResponse.json({
    ref_code: code.toUpperCase(),
    convidante: {
      id: userRole.users.id,
      nome: userRole.users.nome_completo,
      role: userRole.role,
    },
    papel_destino: rolePapelDestino, // papel que o novo usuário vai receber
  })
}
