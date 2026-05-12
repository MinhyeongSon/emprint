import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../shared/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--base) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        panel2: 'rgb(var(--panel2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        dangerBg: 'rgb(var(--dangerBg) / <alpha-value>)',
        dangerInk: 'rgb(var(--dangerInk) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['IBM Plex Sans', 'Inter', 'SF Pro Text', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace']
      },
      boxShadow: {
        panel: '0 12px 30px rgba(0, 0, 0, 0.22)'
      }
    }
  },
  plugins: []
}

export default config
