import type {
  Company,
  Evaluation,
  GrowthEvaluation,
  ProductivityEvaluation,
  StockSnapshot,
  WorkabilityEvaluation,
} from '../types'
import type { AxisScores } from '../engine/fit'
import { useModalA11y } from '../hooks/useModalA11y'
import { formatYen, growthColor, levelColor } from '../ui'
import { Avatar } from './Bits'
import { Radar, CATEGORICAL } from './charts'
import { ReportCard } from '../features/report/ReportCard'

interface Row {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  stock: StockSnapshot
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
  scores: AxisScores
}

export function ComparePanel({ rows, onClose }: { rows: Row[]; onClose: () => void }) {
  const anyLabor = rows.some((r) => r.evaluation)
  const anyProductivity = rows.some((r) => r.productivity.score !== null)
  const modalRef = useModalA11y<HTMLDivElement>(onClose)

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 820 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmp-title"
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__top">
          <div className="modal__head">
            <h2 id="cmp-title" style={{ margin: 0, fontSize: 20 }}>企業比較</h2>
            <button className="modal__close" onClick={onClose} aria-label="企業比較を閉じる">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        {(() => {
          const AXES = [
            { label: '将来性', get: (r: Row) => r.growth.growthScore as number | null },
            { label: '生産性', get: (r: Row) => r.productivity.score },
            { label: '働きやすさ', get: (r: Row) => r.workability?.score ?? null },
            { label: '安全度', get: (r: Row) => r.evaluation?.whiteScore ?? null },
          ]
          const active = AXES.filter((ax) => rows.every((r) => ax.get(r) !== null && ax.get(r) !== undefined))
          if (active.length < 3 || rows.length < 2) return null
          return (
            <div className="radar-wrap radar-wrap--compare">
              <Radar
                axes={active.map((a) => a.label)}
                series={rows.map((r, i) => ({ label: r.company.name, color: CATEGORICAL[i % CATEGORICAL.length], values: active.map((a) => a.get(r) as number) }))}
                size={320}
              />
            </div>
          )
        })()}

        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th></th>
                {rows.map((r) => (
                  <th key={r.company.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Avatar company={r.company} size={38} />
                      {r.company.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>将来性スコア</td>
                {rows.map((r) => (
                  <td key={r.company.id} style={{ fontWeight: 800, color: growthColor(r.growth.growthScore) }}>
                    {r.growth.growthScore}
                  </td>
                ))}
              </tr>
              <tr>
                <td>成長ステージ</td>
                {rows.map((r) => (
                  <td key={r.company.id} style={{ color: growthColor(r.growth.growthScore) }}>
                    {r.growth.stageLabel}
                  </td>
                ))}
              </tr>
              <tr>
                <td>売上成長(年率)</td>
                {rows.map((r) => (
                  <td key={r.company.id}>
                    {r.growth.revenueCagr !== null ? `${r.growth.revenueCagr.toFixed(1)}%` : '—'}
                  </td>
                ))}
              </tr>
              <Metric rows={rows} label="従業員数" get={(c) => c.company.employees} />
              <Metric rows={rows} label="設立年" get={(c) => c.company.founded ?? 0} lowerBetter />

              {anyProductivity && (
                <>
                  <tr>
                    <td>生産性スコア</td>
                    {rows.map((r) => (
                      <td
                        key={r.company.id}
                        style={{ fontWeight: 800, color: r.productivity.score !== null ? growthColor(r.productivity.score) : 'var(--text-faint)' }}
                      >
                        {r.productivity.score ?? '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>一人当たり売上</td>
                    {rows.map((r) => (
                      <td key={r.company.id}>{formatYen(r.productivity.revenuePerEmployee)}</td>
                    ))}
                  </tr>
                </>
              )}

              {anyLabor && (
                <>
                  <tr>
                    <td colSpan={rows.length + 1} style={{ paddingTop: 14, color: 'var(--text-faint)', fontSize: 12 }}>
                      — 労働環境 —
                    </td>
                  </tr>
                  <tr>
                    <td>働きやすさ</td>
                    {rows.map((r) => (
                      <td
                        key={r.company.id}
                        style={{ fontWeight: 800, color: r.workability ? growthColor(r.workability.score) : 'var(--text-faint)' }}
                      >
                        {r.workability ? r.workability.score : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>労働環境リスク</td>
                    {rows.map((r) => (
                      <td
                        key={r.company.id}
                        style={{ fontWeight: 800, color: r.evaluation ? levelColor[r.evaluation.level] : 'var(--text-faint)' }}
                      >
                        {r.evaluation ? r.evaluation.blackScore : '未連携'}
                      </td>
                    ))}
                  </tr>
                  <LaborMetric rows={rows} label="月残業(h)" get={(m) => m.avgOvertimeHours} lowerBetter />
                  <LaborMetric rows={rows} label="3年離職率(%)" get={(m) => m.turnover3yrRate} lowerBetter />
                  <LaborMetric rows={rows} label="有給消化(%)" get={(m) => m.paidLeaveRate} />
                </>
              )}
            </tbody>
          </table>
        </div>

        <ReportCard
          inputs={rows.map((r) => ({
            company: r.company,
            growth: r.growth,
            productivity: r.productivity,
            stock: r.stock,
            evaluation: r.evaluation,
            workability: r.workability,
            scores: r.scores,
          }))}
        />
      </div>
    </div>
  )
}

function Metric({
  rows,
  label,
  get,
  lowerBetter,
}: {
  rows: Row[]
  label: string
  get: (r: Row) => number
  lowerBetter?: boolean
}) {
  const vals = rows.map(get)
  const valid = vals.filter((v) => v > 0)
  const best = valid.length ? (lowerBetter ? Math.min(...valid) : Math.max(...valid)) : NaN
  return (
    <tr>
      <td>{label}</td>
      {rows.map((r, i) => {
        const isBest = vals[i] === best && rows.length > 1
        return (
          <td key={r.company.id} style={{ fontWeight: isBest ? 800 : 400, color: isBest ? 'var(--excellent)' : 'var(--text)' }}>
            {vals[i] > 0 ? vals[i].toLocaleString() : '—'}
            {isBest ? ' ◎' : ''}
          </td>
        )
      })}
    </tr>
  )
}

function LaborMetric({
  rows,
  label,
  get,
  lowerBetter,
}: {
  rows: Row[]
  label: string
  get: (m: NonNullable<Company['metrics']>) => number
  lowerBetter?: boolean
}) {
  const vals = rows.map((r) => (r.company.metrics ? get(r.company.metrics) : null))
  const present = vals.filter((v): v is number => v !== null)
  const best = present.length ? (lowerBetter ? Math.min(...present) : Math.max(...present)) : NaN
  return (
    <tr>
      <td>{label}</td>
      {rows.map((r, i) => {
        const v = vals[i]
        const isBest = v === best && present.length > 1
        return (
          <td key={r.company.id} style={{ fontWeight: isBest ? 800 : 400, color: isBest ? 'var(--excellent)' : 'var(--text)' }}>
            {v === null ? '—' : v}
            {isBest ? ' ◎' : ''}
          </td>
        )
      })}
    </tr>
  )
}
