"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "friet-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")
  const [mounted, setMounted] = useState(false)

  // Function to determine the actual theme (resolving "system" if needed)
  const resolveTheme = (theme: Theme): "dark" | "light" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
    return theme
  }

  // Set theme and handle localStorage
  const setTheme = (theme: Theme) => {
    localStorage.setItem(storageKey, theme)
    setThemeState(theme)
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
  }

  // Handle system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      if (theme === "system") {
        const newResolvedTheme = mediaQuery.matches ? "dark" : "light"
        setResolvedTheme(newResolvedTheme)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  // Initialize theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null

    if (storedTheme) {
      setThemeState(storedTheme)
      setResolvedTheme(resolveTheme(storedTheme))
    } else {
      setResolvedTheme(resolveTheme(defaultTheme))
    }

    setMounted(true)
  }, [storageKey, defaultTheme])

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    // Enable transitions
    root.classList.add("theme-transition")

    // Update theme class
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)

    // Remove transition class after transition completes
    const removeTransition = () => {
      root.classList.remove("theme-transition")
    }

    const transitionTimeout = setTimeout(removeTransition, 300) // Match this to your CSS duration

    return () => {
      clearTimeout(transitionTimeout)
    }
  }, [resolvedTheme, mounted])

  // Context value
  const value = {
    theme,
    resolvedTheme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

// Optional: Theme toggle component for convenience
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="theme-toggle"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? "🌞" : "🌙"}
    </button>
  )
}
