import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function GerenteCampanhasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Campanhas</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Campanhas ativas para sua rede
        </p>
      </div>
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">campaign</span>
        <p className="text-sm font-medium opacity-60">Nenhuma campanha ativa</p>
        <p className="text-xs opacity-40">Campanhas disponíveis para sua rede aparecerão aqui.</p>
      </div>
    </div>
  )
}
