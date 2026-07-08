import type {
  Company,
  Evaluation,
  GrowthEvaluation,
  ProductivityEvaluation,
  WorkabilityEvaluation,
} from '../types'
import { formatYen } from '../ui'
import { Avatar, GradeBadge, GrowthBadge } from './Bits'

interface Props {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
  isFavorite: boolean
  inCompare: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onToggleCompare: () => void
}

export function CompanyCard({
  company,
  growth,
  productivity,
  evaluation,
  workability,
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
        {isFavorite && <span style={{ color: 'var(--caution)', fontSize: 18 }}>★</span>}
      </div>

      {/* 一目でわかるグレード */}
      <div className="card__grades">
        <GradeBadge size="sm" score={growth.growthScore} label="将来性" />
        {workability ? (
          <GradeBadge size="sm" score={workability.score} label="働きやすさ" />
        ) : (
          productivity.score !== null && <GradeBadge size="sm" score={productivity.score} label="生産性" />
        )}
        {evaluation && <GradeBadge size="sm" score={evaluation.whiteScore} label="安全度" />}
      </div>

      <div className="card__tagline">
        <GrowthBadge growth={growth} />
        <span className="card__fact">
          {evaluation && evaluation.redFlags.length > 0
            ? `⚠ 危険信号 ${evaluation.redFlags.length}件`
            : growth.revenueCagr !== null
              ? `売上 年率 ${growth.revenueCagr.toFixed(1)}%`
              : productivity.revenuePerEmployee !== null
                ? `一人当たり ${formatYen(productivity.revenuePerEmployee)}`
                : company.founded
                  ? `設立 ${company.founded}年`
                  : ''}
        </span>
      </div>

      {company.blurb && <p className="card__blurb">{company.blurb}</p>}

      <div className="card__stats">
        {m ? (
          <>
            <Stat val={`${m.avgOvertimeHours}h`} label="月残業" />
            <Stat val={`${m.turnover3yrRate}%`} label="3年離職率" />
            <Stat val={`${m.paidLeaveRate}%`} label="有給消化" />
          </>
        ) : (
          <>
            <Stat val={company.employees.toLocaleString()} label="従業員数" />
            <Stat val={company.founded ? `${company.founded}` : '—'} label="設立年" />
            <Stat val={company.listed ? '上場' : '非上場'} label="上場区分" />
          </>
        )}
      </div>

      {company.source && (
        <div className="card__source">
          出典: {company.source.name}
          {company.website && (
            <>
              {' ・ '}
              <a href={company.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                公式サイト
              </a>
            </>
          )}
        </div>
      )}

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

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat__val">{val}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}
