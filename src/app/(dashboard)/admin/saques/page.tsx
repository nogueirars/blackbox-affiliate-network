import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SaquesAdminClient from './SaquesAdminClient'

export default async function AdminSaquesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const rawSaques = await prisma.saques.findMany({
    where: { ativo: true },
    orderBy: { created_at: 'desc' },
    take: 300,
    include: {
      users: {
        select: {
          nome_completo: true,
          email: true,
          cnpj: true,
          users_users_id_gerenteTousers: {
            select: { nome_completo: true },
          },
        },
      },
    },
  })

  const saques = rawSaques.map(s => ({
    id: s.id,
    id_usuario: s.id_usuario,
    valor: Number(s.montante),
    status: s.status as string,
    pix_key: s.pix_key ?? undefined,
    pix_key_type: s.pix_key_type ?? undefined,
    cnpj: s.cnpj ?? undefined,               // CNPJ da empresa p/ faturamento (do formulário)
    razao_social: s.razao_social ?? undefined,
    telefone: s.telefone ?? undefined,
    nota_fiscal: s.nota_fiscal ?? undefined,
    motivo_correcao_nf: s.motivo_correcao_nf ?? undefined,
    saque_valido: s.saque_valido,
    created_at: s.created_at.toISOString(),
    efetivado_at: s.efetivado_at?.toISOString() ?? undefined,
    user: s.users
      ? {
          nome_completo: s.users.nome_completo,
          email: s.users.email,
          cnpj: s.users.cnpj ?? undefined,   // CNPJ do perfil do usuário (diferente do acima)
          gerente_nome: s.users.users_users_id_gerenteTousers?.nome_completo ?? undefined,
        }
      : null,
  }))

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <SaquesAdminClient saques={saques} />
    </div>
  )
}
