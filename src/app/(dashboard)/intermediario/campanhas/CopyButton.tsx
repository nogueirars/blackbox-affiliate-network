'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copiar link"
      className="p-2 rounded-lg hover:bg-[var(--color-surface-container-highest)] transition-colors flex-shrink-0"
    >
      <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  )
}
