import type { Company, Evaluation } from '../types'
import { riskColor } from '../ui'
import { Avatar, RiskBadge, ScoreDonut } from './Bits'

interface Props {
  company: Company
  evaluation: Evaluation
  onClose: () => void
}

export function CompanyDetail({ company, evaluation, onClose }: Props) {
  const m = company.metrics
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <Avatar company={company} size={52} />
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{company.name}</h2>
            <div className="card__meta">
              {company.industry}・{company.location}・
              {company.listed ? '上場' : '非上場'}・設立{company.founded}年・
              従業員{company.employees.toLocaleString()}名
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="score-wrap" style={{ marginTop: 18 }}>
          <ScoreDonut evaluation={evaluation} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RiskBadge evaluation={evaluation} />
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              ホワイト度 <b style={{ color: 'var(--text)' }}>{evaluation.whiteScore}</b> / 100
            </span>
          </div>
        </div>

        <div className="verdict" style={{ marginTop: 16 }}>
          {evaluation.verdict}
        </div>

        {evaluation.redFlags.length > 0 && (
          <>
            <div className="section-title" style={{ color: 'var(--danger)' }}>
              ⚠ 危険信号（レッドフラグ）
            </div>
            <ul className="flag-list">
              {evaluation.redFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </>
        )}

        {evaluation.goodPoints.length > 0 && (
          <>
            <div className="section-title" style={{ color: 'var(--excellent)' }}>
              ◎ 良い点
            </div>
            <ul className="good-list">
              {evaluation.goodPoints.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </>
        )}

        <div className="section-title">スコアの根拠（指標別の寄与）</div>
        <div>
          {evaluation.factors.map((f) => (
            <div className="factor" key={f.key}>
              <div>
                <div className="factor__label">{f.label}</div>
                <div className="factor__value">
                  {f.valueLabel}・重み{Math.round(f.weight * 100)}%
                </div>
              </div>
              <div className="bar">
                <div
                  className="bar__fill"
                  style={{ width: `${f.risk}%`, background: riskColor(f.risk) }}
                />
              </div>
              <div className="factor__risk" style={{ color: riskColor(f.risk) }}>
                {f.risk}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 10 }}>
            ※ 数値は各指標のリスクポイント（0=良い〜100=悪い）。重み付き平均がブラック度スコアです。
          </p>
        </div>

        <div className="section-title">主要データ</div>
        <div className="kv-grid">
          <Kv label="月平均残業" val={`${m.avgOvertimeHours} h`} />
          <Kv label="有給消化率" val={`${m.paidLeaveRate} %`} />
          <Kv label="3年以内離職率" val={`${m.turnover3yrRate} %`} />
          <Kv label="平均勤続年数" val={`${m.avgTenureYears} 年`} />
          <Kv label="残業代支給率" val={`${m.overtimePaidRate} %`} />
          <Kv label="女性管理職比率" val={`${m.womenManagerRate} %`} />
          <Kv label="平均年収" val={`${company.avgAnnualSalary} 万円`} />
          <Kv label="業界平均年収" val={`${company.industryAvgSalary} 万円`} />
          <Kv label="社会保険" val={m.socialInsurance ? '完備' : '未整備'} />
          <Kv label="労基署 是正勧告" val={`${m.laborViolationCount} 件`} />
        </div>
      </div>
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
