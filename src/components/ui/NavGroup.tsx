'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'

interface SubItem { href: string; label: string }
interface NavGroupProps { icon: React.ReactNode; label: string; items: SubItem[] }

export function NavGroup({ icon, label, items }: NavGroupProps) {
  const pathname = usePathname()
  const { isExpanded } = useSidebar()
  const isAnyActive = items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
  const [open, setOpen] = useState(isAnyActive)

  if (!isExpanded) {
    return (
      <div className="relative group mx-2">
        <Link
          href={items[0].href}
          className={`flex items-center justify-center py-3 rounded-lg transition-all duration-200 ${
            isAnyActive
              ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
          }`}
        >
          {icon}
        </Link>
        <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] text-[11px] font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-md border border-[var(--color-outline-variant)] pointer-events-none">
          {label}
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition-all duration-200 ${
          isAnyActive
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', width: 'calc(100% - 16px)' }}
      >
        <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>
        <span className="text-[12px] font-medium tracking-[0.05em] uppercase flex-1 text-left whitespace-nowrap">{label}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 mx-2 mb-1 ml-6 pl-3 border-l border-[var(--color-outline-variant)]">
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] font-medium tracking-[0.04em] uppercase px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  active
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DrawerNavGroup({ icon, label, items }: NavGroupProps) {
  const pathname = usePathname()
  const isAnyActive = items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
  const [open, setOpen] = useState(isAnyActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isAnyActive
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>
        <span className="text-[13px] font-medium flex-1 text-left whitespace-nowrap">{label}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 ml-4 pl-3 border-l border-[var(--color-outline-variant)] mb-1">
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[13px] font-medium px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  active
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
