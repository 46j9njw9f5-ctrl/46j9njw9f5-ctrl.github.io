import { describe, it, expect } from 'vitest'
import { matchScore, availableAxes, describeFit } from './fit'

describe('相性診断', () => {
  const scores = { growth: 80, workability: 60, safety: null, productivity: 90, scale: 70 }

  it('選択軸が揃っていれば平均でマッチ度を出す', () => {
    expect(matchScore(scores, ['growth', 'productivity'])).toBe(85)
  })

  it('半分だけ欠損なら中立値へ補正する', () => {
    // growth=80 の生値を、充足率50%に応じて 65 へ縮約
    expect(matchScore(scores, ['growth', 'safety'])).toBe(65)
  })

  it('半数未満しか揃わなければ比較不能にする', () => {
    expect(matchScore(scores, ['growth', 'safety', 'unknown'])).toBeNull()
  })

  it('選択が無ければ null', () => {
    expect(matchScore(scores, [])).toBeNull()
  })

  it('選んだ軸が全て欠損なら null', () => {
    expect(matchScore(scores, ['safety'])).toBeNull()
  })

  it('重複した選択軸を二重計上しない', () => {
    expect(matchScore(scores, ['growth', 'growth', 'productivity'])).toBe(85)
  })

  it('availableAxes はデータのある軸だけ返す', () => {
    const all = [
      { growth: 50, workability: null, safety: null, productivity: 40, scale: 60 },
      { growth: 70, workability: null, safety: null, productivity: 80, scale: 55 },
    ]
    const keys = availableAxes(all).map((a) => a.key)
    expect(keys).toContain('growth')
    expect(keys).toContain('productivity')
    expect(keys).not.toContain('workability')
    expect(keys).not.toContain('safety')
  })
})

describe('describeFit（こんな人に向いている）', () => {
  it('強い軸から「向いている人」を導く', () => {
    const fit = describeFit({ growth: 85, productivity: 80, workability: null, safety: null, scale: 40 })
    const texts = fit.suits.map((s) => s.text)
    expect(texts).toContain('成長産業で挑戦したい人')
    expect(texts).toContain('少数精鋭で成果を出したい人')
    expect(fit.bestPersona).not.toBeNull()
  })

  it('弱い軸から「気をつけたい人」を導く', () => {
    const fit = describeFit({ growth: 50, productivity: 50, workability: 30, safety: 35, scale: 50 })
    expect(fit.caution.length).toBeGreaterThan(0)
    expect(fit.caution.join('')).toMatch(/ワークライフ|労働環境/)
  })

  it('規模が小さいと裁量重視の人に向く', () => {
    const fit = describeFit({ growth: 50, productivity: 50, workability: null, safety: null, scale: 30 })
    expect(fit.suits.map((s) => s.text)).toContain('裁量を持って幅広く動きたい人')
  })

  it('データが乏しければ suits も caution も空で summary を返す', () => {
    const fit = describeFit({ growth: 55, productivity: 55, workability: null, safety: null, scale: 55 })
    expect(fit.suits).toHaveLength(0)
    expect(fit.caution).toHaveLength(0)
    expect(fit.summary).toContain('限られ')
  })

  it('suits は最大3件に制限', () => {
    const fit = describeFit({ growth: 90, productivity: 90, workability: 90, safety: 90, scale: 90 })
    expect(fit.suits.length).toBeLessThanOrEqual(3)
  })
})
