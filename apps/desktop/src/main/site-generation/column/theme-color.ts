export function resolveAccentHex(themeColor: string | undefined, fallback: string): string {
  if (themeColor && /^#[0-9a-fA-F]{6}$/.test(themeColor)) {
    return themeColor
  }
  return fallback
}

export function accentSoftRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex)
  if (!m) return `rgba(196, 113, 63, ${alpha})`
  const r = Number.parseInt(m[1]!, 16)
  const g = Number.parseInt(m[2]!, 16)
  const b = Number.parseInt(m[3]!, 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
