import { describe, it, expect } from 'vitest'
import {
  evaluate,
  overtimeRisk,
  paidLeaveRisk,
  turnoverRisk,
  tenureRisk,
  overtimePaidRisk,
  riskLevel,
  WEIGHTS,
} from './scoring'
import type { Company } from '../types'

function makeCompany(overrides: Partial<Company['metrics']> = {}, base: Partial<Company> = {}): Company {
  return {
    id: 'test',
    name: 'テスト社',
    industry: 'IT',
    location: '東京',
    employees: 100,
    founded: 2000,
    listed: false,
    avgAnnualSalary: 500,
    industryAvgSalary: 500,
    accent: '#888',
    blurb: '',
    metrics: {
      avgOvertimeHours: 20,
      paidLeaveRate: 70,
      turnover3yrRate: 10,
      avgTenureYears: 10,
      overtimePaidRate: 100,
      harassmentIndex: 0,
      laborViolationCount: 0,
      womenManagerRate: 20,
      alwaysHiring: false,
      socialInsurance: true,
      ...overrides,
    },
    ...base,
  }
}

describe('個別指標のリスク写像', () => {
  it('残業時間は単調増加し、80hで最大', () => {
    expect(overtimeRisk(0)).toBe(0)
    expect(overtimeRisk(80)).toBe(100)
    expect(overtimeRisk(100)).toBe(100)
    expect(overtimeRisk(45)).toBeGreaterThan(overtimeRisk(20))
  })

  it('有給消化率は高いほどリスクが低い', () => {
    expect(paidLeaveRisk(100)).toBe(0)
    expect(paidLeaveRisk(0)).toBe(100)
    expect(paidLeaveRisk(60)).toBe(40)
  })

  it('離職率5%は0、50%以上は最大', () => {
    expect(turnoverRisk(5)).toBe(0)
    expect(turnoverRisk(50)).toBe(100)
    expect(turnoverRisk(60)).toBe(100)
  })

  it('勤続年数は短いほど高リスク', () => {
    expect(tenureRisk(1)).toBe(100)
    expect(tenureRisk(12)).toBe(0)
    expect(tenureRisk(3)).toBeGreaterThan(tenureRisk(7))
  })

  it('残業代支給率100%はリスク0、未払いは高リスク', () => {
    expect(overtimePaidRisk(100)).toBe(0)
    expect(overtimePaidRisk(50)).toBeGreaterThan(50)
  })
})

describe('重みの合計は1.0', () => {
  it('WEIGHTS を合計すると 1 になる', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0, 6)
  })
})

describe('区分の閾値', () => {
  it('スコアに応じて4段階に分かれる', () => {
    expect(riskLevel(10).level).toBe('excellent')
    expect(riskLevel(30).level).toBe('standard')
    expect(riskLevel(55).level).toBe('caution')
    expect(riskLevel(90).level).toBe('danger')
  })
})

describe('evaluate 総合', () => {
  it('優良企業は低ブラック度・ホワイト判定', () => {
    const good = evaluate(makeCompany())
    expect(good.blackScore).toBeLessThan(25)
    expect(good.level).toBe('excellent')
    expect(good.whiteScore).toBe(100 - good.blackScore)
    expect(good.redFlags.length).toBe(0)
    expect(good.goodPoints.length).toBeGreaterThan(0)
  })

  it('劣悪企業は高ブラック度・危険判定と複数の赤信号', () => {
    const bad = evaluate(
      makeCompany({
        avgOvertimeHours: 95,
        paidLeaveRate: 20,
        turnover3yrRate: 45,
        avgTenureYears: 2,
        overtimePaidRate: 40,
        harassmentIndex: 8,
        laborViolationCount: 2,
        alwaysHiring: true,
        socialInsurance: false,
      }),
    )
    expect(bad.blackScore).toBeGreaterThan(65)
    expect(bad.level).toBe('danger')
    expect(bad.redFlags.length).toBeGreaterThanOrEqual(4)
  })

  it('ブラック度は0–100に収まる', () => {
    const bad = evaluate(
      makeCompany({
        avgOvertimeHours: 200,
        paidLeaveRate: 0,
        turnover3yrRate: 100,
        avgTenureYears: 0,
        overtimePaidRate: 0,
        harassmentIndex: 50,
        laborViolationCount: 10,
        alwaysHiring: true,
        socialInsurance: false,
      }),
    )
    expect(bad.blackScore).toBeLessThanOrEqual(100)
    expect(bad.blackScore).toBeGreaterThanOrEqual(0)
  })

  it('寄与の降順に factors が並ぶ', () => {
    const e = evaluate(makeCompany({ avgOvertimeHours: 90 }))
    for (let i = 0; i < e.factors.length - 1; i++) {
      expect(e.factors[i].contribution).toBeGreaterThanOrEqual(e.factors[i + 1].contribution)
    }
  })

  it('過労死ライン超えは赤信号に必ず出る', () => {
    const e = evaluate(makeCompany({ avgOvertimeHours: 85 }))
    expect(e.redFlags.some((f) => f.includes('過労死ライン'))).toBe(true)
  })
})
