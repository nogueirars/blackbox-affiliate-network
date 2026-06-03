import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import CasasClient from './CasasClient'

export default async function AdminCasasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const db = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let casas: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let entidades: any[] = []

  try {
    const [casasRes, entidadesRes] = await Promise.all([
      db
        .from('casas_aposta')
        .select('id, nome_exibicao, razao_social, icone_url, affiliate_url, ativo, created_at, id_entidade, entidades(id, razao_social, nome_fantasia), casas_regras(id), casas_materiais_publicidade(count)')
        .order('nome_exibicao', { ascending: true })
        .limit(200),
      db
        .from('entidades')
        .select('id, razao_social, nome_fantasia')
        .eq('ativo', true)
        .order('nome_fantasia', { ascending: true }),
    ])

    if (!casasRes.error && casasRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      casas = (casasRes.data as any[]).map((c: any) => ({
        ...c,
        entidades: c.entidades
          ? { id: c.entidades.id, nome: c.entidades.nome_fantasia || c.entidades.razao_social || '' }
          : null,
        tem_regras: Array.isArray(c.casas_regras) && c.casas_regras.length > 0,
        materiais_count: c.casas_materiais_publicidade?.[0]?.count ?? 0,
      }))
    }
    if (!entidadesRes.error && entidadesRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entidades = (entidadesRes.data as any[]).map((e: any) => ({
        id: e.id,
        nome: e.nome_fantasia || e.razao_social || '',
      }))
    }
  } catch { /* ignore */ }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <CasasClient casas={casas} entidades={entidades} />
    </div>
  )
}
