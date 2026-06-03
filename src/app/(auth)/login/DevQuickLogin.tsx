'use client'

// DEV ONLY — remove this file + its import in page.tsx when done testing
// Quick-login buttons for each role. Password: Orbit@2026

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ACCOUNTS = [
  { label: 'Agência',      email: 'test@orbit.dev',           color: '#c084fc', redirect: '/dashboard' },
  { label: 'Afiliado',     email: 'influencer@orbit.dev',     color: '#60a5fa', redirect: '/afiliado' },
  { label: 'Intermediário',email: 'intermediario@orbit.dev',  color: '#34d399', redirect: '/intermediario' },
  { label: 'Gerente',      email: 'gerente@orbit.dev',        color: '#fbbf24', redirect: '/gerente' },
] as const

const PASSWORD = 'Orbit@2026'

export function DevQuickLogin() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function login(email: string, redirect: string) {
    setBusy(email)
    setErr(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
    if (error) { setErr(`${email}: ${error.message}`); setBusy(null); return }
    router.push(redirect)
    router.refresh()
  }

  return (
    <div style={{
      marginTop: '1.5rem',
      padding: '1rem',
      borderRadius: '12px',
      border: '1px dashed rgba(173,198,255,0.2)',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <p style={{ fontSize: '11px', color: 'rgba(173,198,255,0.4)', marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Dev — acesso rápido
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {ACCOUNTS.map(({ label, email, color, redirect }) => (
          <button
            key={email}
            type="button"
            disabled={busy !== null}
            onClick={() => login(email, redirect)}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: `1px solid ${color}33`,
              background: busy === email ? `${color}22` : `${color}11`,
              color,
              fontSize: '12px',
              fontWeight: 600,
              cursor: busy !== null ? 'not-allowed' : 'pointer',
              opacity: busy !== null && busy !== email ? 0.5 : 1,
              transition: 'all 150ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {busy === email && (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {label}
          </button>
        ))}
      </div>
      {err && (
        <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-error)' }}>{err}</p>
      )}
    </div>
  )
}
