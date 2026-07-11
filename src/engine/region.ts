import type { Row } from '../data/rows'

// 都道府県 × 条件（テーマ）の検索可能ページ用ロジック。
// 薄い自動生成ページを量産しないよう、データが十分な組み合わせだけを index 可能にする。

export interface Pref {
  name: string // 例: 福岡県
  slug: string // 例: fukuoka（クリーンURL用のローマ字）
}

// 47都道府県（表示順は全国標準の北→南）。
export const PREFS: Pref[] = [
  { name: '北海道', slug: 'hokkaido' },
  { name: '青森県', slug: 'aomori' },
  { name: '岩手県', slug: 'iwate' },
  { name: '宮城県', slug: 'miyagi' },
  { name: '秋田県', slug: 'akita' },
  { name: '山形県', slug: 'yamagata' },
  { name: '福島県', slug: 'fukushima' },
  { name: '茨城県', slug: 'ibaraki' },
  { name: '栃木県', slug: 'tochigi' },
  { name: '群馬県', slug: 'gunma' },
  { name: '埼玉県', slug: 'saitama' },
  { name: '千葉県', slug: 'chiba' },
  { name: '東京都', slug: 'tokyo' },
  { name: '神奈川県', slug: 'kanagawa' },
  { name: '新潟県', slug: 'niigata' },
  { name: '富山県', slug: 'toyama' },
  { name: '石川県', slug: 'ishikawa' },
  { name: '福井県', slug: 'fukui' },
  { name: '山梨県', slug: 'yamanashi' },
  { name: '長野県', slug: 'nagano' },
  { name: '岐阜県', slug: 'gifu' },
  { name: '静岡県', slug: 'shizuoka' },
  { name: '愛知県', slug: 'aichi' },
  { name: '三重県', slug: 'mie' },
  { name: '滋賀県', slug: 'shiga' },
  { name: '京都府', slug: 'kyoto' },
  { name: '大阪府', slug: 'osaka' },
  { name: '兵庫県', slug: 'hyogo' },
  { name: '奈良県', slug: 'nara' },
  { name: '和歌山県', slug: 'wakayama' },
  { name: '鳥取県', slug: 'tottori' },
  { name: '島根県', slug: 'shimane' },
  { name: '岡山県', slug: 'okayama' },
  { name: '広島県', slug: 'hiroshima' },
  { name: '山口県', slug: 'yamaguchi' },
  { name: '徳島県', slug: 'tokushima' },
  { name: '香川県', slug: 'kagawa' },
  { name: '愛媛県', slug: 'ehime' },
  { name: '高知県', slug: 'kochi' },
  { name: '福岡県', slug: 'fukuoka' },
  { name: '佐賀県', slug: 'saga' },
  { name: '長崎県', slug: 'nagasaki' },
  { name: '熊本県', slug: 'kumamoto' },
  { name: '大分県', slug: 'oita' },
  { name: '宮崎県', slug: 'miyazaki' },
  { name: '鹿児島県', slug: 'kagoshima' },
  { name: '沖縄県', slug: 'okinawa' },
]

export function prefBySlug(slug?: string): Pref | undefined {
  return PREFS.find((p) => p.slug === slug)
}

export type ThemeSlug = 'overtime-low' | 'paid-leave-high' | 'promising' | 'hidden-gems'

export interface RegionTheme {
  slug: ThemeSlug
  /** 見出し語（例: 残業が少ない）。ページタイトルは「{県}の{label}企業」。 */
  label: string
  description: string
  /** この行がテーマの対象データを持つか */
  eligible: (r: Row) => boolean
  /** 並び替え（先頭ほど上位） */
  compare: (a: Row, b: Row) => number
  /** 値ラベル（カード補助表示・任意） */
}

const num = (v: number | undefined | null): number | null => (v == null ? null : v)

export const THEMES: RegionTheme[] = [
  {
    slug: 'overtime-low',
    label: '残業が少ない',
    description: '月平均残業時間が短い順（公開データがある企業のみ）',
    eligible: (r) => num(r.company.laborReal?.avgOvertimeHours) !== null,
    compare: (a, b) =>
      (a.company.laborReal!.avgOvertimeHours as number) - (b.company.laborReal!.avgOvertimeHours as number),
  },
  {
    slug: 'paid-leave-high',
    label: '有給取得率が高い',
    description: '年次有給休暇の取得率が高い順（公開データがある企業のみ）',
    eligible: (r) => num(r.company.laborReal?.paidLeaveRate) !== null,
    compare: (a, b) =>
      (b.company.laborReal!.paidLeaveRate as number) - (a.company.laborReal!.paidLeaveRate as number),
  },
  {
    slug: 'promising',
    label: '将来性が高い',
    description: '将来性スコアが高い順',
    eligible: (r) => r.growth.growthScore >= 60,
    compare: (a, b) => b.growth.growthScore - a.growth.growthScore,
  },
  {
    slug: 'hidden-gems',
    label: '隠れ優良',
    description: '知名度は高くないが、成長性・労働環境のバランスが良い企業',
    // 対象判定は隠れ優良の企業ID集合（selectRegion で算出）で行う。
    eligible: () => true,
    compare: (a, b) => b.growth.growthScore - a.growth.growthScore,
  },
]

export function themeBySlug(slug?: string): RegionTheme | undefined {
  return THEMES.find((t) => t.slug === slug)
}

/** index 可能とみなす最小件数（これ未満は noindex にして薄いページ量産を避ける）。 */
export const MIN_INDEXABLE = 8

export interface RegionResult {
  pref: Pref
  theme?: RegionTheme
  rows: Row[]
  total: number // 県内の総企業数
  /** 十分なデータがあり index 可能か */
  indexable: boolean
}

/**
 * 県（＋任意テーマ）で企業を絞り込み・並び替える。
 * 隠れ優良テーマのみ、県内で算出した gemIds 集合で対象を判定する。
 */
export function selectRegion(
  allRows: Row[],
  pref: Pref,
  theme?: RegionTheme,
  gemIds?: Set<string>,
): RegionResult {
  const inPref = allRows.filter((r) => r.company.location === pref.name)
  let rows: Row[]
  if (theme?.slug === 'hidden-gems') {
    rows = inPref.filter((r) => gemIds?.has(r.company.id)).sort(theme.compare)
  } else if (theme) {
    rows = inPref.filter(theme.eligible).sort(theme.compare)
  } else {
    rows = [...inPref].sort((a, b) => b.growth.growthScore - a.growth.growthScore)
  }
  const indexable = rows.length >= MIN_INDEXABLE
  return { pref, theme, rows, total: inPref.length, indexable }
}
