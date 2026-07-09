import type { AxisScores } from './fit'

/**
 * 「隠れ優良企業」抽出。
 * 規模（知名度の代理指標）は控えめでも、将来性・働きやすさ・安全度・生産性が
 * そろって高い企業を客観指標で発掘する。名前で判断しがちなミスマッチを防ぐ。
 */

export interface GemInput {
  id: string
  name: string
  employees: number
  scores: AxisScores
}

export interface Gem {
  id: string
  name: string
  /** 品質スコア（良い軸の平均、0–100） */
  quality: number
  employees: number
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
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * 隠れ優良企業を抽出してランキングする。
 * 条件: 品質スコア >= qualityMin かつ 従業員数が中央値以下（＝規模が控えめ）。
 */
export function findHiddenGems(
  items: GemInput[],
  { qualityMin = 66, maxCount = 8 }: { qualityMin?: number; maxCount?: number } = {},
): Gem[] {
  if (items.length < 4) return []
  const medEmp = median(items.map((i) => i.employees))

  const gems: Gem[] = []
  for (const it of items) {
    const vals = QUALITY_AXES.map((a) => it.scores[a.key]).filter((v): v is number => v !== null && v !== undefined)
    if (vals.length < 2) continue
    const quality = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
    if (quality < qualityMin) continue
    if (it.employees > medEmp) continue // 規模が大きい＝知名度が高い想定は除外

    const reasons: string[] = []
    for (const a of QUALITY_AXES) {
      const v = it.scores[a.key]
      if (v !== null && v !== undefined && v >= 74) reasons.push(`${a.label}が高い`)
    }
    reasons.push(`規模は控えめ（従業員${it.employees.toLocaleString()}名）`)
    gems.push({ id: it.id, name: it.name, quality, employees: it.employees, reasons })
  }

  return gems
    .sort((a, b) => b.quality - a.quality || a.employees - b.employees)
    .slice(0, maxCount)
}
