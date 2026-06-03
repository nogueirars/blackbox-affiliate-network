import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function IntermediarioProgramasIncentivoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-[var(--color-on-surface)]">Programas de Incentivo</h1>
        <p className="text-body-md text-[var(--color-on-surface-variant)] mt-1">
          Programas disponíveis, metas e estrutura de comissões
        </p>
      </div>

      {/* Em desenvolvimento */}
      <div className="glass-card rounded-2xl py-24 flex flex-col items-center gap-4 text-center px-6">
        <span className="material-symbols-outlined text-[56px] opacity-20">workspace_premium</span>
        <div>
          <p className="text-headline-md font-semibold text-[var(--color-on-surface)]">Módulo em desenvolvimento</p>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1 max-w-sm">
            Os programas de incentivo com estrutura de tiers e metas por rede serão configurados
            pela plataforma e estarão disponíveis em breve.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium" style={{ background: 'rgba(2,117,243,0.08)', borderColor: 'rgba(2,117,243,0.25)', color: 'var(--color-primary)' }}>
          <span className="material-symbols-outlined text-[14px]">construction</span>
          Em breve
        </div>
      </div>
    </div>
  )
}
