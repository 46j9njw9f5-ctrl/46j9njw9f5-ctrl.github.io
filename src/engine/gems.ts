import type { AxisScores } from './fit'

/**
 * 「隠れ優良企業」抽出。
 * 規模（知名度の代理指標）は控えめでも、取得できた評価軸が高い企業を発掘する。
 * データの種類が違う企業を無理に同じ条件で比較しないため、総合型と労働環境型を分ける。
 */

export interface GemInput {
  id: string
  name: string
  employees: number
  scores: AxisScores
}

export type GemKind = 'overall' | 'workplace'

export interface Gem {
  id: string
  name: string
  /** 品質スコア（利用可能な品質軸の平均、0–100） */
  quality: number
  employees: number
  kind: GemKind
  reasons: string[]
}

// 品質を構成する軸（規模＝visibility は除外）。
const QUALITY_AXES: { key: string; label: string }[] = [
  { key: 'growth', label: '将来性' },
  { key: 'workability', label: '働きやすさ' },
  { key: 'safety', label: '安全度' },
  { key: 'productivity', label: '生産性' },
]

function median(nums: number[]): number {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function scoreOf(scores: AxisScores, key: string): number | null {
  const value = scores[key]
  return value === null || value === undefined ? null : value
}

/**
 * 隠れ優良企業を抽出してランキングする。
 *
 * 総合型:
 * - 4軸中3軸以上に実データがある
 * - 働きやすさまたは安全度がある
 *
 * 労働環境型:
 * - 将来性と、働きやすさまたは安全度の2軸がある
 * - その2軸がともに74点以上
 *
 * 共通:
 * - 品質スコア >= qualityMin
 * - 従業員数が中央値以下（規模が控えめ）
 */
export function findHiddenGems(
  items: GemInput[],
  { qualityMin = 66, maxCount = 8 }: { qualityMin?: number; maxCount?: number } = {},
): Gem[] {
  if (items.length < 4) return []
  const medianEmployees = median(items.map((item) => item.employees))

  const gems: Gem[] = []
  for (const item of items) {
    const available = QUALITY_AXES
      .map((axis) => ({ ...axis, value: scoreOf(item.scores, axis.key) }))
      .filter((axis): axis is { key: string; label: string; value: number } => axis.value !== null)

    const growth = scoreOf(item.scores, 'growth')
    const workability = scoreOf(item.scores, 'workability')
    const safety = scoreOf(item.scores, 'safety')
    const laborScore = workability ?? safety
    const hasLaborAxis = laborScore !== null

    let kind: GemKind | null = null
    if (available.length >= 3 && hasLaborAxis) {
      kind = 'overall'
    } else if (
      available.length === 2 &&
      growth !== null &&
      laborScore !== null &&
      growth >= 74 &&
      laborScore >= 74
    ) {
      kind = 'workplace'
    }

    if (!kind) continue

    const quality = Math.round(available.reduce((sum, axis) => sum + axis.value, 0) / available.length)
    if (quality < qualityMin) continue
    if (item.employees > medianEmployees) continue

    const reasons: string[] = [kind === 'overall' ? '評価タイプ: 総合型' : '評価タイプ: 成長×労働環境型']
    for (const axis of available) {
      if (axis.value >= 74) reasons.push(`${axis.label}が高い`)
    }
    reasons.push(`評価可能な軸 ${available.length}/4`)
    reasons.push(`規模は控えめ（従業員${item.employees.toLocaleString()}名）`)

    gems.push({
      id: item.id,
      name: item.name,
      quality,
      employees: item.employees,
      kind,
      reasons,
    })
  }

  return gems
    .sort((a, b) => b.quality - a.quality || a.employees - b.employees)
    .slice(0, maxCount)
}
