import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import MateriaisClient from '@/components/shared/MateriaisClient'

export default async function AfiliadoMateriaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  // Fetch all active casas with their materiais
  const { data: casasRaw } = await db
    .from('casas_aposta')
    .select('id, nome_exibicao, icone_url, casas_materiais_publicidade(id, nome, descricao, file_path, file_size, file_type)')
    .eq('ativo', true)
    .order('nome_exibicao', { ascending: true })

  const casas = (casasRaw ?? []).map((c: {
    id: string
    nome_exibicao: string
    icone_url: string | null
    casas_materiais_publicidade: {
      id: string
      nome: string
      descricao: string | null
      file_path: string | null
      file_size: number | null
      file_type: string | null
    }[]
  }) => ({
    id: c.id,
    nome_exibicao: c.nome_exibicao,
    icone_url: c.icone_url,
    materiais: c.casas_materiais_publicidade ?? [],
  }))

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Materiais de Publicidade</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Baixe banners, vídeos e materiais para divulgação das casas parceiras.
        </p>
      </div>
      <MateriaisClient casas={casas} />
    </div>
  )
}
