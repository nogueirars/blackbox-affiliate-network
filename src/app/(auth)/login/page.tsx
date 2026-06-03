'use client'

import { BlackboxLogo } from '@/components/ui/BlackboxLogo'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DevQuickLogin } from './DevQuickLogin'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10 relative overflow-hidden"
      style={{ background: '#05050a' }}
    >
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div style={{
          position: 'absolute', top: '-15%', left: '-5%',
          width: '55%', height: '55%',
          background: 'radial-gradient(circle, rgba(75,142,255,0.2) 0%, transparent 70%)',
          filter: 'blur(72px)',
          animation: 'blobFloat1 9s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-5%',
          width: '50%', height: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)',
          filter: 'blur(72px)',
          animation: 'blobFloat2 11s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '25%',
          width: '45%', height: '45%',
          background: 'radial-gradient(circle, rgba(34,211,165,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blobFloat3 13s ease-in-out infinite',
        }} />
      </div>

      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(173,198,255,0.18) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%)',
      }} />

      {/* Noise texture */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* Content */}
      <div className="w-full relative z-10" style={{ maxWidth: '26rem' }}>

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5" style={{ position: 'relative' }}>
            <BlackboxLogo size={64} />
          </div>
          <h1
            className="font-bold tracking-[-0.05em]"
            style={{ fontSize: '2.25rem', lineHeight: 1, color: 'var(--color-primary)', letterSpacing: '-0.04em' }}
          >
            BLACKBOX
          </h1>
          <p className="mt-2" style={{ fontSize: '13px', color: 'var(--color-outline)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AFFILIATES</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl"
          style={{
            background: 'rgba(20, 20, 22, 0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(173, 198, 255, 0.1)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(75,142,255,0.04)',
            padding: '2rem',
          }}
        >
          <div style={{ marginBottom: '1.75rem' }}>
            <h2
              className="font-semibold"
              style={{ fontSize: '1.25rem', color: 'var(--color-on-surface)', marginBottom: '4px' }}
            >
              Entrar na plataforma
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-outline)' }}>
              Acesse com suas credenciais
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Email field */}
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
                  className="w-full outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(173,198,255,0.12)',
                    borderRadius: '10px',
                    color: 'var(--color-on-surface)',
                    fontSize: '14px',
                    padding: '10px 14px 10px 40px',
                  }}
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

            {/* Password field */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  htmlFor="password"
                  style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-on-surface-variant)', letterSpacing: '0.02em' }}
                >
                  Senha
                </label>
                <a
                  href="/forgot-password"
                  style={{ fontSize: '12px', color: 'var(--color-outline)', textDecoration: 'none', transition: 'color 150ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-outline)' }}
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <span className="absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', lineHeight: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(173,198,255,0.12)',
                    borderRadius: '10px',
                    color: 'var(--color-on-surface)',
                    fontSize: '14px',
                    padding: '10px 44px 10px 40px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(173,198,255,0.4)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(173,198,255,0.12)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute cursor-pointer"
                  style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', background: 'none', border: 'none', padding: '2px', lineHeight: 0 }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
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
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: 'rgba(255,180,171,0.07)',
                  border: '1px solid rgba(255,180,171,0.2)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <svg style={{ flexShrink: 0, marginTop: '1px' }} width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="7.5" r="7" stroke="var(--color-error)" strokeWidth="1.2" />
                  <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p style={{ fontSize: '13px', color: 'var(--color-error)', lineHeight: '1.4' }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer transition-opacity"
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
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <DevQuickLogin />

        {/* Footer */}
        <p className="text-center mt-6" style={{ fontSize: '12px', color: 'var(--color-outline-variant)' }}>
          © 2026 BLACKBOX AFFILIATES
        </p>
        <p className="text-center mt-3" style={{ fontSize: '13px', color: 'var(--color-outline)' }}>
          Não tem conta?{' '}
          <a
            href="/auth"
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
          >
            Criar conta
          </a>
        </p>
      </div>
    </div>
  )
}
