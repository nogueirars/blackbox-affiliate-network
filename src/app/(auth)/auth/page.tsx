'use client'

import { BlackboxLogo } from '@/components/ui/BlackboxLogo'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

interface InviteInfo {
  convidante: { nome: string; role: string }
  papel_destino: string
}

const ROLE_LABEL: Record<string, string> = {
  AFILIADO: 'Afiliado',
  GERENTE: 'Gerente',
  INTERMEDIARIO: 'Intermediário',
}

const FEATURES = [
  { icon: 'payments',        text: 'Comissões em tempo real' },
  { icon: 'bar_chart',       text: 'Dashboard de produção completo' },
  { icon: 'group',           text: 'Gestão de rede multinível' },
  { icon: 'verified',        text: 'Transparência total nas métricas' },
]

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [refCode, setRefCode] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Signup state
  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    password: '',
    telefone: '',
    data_nascimento: '',
    cpf: '',
    instagram: '',
    telegram_canal: '',
    whatsapp_canal: '',
  })
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  const fetchInvite = useCallback(async (code: string) => {
    setInviteLoading(true)
    setInviteError(null)
    try {
      const res = await fetch(`/api/ref/${code}`)
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error ?? 'Código de convite inválido.')
        setInvite(null)
      } else {
        setInvite(data)
      }
    } catch {
      setInviteError('Erro ao validar código de convite.')
    } finally {
      setInviteLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      setRefCode(ref)
      setMode('signup')
      fetchInvite(ref)
    }
  }, [fetchInvite])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) { setLoginError(error.message); setLoginLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  function setField(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setSignupLoading(true)
    setSignupError(null)
    try {
      const body: Record<string, string> = {
        nome_completo: form.nome_completo,
        email: form.email,
        password: form.password,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento,
      }
      if (refCode) body.ref_code = refCode
      if (form.cpf) body.cpf = form.cpf
      if (form.instagram) body.instagram = form.instagram
      if (form.telegram_canal) body.telegram_canal = form.telegram_canal
      if (form.whatsapp_canal) body.whatsapp_canal = form.whatsapp_canal

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setSignupError(data.error ?? 'Erro ao criar cadastro.'); return }
      setSignupSuccess(true)
    } catch {
      setSignupError('Erro de conexão. Tente novamente.')
    } finally {
      setSignupLoading(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="min-h-screen flex" style={{ background: '#080809' }}>

      {/* ── Left brand panel (desktop only) ─────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden flex-shrink-0"
        style={{
          width: '44%',
          background: 'linear-gradient(160deg, #0d0d10 0%, #080809 60%, #040405 100%)',
          borderRight: '1px solid rgba(173,198,255,0.06)',
        }}
      >
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute inset-0" style={{ overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '15%', left: '10%',
            width: 340, height: 340,
            background: 'radial-gradient(circle, rgba(2,117,243,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', bottom: '20%', right: '5%',
            width: 260, height: 260,
            background: 'radial-gradient(circle, rgba(94,106,210,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
        </div>

        {/* Top: Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <BlackboxLogo size={32} className="text-[var(--color-primary)] flex-shrink-0" />
            <div>
              <h1 className="font-bold leading-tight" style={{ fontSize: '18px', letterSpacing: '-0.02em' }}>
                <span style={{ color: 'var(--color-on-surface)' }}>BLACK</span><span style={{ color: 'var(--color-primary)' }}>BOX</span>
              </h1>
              <p className="text-[11px] font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-0.5">AFFILIATES</p>
            </div>
          </div>
        </div>

        {/* Middle: Headline + features */}
        <div className="relative z-10 px-10 pb-4 flex flex-col gap-8">
          <div>
            <h1
              className="font-bold leading-tight mb-4"
              style={{
                fontSize: 'clamp(1.8rem, 2.5vw, 2.6rem)',
                color: '#fff',
                letterSpacing: '-0.04em',
              }}
            >
              Sua rede de afiliados,{' '}
              <span style={{ color: 'var(--color-primary)' }}>
                no controle.
              </span>
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'rgba(173,198,255,0.5)', lineHeight: 1.6 }}>
              Plataforma completa para gerenciar afiliados, acompanhar produção e receber comissões.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {FEATURES.map((f) => (
              <div key={f.icon} className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: 'rgba(2,117,243,0.12)',
                    border: '1px solid rgba(2,117,243,0.2)',
                  }}
                >
                  <span className="material-symbols-outlined text-[15px]" style={{ color: 'var(--color-primary)' }}>
                    {f.icon}
                  </span>
                </div>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Invite info or tagline */}
        <div className="relative z-10 p-10">
          {invite ? (
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: 'rgba(2,117,243,0.08)',
                border: '1px solid rgba(2,117,243,0.18)',
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(2,117,243,0.15)' }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--color-primary)' }}>person_add</span>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  Convidado por {invite.convidante.nome}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(173,198,255,0.5)', marginTop: 2 }}>
                  Você entrará como {ROLE_LABEL[invite.papel_destino] ?? invite.papel_destino}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'rgba(173,198,255,0.25)', letterSpacing: '0.04em' }}>
              © 2026 BLACKBOX AFFILIATES
            </p>
          )}
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto"
        style={{ minHeight: '100dvh' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8 flex-shrink-0">
          <BlackboxLogo size={32} className="text-[var(--color-primary)] flex-shrink-0" />
          <div>
            <h1 className="font-bold leading-tight" style={{ fontSize: '18px', letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--color-on-surface)' }}>BLACK</span><span style={{ color: 'var(--color-primary)' }}>BOX</span>
            </h1>
            <p className="text-[11px] font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-0.5">AFFILIATES</p>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full" style={{ maxWidth: 480 }}>

          {/* Mode header */}
          <div className="mb-7">
            {!refCode && (
              <div
                className="flex mb-6 rounded-xl p-1"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(173,198,255,0.07)',
                }}
              >
                {(['login', 'signup'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setLoginError(null); setSignupError(null) }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                    style={{
                      background: mode === m ? 'rgba(2,117,243,0.15)' : 'transparent',
                      color: mode === m ? '#fff' : 'rgba(173,198,255,0.4)',
                      border: mode === m ? '1px solid rgba(2,117,243,0.25)' : '1px solid transparent',
                    }}
                  >
                    {m === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>
            )}

            <div>
              {isSignup ? (
                <>
                  <h2 className="font-bold mb-1" style={{ fontSize: '1.4rem', color: '#fff', letterSpacing: '-0.02em' }}>
                    {signupSuccess ? 'Cadastro realizado!' : 'Criar conta'}
                  </h2>
                  {!signupSuccess && (
                    <p style={{ fontSize: '0.875rem', color: 'rgba(173,198,255,0.45)' }}>
                      Preencha seus dados para se cadastrar
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="font-bold mb-1" style={{ fontSize: '1.4rem', color: '#fff', letterSpacing: '-0.02em' }}>
                    Entrar na plataforma
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(173,198,255,0.45)' }}>
                    Acesse com suas credenciais
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Login form ── */}
          {!isSignup && (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Field label="E-mail">
                <InputBase
                  id="login-email" type="email" value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="seu@email.com" autoComplete="email"
                  icon="mail"
                />
              </Field>
              <Field label="Senha">
                <PasswordBase
                  id="login-password" value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  show={showLoginPassword} onToggle={() => setShowLoginPassword(v => !v)}
                />
              </Field>
              {loginError && <ErrorMsg message={loginError} />}
              <SubmitBtn loading={loginLoading} label="Entrar" loadingLabel="Entrando…" />
            </form>
          )}

          {/* ── Signup success ── */}
          {isSignup && signupSuccess && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(34,211,165,0.1)',
                  border: '1px solid rgba(34,211,165,0.25)',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22D3A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold mb-2" style={{ fontSize: '1rem', color: '#fff' }}>
                  Cadastro enviado com sucesso
                </p>
                <p style={{ fontSize: '0.875rem', color: 'rgba(173,198,255,0.45)', lineHeight: 1.6 }}>
                  Seu cadastro está em análise. Em breve você receberá confirmação e poderá acessar a plataforma.
                </p>
              </div>
              <a
                href="/login"
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
                style={{ background: 'rgba(2,117,243,0.15)', border: '1px solid rgba(2,117,243,0.25)', color: '#fff' }}
              >
                Ir para o login
              </a>
            </div>
          )}

          {/* ── Signup form ── */}
          {isSignup && !signupSuccess && (
            <>
              {/* Invite badge (mobile / fallback) */}
              {refCode && (
                <div className="mb-5">
                  {inviteLoading ? (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <svg className="animate-spin flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(173,198,255,0.4)' }}>Validando convite…</span>
                    </div>
                  ) : invite ? (
                    <div
                      className="lg:hidden flex items-start gap-3 rounded-xl p-3"
                      style={{ background: 'rgba(2,117,243,0.08)', border: '1px solid rgba(2,117,243,0.15)' }}
                    >
                      <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }}>person_add</span>
                      <div>
                        <p style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>Convidado por {invite.convidante.nome}</p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(173,198,255,0.45)', marginTop: 2 }}>
                          Você será cadastrado como {ROLE_LABEL[invite.papel_destino] ?? invite.papel_destino}
                        </p>
                      </div>
                    </div>
                  ) : inviteError ? (
                    <ErrorMsg message={inviteError} />
                  ) : null}
                </div>
              )}

              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                {/* Row 1: Nome */}
                <Field label="Nome completo" required>
                  <InputBase id="nome" type="text" value={form.nome_completo} onChange={setField('nome_completo')}
                    placeholder="Seu nome completo" autoComplete="name" required icon="person" />
                </Field>

                {/* Row 2: Email */}
                <Field label="E-mail" required>
                  <InputBase id="signup-email" type="email" value={form.email} onChange={setField('email')}
                    placeholder="seu@email.com" autoComplete="email" required icon="mail" />
                </Field>

                {/* Row 3: Senha */}
                <Field label="Senha" required>
                  <PasswordBase id="signup-password" value={form.password} onChange={setField('password')}
                    show={showSignupPassword} onToggle={() => setShowSignupPassword(v => !v)} required minLength={8} />
                </Field>

                {/* Row 4: Telefone + Nascimento */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone" required>
                    <InputBase id="telefone" type="tel" value={form.telefone} onChange={setField('telefone')}
                      placeholder="(11) 9 0000-0000" autoComplete="tel" required icon="phone" />
                  </Field>
                  <Field label="Nascimento" required>
                    <InputBase id="nascimento" type="date" value={form.data_nascimento} onChange={setField('data_nascimento')}
                      placeholder="" autoComplete="bday" required />
                  </Field>
                </div>

                {/* Row 5: CPF */}
                <Field label="CPF (opcional)">
                  <InputBase id="cpf" type="text" value={form.cpf} onChange={setField('cpf')}
                    placeholder="000.000.000-00" autoComplete="off" />
                </Field>

                {/* Row 6: Sociais */}
                <div>
                  <p className="mb-2" style={{ fontSize: '0.7rem', color: 'rgba(173,198,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Redes sociais (opcional)
                  </p>
                  <div className="flex flex-col gap-3">
                    <InputBase id="instagram" type="text" value={form.instagram} onChange={setField('instagram')}
                      placeholder="Instagram (@usuario)" autoComplete="off" icon="photo_camera" />
                    <InputBase id="telegram" type="text" value={form.telegram_canal} onChange={setField('telegram_canal')}
                      placeholder="Telegram (t.me/grupo)" autoComplete="off" icon="send" />
                    <InputBase id="whatsapp" type="text" value={form.whatsapp_canal} onChange={setField('whatsapp_canal')}
                      placeholder="WhatsApp (chat.whatsapp.com/...)" autoComplete="off" icon="chat" />
                  </div>
                </div>

                {signupError && <ErrorMsg message={signupError} />}
                <SubmitBtn loading={signupLoading} label="Criar conta" loadingLabel="Cadastrando…" />
              </form>
            </>
          )}
        </div>

        {/* Mobile footer */}
        <p className="lg:hidden mt-8 text-center flex-shrink-0" style={{ fontSize: '11px', color: 'rgba(173,198,255,0.2)' }}>
          © 2026 BLACKBOX AFFILIATES
        </p>
      </div>
    </div>
  )
}

/* ── Field wrapper ───────────────────────────────────────────────── */
function Field({ label, required, children }: { label?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(173,198,255,0.5)', letterSpacing: '0.02em' }}>
          {label}{required && <span style={{ color: 'rgba(244,63,94,0.7)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  )
}

/* ── Base input ──────────────────────────────────────────────────── */
function InputBase({
  id, type, value, onChange, placeholder, autoComplete, required, icon, minLength,
}: {
  id: string; type: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string; autoComplete?: string; required?: boolean
  icon?: string; minLength?: number
}) {
  return (
    <div className="relative">
      {icon && (
        <span
          className="material-symbols-outlined absolute pointer-events-none"
          style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(173,198,255,0.3)' }}
        >
          {icon}
        </span>
      )}
      <input
        id={id} type={type} value={value} onChange={onChange}
        required={required} placeholder={placeholder}
        autoComplete={autoComplete} minLength={minLength}
        className="w-full outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(173,198,255,0.1)',
          borderRadius: 10,
          color: '#fff',
          fontSize: '0.875rem',
          padding: icon ? '11px 14px 11px 38px' : '11px 14px',
          height: 44,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(2,117,243,0.5)'
          e.currentTarget.style.background = 'rgba(2,117,243,0.04)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(173,198,255,0.1)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        }}
      />
    </div>
  )
}

/* ── Password input ──────────────────────────────────────────────── */
function PasswordBase({
  id, value, onChange, show, onToggle, required, minLength,
}: {
  id: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  show: boolean; onToggle: () => void; required?: boolean; minLength?: number
}) {
  return (
    <div className="relative">
      <span
        className="material-symbols-outlined absolute pointer-events-none"
        style={{ left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(173,198,255,0.3)' }}
      >
        lock
      </span>
      <input
        id={id} type={show ? 'text' : 'password'} value={value}
        onChange={onChange} required={required} minLength={minLength}
        placeholder="••••••••" autoComplete="new-password"
        className="w-full outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(173,198,255,0.1)',
          borderRadius: 10,
          color: '#fff',
          fontSize: '0.875rem',
          padding: '11px 44px 11px 38px',
          height: 44,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(2,117,243,0.5)'
          e.currentTarget.style.background = 'rgba(2,117,243,0.04)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(173,198,255,0.1)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        }}
      />
      <button
        type="button" onClick={onToggle} tabIndex={-1}
        className="absolute cursor-pointer"
        style={{ right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, lineHeight: 0 }}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(173,198,255,0.35)' }}>
          {show ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  )
}

/* ── Error message ───────────────────────────────────────────────── */
function ErrorMsg({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.18)' }}
    >
      <span className="material-symbols-outlined flex-shrink-0 mt-px" style={{ fontSize: 15, color: 'var(--color-error)' }}>
        error
      </span>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-error)', lineHeight: 1.4 }}>{message}</p>
    </div>
  )
}

/* ── Submit button ───────────────────────────────────────────────── */
function SubmitBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit" disabled={loading}
      className="w-full cursor-pointer transition-opacity mt-1"
      style={{
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        padding: '12px',
        fontSize: '0.9rem',
        fontWeight: 600,
        height: 46,
        opacity: loading ? 0.6 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {loadingLabel}
        </span>
      ) : label}
    </button>
  )
}
