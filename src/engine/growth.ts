import type { Company, GrowthEvaluation, GrowthFactor, GrowthStage, SeriesPoint } from '../types'
import { industryOutlook } from './industry'

/**
 * 将来性（成長性）評価エンジン。
 *
 * 実データ（従業員数・売上高の推移、設立年、上場、業種）から
 * 「将来性スコア 0–100（高いほど有望）」を算出する。
 * データが欠損する要因は重みを動的に再正規化して除外し、
 * 各要因の寄与を透明に開示する。
 */

const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v))

function piecewise(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1]
  const last = points[points.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return last[1]
}

const CURRENT_YEAR = new Date().getFullYear()

/**
 * 時系列から年平均成長率(CAGR, %)を算出。単位不整合の外れ値を除外し、
 * 2 点以上・1 年以上の期間があるときのみ返す。
 */
export function cagr(series: SeriesPoint[] | undefined): number | null {
  if (!series || series.length < 2) return null
  const pts = series.filter((p) => p.year > 0 && Number.isFinite(p.value) && p.value > 0)
  if (pts.length < 2) return null
  // 中央値から大きく外れた値（単位違い等）を除去
  const sorted = [...pts].map((p) => p.value).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const clean = pts
    .filter((p) => p.value >= median * 0.25 && p.value <= median * 4)
    .sort((a, b) => a.year - b.year)
  if (clean.length < 2) return null
  const first = clean[0]
  const last = clean[clean.length - 1]
  const years = last.year - first.year
  if (years < 1) return null
  const ratio = last.value / first.value
  return (Math.pow(ratio, 1 / years) - 1) * 100
}

/** 時系列から単位不整合の外れ値を除いた最新値を返す。 */
export function cleanLatest(series: SeriesPoint[] | undefined): number | null {
  if (!series || !series.length) return null
  const pts = series.filter((p) => Number.isFinite(p.value) && p.value > 0)
  if (!pts.length) return null
  const vals = pts.map((p) => p.value).sort((a, b) => a - b)
  const median = vals[Math.floor(vals.length / 2)]
  const clean = pts.filter((p) => p.value >= median * 0.25 && p.value <= median * 4)
  const src = (clean.length ? clean : pts).filter((p) => p.year > 0)
  const use = src.length ? src : clean.length ? clean : pts
  const sorted = [...use].sort((a, b) => a.year - b.year)
  return sorted[sorted.length - 1].value
}

/** CAGR(%) → ポテンシャルポイント(0–100)。 */
export const growthRateToPotential = (pct: number): number =>
  piecewise(pct, [
    [-15, 5],
    [-5, 30],
    [0, 50],
    [5, 66],
    [10, 82],
    [20, 100],
  ])

/** 企業年齢 → ポテンシャル。若く確立した企業ほど伸びしろ。 */
export const ageToPotential = (age: number): number =>
  piecewise(age, [
    [0, 72],
    [5, 84],
    [15, 78],
    [30, 62],
    [60, 50],
    [100, 42],
  ])

/** 従業員規模 → 安定性ポテンシャル。 */
export const scaleToPotential = (employees: number): number =>
  piecewise(employees, [
    [50, 55],
    [500, 70],
    [5000, 72],
    [50000, 64],
    [200000, 58],
  ])

const BASE_WEIGHTS = {
  industry: 0.3,
  revenueGrowth: 0.24,
  headcountGrowth: 0.14,
  age: 0.14,
  scale: 0.08,
  capital: 0.1,
}

// 表示ラベルは「将来を保証しない公開データ上の傾向」を示す表現にする（断定回避）。
const STAGES: Record<GrowthStage, string> = {
  hypergrowth: '成長シグナル：強（若い企業）',
  growth: '成長シグナル：中',
  mature: '成熟期',
  declining: '転換期（要確認）',
}

function classify(score: number, revCagr: number | null): GrowthStage {
  let s: GrowthStage
  if (score >= 74) s = 'hypergrowth'
  else if (score >= 60) s = 'growth'
  else if (score >= 46) s = 'mature'
  else s = 'declining'
  // 明確な売上減少は一段引き下げ
  if (revCagr !== null && revCagr <= -5 && s === 'growth') s = 'mature'
  return s
}

function outlookText(stage: GrowthStage, c: Company, note: string): string {
  const n = c.name
  switch (stage) {
    case 'hypergrowth':
      return `${n} は将来性が高い水準。${note}。伸びる市場でキャリアの選択肢が広がりやすい環境です。`
    case 'growth':
      return `${n} は成長が見込める水準。${note}。安定と成長のバランスが取りやすいでしょう。`
    case 'mature':
      return `${n} は成熟・安定の水準。${note}。大きな成長より安定を重視する人に向きます。`
    case 'declining':
      return `${n} は構造的な逆風がある水準。${note}。事業転換の動向とスキルの汎用性を意識したい局面です。`
  }
}

