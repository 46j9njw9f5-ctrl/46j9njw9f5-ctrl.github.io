import { describe, it, expect } from 'vitest'
import { buildReport, REPORT_PRICE, type CompanyReportInput } from './reportModel'
import { evaluateCompany } from '../../data/rows'
import type { Company, CompanyMetrics } from '../../types'

function withMetrics(id: string, name: string, m: Partial<CompanyMetrics> = {}): CompanyReportInput {
  const c = {
    id, name, industry: 'IT・通信', location: '東京都', employees: 500, founded: 2005, listed: false,
    accent: '#888',
    metrics: {
      avgOvertimeHours: 18, paidLeaveRate: 72, turnover3yrRate: 9, avgTenureYears: 11,
      overtimePaidRate: 100, harassmentIndex: 0, laborViolationCount: 0, womenManagerRate: 25,
      alwaysHiring: false, socialInsurance: true, ...m,
    },
  } as Company
  return evaluateCompany(c)
}

// 労働データがまったく無い実在企業型（laborReal も metrics も無し）。
function bareCompany(id: string, name: string): CompanyReportInput {
  const c = {
    id, name, industry: '小売・流通', location: '大阪府', employees: 300, founded: null, listed: true,
    accent: '#888', source: { name: 'Wikidata', license: 'CC0', url: 'https://www.wikidata.org' },
  } as Company
  return evaluateCompany(c)
}

describe('就職判断レポートの表示モデル', () => {
  it('価格は 1回 500円で固定される', () => {
    expect(REPORT_PRICE).toBe(500)
    const r = buildReport([withMetrics('Q1', 'A社')])
    expect(r.price).toBe(500)
  })

  it('実決済・PDF・会員系の関数を公開しない（検証のみ）', async () => {
    const mod = await import('./reportModel')
    for (const k of Object.keys(mod)) {
      expect(k.toLowerCase()).not.toMatch(/pay|checkout|charge|purchase|pdf|stripe|login|signup/)
    }
  })

  it('欠損値を推測で補完せず「未公表」と表示する', () => {
    const r = buildReport([bareCompany('Q9', 'データ乏しい社')])
    const summary = r.previewSections.find((s) => s.key === 'summary')!
    const ot = summary.lines.find((l) => l.label === '月平均残業時間')!
    expect(ot.value).toBe('未公表')
    expect(ot.kind).toBe('unpublished')
    // 数値が捏造されていない
    expect(summary.lines.every((l) => l.value !== 'NaN')).toBe(true)
  })

  it('事実・解釈・未公表を区別する', () => {
    const r = buildReport([withMetrics('Q1', 'A社')])
    const summary = r.previewSections.find((s) => s.key === 'summary')!
    expect(summary.lines.some((l) => l.kind === 'fact')).toBe(true)
    // スコアは独自指標＝解釈
    expect(summary.lines.some((l) => l.kind === 'interpretation' && l.label.includes('スコア'))).toBe(true)
  })

  it('単一企業レポートと比較レポートを区別できる', () => {
    const single = buildReport([withMetrics('Q1', 'A社')])
    expect(single.type).toBe('single')
    expect(single.comparisonSections).toHaveLength(0)

    const cmp = buildReport([withMetrics('Q1', 'A社'), withMetrics('Q2', 'B社')])
    expect(cmp.type).toBe('comparison')
    expect(cmp.comparisonSections.length).toBeGreaterThan(0)
    // 比較に両社の値が入る
    const line = cmp.comparisonSections[0].lines[0].value
    expect(line).toContain('A社')
    expect(line).toContain('B社')
  })

  it('企業構成シグネチャは順序に依存しない（重複計上防止の基盤）', () => {
    const a = withMetrics('Q1', 'A社')
    const b = withMetrics('Q2', 'B社')
    expect(buildReport([a, b]).signature).toBe(buildReport([b, a]).signature)
  })

  it('比較で片方が未公表でも他方の値は保持される', () => {
    const cmp = buildReport([withMetrics('Q1', 'A社'), bareCompany('Q9', 'B社')])
    const metrics = cmp.comparisonSections.find((s) => s.key === 'cmp-metrics')!
    const ot = metrics.lines.find((l) => l.label === '月平均残業')!
    expect(ot.value).toContain('A社')
    expect(ot.value).toContain('B社: 未公表')
  })

  it('必須の免責文をすべて含む', () => {
    const r = buildReport([withMetrics('Q1', 'A社')])
    const joined = r.disclaimers.join('')
    expect(joined).toContain('決済は発生しません')
    expect(joined).toContain('保証するものではありません')
    expect(joined).toContain('面接')
  })
})
