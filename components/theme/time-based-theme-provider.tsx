"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface ThemeContextType {
  theme: "light" | "dark"
  isAutoTheme: boolean
  toggleAutoTheme: () => void
  setManualTheme: (theme: "light" | "dark") => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a TimeBasedThemeProvider")
  }
  return context
}

export function TimeBasedThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Start with undefined to avoid hydration mismatch, will be set on client
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isAutoTheme, setIsAutoTheme] = useState(true)

  // Only run on client after mount
  useEffect(() => {
    setMounted(true)
    // Load saved preferences
    const savedAutoTheme = localStorage.getItem("qcc-auto-theme")
    const savedManualTheme = localStorage.getItem("qcc-manual-theme")

    if (savedAutoTheme === "false") {
      setIsAutoTheme(false)
      setTheme((savedManualTheme as "light" | "dark") || "light")
    } else {
      setIsAutoTheme(true)
      updateThemeBasedOnTime()
    }
  }, [])

  const updateThemeBasedOnTime = () => {
    const now = new Date()
    const hour = now.getHours()

    // Dark theme after 6pm (18:00) and before 6am (06:00)
    const shouldBeDark = hour >= 18 || hour < 6
    setTheme(shouldBeDark ? "dark" : "light")
  }

  useEffect(() => {
    if (!isAutoTheme) return

    // Update theme immediately
    updateThemeBasedOnTime()

    // Set up interval to check every minute
    const interval = setInterval(updateThemeBasedOnTime, 60000)

    return () => clearInterval(interval)
  }, [isAutoTheme])

  useEffect(() => {
    if (!mounted) return
    // Apply theme to document
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme, mounted])

  const toggleAutoTheme = () => {
    const newAutoTheme = !isAutoTheme
    setIsAutoTheme(newAutoTheme)
    localStorage.setItem("qcc-auto-theme", newAutoTheme.toString())

    if (newAutoTheme) {
      updateThemeBasedOnTime()
    }
  }

  const setManualTheme = (newTheme: "light" | "dark") => {
    setIsAutoTheme(false)
    setTheme(newTheme)
    localStorage.setItem("qcc-auto-theme", "false")
    localStorage.setItem("qcc-manual-theme", newTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isAutoTheme,
        toggleAutoTheme,
        setManualTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
