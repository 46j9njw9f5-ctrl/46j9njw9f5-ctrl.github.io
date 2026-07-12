import { memo } from 'react'
import type {
  Company,
  Evaluation,
  GrowthEvaluation,
  ProductivityEvaluation,
  WorkabilityEvaluation,
} from '../types'
import { formatYen, growthColor } from '../ui'
import { Avatar, GradeBadge, GrowthBadge } from './Bits'
import { coverageLabel } from '../features/disclosure/copy'

interface Props {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
  match?: number | null
  isFavorite: boolean
  inCompare: boolean
  // id を受け取る安定コールバック（React.memo を効かせるため）
  onOpen: (id: string) => void
  onToggleFavorite: (id: string) => void
  onToggleCompare: (id: string) => void
}

function CompanyCardBase({
  company,
  growth,
  productivity,
  evaluation,
  workability,
  match,
  isFavorite,
  inCompare,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
}: Props) {
  const m = company.metrics
  return (
    <div className="card">
      {match !== null && match !== undefined && (
        <div className="card__match" style={{ background: `color-mix(in srgb, ${growthColor(match)} 16%, transparent)`, borderColor: `color-mix(in srgb, ${growthColor(match)} 45%, transparent)` }}>
          <span style={{ color: growthColor(match), fontWeight: 800 }}>重視条件との一致度 {match}%</span>
        </div>
      )}
      <div className="card__top">
        <Avatar company={company} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card__name">{company.name}</div>
          <div className="card__meta">
            {company.industry}・{company.location}・従業員{company.employees.toLocaleString()}名
          </div>
        </div>
        {isFavorite && (
          <span style={{ color: 'var(--caution)', fontSize: 18 }} aria-hidden="true">
            ★
          </span>
        )}
      </div>

      {/* 一目でわかるグレード（データのある軸を最大3つ） */}
      <div className="card__grades">
        {[
          { score: growth.growthScore, label: '将来性' },
          workability ? { score: workability.score, label: '働きやすさ' } : null,
          evaluation ? { score: evaluation.whiteScore, label: '労働環境' } : null,
          productivity.score !== null ? { score: productivity.score, label: '生産性' } : null,
        ]
          .filter((g): g is { score: number; label: string } => g !== null)
          .slice(0, 3)
          .map((g) => (
            <GradeBadge key={g.label} size="sm" score={g.score} label={g.label} />
          ))}
      </div>

      <div className="card__tagline">
        <GrowthBadge growth={growth} />
        <span className="card__fact">
          {evaluation && evaluation.redFlags.length > 0
            ? `⚠ 確認したい労働指標 ${evaluation.redFlags.length}件`
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

      {(() => {
        const cov = coverageLabel(workability)
        return cov ? (
          <div className={`card__coverage card__coverage--${cov.level}`} title="公開されている働きやすさ指標の充足度">
            <span aria-hidden="true">●</span> {cov.text}
          </div>
        ) : null
      })()}

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
        <button
          className="btn btn--primary"
          onClick={() => onOpen(company.id)}
          aria-label={`${company.name} の詳細を見る`}
        >
          詳細を見る
        </button>
        <button
          className={`btn ${inCompare ? 'btn--on' : ''}`}
          onClick={() => onToggleCompare(company.id)}
          style={{ flex: '0 0 auto', paddingInline: 14 }}
          aria-pressed={inCompare}
          aria-label={inCompare ? `${company.name} を比較から外す` : `${company.name} を比較に追加`}
        >
          {inCompare ? '比較中' : '比較'}
        </button>
        <button
          className={`btn btn--ghost ${isFavorite ? 'btn--on' : ''}`}
          onClick={() => onToggleFavorite(company.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `${company.name} をお気に入りから外す` : `${company.name} をお気に入りに追加`}
        >
          <span aria-hidden="true">{isFavorite ? '★' : '☆'}</span>
        </button>
      </div>
    </div>
  )
}

export const CompanyCard = memo(CompanyCardBase)

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <div className="stat">
      <div className="stat__val">{val}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}
