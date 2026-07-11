import { describe, expect, it } from 'vitest'
import companies from './companies.generated.json'
import { evaluateWorkability } from '../engine/workability'
import type { WorkabilityInput } from '../engine/workability'

// 実データの労働指標の「量と妥当性」を守るテスト。
// 再取得でしょくばらぼの離職率・勤続年数が失われた場合に気付けるようにする。
type Labor = WorkabilityInput & { avgAge?: number }
const list = companies as unknown as { name: string; laborReal?: Labor }[]

describe('実データの労働指標', () => {
  it('離職率（3年以内）を実データで持つ企業が一定数ある', () => {
    const withTurnover = list.filter((c) => c.laborReal?.turnover3yrRate != null)
    // 現状 約380社。大幅に減ったら再取得の欠落を疑う。
    expect(withTurnover.length).toBeGreaterThan(300)
  })

  it('離職率は 0〜100% の妥当な範囲に収まっている', () => {
    const vals = list.map((c) => c.laborReal?.turnover3yrRate).filter((v): v is number => v != null)
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('5項目すべて揃う「高信頼度」の実企業が存在する', () => {
    const keys: (keyof WorkabilityInput)[] = [
      'avgOvertimeHours',
      'paidLeaveRate',
      'turnover3yrRate',
      'avgTenureYears',
      'womenManagerRate',
    ]
    const full = list.filter((c) => c.laborReal && keys.every((k) => c.laborReal![k] != null))
    expect(full.length).toBeGreaterThan(50)
    // 実データが揃った企業は評価も高信頼度になる。
    const sample = full[0]
    const w = evaluateWorkability(sample.laborReal as WorkabilityInput)
    expect(w.confidence).toBe('high')
    expect(w.isReference).toBe(false)
  })
})
