import type { Company, Evaluation } from '../types'
import { Avatar, RiskBadge, ScoreDonut } from './Bits'

interface Props {
  company: Company
  evaluation: Evaluation
  isFavorite: boolean
  inCompare: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onToggleCompare: () => void
}

export function CompanyCard({
  company,
  evaluation,
  isFavorite,
  inCompare,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
}: Props) {
  const m = company.metrics
  return (
    <div className="card">
      <div className="card__top">
        <Avatar company={company} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__name">{company.name}</div>
          <div className="card__meta">
            {company.industry}・{company.location}・従業員{company.employees.toLocaleString()}名
          </div>
        </div>
      </div>

      <div className="score-wrap">
        <ScoreDonut evaluation={evaluation} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <RiskBadge evaluation={evaluation} />
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            ホワイト度 {evaluation.whiteScore} / 平均年収 {company.avgAnnualSalary}万円
          </span>
          {evaluation.redFlags.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>
              ⚠ 危険信号 {evaluation.redFlags.length} 件
            </span>
          )}
        </div>
      </div>

      <p className="card__blurb">{company.blurb}</p>

      <div className="card__stats">
        <div className="stat">
          <div className="stat__val">{m.avgOvertimeHours}h</div>
          <div className="stat__label">月残業</div>
        </div>
        <div className="stat">
          <div className="stat__val">{m.turnover3yrRate}%</div>
          <div className="stat__label">3年離職率</div>
        </div>
        <div className="stat">
          <div className="stat__val">{m.paidLeaveRate}%</div>
          <div className="stat__label">有給消化</div>
        </div>
      </div>

      <div className="card__actions">
        <button className="btn btn--primary" onClick={onOpen}>
          詳細を見る
        </button>
        <button
          className={`btn ${inCompare ? 'btn--on' : ''}`}
          onClick={onToggleCompare}
          style={{ flex: '0 0 auto', paddingInline: 14 }}
          title="比較に追加"
        >
          {inCompare ? '比較中' : '比較'}
        </button>
        <button
          className={`btn btn--ghost ${isFavorite ? 'btn--on' : ''}`}
          onClick={onToggleFavorite}
          title="お気に入り"
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
    </div>
  )
}
