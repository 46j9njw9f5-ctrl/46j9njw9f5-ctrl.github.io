import type { Company, Evaluation, GrowthEvaluation, SeriesPoint } from '../types'
import { grade, gradeColor, growthColor, levelClass, levelColor, stageClass } from '../ui'

/** 一目でわかる評価グレード（S/A/B/C/D）のバッジ。score は高いほど良い向き。 */
export function GradeBadge({
  score,
  label,
  size = 'md',
}: {
  score: number
  label: string
  size?: 'sm' | 'md'
}) {
  const g = grade(score)
  const color = gradeColor[g]
  return (
    <div className={`grade grade--${size}`}>
      <div
        className="grade__letter"
        style={{ color, borderColor: `color-mix(in srgb, ${color} 55%, transparent)`, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        {g}
      </div>
      <div className="grade__meta">
        <div className="grade__label">{label}</div>
        <div className="grade__score" style={{ color }}>
          {score}
          <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>/100</span>
        </div>
      </div>
    </div>
  )
}

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

/** リスク区分バッジ（ブラック度）。 */
export function RiskBadge({ evaluation }: { evaluation: Evaluation }) {
  return (
    <span className={`badge ${levelClass[evaluation.level]}`}>
      <span className="badge__dot" />
      {evaluation.levelLabel}
    </span>
  )
}

/** 成長ステージのバッジ（将来性）。 */
export function GrowthBadge({ growth }: { growth: GrowthEvaluation }) {
  return (
    <span className={`badge ${stageClass[growth.stage]}`}>
      <span className="badge__dot" />
      {growth.stageLabel}
    </span>
  )
}

/** ブラック度ドーナツ（高いほど危険＝赤）。 */
export function ScoreDonut({ evaluation, size }: { evaluation: Evaluation; size?: number }) {
  return (
    <Donut value={evaluation.blackScore} color={levelColor[evaluation.level]} caption="ブラック度" size={size} />
  )
}

/** 将来性ドーナツ（高いほど有望＝緑）。 */
export function GrowthDonut({ growth, size }: { growth: GrowthEvaluation; size?: number }) {
  return (
    <Donut value={growth.growthScore} color={growthColor(growth.growthScore)} caption="将来性" size={size} />
  )
}

export function Donut({
  value,
  color,
  caption,
  size,
}: {
  value: number
  color: string
  caption: string
  size?: number
}) {
  const s = size ?? 66
  return (
    <div
      className="donut"
      style={{ '--p': value, '--c': color, width: s, height: s } as React.CSSProperties}
    >
      <div style={{ textAlign: 'center' }}>
        <div className="donut__num" style={{ color, fontSize: s * 0.29 }}>
          {value}
        </div>
        <div className="donut__cap">{caption}</div>
      </div>
    </div>
  )
}

/** 時系列のスパークライン（実データの推移を可視化）。 */
export function Sparkline({
  series,
  color,
  width = 160,
  height = 40,
}: {
  series: SeriesPoint[]
  color: string
  width?: number
  height?: number
}) {
  const valid = series.filter((p) => p.year > 0 && p.value > 0).sort((a, b) => a.year - b.year)
  // 単位不整合の外れ値を中央値基準で除外（成長率計算と整合させる）
  const sortedVals = valid.map((p) => p.value).sort((a, b) => a - b)
  const median = sortedVals[Math.floor(sortedVals.length / 2)] ?? 0
  const pts = valid.filter((p) => p.value >= median * 0.25 && p.value <= median * 4)
  if (pts.length < 2) return null
  const xs = pts.map((p) => p.year)
  const ys = pts.map((p) => p.value)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const nx = (x: number) => (maxX === minX ? 0 : ((x - minX) / (maxX - minX)) * (width - 6) + 3)
  const ny = (y: number) =>
    maxY === minY ? height / 2 : height - 4 - ((y - minY) / (maxY - minY)) * (height - 8)
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${nx(p.year).toFixed(1)} ${ny(p.value).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={nx(p.year)} cy={ny(p.value)} r={2.2} fill={color} />
      ))}
    </svg>
  )
}
