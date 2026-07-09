import type { RealLabor } from '../types'
import { analytics } from '../data'

/**
 * 実労働データを「全国平均・業種平均」と比較する。
 * 「この会社は業種平均より残業が短い/長い」を就職者に分かりやすく示す。
 */

export interface BenchmarkItem {
  key: string
  label: string
  unit: string
  value: number
  nationalAvg: number | null
  industryAvg: number | null
  /** 低いほど良い指標か（残業=true、有給/女性管理職=false） */
  lowerBetter: boolean
  /** 業種平均（無ければ全国平均）との差。正負は「良い方向」に正規化しない生の差 */
  delta: number | null
  /** 比較先ラベル（業種平均 or 全国平均） */
  baseLabel: string
  /** 良い方向か */
  better: boolean | null
}

export function buildBenchmark(labor: RealLabor): BenchmarkItem[] {
  const nat = analytics.national
  const industry = labor.industryJsic
    ? analytics.byIndustry.find((d) => d.key === labor.industryJsic)
    : undefined

  const defs: { key: string; label: string; unit: string; value?: number; nat: number | null; ind: number | null; lowerBetter: boolean }[] = [
    { key: 'overtime', label: '月平均残業', unit: 'h', value: labor.avgOvertimeHours, nat: nat.avgOvertime, ind: industry?.avgOvertime ?? null, lowerBetter: true },
    { key: 'paidLeave', label: '有給取得率', unit: '%', value: labor.paidLeaveRate, nat: nat.avgPaidLeave, ind: industry?.avgPaidLeave ?? null, lowerBetter: false },
    { key: 'women', label: '女性管理職比率', unit: '%', value: labor.womenManagerRate, nat: nat.avgWomenManager, ind: industry?.avgWomenManager ?? null, lowerBetter: false },
  ]

  const items: BenchmarkItem[] = []
  for (const d of defs) {
    if (d.value === undefined) continue
    const base = d.ind ?? d.nat
    const baseLabel = d.ind !== null ? `業種平均（${industryLabel(labor.industryJsic)}）` : '全国平均'
    const delta = base !== null ? Math.round((d.value - base) * 10) / 10 : null
    let better: boolean | null = null
    if (delta !== null) better = d.lowerBetter ? delta < 0 : delta > 0
    items.push({
      key: d.key,
      label: d.label,
      unit: d.unit,
      value: d.value,
      nationalAvg: d.nat,
      industryAvg: d.ind,
      lowerBetter: d.lowerBetter,
      delta,
      baseLabel,
      better,
    })
  }
  return items
}

/** "E:製造業" → "製造業" のように接頭コードを外す。 */
export function industryLabel(jsic?: string): string {
  if (!jsic) return ''
  const i = jsic.indexOf(':')
  return i >= 0 ? jsic.slice(i + 1) : jsic
}
