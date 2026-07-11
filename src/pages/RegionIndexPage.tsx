import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { PREFS, THEMES } from '../engine/region'

// よく探される地域を上位に（福岡県を優先的に露出）。
const FEATURED = ['fukuoka', 'tokyo', 'osaka', 'aichi', 'kanagawa', 'hokkaido', 'hyogo', 'fukuoka']
const featuredPrefs = PREFS.filter((p) => FEATURED.includes(p.slug)).sort(
  (a, b) => FEATURED.indexOf(a.slug) - FEATURED.indexOf(b.slug),
)

export default function RegionIndexPage() {
  useDocumentMeta({
    title: '地域・条件から企業を探す | -0（ゼロ）',
    description:
      '都道府県 × 条件（残業が少ない・有給取得率が高い・将来性が高い・隠れ優良）で企業を検索。公開データ（Wikidata・厚労省しょくばらぼ）にもとづく参考指標です。',
    path: '/area',
  })

  return (
    <PageShell
      title="地域・条件から企業を探す"
      lead="都道府県と条件をえらぶと、公開データにもとづく企業ランキングを表示します。"
    >
      <section className="page__section">
        <h2 className="page__h2">注目の地域</h2>
        <div className="region-featured">
          {featuredPrefs.map((p) => (
            <div className="region-featured__card" key={p.slug}>
              <Link className="region-featured__name" to={`/area/${p.slug}`}>
                {p.name}
              </Link>
              <div className="region-featured__themes">
                {THEMES.map((t) => (
                  <Link key={t.slug} className="chip chip--sm" to={`/area/${p.slug}/${t.slug}`}>
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="page__section">
        <h2 className="page__h2">すべての都道府県</h2>
        <div className="region-links__row">
          {PREFS.map((p) => (
            <Link key={p.slug} className="region-links__pref" to={`/area/${p.slug}`}>
              {p.name}
            </Link>
          ))}
        </div>
      </section>

      <p className="page__muted">
        ※ 各スコアは公開データにもとづく参考指標で、現在の企業の状態を断定するものではありません。応募前に求人票・面接等でご確認ください。
      </p>
    </PageShell>
  )
}
