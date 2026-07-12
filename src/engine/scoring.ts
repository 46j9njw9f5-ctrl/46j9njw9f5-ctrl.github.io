import type { CompanyWithLabor, Evaluation, FactorScore, RiskLevel } from '../types'

/**
 * ブラック企業スコアリングエンジン。
 *
 * 各労働指標を「リスクポイント 0–100（高いほど悪い）」へ正規化し、
 * 重み付き平均で「ブラック度スコア」を算出する。
 * ロジックはすべて透明（各指標の寄与を UI で開示）。
 */

const clamp = (v: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, v))

/**
 * 区分点による線形補間。points は x 昇順の [x, risk] 配列。
 * 範囲外は端の値でクランプする。
 */
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

// --- 各指標 → リスクポイント(0–100) の写像 -------------------------------

/** 月平均残業時間: 45h で警告水準、80h で過労死ライン。 */
export const overtimeRisk = (h: number): number =>
  piecewise(h, [
    [0, 0],
    [20, 15],
    [45, 60],
    [80, 100],
  ])

/** 有給消化率: 高いほど良い。リスク = ほぼ (100 - 率)。 */
export const paidLeaveRisk = (rate: number): number =>
  clamp(100 - rate)

/** 3年以内離職率: 10% 標準、30% で高リスク、50% 以上は最悪。 */
export const turnoverRisk = (rate: number): number =>
  piecewise(rate, [
    [5, 0],
    [10, 15],
    [30, 75],
    [50, 100],
  ])

/** 平均勤続年数: 短いほど使い捨て傾向。 */
export const tenureRisk = (years: number): number =>
  piecewise(years, [
    [1, 100],
    [3, 70],
    [7, 25],
    [12, 0],
  ])

/** 残業代支給率: 100% で 0、低いほどサービス残業の疑い。 */
export const overtimePaidRisk = (rate: number): number =>
  clamp((100 - rate) * 1.1)

/** ハラスメント指数（1000人あたり年間報告件数）。 */
export const harassmentRisk = (index: number): number =>
  piecewise(index, [
    [0, 0],
    [2, 30],
    [5, 70],
    [10, 100],
  ])

/** 労基署是正勧告: 1件でも重い。 */
export const laborViolationRisk = (count: number): number =>
  clamp(count * 45)

/** 万年採用: 常時大量採用は高離職の兆候。 */
export const alwaysHiringRisk = (flag: boolean): number => (flag ? 100 : 0)

/** 社会保険 未整備は基礎的な問題。 */
export const socialInsuranceRisk = (ok: boolean): number => (ok ? 0 : 100)

// --- 重み（合計 1.0） -----------------------------------------------------

export const WEIGHTS = {
  overtime: 0.2,
  turnover: 0.18,
  paidLeave: 0.12,
  overtimePaid: 0.12,
  tenure: 0.1,
  harassment: 0.1,
  laborViolation: 0.1,
  alwaysHiring: 0.04,
  socialInsurance: 0.04,
} as const

/** 区分の判定。 */
export function riskLevel(blackScore: number): { level: RiskLevel; label: string } {
  if (blackScore < 25) return { level: 'excellent', label: '公開データ上：良好' }
  if (blackScore < 45) return { level: 'standard', label: '公開データ上：標準' }
  if (blackScore < 65) return { level: 'caution', label: '要確認' }
  return { level: 'danger', label: '要確認（リスク指標高）' }
}

function buildFactors(c: CompanyWithLabor): FactorScore[] {
  const m = c.metrics
  const defs: Omit<FactorScore, 'contribution'>[] = [
    {
      key: 'overtime',
      label: '月平均残業時間',
      valueLabel: `${m.avgOvertimeHours}h/月`,
      risk: overtimeRisk(m.avgOvertimeHours),
      weight: WEIGHTS.overtime,
    },
    {
      key: 'turnover',
      label: '3年以内離職率',
      valueLabel: `${m.turnover3yrRate}%`,
      risk: turnoverRisk(m.turnover3yrRate),
      weight: WEIGHTS.turnover,
    },
    {
      key: 'paidLeave',
      label: '有給休暇消化率',
      valueLabel: `${m.paidLeaveRate}%`,
      risk: paidLeaveRisk(m.paidLeaveRate),
      weight: WEIGHTS.paidLeave,
    },
    {
      key: 'overtimePaid',
      label: '残業代支給率',
      valueLabel: `${m.overtimePaidRate}%`,
      risk: overtimePaidRisk(m.overtimePaidRate),
      weight: WEIGHTS.overtimePaid,
    },
    {
      key: 'tenure',
      label: '平均勤続年数',
      valueLabel: `${m.avgTenureYears}年`,
      risk: tenureRisk(m.avgTenureYears),
      weight: WEIGHTS.tenure,
    },
    {
      key: 'harassment',
      label: 'ハラスメント指数',
      valueLabel: `${m.harassmentIndex} 件/千人`,
      risk: harassmentRisk(m.harassmentIndex),
      weight: WEIGHTS.harassment,
    },
    {
      key: 'laborViolation',
      label: '労基署 是正勧告',
      valueLabel: `${m.laborViolationCount} 件`,
      risk: laborViolationRisk(m.laborViolationCount),
      weight: WEIGHTS.laborViolation,
    },
    {
      key: 'alwaysHiring',
      label: '万年採用',
      valueLabel: m.alwaysHiring ? 'あり' : 'なし',
      risk: alwaysHiringRisk(m.alwaysHiring),
      weight: WEIGHTS.alwaysHiring,
    },
    {
      key: 'socialInsurance',
      label: '社会保険',
      valueLabel: m.socialInsurance ? '完備' : '未整備',
      risk: socialInsuranceRisk(m.socialInsurance),
      weight: WEIGHTS.socialInsurance,
    },
  ]
  return defs.map((d) => ({
    ...d,
    risk: Math.round(d.risk),
    contribution: d.risk * d.weight,
  }))
}

