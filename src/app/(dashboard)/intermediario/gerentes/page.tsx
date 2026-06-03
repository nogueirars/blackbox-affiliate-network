import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function IntermediarioGerentesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Meus Gerentes</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Gerentes vinculados à sua rede
        </p>
      </div>
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">manage_accounts</span>
        <p className="text-sm font-medium opacity-60">Módulo em desenvolvimento</p>
        <p className="text-xs opacity-40">Lista de gerentes da sua rede estará disponível em breve.</p>
      </div>
    </div>
  )
}
