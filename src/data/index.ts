import type { Company } from '../types'
import { companies as seed } from './companies'
import generated from './companies.generated.json'
import analyticsData from './analytics.generated.json'

/** しょくばらぼ由来の業種別・都道府県別の実データ集計。 */
export interface IndustryStat {
  key: string
  count: number
  avgOvertime: number | null
  avgPaidLeave: number | null
  avgWomenManager: number | null
  avgAge: number | null
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
export const analytics = analyticsData as NationalAnalytics

// 実データ（Wikidata・CC0）。事実データ中心で労働指標は未連携。
export const realCompanies = generated as unknown as Company[]

// デモ用シード（架空企業）。労働環境データを含み、ブラック度評価をフル体験できる。
export const demoCompanies = seed as Company[]

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
      '実在企業の事実データ（従業員数・設立年・売上・業種）を Wikidata から、働きやすさ（残業・有給・女性管理職）を厚労省 女性活躍・両立支援DBから取得（いずれも無認証の公開データ）。ブラック度は離職率・残業代等の追加連携で有効化。',
    companies: realCompanies,
    hasLabor: false,
  },
  {
    key: 'demo',
    label: 'デモ（労働環境つき）',
    description:
      '架空企業のサンプル。残業・離職率などの労働指標を含み、ブラック度評価をフルに体験できます。',
    companies: demoCompanies,
    hasLabor: true,
  },
]
