import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ContratosClient from './ContratosClient'

export default async function AdminContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; casa?: string; role?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const filter  = params.filter ?? 'ativo'
  const page    = Math.max(1, parseInt(params.page ?? '1'))
  const casaId  = params.casa ?? ''
  const role    = params.role ?? ''
  const q       = params.q ?? ''
  const limit   = 25
  const offset  = (page - 1) * limit
  const isAtivo = filter === 'ativo'

  const baseWhere = {
    ativo: isAtivo,
    ...(casaId ? { id_casa: casaId } : {}),
    ...(role ? { user_roles: { role: role as never } } : {}),
    ...(q ? {
      OR: [
        { afp: { contains: q, mode: 'insensitive' as const } },
        { user_roles: { users: { nome_completo: { contains: q, mode: 'insensitive' as const } } } },
        { user_roles: { users: { email: { contains: q, mode: 'insensitive' as const } } } },
      ],
    } : {}),
  }

  const contratosQuery = () => prisma.contratos.findMany({
    where: baseWhere,
    select: {
      id: true, id_user_role: true, id_casa: true,
      afp: true, tipo_contrato: true, ativo: true, created_at: true,
      user_roles: {
        select: {
          id_usuario: true,
          users: { select: { id: true, nome_completo: true, email: true } },
        },
      },
      casas_aposta: { select: { id: true, nome_exibicao: true } },
    },
    orderBy: { created_at: 'desc' },
    skip: offset,
    take: limit,
  })

  let contratosRaw: Awaited<ReturnType<typeof contratosQuery>> = []
  let total = 0
  let allCasas: { id: string; nome_exibicao: string }[] = []

  try {
    ;[contratosRaw, total, allCasas] = await Promise.all([
      contratosQuery(),
      prisma.contratos.count({ where: baseWhere }),

      prisma.casas_aposta.findMany({
        where: { ativo: true },
        select: { id: true, nome_exibicao: true },
        orderBy: { nome_exibicao: 'asc' },
      }),
    ])
  } catch (e) {
    console.error('[admin/contratos] prisma error:', e)
    return (
      <ContratosClient
        contratos={[]}
        casas={[]}
        userMap={{}}
        casaMap={{}}
        roleToUserMap={{}}
        filter="ativo"
        count={0}
        page={1}
        totalPages={0}
        currentCasa=""
        currentRole=""
        currentQ=""
      />
    )
  }

  // Build maps from included data (no extra queries needed)
  const roleToUserMap: Record<string, string> = {}
  const userMap:       Record<string, string> = {}
  const casaMap:       Record<string, string> = {}

  for (const c of contratosRaw) {
    const userId = c.user_roles?.id_usuario
    if (userId) {
      roleToUserMap[c.id_user_role] = userId
      const name = c.user_roles?.users?.nome_completo ?? c.user_roles?.users?.email ?? userId.slice(0, 8) + '…'
      userMap[c.id_user_role] = name
    }
    if (c.casas_aposta) casaMap[c.id_casa] = c.casas_aposta.nome_exibicao
  }

  const contratos = contratosRaw.map(c => ({
    id:           c.id,
    id_user_role: c.id_user_role,
    id_casa:      c.id_casa,
    afp:          c.afp,
    tipo_contrato: String(c.tipo_contrato),
    ativo:        c.ativo,
    created_at:   c.created_at.toISOString(),
  }))

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <ContratosClient
        contratos={contratos}
        casas={allCasas}
        userMap={userMap}
        casaMap={casaMap}
        roleToUserMap={roleToUserMap}
        filter={filter}
        count={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
        currentCasa={casaId}
        currentRole={role}
        currentQ={q}
      />
    </div>
  )
}
