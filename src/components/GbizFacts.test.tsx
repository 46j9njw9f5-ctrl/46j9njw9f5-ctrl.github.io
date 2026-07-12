// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GbizFacts } from './GbizFacts'
import type { GbizInfo } from '../types'

const g: GbizInfo = {
  capitalStock: 100000000,
  established: '1990-04-01',
  employees: 1200,
  womenEmployees: 400,
  menEmployees: 800,
  representative: '代表取締役社長 山田 太郎',
  businessSummary: 'ソフトウェア開発',
  certifications: [
    { title: 'くるみん認定', category: '子育て支援' },
    { title: '経営革新計画の承認' },
  ],
  subsidyCount: 2,
  source: 'gBizINFO（経済産業省）',
  asOf: '2026-06-30',
}

describe('GbizFacts 表示', () => {
  it('gbizが無ければ何も描画しない（未連携）', () => {
    const { container } = render(<GbizFacts gbiz={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('事実タグ・認定・出典を表示する', () => {
    render(<GbizFacts gbiz={g} />)
    expect(screen.getByText('公的登録・認定', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('くるみん認定', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/代表取締役社長 山田 太郎/)).toBeInTheDocument()
    expect(screen.getByText(/gBizINFO（経済産業省）/)).toBeInTheDocument()
    // 事実タグ
    expect(screen.getByText('事実')).toBeInTheDocument()
  })
})
