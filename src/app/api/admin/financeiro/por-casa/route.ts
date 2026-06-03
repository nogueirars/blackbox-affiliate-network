import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth-helpers'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.app_metadata)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const casaId  = searchParams.get('casa_id')  ?? ''
  const perfil  = searchParams.get('perfil')   ?? ''
  const fromStr = searchParams.get('from')     ?? ''
  const toStr   = searchParams.get('to')       ?? ''

  const now = new Date()
  const dateFrom = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1)
  const dateTo   = toStr   ? new Date(toStr)   : now

  const producaoWhere: Prisma.producao_dadosWhereInput = {
    data: { gte: dateFrom, lte: dateTo },
  }
  if (casaId) producaoWhere.id_casa = casaId

  const [producaoRows, contratosData, casaMap, saquesMap] = await Promise.all([
    prisma.producao_dados.groupBy({
      by: ['id_contrato', 'id_casa'],
      where: producaoWhere,
      _sum: { receita_bruta: true },
      orderBy: { _sum: { receita_bruta: 'desc' } },
      take: 300,
    }),
    prisma.contratos.findMany({
      where: { ativo: true },
      select: {
        id: true,
        tipo_contrato: true,
        user_roles: {
          select: {
            id_usuario: true,
            users: { select: { id: true, nome_completo: true, email: true } },
          },
        },
      },
    }),
    prisma.casas_aposta.findMany({
      where: { ativo: true },
      select: { id: true, nome_exibicao: true },
    }),
    prisma.saques.groupBy({
      by: ['id_usuario'],
      where: { ativo: true, status: 'CONCLUIDO' },
      _sum: { montante: true },
    }),
  ])

  // Map: id_contrato → { nome, email, tipo, id_usuario }
  const contratoInfo: Record<string, { nome: string; email: string; tipo: string | null; id_usuario: string }> = {}
  for (const c of contratosData) {
    const u = c.user_roles.users
    contratoInfo[c.id] = {
      nome:       u?.nome_completo ?? '—',
      email:      u?.email        ?? '',
      tipo:       c.tipo_contrato ? String(c.tipo_contrato) : null,
      id_usuario: c.user_roles.id_usuario,
    }
  }

  const casas: Record<string, string> = {}
  for (const c of casaMap) casas[c.id] = c.nome_exibicao

  const saquesPorUser: Record<string, number> = {}
  for (const s of saquesMap) saquesPorUser[s.id_usuario] = Number(s._sum.montante ?? 0)

  let rows = producaoRows
    .filter(r => {
      if (!perfil) return true
      return contratoInfo[r.id_contrato]?.tipo === perfil
    })
    .map(r => {
      const info    = contratoInfo[r.id_contrato]
      const receita = Number(r._sum?.receita_bruta ?? 0)
      const pago    = saquesPorUser[info?.id_usuario ?? ''] ?? 0
      const aReceber = Math.max(0, receita - pago)
      return {
        nome:      info?.nome  ?? r.id_contrato.slice(0, 8) + '…',
        email:     info?.email ?? '',
        casa:      casas[r.id_casa] ?? r.id_casa,
        receita,
        pago,
        aReceber,
      }
    })
    .filter(r => r.aReceber > 0)

  rows = rows.sort((a, b) => b.aReceber - a.aReceber)

  return NextResponse.json({ rows })
}
