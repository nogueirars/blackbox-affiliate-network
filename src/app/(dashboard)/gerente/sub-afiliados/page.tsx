import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SubAfiliadosClient from './components/SubAfiliadosClient'

export default async function GerenteSubAfiliadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const publicUser = await prisma.public_users.findUnique({
    where: { auth_id: user.id },
    select: { id: true }
  })

  let subAfiliados: any[] = []
  let refCode: string | null = null

  if (publicUser) {
    const [subs, gerenteRole] = await Promise.all([
      prisma.public_users.findMany({
        where: { id_gerente: publicUser.id },
        select: {
          id: true,
          nome_completo: true,
          email: true,
          status_aprovacao: true,
          created_at: true,
          premium: true,
          user_roles: {
            select: {
              contratos: {
                where: { ativo: true },
                select: {
                  id: true,
                  tipo_contrato: true,
                  afp: true,
                  casas_aposta: { select: { nome_exibicao: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.user_roles.findFirst({
        where: { id_usuario: publicUser.id, role: 'GERENTE', ativo: true },
        select: { ref_code: true }
      })
    ])
    subAfiliados = subs
    refCode = gerenteRole?.ref_code ?? null
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)] mb-1">Influenciadores</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)]">
          Gerencie os influenciadores da sua rede
        </p>
      </div>

      <SubAfiliadosClient subAfiliados={subAfiliados} refCode={refCode} />
    </div>
  )
}
