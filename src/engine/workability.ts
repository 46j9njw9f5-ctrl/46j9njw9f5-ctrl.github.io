import type { GrowthFactor, Tier, WorkabilityEvaluation } from '../types'
import { overtimeRisk, turnoverRisk, tenureRisk } from './scoring'

/**
 * 働きやすさ評価エンジン。
 * ワークライフバランス寄りの観点で「どれだけ働きやすいか（0–100、高いほど良い）」を測る。
 *
 * 入力は部分的でよい（公的データでは残業・有給・女性管理職のみ等）。
 * 揃っている観点だけで評価しつつ、欠損が多い場合は極端な点数にならないよう
 * 50点（中立値）へ縮約する。
 */

const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v))

export interface WorkabilityInput {
  avgOvertimeHours?: number
  paidLeaveRate?: number
  turnover3yrRate?: number
  avgTenureYears?: number
  womenManagerRate?: number
}

const BASE = {
  overtime: 0.3,
  paidLeave: 0.22,
  retention: 0.2,
  tenure: 0.16,
  diversity: 0.12,
}

function tierOf(score: number): { tier: Tier; label: string } {
  if (score >= 70) return { tier: 'high', label: '働きやすい' }
  if (score >= 50) return { tier: 'mid', label: '標準的' }
  return { tier: 'low', label: '働きにくい' }
}

export function evaluateWorkability(m: WorkabilityInput): WorkabilityEvaluation {
  const raw: { key: string; label: string; valueLabel: string; potential: number; base: number }[] = []
  if (m.avgOvertimeHours !== undefined)
    raw.push({ key: 'overtime', label: '残業の少なさ', valueLabel: `${m.avgOvertimeHours}h/月`, potential: 100 - overtimeRisk(m.avgOvertimeHours), base: BASE.overtime })
  if (m.paidLeaveRate !== undefined)
    raw.push({ key: 'paidLeave', label: '有給の取りやすさ', valueLabel: `消化率 ${m.paidLeaveRate}%`, potential: clamp(m.paidLeaveRate), base: BASE.paidLeave })
  if (m.turnover3yrRate !== undefined)
    raw.push({ key: 'retention', label: '定着（離職の少なさ）', valueLabel: `3年離職 ${m.turnover3yrRate}%`, potential: 100 - turnoverRisk(m.turnover3yrRate), base: BASE.retention })
  if (m.avgTenureYears !== undefined)
    raw.push({ key: 'tenure', label: '長く働ける（勤続年数）', valueLabel: `${m.avgTenureYears}年`, potential: 100 - tenureRisk(m.avgTenureYears), base: BASE.tenure })
  if (m.womenManagerRate !== undefined)
    raw.push({ key: 'diversity', label: '多様性（女性管理職）', valueLabel: `${m.womenManagerRate}%`, potential: clamp(m.womenManagerRate * 2.5), base: BASE.diversity })

  const coverage = clamp(raw.reduce((s, f) => s + f.base, 0), 0, 1)
  const normalization = coverage || 1
  const factors: GrowthFactor[] = raw.map((f) => {
    const weight = f.base / normalization
    return { key: f.key, label: f.label, valueLabel: f.valueLabel, potential: Math.round(f.potential), weight, contribution: f.potential * weight, available: true }
  })

  const rawScore = factors.length ? clamp(factors.reduce((s, f) => s + f.contribution, 0)) : 50
  // データ充足率が低いほど中立値50へ寄せ、単一指標だけでS/A評価になるのを防ぐ。
  const score = Math.round(clamp(50 + (rawScore - 50) * coverage))
  const { tier, label } = tierOf(score)

  const highlights: string[] = []
  if (m.avgOvertimeHours !== undefined && m.avgOvertimeHours <= 20) highlights.push('残業が少なくプライベートを確保しやすい')
  if (m.paidLeaveRate !== undefined && m.paidLeaveRate >= 70) highlights.push('有給が取りやすい')
  if (m.turnover3yrRate !== undefined && m.turnover3yrRate <= 10) highlights.push('定着率が高く長く働ける')
  if (m.womenManagerRate !== undefined && m.womenManagerRate >= 25) highlights.push('女性の登用が進んでいる')
  if (m.avgTenureYears !== undefined && m.avgTenureYears >= 12) highlights.push('平均勤続が長く安定している')
  if (coverage < 0.6) highlights.push(`公開データの充足率が${Math.round(coverage * 100)}%のため、評価を中立値へ補正`)

  return { score, tier, tierLabel: label, factors, highlights }
}
