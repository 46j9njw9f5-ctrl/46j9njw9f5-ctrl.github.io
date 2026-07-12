import { describe, it, expect } from 'vitest'
import { parseHojin, isNotableCertification } from './gbiz'

// gBizINFO v1 HojinInfo スキーマに沿った現実的サンプル。
const sample = {
  corporate_number: '5180001017428',
  name: 'サンプル株式会社',
  capital_stock: 100000000,
  date_of_establishment: '1990-04-01',
  employee_number: 1200,
  company_size_female: 400,
  company_size_male: 800,
  representative_position: '代表取締役社長',
  representative_name: '山田 太郎',
  business_summary: '各種ソフトウェアの開発',
  certification: [
    { title: 'くるみん認定', category: '子育て支援', target: '全社', date_of_approval: '2023-06-01' },
    { title: 'えるぼし認定（3段階目）', category: '女性活躍', date_of_approval: '2022-03-01' },
  ],
  subsidy: [{}, {}],
  procurement: [{}],
  update_date: '2026-06-30',
}

describe('gBizINFO 変換', () => {
  it('事実フィールドを推測なしで抽出する', () => {
    const g = parseHojin(sample)!
    expect(g.capitalStock).toBe(100000000)
    expect(g.established).toBe('1990-04-01')
    expect(g.employees).toBe(1200)
    expect(g.womenEmployees).toBe(400)
    expect(g.representative).toBe('代表取締役社長 山田 太郎')
    expect(g.certifications).toHaveLength(2)
    expect(g.certifications[0].title).toBe('くるみん認定')
    expect(g.subsidyCount).toBe(2)
    expect(g.procurementCount).toBe(1)
    expect(g.source).toBe('gBizINFO（経済産業省）')
    expect(g.asOf).toBe('2026-06-30')
  })

  it('値が無い項目は入れない（欠損を0埋めしない）', () => {
    const g = parseHojin({ corporate_number: '1', capital_stock: '', employee_number: null, certification: [] })
    expect(g).toBeNull() // 事実ゼロ → 未連携
  })

  it('空・不正入力でも落ちない', () => {
    expect(parseHojin(null)).toBeNull()
    expect(parseHojin(undefined)).toBeNull()
    expect(parseHojin({} as Record<string, unknown>)).toBeNull()
  })

  it('求職者に関係の深い認定を判定できる', () => {
    expect(isNotableCertification('くるみん認定')).toBe(true)
    expect(isNotableCertification('健康経営優良法人2025')).toBe(true)
    expect(isNotableCertification('経営革新計画の承認')).toBe(false)
  })
})
