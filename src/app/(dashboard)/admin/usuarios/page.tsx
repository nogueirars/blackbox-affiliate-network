import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UsuariosTableClient from './UsuariosTableClient'
import type { Prisma } from '@prisma/client'

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const q = params.q ?? ''

  // 1. Where clause for admins
  const where: Prisma.public_usersWhereInput = {
    user_roles: {
      some: {
        role: 'ADMIN',
      },
    },
  }

  if (q) {
    where.OR = [
      { nome_completo: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  // 2. Fetch all administrators from database
  const adminUsers = await prisma.public_users.findMany({
    where,
    select: {
      id: true,
      nome_completo: true,
      email: true,
      telefone: true,
      data_nascimento: true,
      created_at: true,
      ativo: true,
      status_aprovacao: true,
      user_roles: {
        select: {
          role: true,
          ativo: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  // 3. Render layout & client component
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Usuários Administradores</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Gerencie o acesso administrativo e crie novos administradores para o sistema
        </p>
      </div>

      <UsuariosTableClient
        admins={adminUsers as any}
        currentUserEmail={user.email ?? ''}
        q={q}
      />
    </div>
  )
}
