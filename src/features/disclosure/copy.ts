// 開示コピーの単一情報源（Lane A の claims matrix §E に対応）。
// UI各所はこの定数を参照し、法的・信用リスクの表現を統一する。

import type { WorkabilityEvaluation } from '../../types'

export const FOUR_WAY_KEY =
  '事実＝出典から直接取得 ／ 算出値＝出典データからの計算 ／ 独自解釈＝当サイトの評価 ／ 未公表＝公開データなし'

export const SCORE_CAVEAT =
  '将来性・生産性・労働環境の各スコアは公開データにもとづく当サイトの独自指標で、将来や実態を保証しません。'

export const FIT_CAVEAT = '「一致度」は選んだ重視条件との比較であり、適性検査・内定可能性の予測ではありません。'

export const COVERAGE_LABEL = 'データ充足度'

export const CORRECTION_CTA = '情報の誤りを報告する'

export const MISSING_BLOCK_TITLE = '未公表・未連携の項目'

export function oldDataWarning(asOf: string): string {
  return `このデータは ${asOf} 時点で、更新から時間が経っている可能性があります。最新の状況は公式情報でご確認ください。`
}

/** 充足度ラベル（既存の workability confidence を再利用。新規スコアは作らない）。 */
export function coverageLabel(w?: WorkabilityEvaluation): { text: string; level: 'high' | 'medium' | 'low' } | null {
  if (!w) return null
  const level = w.confidence
  const jp = level === 'high' ? '高' : level === 'medium' ? '中' : '低'
  return { text: `${COVERAGE_LABEL}：${jp}（${w.availableCount}/${w.totalCount}項目）`, level }
}

/**
 * asOf 文字列（YYYY-MM-DD 等）が閾値より古いかを判定。
 * 比較用の現在日付は呼び出し側から渡す（テスト容易性のため）。
 */
export function isOldData(asOf: string | undefined, nowIso: string, months = 18): boolean {
  if (!asOf) return false
  const as = Date.parse(asOf)
  const now = Date.parse(nowIso)
  if (Number.isNaN(as) || Number.isNaN(now)) return false
  const ms = months * 30 * 24 * 60 * 60 * 1000
  return now - as > ms
}
