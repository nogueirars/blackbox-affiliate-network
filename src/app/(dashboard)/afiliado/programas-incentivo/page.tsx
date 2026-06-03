import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AfiliadoProgramasIncentivosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Programas de Incentivo</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Campanhas e bônus disponíveis para você
        </p>
      </div>
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">star</span>
        <p className="text-sm font-medium opacity-60">Nenhum programa ativo</p>
        <p className="text-xs opacity-40">Programas de incentivo aparecerão aqui quando disponíveis.</p>
      </div>
    </div>
  )
}
