// 相性診断（あなたの優先度で企業をランキング）。
// 就職者が「重視すること」を選ぶと、その軸の平均で「マッチ度」を算出する。
// 欠損が多い企業を過大評価しないよう、充足率に応じて中立値50へ補正する。

export interface FitAxis {
  key: string
  label: string
  /** チップ表示用の短いラベル */
  short: string
}

export const FIT_AXES: FitAxis[] = [
  { key: 'growth', label: '成長したい（将来性）', short: '将来性' },
  { key: 'workability', label: '働きやすさ重視', short: '働きやすさ' },
  { key: 'safety', label: '健全な労働環境を重視', short: '労働環境' },
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
 * 選択された優先軸からマッチ度(0–100)を返す。
 * 半数未満しかデータが無い場合は比較不能として null。
 * 一部欠損の場合は、欠損率に応じて中立値50へ縮約する。
 */
export function matchScore(scores: AxisScores, selected: string[]): number | null {
  const unique = [...new Set(selected)]
  if (!unique.length) return null
  const vals = unique
    .map((k) => scores[k])
    .filter((v): v is number => v !== null && v !== undefined)
  const coverage = vals.length / unique.length
  if (!vals.length || coverage < 0.5) return null
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(50 + (raw - 50) * coverage)
}

/** データセット内で少なくとも1社が値を持つ軸だけを返す（選ばせる意味のある軸）。 */
export function availableAxes(allScores: AxisScores[]): FitAxis[] {
  return FIT_AXES.filter((ax) => allScores.some((s) => s[ax.key] !== null && s[ax.key] !== undefined))
}

// ─────────────────────────────────────────────────────────────
// 「こんな人に向いている」— スコアから導く相性プロフィール。
// ※ 会社の公式な募集要件ではなく、当サイトの分析に基づく相性の見立て。
// ─────────────────────────────────────────────────────────────
export interface FitSuit {
  key: string
  text: string
  score: number
}
export interface FitProfile {
  /** 向いている人（強みの軸から） */
  suits: FitSuit[]
  /** 気をつけたい人（弱みの軸から） */
  caution: string[]
  /** 最も相性の良いペルソナ */
  bestPersona: Persona | null
  /** 一言まとめ */
  summary: string
}

// 高いほど「向いている人」を導く軸
const SUIT_RULES: { key: string; min: number; text: string }[] = [
  { key: 'growth', min: 68, text: '成長産業で挑戦したい人' },
  { key: 'productivity', min: 68, text: '少数精鋭で成果を出したい人' },
  { key: 'workability', min: 68, text: '働きやすさ・生活との両立を大切にしたい人' },
  { key: 'safety', min: 70, text: '健全な労働環境を重視する人' },
  { key: 'scale', min: 72, text: '大きな組織で腰を据えて働きたい人' },
]
// 低いことが「向いている人」を導く軸（規模が小さい＝裁量が大きい等）
const SUIT_LOW: { key: string; max: number; text: string }[] = [
  { key: 'scale', max: 38, text: '裁量を持って幅広く動きたい人' },
]
// 低いと「気をつけたい人」を導く軸
const CAUTION_RULES: { key: string; max: number; text: string }[] = [
  { key: 'workability', max: 48, text: 'ワークライフバランスを最優先する人は、働き方の詳細を確認' },
  { key: 'safety', max: 48, text: '労働環境を重視する人は、離職率などの詳細を確認' },
  { key: 'growth', max: 40, text: '変化・成長を強く求める人には、成熟・安定型かもしれません' },
  { key: 'productivity', max: 40, text: '高い生産性・年収を最優先する人は要確認' },
]

/**
 * スコアから「こんな人に向いている／気をつけたい」を導く。
 * 会社の公式要件ではなく、データに基づく相性の見立て。
 */
export function describeFit(scores: AxisScores): FitProfile {
  const val = (k: string): number | null =>
    typeof scores[k] === 'number' ? (scores[k] as number) : null

  const suits: FitSuit[] = SUIT_RULES.filter((r) => {
    const v = val(r.key)
    return v !== null && v >= r.min
  }).map((r) => ({ key: r.key, text: r.text, score: val(r.key) as number }))

  for (const r of SUIT_LOW) {
    const v = val(r.key)
    if (v !== null && v <= r.max) suits.push({ key: `${r.key}-low`, text: r.text, score: 100 - v })
  }
  suits.sort((a, b) => b.score - a.score)

  const caution = CAUTION_RULES.filter((r) => {
    const v = val(r.key)
    return v !== null && v <= r.max
  }).map((r) => r.text)

  let bestPersona: Persona | null = null
  let best = -1
  for (const p of PERSONAS) {
    const m = matchScore(scores, p.priorities)
    if (m !== null && m > best) {
      best = m
      bestPersona = p
    }
  }

  const top = suits[0]
  const summary = top
    ? `データ上は「${top.text}」に向いています。`
    : 'データが限られており、明確な傾向は出ていません。'

  return { suits: suits.slice(0, 3), caution: caution.slice(0, 2), bestPersona, summary }
}
