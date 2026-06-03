import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import GerentesClient from './GerentesClient'

export default async function AdminFinanceiroGerentesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const [gerentes, influencers] = await Promise.all([
    prisma.public_users.findMany({
      where: {
        ativo: true,
        user_roles: { some: { role: 'GERENTE' as never, ativo: true } },
      },
      select: { id: true, nome_completo: true, email: true, pix_key: true, pix_key_type: true },
      orderBy: { nome_completo: 'asc' },
    }),
    prisma.public_users.findMany({
      where: { ativo: true, id_gerente: { not: null } },
      select: {
        id: true,
        id_gerente: true,
        nome_completo: true,
        email: true,
        saques: {
          where: { ativo: true },
          select: { montante: true, status: true },
        },
      },
    }),
  ])

  const rows = gerentes.map(ger => {
    const myInfluencers = influencers.filter(u => u.id_gerente === ger.id)
    let pendente = 0
    let pago = 0
    let countSaques = 0
    for (const inf of myInfluencers) {
      for (const s of inf.saques) {
        const val = Number(s.montante)
        if (['AGUARDANDO_NF', 'PROCESSANDO'].includes(s.status as string)) pendente += val
        if (s.status === 'CONCLUIDO') pago += val
        countSaques++
      }
    }
    return {
      id: ger.id,
      nome: ger.nome_completo,
      email: ger.email,
      pix_key: ger.pix_key ?? null,
      pix_key_type: ger.pix_key_type ?? null,
      afiliados: myInfluencers.length,
      saques: countSaques,
      pendente,
      pago,
    }
  })

  const totalPendente = rows.reduce((a, r) => a + r.pendente, 0)
  const totalPago = rows.reduce((a, r) => a + r.pago, 0)
  const totalAfiliados = rows.reduce((a, r) => a + r.afiliados, 0)

  return (
    <GerentesClient
      rows={rows}
      totalPendente={totalPendente}
      totalPago={totalPago}
      totalAfiliados={totalAfiliados}
    />
  )
}
