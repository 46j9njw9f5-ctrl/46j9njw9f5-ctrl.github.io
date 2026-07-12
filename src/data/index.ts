import type { Company } from '../types'
import { companies as seed } from './companies'

// 大きな実データ（企業 6MB・全国集計）は初期バンドルから外し、
// 実行時に動的 import で読み込む（初期JSを大幅に軽量化）。

/** しょくばらぼ由来の業種別・都道府県別の実データ集計。 */
export interface IndustryStat {
  key: string
  count: number
  avgOvertime: number | null
  avgPaidLeave: number | null
  avgWomenManager: number | null
  avgAge: number | null
  /** 分位点（0,10,…,100%tile の11値）。業種内パーセンタイル算出に使う */
  otDeciles?: number[]
  plDeciles?: number[]
  wmDeciles?: number[]
}
export interface NationalAnalytics {
  source: string
  total: number
  national: {
    avgOvertime: number | null
    avgPaidLeave: number | null
    avgWomenManager: number | null
    avgAge: number | null
    counts: { overtime: number; paidLeave: number; women: number; age: number }
  }
  byIndustry: IndustryStat[]
  byPrefecture: IndustryStat[]
  overtimeHistogram: { bucket: string; count: number }[]
}
const EMPTY_ANALYTICS: NationalAnalytics = {
  source: '',
  total: 0,
  national: {
    avgOvertime: null,
    avgPaidLeave: null,
    avgWomenManager: null,
    avgAge: null,
    counts: { overtime: 0, paidLeave: 0, women: 0, age: 0 },
  },
  byIndustry: [],
  byPrefecture: [],
  overtimeHistogram: [],
}

// 読み込み後に差し替わる（ESM のライブバインディングで各所へ反映）。
export let analytics: NationalAnalytics = EMPTY_ANALYTICS

// 実データ（Wikidata＋公的データ）。読み込み後に同じ配列参照へ流し込む。
export const realCompanies: Company[] = []

// デモ用シード（架空企業・小さいので静的同梱）。ブラック度評価をフル体験できる。
export const demoCompanies = seed as Company[]

let loadPromise: Promise<void> | null = null

/** 大きな実データを一度だけ動的に読み込む（冪等）。 */
export function loadData(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all([
      import('./companies.generated.json'),
      import('./analytics.generated.json'),
    ]).then(([c, a]) => {
      const companies = (c.default ?? c) as unknown as Company[]
      realCompanies.splice(0, realCompanies.length, ...companies)
      analytics = (a.default ?? a) as unknown as NationalAnalytics
    })
  }
  return loadPromise
}

/** 実データの読み込みが完了しているか。 */
export function isDataLoaded(): boolean {
  return realCompanies.length > 0
}

export type DatasetKey = 'real' | 'demo'

export interface Dataset {
  key: DatasetKey
  label: string
  description: string
  companies: Company[]
  hasLabor: boolean
}

export const datasets: Dataset[] = [
  {
    key: 'real',
    label: '実データ（Wikidata＋公的データ）',
    description:
      '実在企業の事実データ（従業員数・設立年・売上・業種）を Wikidata から、働きやすさ（残業・有給・女性管理職）を厚労省 女性活躍・両立支援DBから取得（いずれも無認証の公開データ）。労働環境リスクの指標は離職率・残業代等の追加連携で有効化。',
    companies: realCompanies,
    hasLabor: false,
  },
  {
    key: 'demo',
    label: 'デモ（労働環境つき）',
    description:
      '架空企業のサンプル。残業・離職率などの労働指標を含み、労働環境リスク評価をフルに体験できます。',
    companies: demoCompanies,
    hasLabor: true,
  },
]
