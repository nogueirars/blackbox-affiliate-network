import { BlackboxLogo } from '@/components/ui/BlackboxLogo'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { clearImpersonationCookie } from '@/app/actions/impersonation'

export default async function AguardandoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  async function logout() {
    'use server'
    await clearImpersonationCookie()
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#000' }}
    >
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(75,142,255,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(173,198,255,0.05) 0%, transparent 60%)',
      }} />
      <div className="pointer-events-none absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <svg width="900" height="900" viewBox="0 0 900 900" fill="none" opacity="0.04">
          <circle cx="450" cy="450" r="200" stroke="#adc6ff" strokeWidth="1" />
          <circle cx="450" cy="450" r="300" stroke="#adc6ff" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="450" cy="450" r="400" stroke="#adc6ff" strokeWidth="1" strokeDasharray="2 12" />
        </svg>
      </div>

      <div className="relative z-10 w-full" style={{ maxWidth: '28rem' }}>
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <BlackboxLogo size={64} />
          </div>
          <h1 className="font-bold tracking-[-0.05em]" style={{ fontSize: '2.25rem', lineHeight: 1, color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>
            BLACKBOX
          </h1>
          <p className="mt-2" style={{ fontSize: '13px', color: 'var(--color-outline)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AFFILIATES</p>
        </div>

        <div
          className="rounded-2xl flex flex-col items-center gap-6 text-center"
          style={{
            background: 'rgba(20, 20, 22, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(173, 198, 255, 0.1)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 40px 80px rgba(0,0,0,0.6)',
            padding: '2.5rem 2rem',
          }}
        >
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.25)' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <div>
            <h2 className="font-bold text-xl mb-2" style={{ color: 'var(--color-on-surface)' }}>
              Cadastro em análise
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-outline)', lineHeight: 1.6 }}>
              Seu cadastro está sendo revisado pela nossa equipe. Você receberá um e-mail assim que sua conta for aprovada.
            </p>
          </div>

          <div
            className="w-full rounded-xl p-4"
            style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#facc15' }}>
              Status atual
            </p>
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
              Aguardando aprovação
            </p>
          </div>

          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(173,198,255,0.12)',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              Sair da conta
            </button>
          </form>
        </div>

        <p className="text-center mt-6" style={{ fontSize: '12px', color: 'var(--color-outline-variant)' }}>
          © 2026 BLACKBOX AFFILIATES
        </p>
      </div>
    </div>
  )
}
