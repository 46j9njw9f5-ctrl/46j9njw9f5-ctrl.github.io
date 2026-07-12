import { Fragment, Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { getRows, type Row } from '../data/rows'
import { datasets, type DatasetKey } from '../data'
import { availableAxes, matchScore, PERSONAS } from '../engine/fit'
import { findHiddenGems } from '../engine/gems'
import { CompanyCard } from '../components/CompanyCard'
import { SiteFooter } from '../components/Legal'
import { AdSlot, AffiliateStrip } from '../monetize/Ad'
import { activeAffiliates, hasAdsense, hasAnyAds } from '../monetize/config'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useDebouncedSearch } from '../hooks/useDebouncedValue'
import { track } from '../analytics/track'
import { ReportInterestSummary, isReportStatsEnabled } from '../features/report/ReportInterestSummary'
import { SCORE_CAVEAT, FOUR_WAY_KEY } from '../features/disclosure/copy'

// 重いUIは初期バンドルから分離（React.lazy）。チャートもこの分割に含まれる。
const Dashboard = lazy(() => import('../components/Dashboard').then((m) => ({ default: m.Dashboard })))
const ComparePanel = lazy(() => import('../components/ComparePanel').then((m) => ({ default: m.ComparePanel })))

type SortKey = 'match' | 'growth' | 'growthLow' | 'productivity' | 'white' | 'black' | 'work' | 'employees' | 'young'

const SORTS: { key: SortKey; label: string; need?: 'work' | 'eval' }[] = [
  { key: 'growth', label: '成長シグナルが強い順（独自指標）' },
  { key: 'growthLow', label: '成長シグナルが弱い順（独自指標）' },
  { key: 'productivity', label: '生産性が高い順' },
  { key: 'employees', label: '規模が大きい順' },
  { key: 'young', label: '設立が新しい順' },
  { key: 'work', label: '働きやすい順', need: 'work' },
  { key: 'white', label: '労働環境スコアが高い順（独自指標）', need: 'eval' },
  { key: 'black', label: '労働環境リスクが高い順', need: 'eval' },
]

