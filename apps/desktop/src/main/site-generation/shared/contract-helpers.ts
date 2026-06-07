export function componentClass(prefix: string, component: string, part?: string): string {
  return part ? `${prefix}-${component}-${part}` : `${prefix}-${component}`
}

export function utilityClass(prefix: string, name: string): string {
  return `${prefix}-u-${name}`
}
