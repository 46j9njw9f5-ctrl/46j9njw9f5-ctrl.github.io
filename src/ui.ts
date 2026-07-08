import type { RiskLevel } from './types'

export const levelClass: Record<RiskLevel, string> = {
  excellent: 'lv-excellent',
  standard: 'lv-standard',
  caution: 'lv-caution',
  danger: 'lv-danger',
}

export const levelColor: Record<RiskLevel, string> = {
  excellent: 'var(--excellent)',
  standard: 'var(--standard)',
  caution: 'var(--caution)',
  danger: 'var(--danger)',
}

/** リスクポイント(0-100)の色。低いほど緑、高いほど赤。 */
export function riskColor(risk: number): string {
  if (risk < 25) return 'var(--excellent)'
  if (risk < 50) return 'var(--standard)'
  if (risk < 70) return 'var(--caution)'
  return 'var(--danger)'
}
