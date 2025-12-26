import { ref, watch, onMounted, onUnmounted } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'auto'

const THEME_STORAGE_KEY = 'theme-preference'

// Get system preference
const getSystemPreference = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Update theme based on mode
const updateTheme = (mode: ThemeMode) => {
  let shouldBeDark = false

  // Explicitly check the mode - only use system preference for 'auto'
  if (mode === 'auto') {
    shouldBeDark = getSystemPreference()
  } else if (mode === 'dark') {
    shouldBeDark = true
  } else if (mode === 'light') {
    shouldBeDark = false
  }

  // Apply to document immediately - force the class change
  if (typeof document !== 'undefined') {
    const htmlElement = document.documentElement
    if (shouldBeDark) {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
  }

  return shouldBeDark
}

// Apply theme immediately on script load (before Vue mounts)
if (typeof document !== 'undefined') {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
  const initialMode = stored && ['light', 'dark', 'auto'].includes(stored) ? stored : 'auto'
  updateTheme(initialMode)
}

export function useTheme() {
  // Load from localStorage or default to 'auto'
  const stored = typeof localStorage !== 'undefined' 
    ? localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    : null
  const initialMode = stored && ['light', 'dark', 'auto'].includes(stored) ? stored : 'auto'
  
  const themeMode = ref<ThemeMode>(initialMode)
  const isDark = ref(updateTheme(initialMode))

  // Internal update function that also updates the reactive ref
  const updateThemeInternal = () => {
    const shouldBeDark = updateTheme(themeMode.value)
    isDark.value = shouldBeDark
  }

  // Set theme mode
  const setThemeMode = (mode: ThemeMode) => {
    // Save to localStorage first
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    }
    
    // Update the mode - this will trigger the watch which calls updateThemeInternal
    // The watch ensures the theme is applied immediately and correctly
    themeMode.value = mode
    
    // Also apply immediately to ensure no delay (watch might be async)
    updateThemeInternal()
  }

  // Listen to system preference changes when in auto mode
  let mediaQuery: MediaQueryList | null = null
  const handleSystemPreferenceChange = () => {
    // Only update if we're in auto mode
    if (themeMode.value === 'auto') {
      updateThemeInternal()
    }
  }

  onMounted(() => {
    // Ensure theme is applied (in case DOM wasn't ready)
    updateThemeInternal()

    // Listen to system preference changes
    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemPreferenceChange)
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleSystemPreferenceChange)
      }
    }
  })

  onUnmounted(() => {
    if (mediaQuery) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemPreferenceChange)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleSystemPreferenceChange)
      }
    }
  })

  // Watch for theme mode changes
  watch(themeMode, () => {
    updateThemeInternal()
  })

  return {
    themeMode,
    isDark,
    setThemeMode,
  }
}

