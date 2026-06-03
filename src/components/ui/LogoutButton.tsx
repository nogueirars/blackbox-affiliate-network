'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { clearImpersonationCookie } from '@/app/actions/impersonation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await clearImpersonationCookie()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors group"
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--color-outline)',
        fontSize: '13px',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,180,171,0.08)'
        e.currentTarget.style.color = 'var(--color-error)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none'
        e.currentTarget.style.color = 'var(--color-outline)'
      }}
    >
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
        <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2M9.5 9.5L12 7l-2.5-2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Sair da conta
    </button>
  )
}
