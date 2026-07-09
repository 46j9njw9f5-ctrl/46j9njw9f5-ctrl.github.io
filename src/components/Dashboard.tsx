import { useMemo } from 'react'
import type { Row } from '../App'
import { analytics } from '../data'
import { growthColor } from '../ui'
import { HBar, Histogram, Scatter, StatTile, type BarDatum, type DotDatum } from './charts'

/** データ分析ダッシュボード。全国の実データ集計＋このアプリの企業群の分析。 */
export function Dashboard({ rows, datasetLabel }: { rows: Row[]; datasetLabel: string }) {
  // --- このアプリの企業群（rows）の集計 ---
  const portfolio = useMemo(() => {
    const byInd = new Map<string, { g: number[]; w: number[]; p: number[] }>()
    for (const r of rows) {
      const k = r.company.industry
      if (!byInd.has(k)) byInd.set(k, { g: [], w: [], p: [] })
      const a = byInd.get(k)!
      a.g.push(r.growth.growthScore)
      if (r.workability) a.w.push(r.workability.score)
      if (r.productivity.score !== null) a.p.push(r.productivity.score)
    }
    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length) : null)
    const industryGrowth: BarDatum[] = [...byInd.entries()]
      .filter(([, a]) => a.g.length >= 2)
      .map(([k, a]) => ({ label: k, value: avg(a.g)!, sub: `n=${a.g.length}` }))
      .sort((x, y) => y.value - x.value)
      .slice(0, 10)

    const scatter: DotDatum[] = rows
      .filter((r) => r.productivity.score !== null)
      .map((r) => ({ x: r.growth.growthScore, y: r.productivity.score!, label: r.company.name, color: growthColor((r.growth.growthScore + r.productivity.score!) / 2) }))

    const topBy = (get: (r: Row) => number | null | undefined, n = 5) =>
      rows
        .map((r) => ({ name: r.company.name, v: get(r) }))
        .filter((x): x is { name: string; v: number } => x.v !== null && x.v !== undefined)
        .sort((a, b) => b.v - a.v)
        .slice(0, n)

    return {
      industryGrowth,
      scatter,
      topGrowth: topBy((r) => r.growth.growthScore),
      topWork: topBy((r) => r.workability?.score),
      topProd: topBy((r) => r.productivity.score),
    }
  }, [rows])

  const n = analytics
  const otRanking: BarDatum[] = [...n.byIndustry]
    .filter((d) => d.avgOvertime !== null)
    .sort((a, b) => (b.avgOvertime ?? 0) - (a.avgOvertime ?? 0))
    .slice(0, 12)
    .map((d) => ({ label: d.key, value: d.avgOvertime!, sub: `n=${d.count.toLocaleString()}` }))
  const womenRanking: BarDatum[] = [...n.byIndustry]
    .filter((d) => d.avgWomenManager !== null)
    .sort((a, b) => (b.avgWomenManager ?? 0) - (a.avgWomenManager ?? 0))
    .slice(0, 12)
    .map((d) => ({ label: d.key, value: d.avgWomenManager!, sub: `n=${d.count.toLocaleString()}` }))
  const hist: BarDatum[] = n.overtimeHistogram.map((h) => ({ label: h.bucket, value: h.count }))

  return (
    <div className="dash">
      {/* 全国の実データ */}
      <section className="dash__section">
        <h2 className="dash__h">📊 全国の労働実態（実データ）</h2>
        <p className="dash__src">
          出典: {n.source} ・ 集計対象 <b>{n.total.toLocaleString()}社</b>（無認証の公開データ）
        </p>
        <div className="tile-row">
          <StatTile value={String(n.national.avgOvertime ?? '—')} unit="h" label="平均残業時間/月" sub={`${n.national.counts.overtime.toLocaleString()}社が公表`} />
          <StatTile value={String(n.national.avgPaidLeave ?? '—')} unit="%" label="有給取得率" sub={`${n.national.counts.paidLeave.toLocaleString()}社`} />
          <StatTile value={String(n.national.avgWomenManager ?? '—')} unit="%" label="女性管理職比率" sub={`${n.national.counts.women.toLocaleString()}社`} />
          <StatTile value={String(n.national.avgAge ?? '—')} unit="歳" label="従業員の平均年齢" sub={`${n.national.counts.age.toLocaleString()}社`} />
        </div>

        <div className="dash__grid">
          <figure className="chart-card">
            <figcaption>業種別 平均残業時間（長い順・上位12）</figcaption>
            <HBar data={otRanking} unit="h" color="var(--caution)" />
          </figure>
          <figure className="chart-card">
            <figcaption>残業時間の分布（公表企業）</figcaption>
            <Histogram data={hist} color="var(--accent)" />
          </figure>
        </div>
        <figure className="chart-card">
          <figcaption>業種別 女性管理職比率（高い順・上位12）</figcaption>
          <HBar data={womenRanking} unit="%" color="var(--excellent)" />
        </figure>
      </section>

      {/* このアプリの企業群 */}
      <section className="dash__section">
        <h2 className="dash__h">🏢 {datasetLabel} の分析（{rows.length}社）</h2>
        <div className="dash__grid">
          <figure className="chart-card">
            <figcaption>業種別 平均将来性スコア（上位10）</figcaption>
            <HBar data={portfolio.industryGrowth} color="var(--standard)" max={100} />
          </figure>
          {portfolio.scatter.length > 0 && (
            <figure className="chart-card">
              <figcaption>将来性 × 生産性（各点＝企業）</figcaption>
              <Scatter data={portfolio.scatter} xLabel="将来性" yLabel="生産性" />
            </figure>
          )}
        </div>
        <div className="dash__grid dash__grid--3">
          <RankCard title="将来性 Top5" items={portfolio.topGrowth} />
          {portfolio.topWork.length > 0 && <RankCard title="働きやすさ Top5" items={portfolio.topWork} />}
          {portfolio.topProd.length > 0 && <RankCard title="生産性 Top5" items={portfolio.topProd} />}
        </div>
      </section>
    </div>
  )
}

function RankCard({ title, items }: { title: string; items: { name: string; v: number }[] }) {
  return (
    <div className="rank-card">
      <div className="rank-card__title">{title}</div>
      <ol className="rank-card__list">
        {items.map((it) => (
          <li key={it.name}>
            <span className="rank-card__name">{it.name}</span>
            <span className="rank-card__val" style={{ color: growthColor(it.v) }}>{it.v}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
