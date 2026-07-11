// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordGuideView,
  recordIntent,
  aggregate,
  loadStore,
  resetInterest,
  exportJson,
  STORAGE_KEY,
  type IntentMeta,
} from './reportInterest'

const single: IntentMeta = { signature: 'single:Q1', type: 'single', companyCount: 1, persona: 'wlb' }
const compare: IntentMeta = { signature: 'comparison:Q1+Q2', type: 'comparison', companyCount: 2 }

beforeEach(() => resetInterest())

describe('購入意向の記録・集計', () => {
  it('0件でも購入意向率は NaN にならず 0 を返す', () => {
    const agg = aggregate()
    expect(agg.interestRate).toBe(0)
    expect(Number.isNaN(agg.interestRate)).toBe(false)
    expect(agg.buyIntent).toBe(0)
  })

  it('同じ企業構成の連打を購入希望人数として重複計上しない', () => {
    recordIntent(single, 'buy')
    recordIntent(single, 'buy')
    recordIntent(single, 'buy')
    expect(aggregate().buyIntent).toBe(1)
  })

  it('別々の企業構成は別々に数える', () => {
    recordIntent(single, 'buy')
    recordIntent(compare, 'buy')
    const agg = aggregate()
    expect(agg.buyIntent).toBe(2)
    expect(agg.single.buy).toBe(1)
    expect(agg.comparison.buy).toBe(1)
  })

  it('同一構成で反応を変えると最新で上書きし二重計上しない', () => {
    recordIntent(single, 'buy')
    recordIntent(single, 'enough')
    const agg = aggregate()
    expect(agg.buyIntent).toBe(0)
    expect(agg.enough).toBe(1)
  })

  it('購入意向率＝buy/(buy+enough)', () => {
    recordIntent({ ...single, signature: 's1' }, 'buy')
    recordIntent({ ...single, signature: 's2' }, 'buy')
    recordIntent({ ...single, signature: 's3' }, 'enough')
    const agg = aggregate()
    expect(agg.responded).toBe(3)
    expect(agg.interestRate).toBeCloseTo(2 / 3, 5)
  })

  it('案内表示回数（案内到達数）を数える', () => {
    recordGuideView()
    recordGuideView()
    expect(aggregate().guideReach).toBe(2)
  })

  it('単一と比較で反応差を確認できる', () => {
    recordIntent({ ...single, signature: 'a' }, 'buy')
    recordIntent({ ...single, signature: 'b' }, 'enough')
    recordIntent({ ...compare, signature: 'c' }, 'buy')
    const agg = aggregate()
    expect(agg.single).toEqual({ buy: 1, enough: 1 })
    expect(agg.comparison).toEqual({ buy: 1, enough: 0 })
  })

  it('不正な localStorage でも落ちず空状態で復帰する', () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not json')
    expect(() => loadStore()).not.toThrow()
    const agg = aggregate()
    expect(agg.buyIntent).toBe(0)
    expect(agg.interestRate).toBe(0)
  })

  it('壊れた records 形状を無視して安全に読む', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, views: 'x', records: { k: 42, j: { intent: 'nope' } } }))
    const store = loadStore()
    expect(store.views).toBe(0)
    expect(Object.keys(store.records)).toHaveLength(0)
  })

  it('外部送信をしない（localStorage キーのみ使用）', () => {
    recordIntent(single, 'buy')
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    // JSON エクスポートは集計を含む
    expect(exportJson()).toContain('interestRate')
  })
})
