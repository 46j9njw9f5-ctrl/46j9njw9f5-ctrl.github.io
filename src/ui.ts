import type { GrowthStage, RiskLevel } from './types'

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

// ---------- 将来性 ----------

export const stageClass: Record<GrowthStage, string> = {
  hypergrowth: 'lv-excellent',
  growth: 'lv-standard',
  mature: 'lv-caution',
  declining: 'lv-danger',
}

/** 将来性スコア(0-100)の色。高いほど良い（緑）。 */
export function growthColor(score: number): string {
  if (score >= 70) return 'var(--excellent)'
  if (score >= 58) return 'var(--standard)'
  if (score >= 46) return 'var(--caution)'
  return 'var(--danger)'
}

/** ポテンシャルポイント(0-100)のバー色（高いほど良い）。 */
export function potentialColor(p: number): string {
  return growthColor(p)
}

// ---------- グレード（一目でわかる評価） ----------

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'

/** スコア(0-100, 高いほど良い)→ グレード。 */
export function grade(score: number): Grade {
  if (score >= 88) return 'S'
  if (score >= 74) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

export const gradeColor: Record<Grade, string> = {
  S: 'var(--excellent)',
  A: 'var(--excellent)',
  B: 'var(--standard)',
  C: 'var(--caution)',
  D: 'var(--danger)',
}

/** グレードの意味（凡例・補足用）。 */
export const gradeLabel: Record<Grade, string> = {
  S: '非常に良い',
  A: '良い',
  B: '標準以上',
  C: '標準',
  D: '要注意',
}

/** 円を兆/億/万で読みやすく整形。 */
export function formatYen(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(2)}兆円`
  if (a >= 1e8) return `${(v / 1e8).toFixed(0)}億円`
  if (a >= 1e4) return `${(v / 1e4).toFixed(0)}万円`
  return `${Math.round(v)}円`
}
