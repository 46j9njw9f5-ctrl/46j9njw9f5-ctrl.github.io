import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { useDocumentMeta, SITE_ORIGIN } from '../hooks/useDocumentMeta'
import { getRows } from '../data/rows'
import { findHiddenGems } from '../engine/gems'
import { PREFS, THEMES, prefBySlug, themeBySlug, selectRegion } from '../engine/region'
import { AffiliateStrip } from '../monetize/Ad'
import { activeAffiliates } from '../monetize/config'

const DATA_UPDATED = '2026年7月'

export default function RegionPage() {
  const { pref: prefSlug, theme: themeSlug } = useParams()
  const pref = prefBySlug(prefSlug)
  const theme = themeBySlug(themeSlug)

  const allRows = useMemo(() => getRows('real'), [])
  const gemIds = useMemo(() => {
    if (!pref || theme?.slug !== 'hidden-gems') return undefined
    const inPref = allRows.filter((r) => r.company.location === pref.name)
    return new Set(
      findHiddenGems(
        inPref.map((r) => ({ id: r.company.id, name: r.company.name, employees: r.company.employees, scores: r.scores })),
        { maxCount: 30 },
      ).map((g) => g.id),
    )
  }, [allRows, pref, theme])

  const result = useMemo(
    () => (pref ? selectRegion(allRows, pref, theme, gemIds) : null),
    [allRows, pref, theme, gemIds],
  )

  // 未知の地域スラッグ・未知テーマは薄いページを作らず案内する（noindex）。
  const invalid = !pref || (themeSlug !== undefined && !theme)
  const title = pref
    ? `${pref.name}の${theme ? theme.label : '注目'}企業ランキング | -0（ゼロ）`
    : '地域が見つかりません | -0（ゼロ）'
  const description = pref
    ? `${pref.name}の${theme ? theme.label + '企業' : '企業'}を公開データ（Wikidata・厚労省しょくばらぼ）で比較。${theme?.description ?? '将来性・働きやすさ・労働環境リスクの参考指標'}。${result ? `${result.rows.length}社を掲載。` : ''}`
    : 'お探しの地域ページは見つかりませんでした。'
  const path = pref ? `/area/${pref.slug}${theme ? `/${theme.slug}` : ''}` : '/area'

  const jsonLd = useMemo(() => {
    if (!pref || !result || !result.rows.length) return undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: title.replace(' | -0（ゼロ）', ''),
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: result.rows.length,
      itemListElement: result.rows.slice(0, 20).map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_ORIGIN}/company/${r.company.id}`,
        name: r.company.name,
      })),
    }
  }, [pref, result, title])

  useDocumentMeta({
    title,
    description,
    path,
    ogType: 'website',
    noindex: invalid || !result || !result.indexable,
    jsonLd,
  })

  if (!pref || !result) {
    return (
      <PageShell title="地域が見つかりません">
        <p>お探しの地域ページは見つかりませんでした。</p>
        <p>
          <Link className="btn-link" to="/area">
            地域から企業を探す →
          </Link>
        </p>
      </PageShell>
    )
  }

  const { rows, indexable, total } = result

  return (
    <PageShell
      title={`${pref.name}の${theme ? theme.label : '注目'}企業`}
      lead={
        theme
          ? `${theme.description}。公開データがある企業のみを対象にしています。`
          : `${pref.name}に本社を置く企業を将来性の高い順に掲載しています。`
      }
    >
      <p className="region-src">
        出典：Wikidata（企業情報）・厚労省 しょくばらぼ（労働データ）— いずれも公開オープンデータ ／ データ更新：{DATA_UPDATED}
        <br />
        <span className="region-src__note">
          ※ 各スコアは公開データにもとづく参考指標で、現在の企業の状態を断定するものではありません。
        </span>
      </p>

      {/* テーマ切り替え（内部リンク） */}
      <nav className="region-themes" aria-label="条件でしぼり込む">
        <Link className={`chip ${!theme ? 'chip--active' : ''}`} to={`/area/${pref.slug}`}>
          すべて
        </Link>
        {THEMES.map((t) => (
          <Link
            key={t.slug}
            className={`chip ${theme?.slug === t.slug ? 'chip--active' : ''}`}
            to={`/area/${pref.slug}/${t.slug}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="region-meta">
        {pref.name}内 {total} 社中 <b>{rows.length}</b> 社{theme ? `（${theme.label}）` : ''}
        {!indexable && rows.length > 0 && <span className="region-meta__thin">・データが少ないため参考掲載</span>}
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          この条件に該当する公開データのある企業がまだありません。
          <div style={{ marginTop: 8 }}>
            <Link className="btn-link" to={`/area/${pref.slug}`}>
              {pref.name}のすべての企業を見る →
            </Link>
          </div>
        </div>
      ) : (
        <ol className="region-list">
          {rows.slice(0, 50).map((r, i) => {
            const lr = r.company.laborReal
            return (
              <li key={r.company.id} className="region-item">
                <span className="region-item__rank">{i + 1}</span>
                <div className="region-item__main">
                  <Link className="region-item__name" to={`/company/${r.company.id}`}>
                    {r.company.name}
                  </Link>
                  <div className="region-item__meta">
                    {r.company.industry}・従業員{r.company.employees.toLocaleString()}名
                  </div>
                  <div className="region-item__stats">
                    <span>将来性 {r.growth.growthScore}</span>
                    {r.workability && <span>働きやすさ {r.workability.score}</span>}
                    {lr?.avgOvertimeHours != null && <span>残業 {lr.avgOvertimeHours}h/月</span>}
                    {lr?.paidLeaveRate != null && <span>有給 {lr.paidLeaveRate}%</span>}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <AffiliateStrip offers={activeAffiliates()} heading="就活・転職に役立つサービス" />

      {/* 他の地域への内部リンク */}
      <section className="region-links" aria-label="他の地域から探す">
        <h2 className="region-links__h">他の地域から探す</h2>
        <div className="region-links__row">
          {PREFS.filter((p) => p.slug !== pref.slug).map((p) => (
            <Link key={p.slug} className="region-links__pref" to={`/area/${p.slug}${theme ? `/${theme.slug}` : ''}`}>
              {p.name}
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 10 }}>
          <Link className="btn-link" to="/area">
            すべての地域・条件の一覧へ →
          </Link>
        </p>
      </section>
    </PageShell>
  )
}
