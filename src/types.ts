// 企業データモデル。データ層（Wikidata 等の実データ / デモ用シード）から独立した
// 純粋なデータ型として定義する。

/** 出典（実データ化のためのデータ来歴）。 */
export interface DataSource {
  name: string
  license: string
  url: string
}

/** 時系列の1点（年 × 値）。従業員数・売上高の推移に使う。 */
export interface SeriesPoint {
  year: number
  value: number
}

/** 財務・株式情報（実データ。取れた範囲のみ・単位は円）。 */
export interface Financials {
  /** 純利益 */
  netProfit?: number
  /** 営業利益 */
  operatingIncome?: number
  /** 時価総額 */
  marketCap?: number
  /** ティッカーシンボル */
  ticker?: string
  /** 上場市場 */
  exchange?: string
}

/** 公的データから取得した実労働データ（部分的。取れた項目のみ）。 */
export interface RealLabor {
  /** 月平均残業時間（時間） */
  avgOvertimeHours?: number
  /** 年次有給休暇取得率（%） */
  paidLeaveRate?: number
  /** 3年以内離職率（%） */
  turnover3yrRate?: number
  /** 平均勤続年数（年） */
  avgTenureYears?: number
  /** 女性管理職比率（%） */
  womenManagerRate?: number
  /** 従業員の平均年齢 */
  avgAge?: number
  /** しょくばらぼの業種（JSIC大分類。業種平均との比較に使う） */
  industryJsic?: string
  /** 出典 */
  source: string
  /** 取得日 */
  asOf?: string
  /** 離職率・勤続年数（しょくばらぼ由来）を取得した日 */
  retentionAsOf?: string
}

/** 労働環境の指標（ブラック度スコアの入力）。実データが無い企業では未連携となる。 */
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
  /** Wikidata 由来の生の業種ラベル（デバッグ・透明性用） */
  industryRaw?: string[]
  /** 本社所在地 */
  location: string
  /** 従業員数 */
  employees: number
  /** 設立年（不明は null） */
  founded: number | null
  /** 上場 */
  listed: boolean
  /** 公式サイト */
  website?: string
  /** 平均年収（万円）。実データで未取得の場合は undefined */
  avgAnnualSalary?: number
  /** 業界平均年収（万円） */
  industryAvgSalary?: number
  /** ロゴ代替のアクセントカラー */
  accent: string
  /** 一言紹介 */
  blurb?: string
  /** 従業員数の推移（将来性分析の成長率に使用） */
  employeeHistory?: SeriesPoint[]
  /** 売上高の推移 */
  revenueHistory?: SeriesPoint[]
  /** 財務・株式情報 */
  financials?: Financials
  /** 法人番号（公的データとの突合キー） */
  corporateNumber?: string
  /** 公的データ由来の実労働データ（部分的） */
  laborReal?: RealLabor
  /** gBizINFO（経済産業省）由来の事実（資本金・設立・認定 等）。未連携なら undefined */
  gbiz?: GbizInfo
  /** 出典 */
  source?: DataSource
  /** 労働環境の指標（未連携なら undefined） */
  metrics?: CompanyMetrics
}

/** gBizINFO（経済産業省）由来の公的認定・表彰。 */
export interface GbizCertification {
  /** 届出認定等（例：くるみん認定、えるぼし認定、ユースエール認定） */
  title: string
  category?: string
  target?: string
  approvedOn?: string
}

/** gBizINFO 由来の事実データ（法人番号で同定・推測なし）。 */
export interface GbizInfo {
  capitalStock?: number
  established?: string
  employees?: number
  womenEmployees?: number
  menEmployees?: number
  representative?: string
  businessSummary?: string
  certifications: GbizCertification[]
  subsidyCount?: number
  procurementCount?: number
  source: string
  asOf?: string
}

/** 労働環境データを持つ企業（ブラック度評価の対象）。 */
export type CompanyWithLabor = Company & { metrics: CompanyMetrics }

export function hasLabor(c: Company): c is CompanyWithLabor {
  return c.metrics !== undefined
}