/** 明示条件による危険信号。 */
function buildRedFlags(c: CompanyWithLabor): string[] {
  const m = c.metrics
  const flags: string[] = []
  if (m.avgOvertimeHours >= 80)
    flags.push(`月残業 ${m.avgOvertimeHours}h — 過労死ライン（80h）超え`)
  else if (m.avgOvertimeHours >= 60)
    flags.push(`月残業 ${m.avgOvertimeHours}h — 長時間労働の常態化`)
  if (m.overtimePaidRate < 80)
    flags.push(`残業代支給率 ${m.overtimePaidRate}% — サービス残業の疑い`)
  if (m.turnover3yrRate >= 30)
    flags.push(`3年離職率 ${m.turnover3yrRate}% — 極端に高い`)
  if (m.laborViolationCount > 0)
    flags.push(`労基署の是正勧告 ${m.laborViolationCount} 件`)
  if (!m.socialInsurance) flags.push('社会保険が未整備')
  if (m.alwaysHiring && m.turnover3yrRate >= 20)
    flags.push('万年採用 × 高離職率 — 使い捨て体質の兆候')
  if (m.paidLeaveRate < 40)
    flags.push(`有給消化率 ${m.paidLeaveRate}% — 休みにくい環境`)
  if (m.harassmentIndex >= 5)
    flags.push('ハラスメント報告が多い')
  return flags
}

/** 就職者向けの良い点。 */
function buildGoodPoints(c: CompanyWithLabor): string[] {
  const m = c.metrics
  const good: string[] = []
  if (m.avgOvertimeHours <= 20) good.push(`残業が少ない（${m.avgOvertimeHours}h/月）`)
  if (m.paidLeaveRate >= 70) good.push(`有給が取りやすい（消化率 ${m.paidLeaveRate}%）`)
  if (m.turnover3yrRate <= 10) good.push(`定着率が高い（3年離職率 ${m.turnover3yrRate}%）`)
  if (m.avgTenureYears >= 10) good.push(`平均勤続 ${m.avgTenureYears}年 — 長く働ける`)
  if (m.overtimePaidRate >= 100) good.push('残業代は全額支給')
  if (
    c.avgAnnualSalary !== undefined &&
    c.industryAvgSalary !== undefined &&
    c.avgAnnualSalary >= c.industryAvgSalary * 1.1
  )
    good.push(`年収が業界平均を上回る（${c.avgAnnualSalary}万円）`)
  if (m.womenManagerRate >= 20) good.push(`女性管理職比率 ${m.womenManagerRate}%`)
  if (m.laborViolationCount === 0 && m.socialInsurance)
    good.push('法令違反歴なし・社保完備')
  return good
}

function buildVerdict(blackScore: number, level: RiskLevel, c: CompanyWithLabor): string {
  const name = c.name
  switch (level) {
    case 'danger':
      return `${name} はブラック度 ${blackScore} と高く、応募は慎重に。特に長時間労働・離職率・残業代の実態を必ず面接で確認してください。`
    case 'caution':
      return `${name} は要注意水準（ブラック度 ${blackScore}）。気になる指標が複数あります。労働条件通知書と実残業時間を確認しましょう。`
    case 'standard':
      return `${name} は概ね標準的（ブラック度 ${blackScore}）。目立った赤信号は少ないですが、配属先による差に注意。`
    case 'excellent':
      return `${name} は健全性が高い水準（ホワイト度 ${100 - blackScore}）。労働環境の指標は良好です。`
  }
}

/** 企業を評価して結果を返す。純粋関数。 */
export function evaluate(c: CompanyWithLabor): Evaluation {
  const factors = buildFactors(c)
  const blackScoreRaw = factors.reduce((s, f) => s + f.contribution, 0)
  const blackScore = Math.round(clamp(blackScoreRaw))
  const whiteScore = 100 - blackScore
  const { level, label } = riskLevel(blackScore)
  return {
    blackScore,
    whiteScore,
    level,
    levelLabel: label,
    factors: factors.sort((a, b) => b.contribution - a.contribution),
    redFlags: buildRedFlags(c),
    goodPoints: buildGoodPoints(c),
    verdict: buildVerdict(blackScore, level, c),
  }
}
