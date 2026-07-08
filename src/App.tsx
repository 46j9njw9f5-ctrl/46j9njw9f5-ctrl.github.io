import { useEffect, useMemo, useState } from 'react'
import { companies } from './data/companies'
import { evaluate } from './engine/scoring'
import type { Company, Evaluation } from './types'
import { CompanyCard } from './components/CompanyCard'
import { CompanyDetail } from './components/CompanyDetail'
import { ComparePanel } from './components/ComparePanel'

type SortKey = 'white' | 'black' | 'overtime' | 'turnover' | 'salary'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'white', label: 'ホワイト度が高い順' },
  { key: 'black', label: 'ブラック度が高い順' },
  { key: 'overtime', label: '残業が少ない順' },
  { key: 'turnover', label: '離職率が低い順' },
  { key: 'salary', label: '年収が高い順' },
]

const FAV_KEY = 'zero.favorites.v1'

// 全企業を一度だけ評価してキャッシュ。
const evaluated: { company: Company; evaluation: Evaluation }[] = companies.map((c) => ({
  company: c,
  evaluation: evaluate(c),
}))

const industries = ['すべて', ...Array.from(new Set(companies.map((c) => c.industry)))]

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export default function App() {
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('すべて')
  const [sort, setSort] = useState<SortKey>('white')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [safeOnly, setSafeOnly] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [compare, setCompare] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (id: string) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  const toggleCompare = (id: string) =>
    setCompare((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : c.length >= 4 ? c : [...c, id],
    )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = evaluated.filter(({ company, evaluation }) => {
      if (industry !== 'すべて' && company.industry !== industry) return false
      if (onlyFavorites && !favorites.includes(company.id)) return false
      if (safeOnly && (evaluation.level === 'danger' || evaluation.level === 'caution'))
        return false
      if (q) {
        const hay = `${company.name} ${company.industry} ${company.location} ${company.blurb}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case 'white':
          return b.evaluation.whiteScore - a.evaluation.whiteScore
        case 'black':
          return b.evaluation.blackScore - a.evaluation.blackScore
        case 'overtime':
          return a.company.metrics.avgOvertimeHours - b.company.metrics.avgOvertimeHours
        case 'turnover':
          return a.company.metrics.turnover3yrRate - b.company.metrics.turnover3yrRate
        case 'salary':
          return b.company.avgAnnualSalary - a.company.avgAnnualSalary
      }
    })
    return sorted
  }, [query, industry, sort, onlyFavorites, safeOnly, favorites])

  const detail = detailId ? evaluated.find((e) => e.company.id === detailId) : null
  const compareRows = compare
    .map((id) => evaluated.find((e) => e.company.id === id))
    .filter((x): x is (typeof evaluated)[number] => Boolean(x))

  const dangerCount = evaluated.filter((e) => e.evaluation.level === 'danger').length

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand__logo">-0</span>
          <span className="brand__tag">就職者のための企業評価プラットフォーム</span>
        </div>
        <div className="subhead">
          労働指標からブラック企業リスクを可視化。全{companies.length}社中
          <b style={{ color: 'var(--danger)' }}> {dangerCount}社 </b>
          が「ブラック危険」水準です。
        </div>
      </header>

      <div className="controls">
        <input
          className="input"
          placeholder="🔍 企業名・業界・地域で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="chip-row">
        {industries.map((ind) => (
          <button
            key={ind}
            className={`chip ${industry === ind ? 'chip--active' : ''}`}
            onClick={() => setIndustry(ind)}
          >
            {ind}
          </button>
        ))}
      </div>

      <div className="chip-row" style={{ marginTop: 10 }}>
        <button
          className={`chip ${safeOnly ? 'chip--active' : ''}`}
          onClick={() => setSafeOnly((v) => !v)}
        >
          🛡 安全な企業のみ（要注意・危険を除外）
        </button>
        <button
          className={`chip ${onlyFavorites ? 'chip--active' : ''}`}
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          ★ お気に入りのみ（{favorites.length}）
        </button>
      </div>

      <div className="result-meta">{filtered.length} 社を表示中</div>

      {filtered.length === 0 ? (
        <div className="empty">条件に一致する企業がありません。</div>
      ) : (
        <div className="grid">
          {filtered.map(({ company, evaluation }) => (
            <CompanyCard
              key={company.id}
              company={company}
              evaluation={evaluation}
              isFavorite={favorites.includes(company.id)}
              inCompare={compare.includes(company.id)}
              onOpen={() => setDetailId(company.id)}
              onToggleFavorite={() => toggleFavorite(company.id)}
              onToggleCompare={() => toggleCompare(company.id)}
            />
          ))}
        </div>
      )}

      <div className="disclaimer">
        本アプリのスコアは提供された労働指標に基づく<b>参考値</b>です。掲載企業はすべて架空であり、
        実在の企業・団体とは一切関係ありません。実データを導入する際は、出典の明示・名誉毀損への配慮・
        企業側の反論掲載の仕組みを併せて実装する前提です。
      </div>

      {detail && (
        <CompanyDetail
          company={detail.company}
          evaluation={detail.evaluation}
          onClose={() => setDetailId(null)}
        />
      )}

      {showCompare && compareRows.length > 0 && (
        <ComparePanel rows={compareRows} onClose={() => setShowCompare(false)} />
      )}

      {compare.length > 0 && (
        <div className="compare-bar">
          <div className="compare-bar__items">
            {compareRows.map((r) => (
              <span className="compare-pill" key={r.company.id}>
                {r.company.name}
                <button onClick={() => toggleCompare(r.company.id)} aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => setCompare([])}>
            クリア
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: '0 0 auto' }}
            disabled={compareRows.length < 2}
            onClick={() => setShowCompare(true)}
          >
            {compareRows.length}社を比較
          </button>
        </div>
      )}
    </div>
  )
}
