"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

// Suppress the React 19 "script tag in component" warning from next-themes.
// next-themes injects a <script dangerouslySetInnerHTML> for flicker prevention
// which React 19 warns about. This is a known upstream issue (next-themes ≤0.4.6).
// Remove once next-themes ships a React-19-compatible release.
if (typeof window !== 'undefined') {
  const originalError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return
    originalError(...args)
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
