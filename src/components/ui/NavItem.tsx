'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
}

export function NavItem({ href, label, icon }: NavItemProps) {
  const pathname = usePathname()
  const { isExpanded } = useSidebar()
  
  const isActive = href.includes('/', 1)
    ? pathname === href || pathname.startsWith(href + '/')
    : pathname === href

  return (
    <Link
      href={href}
      className={`relative flex items-center ${
        isExpanded ? 'gap-3 px-4 mx-2' : 'justify-center mx-2'
      } py-3 rounded-lg transition-all duration-200 group ${
        isActive
          ? 'text-[var(--color-primary)] border-l-3 border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
          : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] border-l-3 border-transparent'
      }`}
    >
      <span className={`flex-shrink-0 flex items-center justify-center ${isActive ? 'text-[var(--color-primary)]' : ''}`}>
        {icon}
      </span>
      
      {isExpanded && (
        <span className="text-[12px] font-medium tracking-[0.05em] uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300">
          {label}
        </span>
      )}
      
      {/* Tooltip for collapsed state */}
      {!isExpanded && (
        <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] text-[11px] font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-md border border-[var(--color-outline-variant)] pointer-events-none">
          {label}
        </div>
      )}
    </Link>
  )
}
