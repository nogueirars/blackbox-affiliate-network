'use client'

import { BlackboxLogo } from '@/components/ui/BlackboxLogo'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(173,198,255,0.12)',
  borderRadius: '10px',
  color: 'var(--color-on-surface)',
  fontSize: '14px',
  padding: '10px 14px 10px 40px',
  outline: 'none',
  transition: 'border-color 150ms, background 150ms',
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#000' }}
    >
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(75,142,255,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(173,198,255,0.05) 0%, transparent 60%)',
      }} />

      {/* BLACKBOXal rings */}
      <div className="pointer-events-none absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <svg width="900" height="900" viewBox="0 0 900 900" fill="none" opacity="0.04">
          <circle cx="450" cy="450" r="200" stroke="#adc6ff" strokeWidth="1" />
          <circle cx="450" cy="450" r="300" stroke="#adc6ff" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="450" cy="450" r="400" stroke="#adc6ff" strokeWidth="1" strokeDasharray="2 12" />
        </svg>
      </div>

      <div className="w-full relative z-10 animate-fade-in" style={{ maxWidth: '26rem' }}>
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <BlackboxLogo size={64} />
          </div>
          <h1 className="font-bold" style={{ fontSize: '2.25rem', lineHeight: 1, color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>
            BLACKBOX
          </h1>
          <p className="mt-2" style={{ fontSize: '13px', color: 'var(--color-outline)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AFFILIATES</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl"
          style={{
            background: 'rgba(20,20,22,0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(173,198,255,0.1)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(75,142,255,0.04)',
            padding: '2rem',
          }}
        >
          {sent ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(34,211,165,0.15)' }}
              >
                <span className="material-symbols-outlined text-[28px]" style={{ color: '#22D3A5' }}>mark_email_read</span>
              </div>
              <h2 className="font-semibold mb-2" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface)' }}>
                Email enviado
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-outline)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Enviamos um link de recuperação para{' '}
                <strong style={{ color: 'var(--color-on-surface)' }}>{email}</strong>.
                Verifique sua caixa de entrada (e o spam).
              </p>
              <Link
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(173,198,255,0.15)',
                  borderRadius: '10px',
                  color: 'var(--color-on-surface-variant)',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background 150ms',
                }}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 className="font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface)', marginBottom: '4px' }}>
                  Recuperar senha
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--color-outline)' }}>
                  Informe seu e-mail para receber o link de redefinição
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="email"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: '6px', letterSpacing: '0.02em' }}
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <span className="absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', lineHeight: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      autoComplete="email"
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(173,198,255,0.4)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(173,198,255,0.12)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: 'rgba(255,180,171,0.07)', border: '1px solid rgba(255,180,171,0.2)',
                    borderRadius: '10px', padding: '10px 12px',
                  }}>
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
                    background: 'var(--color-primary-container)',
                    color: 'var(--color-on-primary)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px',
                    fontSize: '14px',
                    fontWeight: 600,
                    opacity: loading ? 0.65 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      Enviando…
                    </>
                  ) : 'Enviar link de recuperação'}
                </button>
              </form>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Link
                  href="/login"
                  style={{ fontSize: '13px', color: 'var(--color-outline)', textDecoration: 'none', transition: 'color 150ms' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-outline)' }}
                >
                  ← Voltar ao login
                </Link>
              </div>
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
