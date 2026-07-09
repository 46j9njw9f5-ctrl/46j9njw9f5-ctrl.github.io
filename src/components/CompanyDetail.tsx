import { useEffect, useState } from 'react'
import type {
  Company,
  Evaluation,
  GrowthEvaluation,
  ProductivityEvaluation,
  StockSnapshot,
  WorkabilityEvaluation,
} from '../types'
import { buildOverview } from '../engine/overview'
import { buildBenchmark } from '../engine/benchmark'
import { formatYen, growthColor, potentialColor, riskColor } from '../ui'
import { Avatar, Donut, GradeBadge, GrowthBadge, GrowthDonut, RiskBadge, ScoreDonut, Sparkline } from './Bits'
import { Radar } from './charts'

interface Props {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  stock: StockSnapshot
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
  onClose: () => void
}

export function CompanyDetail({
  company,
  growth,
  productivity,
  stock,
  evaluation,
  workability,
  onClose,
}: Props) {
  const m = company.metrics
  const showMoney = productivity.score !== null || stock.hasData
  const overview = buildOverview({ company, growth, productivity, stock, evaluation, workability })

  const tabs: { key: string; label: string }[] = [
    { key: 'overview', label: '総合' },
    { key: 'growth', label: '🚀 将来性' },
  ]
  if (showMoney) tabs.push({ key: 'money', label: '📈 生産性・財務' })
  if (workability) tabs.push({ key: 'work', label: '🌱 働きやすさ' })
  if (evaluation) tabs.push({ key: 'risk', label: '🛡 リスク' })

  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__top">
        <div className="modal__head">
          <Avatar company={company} size={52} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{company.name}</h2>
            <div className="card__meta">
              {company.industry}・{company.location}・
              {company.listed ? '上場' : '非上場'}
              {company.founded ? `・設立${company.founded}年` : ''}・従業員
              {company.employees.toLocaleString()}名
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        {/* タブ */}
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? 'tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        </div>

        {tab === 'overview' && (
          <div className="tab-body">
            <div className="grade-row">
              {overview.axes.map((a) => (
                <div className="grade-cell" key={a.key}>
                  <GradeBadge score={a.score} label={a.label} />
                </div>
              ))}
            </div>

            {overview.axes.length >= 3 && (
              <div className="radar-wrap">
                <Radar
                  axes={overview.axes.map((a) => a.label)}
                  series={[{ label: company.name, color: 'var(--standard)', values: overview.axes.map((a) => a.score) }]}
                  size={280}
                />
              </div>
            )}

            <div className="verdict verdict--lead">{overview.verdict}</div>

            {overview.pros.length > 0 && (
              <>
                <div className="section-title" style={{ color: 'var(--excellent)' }}>◎ 強み</div>
                <ul className="good-list">
                  {overview.pros.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </>
            )}
            {overview.cons.length > 0 && (
              <>
                <div className="section-title" style={{ color: 'var(--caution)' }}>△ 気になる点</div>
                <ul className="warn-list">
                  {overview.cons.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}

            {!evaluation && workability && company.laborReal && (
              <div className="notice notice--ok">
                🌱 働きやすさは <b>{company.laborReal.source}</b>（公開データ）の実データで算出しています。
                ブラック度（離職率・残業代・法令違反など）は追加の公的データ連携で有効化されます。
              </div>
            )}
            {!evaluation && !workability && (
              <div className="notice">
                🛡 労働環境（残業・離職率・有給など）と働きやすさは、公的な労働データ（厚労省 両立支援DB /
                しょくばらぼ 等）の連携でこの企業にも表示されます。今すぐ体験するにはヘッダーの「デモ」データへ。
              </div>
            )}

            <SourceLine company={company} />
          </div>
        )}

        {tab === 'growth' && (
          <div className="tab-body">
            <div className="score-wrap">
              <GrowthDonut growth={growth} size={76} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <GrowthBadge growth={growth} />
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                  将来性スコア <b style={{ color: 'var(--text)' }}>{growth.growthScore}</b> / 100
                </span>
              </div>
            </div>
            <div className="verdict" style={{ marginTop: 14 }}>{growth.outlook}</div>

            {(company.revenueHistory?.length || company.employeeHistory?.length) && (
              <div className="history-row">
                {company.revenueHistory && company.revenueHistory.filter((p) => p.year > 0).length >= 2 && (
                  <div className="history">
                    <div className="history__label">売上高の推移</div>
                    <Sparkline series={company.revenueHistory} color="var(--excellent)" />
                  </div>
                )}
                {company.employeeHistory && company.employeeHistory.filter((p) => p.year > 0).length >= 2 && (
                  <div className="history">
                    <div className="history__label">従業員数の推移</div>
                    <Sparkline series={company.employeeHistory} color="var(--standard)" />
                  </div>
                )}
              </div>
            )}

            <div className="section-title">将来性スコアの根拠</div>
            <FactorBars
              factors={growth.factors.map((f) => ({
                key: f.key,
                label: f.label,
                valueLabel: f.valueLabel,
                value: f.potential,
                weight: f.weight,
                available: f.available,
              }))}
              note="※ 各要因のポテンシャル（0〜100、高いほど有望）。データ未取得の要因は重みを再配分。"
            />
          </div>
        )}

        {tab === 'money' && (
          <div className="tab-body">
            {productivity.score !== null && (
              <>
                <div className="section-title">📈 生産性</div>
                <div className="score-wrap">
                  <Donut value={productivity.score} color={growthColor(productivity.score)} caption="生産性" size={76} />
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>{productivity.note}</div>
                </div>
                <div className="kv-grid" style={{ marginTop: 12 }}>
                  <Kv label="一人当たり売上高" val={formatYen(productivity.revenuePerEmployee)} />
                  <Kv label="一人当たり営業利益" val={formatYen(productivity.profitPerEmployee)} />
                  <Kv label="営業利益率" val={productivity.operatingMargin !== null ? `${productivity.operatingMargin.toFixed(1)} %` : '—'} />
                </div>
              </>
            )}
            {stock.hasData && (
              <>
                <div className="section-title">💹 株・投資（財務スナップショット）</div>
                <div className="verdict" style={{ marginBottom: 12 }}>{stock.note}</div>
                <div className="kv-grid">
                  <Kv label="売上高" val={formatYen(stock.revenue)} />
                  <Kv label="純利益" val={formatYen(stock.netProfit)} />
                  <Kv label="営業利益" val={formatYen(stock.operatingIncome)} />
                  <Kv label="純利益率" val={stock.netMargin !== null ? `${stock.netMargin.toFixed(1)} %` : '—'} />
                  <Kv label="時価総額" val={formatYen(stock.marketCap)} />
                  <Kv label="売上成長率(年率)" val={stock.revenueCagr !== null ? `${stock.revenueCagr.toFixed(1)} %` : '—'} />
                  <Kv label="上場市場" val={stock.exchange ?? (stock.listed ? '上場' : '非上場')} />
                  {stock.ticker && <Kv label="ティッカー" val={stock.ticker} />}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 10 }}>
                  ※ 財務データは取得できた範囲。投資助言ではありません。詳細は EDINET / J-Quants 連携で補完。
                </p>
              </>
            )}
          </div>
        )}

        {tab === 'work' && workability && (
          <div className="tab-body">
            <div className="score-wrap">
              <Donut value={workability.score} color={growthColor(workability.score)} caption="働きやすさ" size={76} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span
                  className={`badge ${workability.tier === 'high' ? 'lv-excellent' : workability.tier === 'mid' ? 'lv-caution' : 'lv-danger'}`}
                >
                  <span className="badge__dot" />
                  {workability.tierLabel}
                </span>
                {workability.highlights.slice(0, 3).map((h, i) => (
                  <span key={i} style={{ fontSize: 12, color: 'var(--text-dim)' }}>・{h}</span>
                ))}
              </div>
            </div>
            <FactorBars
              factors={workability.factors.map((f) => ({
                key: f.key,
                label: f.label,
                valueLabel: f.valueLabel,
                value: f.potential,
                weight: f.weight,
                available: true,
              }))}
              note="※ 各観点の働きやすさ（0〜100、高いほど良い）。揃っている観点だけで重みを再配分。"
            />
            {company.laborReal && (() => {
              const bench = buildBenchmark(company.laborReal)
              return bench.length ? (
                <>
                  <div className="section-title">業種・全国平均との比較</div>
                  <div className="bench">
                    {bench.map((b) => (
                      <div className="bench__row" key={b.key}>
                        <div className="bench__label">{b.label}</div>
                        <div className="bench__value">{b.value}{b.unit}</div>
                        <div className="bench__base">
                          {b.baseLabel} {b.industryAvg ?? b.nationalAvg}{b.unit}
                          {b.betterThanPct !== null && (
                            <span
                              className="bench__pct"
                              style={{ color: b.betterThanPct >= 60 ? 'var(--excellent)' : b.betterThanPct <= 40 ? 'var(--danger)' : 'var(--text-faint)' }}
                            >
                              業種内で{b.betterThanPct}%の企業より{b.lowerBetter ? '少ない' : '高い'}
                            </span>
                          )}
                        </div>
                        {b.delta !== null && b.better !== null && (
                          <div className="bench__delta" style={{ color: b.better ? 'var(--excellent)' : 'var(--danger)' }}>
                            {b.delta > 0 ? '+' : ''}{b.delta}{b.unit}
                            {' '}
                            {b.better ? '（良い）' : '（悪い）'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : null
            })()}
            {company.laborReal && (
              <div className="source-line" style={{ marginTop: 12 }}>
                労働データ出典: <b>{company.laborReal.source}</b>
                {company.laborReal.asOf ? `（${company.laborReal.asOf} 時点）` : ''} ・ 公開オープンデータ
              </div>
            )}
          </div>
        )}

        {tab === 'risk' && evaluation && m && (
          <div className="tab-body">
            <div className="score-wrap">
              <ScoreDonut evaluation={evaluation} size={76} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <RiskBadge evaluation={evaluation} />
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                  ホワイト度 <b style={{ color: 'var(--text)' }}>{evaluation.whiteScore}</b> / 100
                </span>
              </div>
            </div>
            <div className="verdict" style={{ marginTop: 14 }}>{evaluation.verdict}</div>

            {evaluation.redFlags.length > 0 && (
              <>
                <div className="section-title" style={{ color: 'var(--danger)' }}>⚠ 危険信号（レッドフラグ）</div>
                <ul className="flag-list">
                  {evaluation.redFlags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="section-title">ブラック度スコアの根拠</div>
            <div>
              {evaluation.factors.map((f) => (
                <div className="factor" key={f.key}>
                  <div>
                    <div className="factor__label">{f.label}</div>
                    <div className="factor__value">{f.valueLabel}・重み{Math.round(f.weight * 100)}%</div>
                  </div>
                  <div className="bar">
                    <div className="bar__fill" style={{ width: `${f.risk}%`, background: riskColor(f.risk) }} />
                  </div>
                  <div className="factor__risk" style={{ color: riskColor(f.risk) }}>{f.risk}</div>
                </div>
              ))}
            </div>

            <div className="section-title">主要データ</div>
            <div className="kv-grid">
              <Kv label="月平均残業" val={`${m.avgOvertimeHours} h`} />
              <Kv label="有給消化率" val={`${m.paidLeaveRate} %`} />
              <Kv label="3年以内離職率" val={`${m.turnover3yrRate} %`} />
              <Kv label="平均勤続年数" val={`${m.avgTenureYears} 年`} />
              <Kv label="残業代支給率" val={`${m.overtimePaidRate} %`} />
              <Kv label="女性管理職比率" val={`${m.womenManagerRate} %`} />
              {company.avgAnnualSalary && <Kv label="平均年収" val={`${company.avgAnnualSalary} 万円`} />}
              <Kv label="社会保険" val={m.socialInsurance ? '完備' : '未整備'} />
              <Kv label="労基署 是正勧告" val={`${m.laborViolationCount} 件`} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SourceLine({ company }: { company: Company }) {
  if (!company.source) return null
  return (
    <div className="source-line">
      出典: <b>{company.source.name}</b>（{company.source.license}）
      {' ・ '}
      <a href={company.source.url} target="_blank" rel="noreferrer">データ元</a>
      {company.website && (
        <>
          {' ・ '}
          <a href={company.website} target="_blank" rel="noreferrer">公式サイト</a>
        </>
      )}
    </div>
  )
}

interface Bar {
  key: string
  label: string
  valueLabel: string
  value: number
  weight: number
  available: boolean
}

function FactorBars({ factors, note }: { factors: Bar[]; note: string }) {
  return (
    <div>
      {factors.map((f) => (
        <div className="factor" key={f.key}>
          <div>
            <div className="factor__label">{f.label}</div>
            <div className="factor__value">
              {f.valueLabel}
              {f.available ? `・重み${Math.round(f.weight * 100)}%` : '（未反映）'}
            </div>
          </div>
          <div className="bar">
            <div
              className="bar__fill"
              style={{ width: `${f.available ? f.value : 0}%`, background: potentialColor(f.value), opacity: f.available ? 1 : 0.3 }}
            />
          </div>
          <div className="factor__risk" style={{ color: f.available ? potentialColor(f.value) : 'var(--text-faint)' }}>
            {f.available ? f.value : '—'}
          </div>
        </div>
      ))}
      <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 10 }}>{note}</p>
    </div>
  )
}

function Kv({ label, val }: { label: string; val: string }) {
  return (
    <div className="kv">
      <div className="kv__label">{label}</div>
      <div className="kv__val">{val}</div>
    </div>
  )
}
