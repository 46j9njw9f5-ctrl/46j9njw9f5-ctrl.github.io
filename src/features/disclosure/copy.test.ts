import { describe, it, expect } from 'vitest'
import { coverageLabel, isOldData, oldDataWarning, FOUR_WAY_KEY, FIT_CAVEAT } from './copy'
import type { WorkabilityEvaluation } from '../../types'

const wk = (over: Partial<WorkabilityEvaluation>): WorkabilityEvaluation =>
  ({
    score: 60, tier: 'mid', tierLabel: '標準的', factors: [], highlights: [],
    availableCount: 3, totalCount: 5, coverage: 0.6, confidence: 'medium',
    presentItems: [], missingItems: [], isReference: false, ...over,
  }) as WorkabilityEvaluation

describe('開示コピーのヘルパー', () => {
  it('データ充足度ラベルは既存のconfidenceを反映する', () => {
    expect(coverageLabel(wk({ confidence: 'high', availableCount: 5 }))!.text).toContain('高（5/5項目）')
    expect(coverageLabel(wk({ confidence: 'low', availableCount: 1 }))!.level).toBe('low')
    expect(coverageLabel(undefined)).toBeNull()
  })

  it('古いデータ判定は閾値を境に切り替わる', () => {
    const now = '2026-07-12T00:00:00Z'
    expect(isOldData('2026-06-01', now)).toBe(false) // 最近
    expect(isOldData('2023-01-01', now)).toBe(true) // 3年以上前
    expect(isOldData(undefined, now)).toBe(false) // 日付なしは警告しない
    expect(isOldData('not-a-date', now)).toBe(false) // 不正日付でも落ちない
  })

  it('古いデータ警告文に日付が入る', () => {
    expect(oldDataWarning('2023-01-01')).toContain('2023-01-01')
  })

  it('4分類キーと相性の注意文が定義されている', () => {
    expect(FOUR_WAY_KEY).toContain('事実')
    expect(FOUR_WAY_KEY).toContain('未公表')
    expect(FIT_CAVEAT).toContain('適性検査')
  })
})
