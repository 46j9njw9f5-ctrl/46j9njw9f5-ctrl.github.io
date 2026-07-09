// 相性診断（あなたの優先度で企業をランキング）。
// 就職者が「重視すること」を選ぶと、その軸の平均で「マッチ度」を算出する。
// データが無い軸はその企業では除外して平均するため、公平に比較できる。

export interface FitAxis {
  key: string
  label: string
  /** チップ表示用の短いラベル */
  short: string
}

export const FIT_AXES: FitAxis[] = [
  { key: 'growth', label: '成長したい（将来性）', short: '将来性' },
  { key: 'workability', label: '働きやすさ重視', short: '働きやすさ' },
  { key: 'safety', label: 'ブラックを避けたい', short: '安全度' },
  { key: 'productivity', label: '稼ぐ力・生産性', short: '生産性' },
  { key: 'scale', label: '規模の安定', short: '規模' },
]

/** 求職者ペルソナ（ワンタップで重視軸をセット）。 */
export interface Persona {
  key: string
  label: string
  emoji: string
  priorities: string[]
}

export const PERSONAS: Persona[] = [
  { key: 'wlb', label: 'ワークライフ重視', emoji: '🌱', priorities: ['workability', 'safety'] },
  { key: 'growth', label: '成長・キャリア志向', emoji: '🚀', priorities: ['growth', 'productivity'] },
  { key: 'stable', label: '安定志向', emoji: '🛡', priorities: ['scale', 'safety'] },
  { key: 'earn', label: 'しっかり稼ぎたい', emoji: '💰', priorities: ['productivity', 'growth'] },
]

/** 各軸のスコア（0–100、高いほど良い。データが無ければ null）。 */
export type AxisScores = Record<string, number | null>

/**
 * 選択された優先軸の平均でマッチ度(0–100)を返す。
 * 選択軸のうちデータがある軸だけで平均する。全て欠損なら null。
 */
export function matchScore(scores: AxisScores, selected: string[]): number | null {
  if (!selected.length) return null
  const vals = selected
    .map((k) => scores[k])
    .filter((v): v is number => v !== null && v !== undefined)
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

/** データセット内で少なくとも1社が値を持つ軸だけを返す（選ばせる意味のある軸）。 */
export function availableAxes(allScores: AxisScores[]): FitAxis[] {
  return FIT_AXES.filter((ax) => allScores.some((s) => s[ax.key] !== null && s[ax.key] !== undefined))
}
