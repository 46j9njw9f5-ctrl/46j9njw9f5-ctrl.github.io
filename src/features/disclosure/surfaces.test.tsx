// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CompanyCard } from '../../components/CompanyCard'
import { CompanyDetail } from '../../components/CompanyDetail'
import { evaluateCompany } from '../../data/rows'
import type { Company, CompanyMetrics, RealLabor } from '../../types'

// 断定的・扇情的な用語（claims matrix §D）。引用/凡例を除き表に出してはならない。
const PROHIBITED = ['ブラック企業', 'ブラック度', '隠れ優良企業', 'おすすめ企業', 'マッチ度', 'ホワイト度', '安全度', '急成長期']

function demoRow(over: Partial<CompanyMetrics> = {}) {
  return evaluateCompany({
    id: 'D1', name: 'デモ・フルカンパニー', industry: 'IT・通信', location: '東京都', employees: 800,
    founded: 2004, listed: false, accent: '#888',
    metrics: {
      avgOvertimeHours: 18, paidLeaveRate: 72, turnover3yrRate: 9, avgTenureYears: 11,
      overtimePaidRate: 100, harassmentIndex: 0, laborViolationCount: 0, womenManagerRate: 25,
      alwaysHiring: false, socialInsurance: true, ...over,
    },
  } as Company)
}

function realRow(labor: Partial<RealLabor>) {
  return evaluateCompany({
    id: 'R1', name: '実在サンプル社', industry: '小売・流通', location: '福岡県', employees: 400,
    founded: 1990, listed: true, accent: '#888',
    source: { name: 'Wikidata', license: 'CC0', url: 'https://www.wikidata.org' },
    laborReal: { source: 'しょくばらぼ（厚労省）', ...labor },
  } as Company)
}

const renderDetail = (row: ReturnType<typeof evaluateCompany>) =>
  render(
    <MemoryRouter>
      <CompanyDetail
        company={row.company} growth={row.growth} productivity={row.productivity} stock={row.stock}
        evaluation={row.evaluation} workability={row.workability} scores={row.scores} onClose={() => {}}
      />
    </MemoryRouter>,
  )

describe('リリース面の開示・用語ガード', () => {
  it('企業カードは禁止用語を出さず、一致度・労働環境・充足度を表示する', () => {
    const r = demoRow()
    const { container } = render(
      <CompanyCard
        company={r.company} growth={r.growth} productivity={r.productivity}
        evaluation={r.evaluation} workability={r.workability} match={72}
        isFavorite={false} inCompare={false} onOpen={() => {}} onToggleFavorite={() => {}} onToggleCompare={() => {}}
      />,
    )
    const text = container.textContent ?? ''
    for (const term of PROHIBITED) expect(text).not.toContain(term)
    expect(text).toContain('重視条件との一致度 72%')
    expect(text).toContain('労働環境') // 旧「安全度」グレード
    expect(text).toContain('データ充足度')
  })

  it('企業詳細（デモ・フル）は禁止用語を出さず、4分類キーと訂正リンクを表示する', () => {
    renderDetail(demoRow())
    const text = document.body.textContent ?? ''
    for (const term of PROHIBITED) expect(text).not.toContain(term)
    expect(screen.getByText(/情報の誤りを報告する/)).toBeInTheDocument()
    expect(text).toContain('未公表・未連携の項目')
    expect(text).toContain('事実＝出典から直接取得')
  })

  it('公開データの無い実在企業には労働環境リスクスコアを出さない（未連携表示）', () => {
    renderDetail(realRow({ avgOvertimeHours: 20, paidLeaveRate: 70 }))
    // 労働環境リスク（black系）のタブ・根拠は出ない
    expect(screen.queryByText(/リスクスコアの根拠/)).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /リスク/ })).not.toBeInTheDocument()
    // 未連携が明示される
    expect(document.body.textContent).toContain('未連携')
  })

  it('古い労働データには更新警告を表示する', () => {
    renderDetail(realRow({ avgOvertimeHours: 20, paidLeaveRate: 70, asOf: '2022-01-01' }))
    expect(document.body.textContent).toContain('更新から時間が経っている')
  })

  it('新しい労働データには更新警告を出さない', () => {
    renderDetail(realRow({ avgOvertimeHours: 20, paidLeaveRate: 70, asOf: '2026-07-10' }))
    expect(document.body.textContent).not.toContain('更新から時間が経っている')
  })
})
