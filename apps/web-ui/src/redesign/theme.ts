import { useEffect, useState } from 'react'

export type DesignTheme = 'light' | 'dark'

const STORAGE_KEY = 'campaignos-redesign-theme'

function preferredTheme(): DesignTheme {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useDesignTheme() {
  const [theme, setTheme] = useState<DesignTheme>(() => preferredTheme())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return [theme, setTheme] as const
}

export function oppositeTheme(theme: DesignTheme): DesignTheme {
  return theme === 'light' ? 'dark' : 'light'
}
