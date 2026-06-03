'use client'

import { useState } from 'react'

export default function InviteLinkCard({ refCode }: { refCode: string | null }) {
  const [copied, setCopied] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aff.blackboxinfluencers.com'
  const inviteLink = refCode ? `${appUrl}/auth?ref=${refCode}` : null

  async function handleCopy() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      // fallback for insecure contexts or permission denied
      const el = document.createElement('textarea')
      el.value = inviteLink
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-3 border border-[var(--color-outline-variant)]">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--color-primary)]">link</span>
        <h3 className="text-label-lg font-semibold text-[var(--color-on-surface)]">Link de Convite</h3>
      </div>
      <p className="text-body-sm text-[var(--color-on-surface-variant)]">
        Compartilhe este link para convidar novos gerentes à sua rede.
      </p>
      {inviteLink ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-sm text-[var(--color-on-surface-variant)] font-mono truncate select-all">
            {inviteLink}
          </div>
          <button
            onClick={handleCopy}
            title={copied ? 'Copiado!' : 'Copiar link'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={{
              background: copied ? 'var(--color-success-container, rgba(0,200,83,0.15))' : 'var(--color-primary-container)',
              color: copied ? 'var(--color-success, #00c853)' : 'var(--color-on-primary)',
              border: 'none',
            }}
          >
            <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-error)]">
          Nenhum código de convite encontrado para o seu perfil de Intermediário.
        </p>
      )}
    </div>
  )
}
