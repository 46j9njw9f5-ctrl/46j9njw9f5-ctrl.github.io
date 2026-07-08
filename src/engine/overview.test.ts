import { describe, it, expect } from 'vitest'
import { buildOverview } from './overview'
import { evaluateGrowth } from './growth'
import { evaluateProductivity } from './productivity'
import { evaluateStock } from './stock'
import { evaluate } from './scoring'
import { evaluateWorkability } from './workability'
import type { Company, CompanyWithLabor } from '../types'

const real: Company = {
  id: 'r',
  name: 'テスト実データ社',
  industry: '半導体',
  location: '東京',
  employees: 5000,
  founded: 2015,
  listed: true,
  accent: '#888',
  revenueHistory: [
    { year: 2020, value: 100_000_000_000 },
    { year: 2024, value: 220_000_000_000 },
  ],
}

describe('総合コメント', () => {
  it('実データ企業でも軸と総合コメントを生成する', () => {
    const o = buildOverview({
      company: real,
      growth: evaluateGrowth(real),
      productivity: evaluateProductivity(real),
      stock: evaluateStock(real),
    })
    expect(o.verdict).toContain('テスト実データ社')
    expect(o.axes.some((a) => a.key === 'growth')).toBe(true)
    expect(o.axes.some((a) => a.key === 'workability')).toBe(false)
    expect(o.verdict).toContain('連携待ち')
  })

  it('労働データがあると安全度・働きやすさ軸が加わる', () => {
    const c: CompanyWithLabor = {
      ...real,
      metrics: {
        avgOvertimeHours: 15,
        paidLeaveRate: 80,
        turnover3yrRate: 7,
        avgTenureYears: 12,
        overtimePaidRate: 100,
        harassmentIndex: 0,
        laborViolationCount: 0,
        womenManagerRate: 30,
        alwaysHiring: false,
        socialInsurance: true,
      },
    }
    const o = buildOverview({
      company: c,
      growth: evaluateGrowth(c),
      productivity: evaluateProductivity(c),
      stock: evaluateStock(c),
      evaluation: evaluate(c),
      workability: evaluateWorkability(c),
    })
    expect(o.axes.map((a) => a.key)).toContain('safety')
    expect(o.axes.map((a) => a.key)).toContain('workability')
    expect(o.pros.length).toBeGreaterThan(0)
  })

  it('危険企業は総合コメントで警告する', () => {
    const bad: CompanyWithLabor = {
      ...real,
      industry: '訪問販売',
      metrics: {
        avgOvertimeHours: 90,
        paidLeaveRate: 15,
        turnover3yrRate: 50,
        avgTenureYears: 2,
        overtimePaidRate: 40,
        harassmentIndex: 8,
        laborViolationCount: 2,
        womenManagerRate: 3,
        alwaysHiring: true,
        socialInsurance: false,
      },
    }
    const o = buildOverview({
      company: bad,
      growth: evaluateGrowth(bad),
      productivity: evaluateProductivity(bad),
      stock: evaluateStock(bad),
      evaluation: evaluate(bad),
      workability: evaluateWorkability(bad),
    })
    expect(o.verdict).toContain('慎重')
    expect(o.cons.length).toBeGreaterThan(0)
  })
})