/** 企業の将来性を評価。純粋関数。 */
export function evaluateGrowth(c: Company): GrowthEvaluation {
  const outlook = industryOutlook(c.industry)
  const revCagr = cagr(c.revenueHistory)
  const empCagr = cagr(c.employeeHistory)
  const age = c.founded ? Math.max(0, CURRENT_YEAR - c.founded) : null

  const raw: (GrowthFactor & { base: number })[] = [
    {
      key: 'industry',
      label: '業種の将来性',
      valueLabel: `${c.industry}｜${outlook.note}`,
      potential: outlook.score,
      available: true,
      base: BASE_WEIGHTS.industry,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'revenueGrowth',
      label: '売上成長率',
      valueLabel: revCagr !== null ? `年率 ${revCagr.toFixed(1)}%` : 'データ未取得',
      potential: revCagr !== null ? growthRateToPotential(revCagr) : 50,
      available: revCagr !== null,
      base: BASE_WEIGHTS.revenueGrowth,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'headcountGrowth',
      label: '従業員数の成長',
      valueLabel: empCagr !== null ? `年率 ${empCagr.toFixed(1)}%` : 'データ未取得',
      potential: empCagr !== null ? growthRateToPotential(empCagr) : 50,
      available: empCagr !== null,
      base: BASE_WEIGHTS.headcountGrowth,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'age',
      label: '成長ステージ（企業年齢）',
      valueLabel: age !== null ? `設立${c.founded}年・${age}年目` : 'データ未取得',
      potential: age !== null ? ageToPotential(age) : 55,
      available: age !== null,
      base: BASE_WEIGHTS.age,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'scale',
      label: '事業規模の安定性',
      valueLabel: `従業員 ${c.employees.toLocaleString()}名`,
      potential: scaleToPotential(c.employees),
      available: true,
      base: BASE_WEIGHTS.scale,
      weight: 0,
      contribution: 0,
    },
    {
      key: 'capital',
      label: '資本アクセス（上場）',
      valueLabel: c.listed ? '上場' : '非上場',
      potential: c.listed ? 66 : 54,
      available: true,
      base: BASE_WEIGHTS.capital,
      weight: 0,
      contribution: 0,
    },
  ]

  // 利用可能な要因のみで重みを再正規化
  const availSum = raw.filter((f) => f.available).reduce((s, f) => s + f.base, 0)
  const factors: GrowthFactor[] = raw.map((f) => {
    const weight = f.available ? f.base / availSum : 0
    return {
      key: f.key,
      label: f.label,
      valueLabel: f.valueLabel,
      potential: Math.round(f.potential),
      available: f.available,
      weight,
      contribution: f.available ? f.potential * weight : 0,
    }
  })

  const growthScore = Math.round(clamp(factors.reduce((s, f) => s + f.contribution, 0)))
  const stage = classify(growthScore, revCagr)

  const strengths: string[] = []
  const risks: string[] = []
  if (outlook.score >= 70) strengths.push(`成長市場（${c.industry}）に位置する`)
  if (outlook.score < 45) risks.push(`構造的な逆風のある業種（${c.industry}）`)
  if (revCagr !== null && revCagr >= 7) strengths.push(`売上が年率 ${revCagr.toFixed(1)}% で伸長`)
  if (revCagr !== null && revCagr <= -3) risks.push(`売上が年率 ${revCagr.toFixed(1)}% で減少`)
  if (empCagr !== null && empCagr >= 5) strengths.push(`従業員数が年率 ${empCagr.toFixed(1)}% で増加（採用拡大）`)
  if (empCagr !== null && empCagr <= -3) risks.push(`従業員数が年率 ${empCagr.toFixed(1)}% で減少`)
  if (age !== null && age <= 20 && age >= 3) strengths.push('若く成長余地のあるステージ')
  if (age !== null && age >= 80) risks.push('歴史が長く、変革スピードが課題になりやすい')
  if (c.listed) strengths.push('上場企業で資金調達・ガバナンス面が安定')

  return {
    growthScore,
    stage,
    stageLabel: STAGES[stage],
    factors,
    strengths,
    risks,
    outlook: outlookText(stage, c, outlook.note),
    revenueCagr: revCagr,
    headcountCagr: empCagr,
  }
}
