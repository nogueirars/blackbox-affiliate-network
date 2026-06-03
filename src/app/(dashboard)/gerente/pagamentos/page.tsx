import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PagamentosClient from './components/PagamentosClient'

export default async function GerentePagamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)] mb-1">Histórico de Pagamentos</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)]">
          Acompanhe todos os pagamentos recebidos e repassados
        </p>
      </div>

      <PagamentosClient />
    </div>
  )
}
