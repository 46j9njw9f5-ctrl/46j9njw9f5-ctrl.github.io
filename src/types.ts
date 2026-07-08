// 企業データモデル。将来的に API / DB / ユーザー投稿へ差し替え可能なように
// UI・スコアリングから独立した純粋なデータ型として定義する。

export interface CompanyMetrics {
  /** 月平均残業時間（時間） */
  avgOvertimeHours: number
  /** 有給休暇消化率（%） */
  paidLeaveRate: number
  /** 3年以内離職率（%） */
  turnover3yrRate: number
  /** 平均勤続年数（年） */
  avgTenureYears: number
  /** 残業代支給率（%）。100 未満はサービス残業の疑い */
  overtimePaidRate: number
  /** ハラスメント報告指数（従業員1000人あたりの年間報告件数） */
  harassmentIndex: number
  /** 直近5年の労基署 是正勧告件数 */
  laborViolationCount: number
  /** 女性管理職比率（%） */
  womenManagerRate: number
  /** 万年採用（常時大量募集） */
  alwaysHiring: boolean
  /** 社会保険 完備 */
  socialInsurance: boolean
}

export interface Company {
  id: string
  name: string
  /** 業界 */
  industry: string
  /** 本社所在地 */
  location: string
  /** 従業員数 */
  employees: number
  /** 設立年 */
  founded: number
  /** 上場 */
  listed: boolean
  /** 平均年収（万円） */
  avgAnnualSalary: number
  /** 業界平均年収（万円）。給与水準の相対評価に使用 */
  industryAvgSalary: number
  /** ロゴ代替のアクセントカラー */
  accent: string
  metrics: CompanyMetrics
  /** 一言紹介 */
  blurb: string
}

/** スコアの区分 */
export type RiskLevel = 'excellent' | 'standard' | 'caution' | 'danger'

/** 各指標の寄与（透明性のため UI で開示する） */
export interface FactorScore {
  key: string
  label: string
  /** 生の指標値の表示文字列 */
  valueLabel: string
  /** リスクポイント 0–100（高いほど悪い） */
  risk: number
  /** 重み 0–1 */
  weight: number
  /** ブラック度スコアへの寄与 = risk * weight */
  contribution: number
}

export interface Evaluation {
  /** ブラック度スコア 0–100（高いほど危険） */
  blackScore: number
  /** ホワイト度スコア 0–100（高いほど健全） = 100 - blackScore */
  whiteScore: number
  level: RiskLevel
  levelLabel: string
  factors: FactorScore[]
  /** 危険信号（明示条件に該当した警告） */
  redFlags: string[]
  /** 良い点 */
  goodPoints: string[]
  /** 就職者向けの総合所見 */
  verdict: string
}
