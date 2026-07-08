import type {
  Company,
  Evaluation,
  GrowthEvaluation,
  ProductivityEvaluation,
  StockSnapshot,
  WorkabilityEvaluation,
} from '../types'

/**
 * 各分析軸を人間が読みやすい「総合コメント」に要約する。
 * 数値ではなく平易な言葉で、強み・気になる点をまとめる。
 */

export interface OverviewAxis {
  key: string
  label: string
  /** 0–100（高いほど良い向きに正規化済み） */
  score: number
}

export interface Overview {
  verdict: string
  pros: string[]
  cons: string[]
  axes: OverviewAxis[]
}

export interface OverviewInput {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  stock: StockSnapshot
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
}

export function buildOverview(input: OverviewInput): Overview {
  const { company, growth, productivity, stock, evaluation, workability } = input

  const axes: OverviewAxis[] = [{ key: 'growth', label: '将来性', score: growth.growthScore }]
  if (productivity.score !== null) axes.push({ key: 'productivity', label: '生産性', score: productivity.score })
  if (workability) axes.push({ key: 'workability', label: '働きやすさ', score: workability.score })
  if (evaluation) axes.push({ key: 'safety', label: '安全度', score: evaluation.whiteScore })

  // --- 平易な総合コメント ---
  const parts: string[] = []
  if (growth.growthScore >= 74) parts.push('将来性が高く')
  else if (growth.growthScore >= 60) parts.push('成長が見込め')
  else if (growth.growthScore < 45) parts.push('成長はゆるやかで')
  else parts.push('安定志向で')

  if (workability) {
    if (workability.score >= 74) parts.push('働きやすい')
    else if (workability.score < 45) parts.push('働き方に注意が必要な')
    else parts.push('働き方は標準的な')
  } else if (productivity.score !== null && productivity.score >= 74) {
    parts.push('生産性の高い')
  }

  let verdict = `${company.name} は、${parts.join('、')}会社です。`
  if (evaluation && (evaluation.level === 'danger' || evaluation.level === 'caution')) {
    verdict +=
      evaluation.level === 'danger'
        ? ' 労働環境に危険信号があるため、応募は慎重に。'
        : ' 労働環境に気になる点があるので、条件をよく確認しましょう。'
  } else if (!evaluation) {
    verdict += ' 労働環境の実データは連携待ちです。'
  }

  // --- 強み ---
  const pros: string[] = []
  pros.push(...growth.strengths.slice(0, 2))
  if (workability) pros.push(...workability.highlights.slice(0, 2))
  if (productivity.tier === 'high') pros.push('生産性が高い（一人当たり売上が多い）')
  if (stock.profitability === 'high') pros.push('高収益（利益率が高い）')

  // --- 気になる点 ---
  const cons: string[] = []
  cons.push(...growth.risks.slice(0, 2))
  if (evaluation) cons.push(...evaluation.redFlags.slice(0, 3))
  if (productivity.tier === 'low' && productivity.score !== null) cons.push('生産性は低め')

  return {
    verdict,
    pros: dedup(pros).slice(0, 5),
    cons: dedup(cons).slice(0, 5),
    axes,
  }
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr)]
}
