import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import EntidadesClient from './EntidadesClient'

export default async function AdminEntidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const entidades = await prisma.entidades.findMany({
    select: {
      id:            true,
      razao_social:  true,
      nome_fantasia: true,
      cnpj:          true,
      logradouro:    true,
      numero:        true,
      complemento:   true,
      bairro:        true,
      cidade:        true,
      estado:        true,
      cep:           true,
      ativo:         true,
      created_at:    true,
      _count: { select: { casas_aposta: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 200,
  })

  const serialized = entidades.map(e => ({
    ...e,
    created_at: e.created_at.toISOString(),
    complemento: e.complemento ?? null,
  }))

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <EntidadesClient entidades={serialized} />
    </div>
  )
}
