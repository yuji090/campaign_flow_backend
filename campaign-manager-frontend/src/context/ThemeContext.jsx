import { createContext, useContext } from 'react'

const ThemeContext = createContext(null)

const theme = {
  colors: {
    navy: '#182d52',
    blue: '#3563e9',
    blueSoft: '#edf2ff',

    ink: '#172033',
    muted: '#667085',
    soft: '#98a2b3',

    line: '#e6eaf0',
    canvas: '#f6f8fb',
    white: '#ffffff',

    green: '#0f9f6e',
    red: '#d92d20',
    amber: '#dc6803',
  },

  radius: {
    card: '11px',
    button: '8px',
    input: '7px',
  },
}

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider'
    )
  }

  return context
}
