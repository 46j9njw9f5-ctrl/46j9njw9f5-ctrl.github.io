import { describe, it, expect } from 'vitest'
import { findHiddenGems, type GemInput } from './gems'

const mk = (id: string, employees: number, scores: Record<string, number | null>): GemInput => ({
  id,
  name: id,
  employees,
  scores,
})

describe('隠れ優良企業', () => {
  const items = [
    mk('giant-good', 100000, { growth: 90, workability: 90, safety: 90, productivity: 90 }), // 良いが大規模
    mk('small-gem', 300, { growth: 85, workability: 80, safety: 82, productivity: null }), // 小規模×高品質
    mk('small-mid', 400, { growth: 55, workability: 50, safety: 60, productivity: null }), // 小規模だが平凡
    mk('small-gem2', 500, { growth: 78, workability: 75, safety: 70, productivity: null }),
  ]

  it('大規模の優良企業は除外され、小規模×高品質が上位に', () => {
    const gems = findHiddenGems(items, { qualityMin: 66 })
    const ids = gems.map((g) => g.id)
    expect(ids).toContain('small-gem')
    expect(ids).not.toContain('giant-good')
    expect(ids).not.toContain('small-mid')
    expect(gems[0].id).toBe('small-gem') // 品質最高
  })

  it('理由（強い軸・規模）が付与される', () => {
    const gems = findHiddenGems(items)
    const g = gems.find((x) => x.id === 'small-gem')!
    expect(g.reasons.some((r) => r.includes('将来性'))).toBe(true)
    expect(g.reasons.some((r) => r.includes('規模'))).toBe(true)
  })

  it('母集団が小さすぎると空', () => {
    expect(findHiddenGems([mk('a', 100, { growth: 90 })])).toEqual([])
  })
})
