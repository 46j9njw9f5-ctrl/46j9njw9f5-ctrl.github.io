import { useState } from 'react'
import { aggregate, exportJson, resetInterest, loadStore } from './reportInterest'

/**
 * 検証用の集計パネル（開発・運営者確認用）。
 * 通常の利用者には出さない：URL に ?report-stats=1 を付けたときだけ表示する。
 * すべてブラウザ内 localStorage の集計で、外部送信はしない。
 */
export function isReportStatsEnabled(): boolean {
  try {
    if (typeof location === 'undefined') return false
    return new URLSearchParams(location.search).has('report-stats')
  } catch {
    return false
  }
}

export function ReportInterestSummary() {
  const [store, setStore] = useState(() => loadStore())
  const [copied, setCopied] = useState(false)
  const agg = aggregate(store)
  const pct = (n: number) => `${Math.round(n * 1000) / 10}%`

  const refresh = () => setStore(loadStore())
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson(store))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* クリップボード不可時は無視 */
    }
  }
  const reset = () => {
    if (!window.confirm('購入意向の記録をすべて削除します。よろしいですか？')) return
    resetInterest()
    refresh()
  }

  return (
    <section className="rstats" aria-label="レポート需要の検証集計">
      <div className="rstats__head">
        <b>📊 レポート需要 検証集計（運営者向け・ローカル）</b>
        <button onClick={refresh} className="rstats__mini">
          更新
        </button>
      </div>
      <div className="rstats__grid">
        <Stat label="案内到達数" value={agg.guideReach} />
        <Stat label="購入意向数" value={agg.buyIntent} />
        <Stat label="無料で十分" value={agg.enough} />
        <Stat label="購入意向率" value={pct(agg.interestRate)} accent />
      </div>
      <div className="rstats__rows">
        <div>単一企業：購入 {agg.single.buy} ／ 十分 {agg.single.enough}</div>
        <div>比較：購入 {agg.comparison.buy} ／ 十分 {agg.comparison.enough}</div>
        <div>最終反応：{agg.lastAt ? new Date(agg.lastAt).toLocaleString('ja-JP') : '—'}</div>
      </div>
      <div className="rstats__actions">
        <button onClick={copy} className="rstats__btn">
          {copied ? 'コピーしました' : 'JSONをコピー'}
        </button>
        <button onClick={reset} className="rstats__btn rstats__btn--danger">
          記録をリセット
        </button>
      </div>
    </section>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rstats__stat ${accent ? 'rstats__stat--accent' : ''}`}>
      <div className="rstats__val">{value}</div>
      <div className="rstats__lbl">{label}</div>
    </div>
  )
}
