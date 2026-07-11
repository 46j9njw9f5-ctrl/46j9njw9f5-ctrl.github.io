import { describe, it, expect, beforeAll } from 'vitest'
import { getRows } from '../data/rows'
import { loadData } from '../data'
import type { Row } from '../data/rows'
import { PREFS, THEMES, prefBySlug, themeBySlug, selectRegion, MIN_INDEXABLE } from './region'

// 実データは実行時に動的読み込みされるため、評価前に必ず loadData() を待つ。
let rows: Row[]
beforeAll(async () => {
  await loadData()
  rows = getRows('real')
})

describe('地域ページのロジック', () => {
  it('47都道府県のスラッグは一意', () => {
    const slugs = new Set(PREFS.map((p) => p.slug))
    expect(slugs.size).toBe(47)
  })

  it('スラッグから都道府県を解決できる', () => {
    expect(prefBySlug('fukuoka')?.name).toBe('福岡県')
    expect(prefBySlug('tokyo')?.name).toBe('東京都')
    expect(prefBySlug('unknown')).toBeUndefined()
  })

  it('福岡県は十分な企業数があり index 可能', () => {
    const fukuoka = prefBySlug('fukuoka')!
    const res = selectRegion(rows, fukuoka)
    expect(res.total).toBeGreaterThanOrEqual(MIN_INDEXABLE)
    expect(res.indexable).toBe(true)
    // すべて福岡県の企業
    expect(res.rows.every((r) => r.company.location === '福岡県')).toBe(true)
  })

  it('「残業が少ない」テーマは残業データのある企業だけを昇順で返す', () => {
    const fukuoka = prefBySlug('fukuoka')!
    const theme = themeBySlug('overtime-low')!
    const res = selectRegion(rows, fukuoka, theme)
    expect(res.rows.length).toBeGreaterThan(0)
    // 全件が残業データを持つ
    expect(res.rows.every((r) => r.company.laborReal?.avgOvertimeHours != null)).toBe(true)
    // 昇順（少ない順）
    const ot = res.rows.map((r) => r.company.laborReal!.avgOvertimeHours as number)
    for (let i = 1; i < ot.length; i++) expect(ot[i]).toBeGreaterThanOrEqual(ot[i - 1])
  })

  it('「有給取得率が高い」テーマは降順で返す', () => {
    const theme = themeBySlug('paid-leave-high')!
    const res = selectRegion(rows, prefBySlug('tokyo')!, theme)
    const pl = res.rows.map((r) => r.company.laborReal!.paidLeaveRate as number)
    for (let i = 1; i < pl.length; i++) expect(pl[i]).toBeLessThanOrEqual(pl[i - 1])
  })

  it('データが少ない都道府県は noindex（indexable=false）になりうる', () => {
    // いずれかの県で MIN 未満なら indexable=false が成立することを型として保証。
    const results = PREFS.map((p) => selectRegion(rows, p, themeBySlug('hidden-gems')!, new Set()))
    // 隠れ優良は空集合を渡しているので全県 0 件 → 非index
    expect(results.every((r) => r.indexable === false)).toBe(true)
  })

  it('全テーマにラベルと説明がある', () => {
    for (const t of THEMES) {
      expect(t.label.length).toBeGreaterThan(0)
      expect(t.description.length).toBeGreaterThan(0)
    }
  })
})