const DATA_UPDATED = '2026年7月'
const FAV_KEY = 'zero.favorites.v2'
const THEME_KEY = 'zero.theme'
type Theme = 'light' | 'dark' | 'auto'
function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark' || t === 'auto') return t
    return 'light'
  } catch {
    return 'light'
  }
}
function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
}
function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export default function HomePage() {
  useDocumentMeta({
    title: '-0（ゼロ）| 就職者のための企業評価・労働環境リスク可視化',
    description:
      '実データと独自ロジックで、企業の将来性・生産性・働きやすさ・労働環境リスクを可視化。公開データに基づく参考指標です。',
    path: '/',
  })

  const navigate = useNavigate()
  const [datasetKey, setDatasetKey] = useState<DatasetKey>('real')
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('すべて')
  const [sort, setSort] = useState<SortKey>('growth')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [promisingOnly, setPromisingOnly] = useState(false)
  const [safeOnly, setSafeOnly] = useState(false)
  const [gemsOnly, setGemsOnly] = useState(false)
  const [priorities, setPriorities] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [compare, setCompare] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [view, setView] = useState<'list' | 'analytics'>('list')
  const [visibleCount, setVisibleCount] = useState(60)
  const [theme, setTheme] = useState<Theme>(loadTheme)

  // 検索入力は即時反映、絞り込み計算だけ 200ms debounce（クリアは即時）
  const debouncedQuery = useDebouncedSearch(query, 200)

  // 検索実行を匿名計測（本文は送らず件数目安のみ）。
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q) track('search', { len: q.length })
  }, [debouncedQuery])

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const dataset = datasets.find((d) => d.key === datasetKey)!
  const rows = useMemo(() => getRows(datasetKey), [datasetKey])

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    setVisibleCount(60)
  }, [debouncedQuery, industry, sort, onlyFavorites, promisingOnly, safeOnly, gemsOnly, priorities, datasetKey])

  useEffect(() => {
    setIndustry('すべて')
    setQuery('')
    setCompare([])
    setShowCompare(false)
    setPriorities([])
    setSort('growth')
    setGemsOnly(false)
    if (!dataset.hasLabor) setSafeOnly(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetKey])

  const scrollToId = (id: string) => {
    setView('list')
    // レイアウト確定後にスクロール
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const findGems = () => {
    setView('list')
    setGemsOnly(true)
    track('filter', { kind: 'hidden_gems' })
    requestAnimationFrame(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const openCompany = useCallback((id: string) => navigate(`/company/${encodeURIComponent(id)}`), [navigate])
  const toggleFavorite = useCallback(
    (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    [],
  )
  const toggleCompare = useCallback(
    (id: string) =>
      setCompare((c) => {
        if (c.includes(id)) return c.filter((x) => x !== id)
        if (c.length >= 4) return c
        track('compare_add', { company: id })
        return [...c, id]
      }),
    [],
  )

  const togglePriority = (key: string) =>
    setPriorities((p) => {
      const next = p.includes(key) ? p.filter((x) => x !== key) : [...p, key]
      setSort(next.length ? 'match' : 'growth')
      track('filter', { kind: 'priority', count: next.length })
      return next
    })
  const selectIndustry = (ind: string) => {
    setIndustry(ind)
    if (ind !== 'すべて') track('filter', { kind: 'industry' })
  }

  const industries = useMemo(
    () => ['すべて', ...Array.from(new Set(dataset.companies.map((c) => c.industry)))],
    [dataset],
  )

  // includes の O(n) 走査を避ける（一覧の各カードで毎回参照するため Set 化）。
  const favoritesSet = useMemo(() => new Set(favorites), [favorites])
  const compareSet = useMemo(() => new Set(compare), [compare])
  // マッチ度は絞り込み・並び替え・カード表示で同じ行に対し何度も計算されるため事前計算。
  const matchScores = useMemo(() => {
    if (!priorities.length) return null
    const m = new Map<string, number | null>()
    for (const r of rows) m.set(r.company.id, matchScore(r.scores, priorities))
    return m
  }, [rows, priorities])

  const fitAxes = useMemo(() => availableAxes(rows.map((r) => r.scores)), [rows])
  const gemIds = useMemo(
    () =>
      new Set(
        findHiddenGems(
          rows.map((r) => ({ id: r.company.id, name: r.company.name, employees: r.company.employees, scores: r.scores })),
          { maxCount: 12 },
        ).map((g) => g.id),
      ),
    [rows],
  )
  const availKeys = new Set(fitAxes.map((a) => a.key))
  const personas = PERSONAS.filter((p) => p.priorities.some((k) => availKeys.has(k)))
  const applyPersona = (pri: string[]) => {
    const f = pri.filter((k) => availKeys.has(k))
    if (!f.length) return
    setPriorities(f)
    setSort('match')
  }

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (industry !== 'すべて' && r.company.industry !== industry) return false
      if (onlyFavorites && !favoritesSet.has(r.company.id)) return false
      if (promisingOnly && r.growth.growthScore < 60) return false
      if (gemsOnly && !gemIds.has(r.company.id)) return false
      if (safeOnly && r.evaluation && (r.evaluation.level === 'danger' || r.evaluation.level === 'caution'))
        return false
      if (q) {
        const hay = `${r.company.name} ${r.company.industry} ${r.company.location} ${r.company.blurb ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'match':
          return (matchScores?.get(b.company.id) ?? -1) - (matchScores?.get(a.company.id) ?? -1)
        case 'growth':
          return b.growth.growthScore - a.growth.growthScore
        case 'growthLow':
          return a.growth.growthScore - b.growth.growthScore
        case 'productivity':
          return (b.productivity.score ?? -1) - (a.productivity.score ?? -1)
        case 'work':
          return (b.workability?.score ?? -1) - (a.workability?.score ?? -1)
        case 'employees':
          return b.company.employees - a.company.employees
        case 'young':
          return (b.company.founded ?? 0) - (a.company.founded ?? 0)
        case 'white':
          return (b.evaluation?.whiteScore ?? -1) - (a.evaluation?.whiteScore ?? -1)
        case 'black':
          return (b.evaluation?.blackScore ?? -1) - (a.evaluation?.blackScore ?? -1)
      }
    })
  }, [rows, debouncedQuery, industry, sort, onlyFavorites, promisingOnly, safeOnly, gemsOnly, gemIds, favoritesSet, matchScores])

  const offers = useMemo(() => activeAffiliates(), [])
  const compareRows = compare
    .map((id) => rows.find((r) => r.company.id === id))
    .filter((x): x is Row => Boolean(x))

  const hasWork = rows.some((r) => r.workability)
  const hasEval = rows.some((r) => r.evaluation)
  const baseSorts = SORTS.filter((s) => !s.need || (s.need === 'work' ? hasWork : hasEval))
  const availableSorts = priorities.length
    ? [{ key: 'match' as SortKey, label: '重視条件との一致度順' }, ...baseSorts]
    : baseSorts

  return (
    <div className="app">
      {isReportStatsEnabled() && <ReportInterestSummary />}
      <header className="header">
        <div className="header__top">
          <div className="brand">
            <span className="brand__logo">-0</span>
            <span className="brand__tag">就職者のための企業評価プラットフォーム</span>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : t === 'light' ? 'auto' : 'dark'))}
            aria-label={`表示テーマ: ${theme === 'auto' ? '自動' : theme === 'dark' ? 'ダーク' : 'ライト'}。クリックで切替`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '🌙 ダーク' : theme === 'light' ? '☀️ ライト' : '🌗 自動'}</span>
          </button>
        </div>
        <div className="subhead">
          就職・転職の会社選びを、<b>公開データ</b>で比較して失敗を防ぐ。<b>将来性</b>と<b>労働環境リスク</b>を可視化し、
          気になる会社の「次の行動」まで進めます。現在 <b>{dataset.label}</b> の {dataset.companies.length} 社を分析中。
        </div>
        <div className="datasrc" aria-label="データ出典と更新日">
          出典：Wikidata・厚労省 しょくばらぼ（公開オープンデータ） ／ データ更新：{DATA_UPDATED}
        </div>
        {view === 'list' && (
          <nav className="quickstart" aria-label="はじめかた">
            <button className="quickstart__btn" onClick={() => scrollToId('company-search')}>
              <span className="quickstart__icon" aria-hidden="true">🔍</span>
              <span className="quickstart__label">会社名で検索</span>
            </button>
            <button className="quickstart__btn" onClick={() => scrollToId('fit')}>
              <span className="quickstart__icon" aria-hidden="true">🎯</span>
              <span className="quickstart__label">条件から探す</span>
            </button>
            <button className="quickstart__btn" onClick={findGems}>
              <span className="quickstart__icon" aria-hidden="true">💎</span>
              <span className="quickstart__label">注目企業候補</span>
            </button>
            <Link className="quickstart__btn" to="/area">
              <span className="quickstart__icon" aria-hidden="true">📍</span>
              <span className="quickstart__label">地域から探す</span>
            </Link>
          </nav>
        )}
      </header>

      <div className="dataset-tabs" role="tablist" aria-label="データセット">
        {datasets.map((d) => (
          <button
            key={d.key}
            role="tab"
            aria-selected={datasetKey === d.key}
            className={`dataset-tab ${datasetKey === d.key ? 'dataset-tab--active' : ''}`}
            onClick={() => setDatasetKey(d.key)}
          >
            <span aria-hidden="true">{d.key === 'real' ? '📊 ' : '🧪 '}</span>
            {d.label}
          </button>
        ))}
      </div>
      <div className="dataset-desc">{dataset.description}</div>

      <div className="viewnav" role="tablist" aria-label="表示の切替">
        <button
          role="tab"
          aria-selected={view === 'list'}
          className={`viewnav__btn ${view === 'list' ? 'viewnav__btn--active' : ''}`}
          onClick={() => setView('list')}
        >
          <span aria-hidden="true">🏢 </span>企業を見る
        </button>
        <button
          role="tab"
          aria-selected={view === 'analytics'}
          className={`viewnav__btn ${view === 'analytics' ? 'viewnav__btn--active' : ''}`}
          onClick={() => setView('analytics')}
        >
          <span aria-hidden="true">📊 </span>データ分析
        </button>
      </div>

      {view === 'analytics' && (
        <Suspense fallback={<div className="lazy-fallback">データ分析を読み込み中…</div>}>
          <Dashboard rows={rows} datasetLabel={dataset.label} />
        </Suspense>
      )}

      {view === 'list' && (
        <>
          <details className="legend">
            <summary>スコアの見方（グレード S〜D）</summary>
            <div className="legend__body">
              <div className="legend__grades">
                <span className="legend__g" style={{ color: 'var(--excellent)' }}>S 非常に良い</span>
                <span className="legend__g" style={{ color: 'var(--excellent)' }}>A 良い</span>
                <span className="legend__g" style={{ color: 'var(--standard)' }}>B 標準以上</span>
                <span className="legend__g" style={{ color: 'var(--caution)' }}>C 標準</span>
                <span className="legend__g" style={{ color: 'var(--danger)' }}>D 要注意</span>
              </div>
              <p>
                各スコアは 0〜100 で、<b>高いほど良い向き</b>に揃えています（労働環境スコア＝労働環境リスクの裏返し）。
                <b>将来性</b>＝成長の見込み／<b>生産性</b>＝一人当たり売上／<b>働きやすさ</b>＝残業・有給・定着など／
                <b>労働環境</b>＝公開データ上の労働環境の確認度。グレードは根拠つきで、詳細画面のタブから確認できます。
                算出方法は <a href="/methodology">スコアの算出方法</a> をご覧ください。
              </p>
            </div>
          </details>

          <div className="fit" id="fit">
            <div className="fit__head">
              <span className="fit__title">🎯 重視条件から探す</span>
              <span className="fit__hint">重視することを選ぶと「一致度」で並び替えます（適性検査ではありません）</span>
              {priorities.length > 0 && (
                <button className="fit__clear" onClick={() => { setPriorities([]); setSort('growth') }}>
                  クリア
                </button>
              )}
            </div>
            {personas.length > 0 && (
              <div className="fit__personas">
                <span className="fit__personas-label">かんたん診断:</span>
                {personas.map((p) => (
                  <button key={p.key} className="chip chip--persona" onClick={() => applyPersona(p.priorities)}>
                    <span aria-hidden="true">{p.emoji} </span>{p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="chip-row">
              {fitAxes.map((ax) => (
                <button
                  key={ax.key}
                  className={`chip ${priorities.includes(ax.key) ? 'chip--active' : ''}`}
                  aria-pressed={priorities.includes(ax.key)}
                  onClick={() => togglePriority(ax.key)}
                >
                  {ax.label}
                </button>
              ))}
            </div>
          </div>

          <div className="controls">
            <label htmlFor="company-search" className="sr-only">企業名・業界・地域で検索</label>
            <input
              id="company-search"
              type="search"
              className="input"
              placeholder="🔍 企業名・業界・地域で検索"
              aria-label="企業名・業界・地域で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label htmlFor="company-sort" className="sr-only">並び替え</label>
            <select
              id="company-sort"
              className="select"
              aria-label="並び替え"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {availableSorts.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="chip-row" role="group" aria-label="業種で絞り込み">
            {industries.map((ind) => (
              <button
                key={ind}
                className={`chip ${industry === ind ? 'chip--active' : ''}`}
                aria-pressed={industry === ind}
                onClick={() => selectIndustry(ind)}
              >
                {ind}
              </button>
            ))}
          </div>

          <div className="chip-row" style={{ marginTop: 10 }}>
            <button
              className={`chip ${promisingOnly ? 'chip--active' : ''}`}
              aria-pressed={promisingOnly}
              onClick={() => setPromisingOnly((v) => !v)}
            >
              <span aria-hidden="true">🚀 </span>成長シグナルが強い（独自指標60点以上）
            </button>
            {gemIds.size > 0 && (
              <button
                className={`chip ${gemsOnly ? 'chip--active' : ''}`}
                aria-pressed={gemsOnly}
                onClick={() => setGemsOnly((v) => !v)}
              >
                <span aria-hidden="true">⭐ </span>注目企業候補のみ（{gemIds.size}）
              </button>
            )}
            {dataset.hasLabor && (
              <button
                className={`chip ${safeOnly ? 'chip--active' : ''}`}
                aria-pressed={safeOnly}
                onClick={() => setSafeOnly((v) => !v)}
              >
                <span aria-hidden="true">🛡 </span>安全な企業のみ（要注意・危険を除外）
              </button>
            )}
            <button
              className={`chip ${onlyFavorites ? 'chip--active' : ''}`}
              aria-pressed={onlyFavorites}
              onClick={() => setOnlyFavorites((v) => !v)}
            >
              <span aria-hidden="true">★ </span>お気に入りのみ（{favorites.length}）
            </button>
          </div>

          <p className="score-caveat" id="results">
            <span className="score-caveat__key">{FOUR_WAY_KEY}</span>
            <span>{SCORE_CAVEAT}</span>
          </p>

          <div className="result-meta" aria-live="polite">
            {filtered.length} 社中 {Math.min(visibleCount, filtered.length)} 社を表示中
          </div>

          <AffiliateStrip offers={offers} heading="就活・転職に役立つサービス" />

          {filtered.length === 0 ? (
            <div className="empty">条件に一致する企業がありません。</div>
          ) : (
            <>
              <div className="grid">
                {filtered.slice(0, visibleCount).map((r, i) => (
                  <Fragment key={r.company.id}>
                    <CompanyCard
                      company={r.company}
                      growth={r.growth}
                      productivity={r.productivity}
                      evaluation={r.evaluation}
                      workability={r.workability}
                      match={matchScores ? (matchScores.get(r.company.id) ?? null) : null}
                      isFavorite={favoritesSet.has(r.company.id)}
                      inCompare={compareSet.has(r.company.id)}
                      onOpen={openCompany}
                      onToggleFavorite={toggleFavorite}
                      onToggleCompare={toggleCompare}
                    />
                    {hasAdsense() && (i + 1) % 6 === 0 && i < Math.min(visibleCount, filtered.length) - 1 && (
                      <AdSlot className="ad--ingrid" />
                    )}
                  </Fragment>
                ))}
              </div>
              {filtered.length > visibleCount && (
                <div className="more-wrap">
                  <button className="more-btn" onClick={() => setVisibleCount((n) => n + 60)}>
                    もっと見る（残り {filtered.length - visibleCount} 社）
                  </button>
                </div>
              )}
            </>
          )}

          <div className="disclaimer">
            「実データ（Wikidata）」の事実データ（従業員数・設立年・売上・業種）は Wikidata（CC0）由来です。
            働きやすさ（残業・有給・女性管理職）は厚労省 女性活躍・両立支援DB（公開データ）由来です。将来性スコアは業種見通し等の前提を含む
            <b>参考値</b>で、投資・就職の助言ではありません。労働環境リスクは離職率・残業代・法令違反などの追加連携時のみ
            算出します（実名企業に推測値は付与しません）。「デモ」データの企業は架空であり、実在の企業とは関係ありません。
            {hasAnyAds() && (
              <>
                {' '}
                <b>【広告について】</b>当サイトは Google
                AdSense およびアフィリエイトプログラム（第三者配信）による広告を掲載しています。「広告」「PR」と
                表示された枠は広告です。掲載は当サイトの評価・順位とは独立しており、企業評価が広告出稿で変わることはありません。
              </>
            )}
          </div>

          {showCompare && compareRows.length > 0 && (
            <Suspense fallback={null}>
              <ComparePanel rows={compareRows} onClose={() => setShowCompare(false)} />
            </Suspense>
          )}

          {compare.length > 0 && (
            <div className="compare-bar">
              <div className="compare-bar__items">
                {compareRows.map((r) => (
                  <span className="compare-pill" key={r.company.id}>
                    {r.company.name}
                    <button onClick={() => toggleCompare(r.company.id)} aria-label={`${r.company.name} を比較から削除`}>
                      <span aria-hidden="true">×</span>
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
                onClick={() => {
                  track('compare_done', { count: compareRows.length })
                  setShowCompare(true)
                }}
              >
                {compareRows.length}社を比較
              </button>
            </div>
          )}
        </>
      )}

      <SiteFooter />

      {/* /company/:id のとき、企業詳細モーダルをここに重ねる（一覧は保持） */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  )
}