// ---------- ブラック度評価 ----------

export type RiskLevel = 'excellent' | 'standard' | 'caution' | 'danger'

/** 各指標の寄与（透明性のため UI で開示する）。 */
export interface FactorScore {
  key: string
  label: string
  valueLabel: string
  /** リスクポイント 0–100（高いほど悪い） */
  risk: number
  weight: number
  /** 寄与 = risk * weight */
  contribution: number
}

export interface Evaluation {
  /** ブラック度スコア 0–100（高いほど危険） */
  blackScore: number
  /** ホワイト度スコア 0–100（高いほど健全） */
  whiteScore: number
  level: RiskLevel
  levelLabel: string
  factors: FactorScore[]
  redFlags: string[]
  goodPoints: string[]
  verdict: string
}

// ---------- 将来性（成長性）評価 ----------

export type GrowthStage = 'hypergrowth' | 'growth' | 'mature' | 'declining'

/** 将来性を構成する各要因（寄与を開示）。 */
export interface GrowthFactor {
  key: string
  label: string
  valueLabel: string
  /** ポテンシャルポイント 0–100（高いほど将来性が高い） */
  potential: number
  /** 動的に再正規化された重み 0–1 */
  weight: number
  contribution: number
  /** データが実在したか（推定・欠損の透明性用） */
  available: boolean
}

export interface GrowthEvaluation {
  /** 将来性スコア 0–100（高いほど有望） */
  growthScore: number
  stage: GrowthStage
  stageLabel: string
  factors: GrowthFactor[]
  strengths: string[]
  risks: string[]
  outlook: string
  /** 売上 CAGR（算出できた場合、%） */
  revenueCagr: number | null
  /** 従業員 CAGR（%） */
  headcountCagr: number | null
}

// ---------- 生産性評価 ----------

export type Tier = 'high' | 'mid' | 'low'

export interface ProductivityEvaluation {
  /** 一人当たり売上高（円）。算出できない場合は null */
  revenuePerEmployee: number | null
  /** 一人当たり営業利益（円） */
  profitPerEmployee: number | null
  /** 営業利益率（%） */
  operatingMargin: number | null
  /** 生産性スコア 0–100（一人当たり売上を対数スケールで） */
  score: number | null
  tier: Tier
  note: string
}

// ---------- 株・投資（財務スナップショット） ----------

export interface StockSnapshot {
  /** 最新売上高（円） */
  revenue: number | null
  /** 純利益（円） */
  netProfit: number | null
  /** 営業利益（円） */
  operatingIncome: number | null
  /** 純利益率（%） */
  netMargin: number | null
  /** 時価総額（円） */
  marketCap: number | null
  /** 売上成長率（年率 %） */
  revenueCagr: number | null
  ticker?: string
  exchange?: string
  listed: boolean
  /** データが取得できたか */
  hasData: boolean
  /** 収益性の簡易評価（利益率ベース、投資助言ではない） */
  profitability: Tier | null
  note: string
}

// ---------- 働きやすさ評価 ----------

/** データ信頼度（充足率に基づく）。 */
export type DataConfidence = 'high' | 'medium' | 'low'

export interface WorkabilityEvaluation {
  /** 働きやすさスコア 0–100（高いほど働きやすい） */
  score: number
  tier: Tier
  tierLabel: string
  factors: GrowthFactor[]
  highlights: string[]
  // ── データ充足度（主要5項目のうち存在する数。スコアとは分けて提示） ──
  /** 揃っている主要項目数（0–5） */
  availableCount: number
  /** 主要項目の総数（=5） */
  totalCount: number
  /** 充足率 = availableCount / totalCount（0–1） */
  coverage: number
  /** 高(≥80%) / 中(50–80%) / 低(<50%) */
  confidence: DataConfidence
  /** 取得できている主要項目のラベル */
  presentItems: string[]
  /** 未取得の主要項目のラベル */
  missingItems: string[]
  /** 参考値として扱うべきか（低信頼度＝充足率50%未満） */
  isReference: boolean
}
