import type { Company, Evaluation } from '../types'
import { levelColor } from '../ui'
import { Avatar } from './Bits'

interface Row {
  company: Company
  evaluation: Evaluation
}

export function ComparePanel({ rows, onClose }: { rows: Row[]; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 style={{ margin: 0, fontSize: 20 }}>企業比較</h2>
          <button className="modal__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

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
                <td>ブラック度</td>
                {rows.map((r) => (
                  <td key={r.company.id} style={{ fontWeight: 800, color: levelColor[r.evaluation.level] }}>
                    {r.evaluation.blackScore}
                  </td>
                ))}
              </tr>
              <tr>
                <td>区分</td>
                {rows.map((r) => (
                  <td key={r.company.id} style={{ color: levelColor[r.evaluation.level] }}>
                    {r.evaluation.levelLabel}
                  </td>
                ))}
              </tr>
              <Metric rows={rows} label="月残業(h)" get={(c) => c.metrics.avgOvertimeHours} lowerBetter />
              <Metric rows={rows} label="3年離職率(%)" get={(c) => c.metrics.turnover3yrRate} lowerBetter />
              <Metric rows={rows} label="有給消化(%)" get={(c) => c.metrics.paidLeaveRate} />
              <Metric rows={rows} label="平均勤続(年)" get={(c) => c.metrics.avgTenureYears} />
              <Metric rows={rows} label="残業代支給(%)" get={(c) => c.metrics.overtimePaidRate} />
              <Metric rows={rows} label="平均年収(万円)" get={(c) => c.avgAnnualSalary} />
              <Metric rows={rows} label="是正勧告(件)" get={(c) => c.metrics.laborViolationCount} lowerBetter />
              <tr>
                <td>危険信号</td>
                {rows.map((r) => (
                  <td key={r.company.id} style={{ color: r.evaluation.redFlags.length ? 'var(--danger)' : 'var(--text-faint)' }}>
                    {r.evaluation.redFlags.length} 件
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** 各行。最良の値をハイライト。 */
function Metric({
  rows,
  label,
  get,
  lowerBetter,
}: {
  rows: Row[]
  label: string
  get: (c: Company) => number
  lowerBetter?: boolean
}) {
  const vals = rows.map((r) => get(r.company))
  const best = lowerBetter ? Math.min(...vals) : Math.max(...vals)
  return (
    <tr>
      <td>{label}</td>
      {rows.map((r, i) => {
        const isBest = vals[i] === best && rows.length > 1
        return (
          <td
            key={r.company.id}
            style={{ fontWeight: isBest ? 800 : 400, color: isBest ? 'var(--excellent)' : 'var(--text)' }}
          >
            {vals[i]}
            {isBest ? ' ◎' : ''}
          </td>
        )
      })}
    </tr>
  )
}
