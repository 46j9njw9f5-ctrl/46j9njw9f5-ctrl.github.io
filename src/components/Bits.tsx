import type { Company, Evaluation } from '../types'
import { levelClass, levelColor } from '../ui'

/** 企業ロゴの代替アバター（頭文字）。 */
export function Avatar({ company, size }: { company: Company; size?: number }) {
  const s = size ?? 44
  return (
    <div
      className="avatar"
      style={{ background: company.accent, width: s, height: s, fontSize: s * 0.4 }}
    >
      {company.name.slice(0, 1)}
    </div>
  )
}

/** リスク区分バッジ。 */
export function RiskBadge({ evaluation }: { evaluation: Evaluation }) {
  return (
    <span className={`badge ${levelClass[evaluation.level]}`}>
      <span className="badge__dot" />
      {evaluation.levelLabel}
    </span>
  )
}

/**
 * スコアのドーナツ。ブラック度を表示（高いほど危険な色）。
 */
export function ScoreDonut({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div
      className="donut"
      style={
        {
          '--p': evaluation.blackScore,
          '--c': levelColor[evaluation.level],
        } as React.CSSProperties
      }
    >
      <div style={{ textAlign: 'center' }}>
        <div className="donut__num" style={{ color: levelColor[evaluation.level] }}>
          {evaluation.blackScore}
        </div>
        <div className="donut__cap">ブラック度</div>
      </div>
    </div>
  )
}
