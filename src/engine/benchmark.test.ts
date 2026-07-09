import { describe, it, expect } from 'vitest'
import { percentileOf, industryLabel } from './benchmark'

describe('percentileOf', () => {
  // 0,10,…,100%tile の11値（等間隔なら値=パーセンタイル）
  const deciles = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  it('中央値は50パーセンタイル', () => {
    expect(percentileOf(50, deciles)).toBe(50)
  })

  it('範囲外は0/100にクランプ', () => {
    expect(percentileOf(-5, deciles)).toBe(0)
    expect(percentileOf(120, deciles)).toBe(100)
  })

  it('補間される', () => {
    expect(percentileOf(25, deciles)).toBe(25)
    expect(percentileOf(83, deciles)).toBe(83)
  })
})

describe('industryLabel', () => {
  it('JSICコードの接頭を外す', () => {
    expect(industryLabel('E:製造業')).toBe('製造業')
    expect(industryLabel('製造業')).toBe('製造業')
    expect(industryLabel(undefined)).toBe('')
  })
})
