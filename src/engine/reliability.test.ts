import { describe, expect, it } from 'vitest'
import { evaluateWorkability } from './workability'
import { industryOutlook } from './industry'
import { findHiddenGems } from './gems'
import type { AxisScores } from './fit'

describe('評価信頼性', () => {
  it('単一の良好指標だけでは働きやすさを高評価にしない', () => {
    const result = evaluateWorkability({ womenManagerRate: 50 })
    expect(result.score).toBeLessThan(70)
    expect(result.highlights.join('')).toContain('充足率')
  })

  it('複数の良好指標が揃えば高評価になる', () => {
    const result = evaluateWorkability({
      avgOvertimeHours: 10,
      paidLeaveRate: 85,
      turnover3yrRate: 5,
      avgTenureYears: 15,
      womenManagerRate: 35,
    })
    expect(result.score).toBeGreaterThanOrEqual(70)
  })

  it('retailをAIやITとして誤判定しない', () => {
    expect(industryOutlook('retail').score).not.toBe(92)
    expect(industryOutlook('retail').score).not.toBe(86)
  })

  it('AIとITは単語として存在するときだけ判定する', () => {
    expect(industryOutlook('AI software').score).toBe(92)
    expect(industryOutlook('IT services').score).toBe(86)
  })
})

describe('隠れ優良企業の認定条件', () => {
  const item = (id: string, employees: number, scores: AxisScores) => ({ id, name: id, employees, scores })

  it('2軸だけ高い企業は認定しない', () => {
    const result = findHiddenGems([
      item('candidate', 100, { growth: 90, productivity: 90, workability: null, safety: null, scale: 60 }),
      item('b', 200, { growth: 50, productivity: 50, workability: 50, safety: null, scale: 60 }),
      item('c', 300, { growth: 50, productivity: 50, workability: 50, safety: null, scale: 60 }),
      item('d', 400, { growth: 50, productivity: 50, workability: 50, safety: null, scale: 60 }),
    ])
    expect(result.some((g) => g.id === 'candidate')).toBe(false)
  })

  it('3軸以上かつ労働環境軸があれば認定対象になる', () => {
    const result = findHiddenGems([
      item('candidate', 100, { growth: 85, productivity: 82, workability: 80, safety: null, scale: 60 }),
      item('b', 200, { growth: 50, productivity: 50, workability: 50, safety: null, scale: 60 }),
      item('c', 300, { growth: 50, productivity: 50, workability: 50, safety: null, scale: 60 }),
      item('d', 400, { growth: 50, productivity: 50, workability: 50, safety: null, scale: 60 }),
    ])
    expect(result.some((g) => g.id === 'candidate')).toBe(true)
  })
})
