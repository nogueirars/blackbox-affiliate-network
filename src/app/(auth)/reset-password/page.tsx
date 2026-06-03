'use client'

import { BlackboxLogo } from '@/components/ui/BlackboxLogo'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(173,198,255,0.12)',
  borderRadius: '10px',
  color: 'var(--color-on-surface)',
  fontSize: '14px',
  padding: '10px 44px 10px 14px',
  outline: 'none',
  transition: 'border-color 150ms, background 150ms',
}

function BLACKBOXalLogo() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center mb-5">
        <BlackboxLogo size={64} />
      </div>
      <h1 className="font-bold" style={{ fontSize: '2.25rem', lineHeight: 1, color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>
        BLACKBOX
      </h1>
      <p className="mt-2" style={{ fontSize: '13px', color: 'var(--color-outline)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AFFILIATES</p>
    </div>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Link inválido ou expirado. Solicite um novo link.')
      setExchanging(false)
      return
    }
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError('Link inválido ou expirado. Solicite um novo link.')
      setExchanging(false)
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  const strength = password.length >= 12 ? 4 : password.length >= 8 ? 3 : password.length >= 6 ? 2 : password.length > 0 ? 1 : 0
  const strengthColors = ['', '#F43F5E', '#f59e0b', '#adc6ff', '#22D3A5']

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

      <div className="w-full relative z-10 animate-fade-in" style={{ maxWidth: '26rem' }}>
        <BLACKBOXalLogo />

        <div
          className="rounded-2xl"
          style={{
            background: 'rgba(20,20,22,0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(173,198,255,0.1)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 40px 80px rgba(0,0,0,0.6)',
            padding: '2rem',
          }}
        >
          {exchanging ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <span className="material-symbols-outlined text-[36px] animate-spin" style={{ color: 'var(--color-primary)' }}>progress_activity</span>
              <p style={{ fontSize: '14px', color: 'var(--color-outline)' }}>Validando link…</p>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(34,211,165,0.15)' }}>
                <span className="material-symbols-outlined text-[28px]" style={{ color: '#22D3A5' }}>check_circle</span>
              </div>
              <h2 className="font-semibold mb-2" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface)' }}>Senha redefinida!</h2>
              <p style={{ fontSize: '14px', color: 'var(--color-outline)' }}>Redirecionando para o painel…</p>
            </div>
          ) : error && !password ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(244,63,94,0.12)' }}>
                <span className="material-symbols-outlined text-[28px]" style={{ color: '#F43F5E' }}>link_off</span>
              </div>
              <h2 className="font-semibold mb-2" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface)' }}>Link inválido</h2>
              <p style={{ fontSize: '14px', color: 'var(--color-outline)', marginBottom: '1.5rem' }}>{error}</p>
              <a
                href="/forgot-password"
                style={{
                  display: 'block', textAlign: 'center',
                  background: 'var(--color-primary-container)', color: 'var(--color-on-primary)',
                  border: 'none', borderRadius: '10px', padding: '11px',
                  fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                }}
              >
                Solicitar novo link
              </a>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 className="font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface)', marginBottom: '4px' }}>
                  Nova senha
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--color-outline)' }}>Escolha uma senha segura para sua conta</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: '6px', letterSpacing: '0.02em' }}>
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(173,198,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(173,198,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer', padding: '2px', lineHeight: 0 }}
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                      {[1, 2, 3, 4].map(lvl => (
                        <div key={lvl} style={{ height: '3px', flex: 1, borderRadius: '9999px', background: lvl <= strength ? strengthColors[strength] : 'var(--color-surface-container-highest)', transition: 'background 300ms' }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: '6px', letterSpacing: '0.02em' }}>
                    Confirmar senha
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repita a senha"
                    style={{ ...inputStyle, padding: '10px 14px' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(173,198,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(173,198,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  />
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,180,171,0.07)', border: '1px solid rgba(255,180,171,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                    <svg style={{ flexShrink: 0, marginTop: '1px' }} width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <circle cx="7.5" cy="7.5" r="7" stroke="var(--color-error)" strokeWidth="1.2" />
                      <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <p style={{ fontSize: '13px', color: 'var(--color-error)', lineHeight: 1.4 }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '4px',
                    background: 'var(--color-primary-container)', color: 'var(--color-on-primary)',
                    border: 'none', borderRadius: '10px', padding: '11px',
                    fontSize: '14px', fontWeight: 600,
                    opacity: loading ? 0.65 : 1, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%',
                  }}
                >
                  {loading ? (
                    <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Salvando…</>
                  ) : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center mt-6" style={{ fontSize: '12px', color: 'rgba(173,198,255,0.25)' }}>
          © 2026 BLACKBOX AFFILIATES
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <span className="material-symbols-outlined text-[36px] animate-spin" style={{ color: 'var(--color-primary)' }}>progress_activity</span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
