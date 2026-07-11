import { useEffect, useMemo, useState } from 'react'
import { buildReport, type CompanyReportInput, type ReportSection, type FactKind } from './reportModel'
import { recordGuideView, recordIntent, loadStore, type Intent } from './reportInterest'

const SURVEY_URL = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_REPORT_INTEREST_URL) || '').trim()

const KIND_LABEL: Record<FactKind, string> = { fact: '事実', interpretation: '解釈', unpublished: '未公表' }

function KindTag({ kind }: { kind: FactKind }) {
  return <span className={`rtag rtag--${kind}`}>{KIND_LABEL[kind]}</span>
}

function SectionView({ s }: { s: ReportSection }) {
  return (
    <div className="report-sec">
      <div className="report-sec__title">
        {s.title} <KindTag kind={s.kind} />
      </div>
      <ul className="report-sec__lines">
        {s.lines.map((l, i) => (
          <li key={i} className={l.kind === 'unpublished' ? 'is-unpub' : undefined}>
            <span className="report-sec__label">{l.label}</span>
            <span className="report-sec__value">{l.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 就職判断レポート（需要検証・決済なし）。企業詳細＝単一、比較＝複数。 */
export function ReportCard({ inputs }: { inputs: CompanyReportInput[] }) {
  const model = useMemo(() => buildReport(inputs), [inputs])
  const [responded, setResponded] = useState<Intent | null>(null)

  // 案内表示を記録＋この構成での過去の反応を復元
  useEffect(() => {
    recordGuideView()
    const prev = loadStore().records[model.signature]
    setResponded(prev?.intent ?? null)
  }, [model.signature])

  const respond = (intent: Intent) => {
    recordIntent(
      { signature: model.signature, type: model.type, companyCount: model.companyCount, persona: model.persona },
      intent,
    )
    setResponded(intent)
  }

  const lockedTitles = [...model.fullSections, ...model.comparisonSections].map((s) => s.title)

  return (
    <section className="report" aria-label="就職判断レポート">
      <div className="report__badge">需要検証中・実際の決済は発生しません</div>
      <h3 className="report__name">就職判断レポート</h3>
      <div className="report__price">
        1回 <b>500円</b>
        <span className="report__type">
          （{model.type === 'comparison' ? `${model.companyCount}社の比較` : '1社'}）
        </span>
      </div>
      <p className="report__lead">
        {model.title}を、公開データ・出典つきでまとめ、<b>事実／解釈／未公表</b>を分けて提示します。
      </p>

      <details className="report__preview">
        <summary>無料プレビュー（概要と一部）を見る</summary>
        <div className="report__legend">
          <KindTag kind="fact" /> 公開データの事実 <KindTag kind="interpretation" /> スコア等の解釈{' '}
          <KindTag kind="unpublished" /> 公開なし
        </div>
        {model.previewSections.map((s) => (
          <SectionView key={s.key} s={s} />
        ))}
        <div className="report__locked">
          <div className="report__locked-title">🔒 有料レポートに含まれる内容</div>
          <ul>
            {lockedTitles.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </details>

      {responded ? (
        <div className="report__thanks" role="status">
          {responded === 'buy' ? (
            <>
              <b>ありがとうございます。</b>「購入したい」を記録しました（決済は行われません）。
              {SURVEY_URL && (
                <a className="report__survey" href={SURVEY_URL} target="_blank" rel="noopener noreferrer">
                  1分アンケートに答える ↗
                </a>
              )}
            </>
          ) : (
            <>「無料情報で十分」を記録しました。ご回答ありがとうございます。</>
          )}
          <button className="report__redo" onClick={() => setResponded(null)}>
            回答をやり直す
          </button>
        </div>
      ) : (
        <div className="report__cta">
          <button className="report__buy" onClick={() => respond('buy')}>
            500円ならレポートを購入したい
          </button>
          <button className="report__enough" onClick={() => respond('enough')}>
            無料情報だけで十分
          </button>
        </div>
      )}

      <ul className="report__disc">
        {model.disclaimers.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
      <div className="report__src">
        情報源：{model.sources.length ? model.sources.join('・') : '公開データ'} ／ データ更新：{model.updatedAt}
      </div>
    </section>
  )
}
