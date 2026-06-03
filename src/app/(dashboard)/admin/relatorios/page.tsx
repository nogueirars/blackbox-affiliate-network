import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Relatórios</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Relatórios financeiros e de produção
        </p>
      </div>
      <div className="glass-card rounded-xl py-20 flex flex-col items-center gap-3 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[48px] opacity-30">summarize</span>
        <p className="text-sm font-medium opacity-60">Módulo em desenvolvimento</p>
        <p className="text-xs opacity-40">Relatórios serão disponibilizados em breve.</p>
      </div>
    </div>
  )
}
