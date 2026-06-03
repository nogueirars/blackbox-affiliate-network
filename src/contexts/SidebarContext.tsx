'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
  isExpanded: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  isExpanded: true,
  toggleSidebar: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem('orbit_sidebar_expanded')
    if (stored !== null) {
      setIsExpanded(stored === 'true')
    }
  }, [])

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const newState = !prev
      localStorage.setItem('orbit_sidebar_expanded', String(newState))
      return newState
    })
  }

  return (
    <SidebarContext.Provider value={{ isExpanded, toggleSidebar }}>
      {/* To avoid hydration mismatch if initial state is different, we could conditionally render, but since layout handles it via classes, it might cause a slight flash. For now, it's fine. */}
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
