// 就職判断レポートの表示モデル生成（純粋関数）。
// ───────────────────────────────────────────────────────────────
// 既存の評価エンジン（overview / benchmark / fit）の出力を組み合わせるだけで、
// スコア計算式・データ取得は一切変更しない。未公表値は推測で補完せず「未公表」と表示し、
// 事実(fact) / 解釈(interpretation) / 未公表(unpublished) を区別する。

import type {
  Company,
  Evaluation,
  GrowthEvaluation,
  ProductivityEvaluation,
  StockSnapshot,
  WorkabilityEvaluation,
} from '../../types'
import { buildOverview } from '../../engine/overview'
import { buildBenchmark } from '../../engine/benchmark'
import { describeFit, type AxisScores } from '../../engine/fit'

/** 価格は 1回 500円で固定（実決済は行わない・需要検証のみ）。 */
export const REPORT_PRICE = 500 as const

export type FactKind = 'fact' | 'interpretation' | 'unpublished'

export interface ReportLine {
  label: string
  value: string
  kind: FactKind
}

export interface ReportSection {
  key: string
  title: string
  /** このセクションの主な分類（見出しのタグ表示用） */
  kind: FactKind
  lines: ReportLine[]
}

export interface CompanyReportInput {
  company: Company
  growth: GrowthEvaluation
  productivity: ProductivityEvaluation
  stock: StockSnapshot
  evaluation?: Evaluation
  workability?: WorkabilityEvaluation
  scores: AxisScores
}

export interface ReportModel {
  price: typeof REPORT_PRICE
  type: 'single' | 'comparison'
  title: string
  updatedAt: string
  companyNames: string[]
  companyCount: number
  /** 相性の良いペルソナ（計測用。判定不能なら 'none'） */
  persona: string
  sources: string[]
  /** 無料で見せる概要・一部プレビュー */
  previewSections: ReportSection[]
  /** 有料部分（UIではロック表示。内容は生成するがプレビューでは出さない） */
  fullSections: ReportSection[]
  /** 比較レポートのときの企業間差分 */
  comparisonSections: ReportSection[]
  disclaimers: string[]
  /** 重複計上防止用の企業構成シグネチャ */
  signature: string
}

const DATA_UPDATED = '2026年7月'

const num = (v: number | null | undefined): v is number => typeof v === 'number' && !Number.isNaN(v)

/** 値を安全に整形。未公表は推測せず「未公表」。 */
function line(label: string, raw: number | string | null | undefined, unit = '', kind: FactKind = 'fact'): ReportLine {
  if (raw === null || raw === undefined || raw === '') {
    return { label, value: '未公表', kind: 'unpublished' }
  }
  return { label, value: `${raw}${unit}`, kind }
}

function summarySection(inp: CompanyReportInput): ReportSection {
  const { company: c, growth, productivity, workability } = inp
  const lr = c.laborReal
  const lines: ReportLine[] = [
    line('業種', c.industry),
    line('本社所在地', c.location),
    line('従業員数', c.employees?.toLocaleString?.() ?? c.employees, '名'),
    line('設立', c.founded ?? null, '年'),
    line('上場区分', c.listed ? '上場' : '非上場'),
    // 労働指標（公的データ由来の事実。無ければ未公表）
    line('月平均残業時間', lr?.avgOvertimeHours ?? null, 'h/月'),
    line('有給取得率', lr?.paidLeaveRate ?? null, '%'),
    line('3年以内離職率', lr?.turnover3yrRate ?? null, '%'),
    line('平均勤続年数', lr?.avgTenureYears ?? null, '年'),
    line('女性管理職比率', lr?.womenManagerRate ?? null, '%'),
    // スコアは独自ロジックによる解釈
    line('将来性スコア（独自指標）', growth.growthScore, ' / 100', 'interpretation'),
    line('生産性スコア（独自指標）', productivity.score ?? null, ' / 100', 'interpretation'),
    line('働きやすさスコア（独自指標）', workability?.score ?? null, ' / 100', 'interpretation'),
  ]
  return { key: 'summary', title: '主要指標まとめ', kind: 'fact', lines }
}

function benchmarkSection(inp: CompanyReportInput): ReportSection {
  const lr = inp.company.laborReal
  if (!lr) {
    return {
      key: 'benchmark',
      title: '業種平均・全国平均との差',
      kind: 'unpublished',
      lines: [{ label: '労働データ', value: '未公表（比較できません）', kind: 'unpublished' }],
    }
  }
  const bench = buildBenchmark(lr)
  if (!bench.length) {
    return {
      key: 'benchmark',
      title: '業種平均・全国平均との差',
      kind: 'unpublished',
      lines: [{ label: '比較可能な指標', value: '未公表', kind: 'unpublished' }],
    }
  }
  const lines = bench.map((b) => {
    const base = b.industryAvg ?? b.nationalAvg
    const deltaTxt = num(b.delta) ? `${b.delta > 0 ? '+' : ''}${b.delta}${b.unit}（${b.better ? '良い' : '悪い'}方向）` : '—'
    const baseTxt = num(base) ? `${b.baseLabel} ${base}${b.unit}` : `${b.baseLabel} 未公表`
    return {
      label: b.label,
      value: `${b.value}${b.unit}（${baseTxt}／差 ${deltaTxt}）`,
      kind: 'fact' as FactKind,
    }
  })
  return { key: 'benchmark', title: '業種平均・全国平均との差', kind: 'fact', lines }
}

function strengthsSection(inp: CompanyReportInput): ReportSection {
  const ov = buildOverview(inp)
  const lines = ov.pros.length
    ? ov.pros.map((p, i) => ({ label: `強み${i + 1}`, value: p, kind: 'interpretation' as FactKind }))
    : [{ label: '強み', value: '公開データからは特筆すべき強みを抽出できませんでした', kind: 'interpretation' as FactKind }]
  return { key: 'strengths', title: '強み（スコア分析にもとづく解釈）', kind: 'interpretation', lines }
}

function cautionsSection(inp: CompanyReportInput): ReportSection {
  const ov = buildOverview(inp)
  const lines: ReportLine[] = ov.cons.map((cn, i) => ({
    label: `注意点${i + 1}`,
    value: cn,
    kind: 'interpretation',
  }))
  if (inp.workability?.isReference) {
    lines.push({
      label: 'データの限界',
      value: '公開データが限定的なため、働きやすさは参考値です。実態は面接等でご確認ください。',
      kind: 'interpretation',
    })
  }
  if (!lines.length) lines.push({ label: '注意点', value: '大きな懸念は抽出されませんでした', kind: 'interpretation' })
  return { key: 'cautions', title: '注意点（スコア分析にもとづく解釈）', kind: 'interpretation', lines }
}

function fitSection(inp: CompanyReportInput): ReportSection {
  const fit = describeFit(inp.scores)
  const lines: ReportLine[] = []
  if (fit.bestPersona) {
    lines.push({ label: '相性の良いタイプ', value: `${fit.bestPersona.label}タイプ`, kind: 'interpretation' })
  }
  for (const s of fit.suits.slice(0, 4)) lines.push({ label: '一致する理由', value: s.text, kind: 'interpretation' })
  if (fit.caution.length) {
    for (const c of fit.caution.slice(0, 2)) lines.push({ label: '相性の注意', value: c, kind: 'interpretation' })
  }
  if (!lines.length) lines.push({ label: '相性', value: '判定に十分なデータがありません', kind: 'unpublished' })
  return { key: 'fit', title: '重視条件との一致理由（解釈）', kind: 'interpretation', lines }
}

function gapsSection(inp: CompanyReportInput): ReportSection {
  const lines: ReportLine[] = []
  const missing = inp.workability?.missingItems ?? []
  for (const m of missing) lines.push({ label: '未取得の労働指標', value: m, kind: 'unpublished' })
  if (!inp.evaluation) {
    lines.push({
      label: '労働環境リスク（残業代・法令違反等）',
      value: '未連携（実在企業に推定値は付与しません）',
      kind: 'unpublished',
    })
  }
  if (inp.productivity.score === null) {
    lines.push({ label: '生産性・財務', value: '未公表（財務データ未連携）', kind: 'unpublished' })
  }
  if (!lines.length) lines.push({ label: '不足項目', value: '主要項目は公開データで揃っています', kind: 'fact' })
  return { key: 'gaps', title: '公開情報が不足している項目', kind: 'unpublished', lines }
}

function questionsSection(inp: CompanyReportInput): ReportSection {
  const lr = inp.company.laborReal
  const qs: string[] = []
  if (!num(lr?.turnover3yrRate)) qs.push('新卒・中途それぞれの3年以内離職率はどのくらいですか？')
  if (!num(lr?.avgOvertimeHours) || (num(lr?.avgOvertimeHours) && lr!.avgOvertimeHours! >= 30))
    qs.push('月平均残業時間の実績と、繁忙期のピークはどの程度ですか？')
  if (!num(lr?.paidLeaveRate) || (num(lr?.paidLeaveRate) && lr!.paidLeaveRate! < 50))
    qs.push('有給休暇の実際の取得率と、取得しやすさを教えてください。')
  if (!num(lr?.avgTenureYears)) qs.push('平均勤続年数と、若手社員の定着状況はいかがですか？')
  if (!inp.evaluation) qs.push('残業代の支給状況・36協定・労基署からの指導歴はありますか？')
  qs.push('配属・勤務地の決まり方と、転勤の頻度を教えてください。')
  qs.push('入社後の教育・研修と、評価・昇給の仕組みはどうなっていますか？')
  const lines = qs.slice(0, 6).map((q, i) => ({ label: `質問${i + 1}`, value: q, kind: 'interpretation' as FactKind }))
  return { key: 'questions', title: '面接・説明会で確認すべき質問', kind: 'interpretation', lines }
}

function sourcesOf(inp: CompanyReportInput): string[] {
  const s = new Set<string>()
  if (inp.company.source?.name) s.add(`${inp.company.source.name}（${inp.company.source.license}）`)
  if (inp.company.laborReal?.source) s.add(inp.company.laborReal.source)
  return [...s]
}

function comparisonOf(inputs: CompanyReportInput[]): ReportSection[] {
  const names = inputs.map((i) => i.company.name)
  const axisRow = (label: string, pick: (i: CompanyReportInput) => number | null | undefined): ReportLine => {
    const vals = inputs.map(pick)
    const nums = vals.filter(num) as number[]
    const best = nums.length ? Math.max(...nums) : null
    const text = inputs
      .map((i, idx) => {
        const v = vals[idx]
        if (!num(v)) return `${i.company.name}: 未公表`
        return `${i.company.name}: ${v}${best !== null && v === best ? ' ◎' : ''}`
      })
      .join(' ／ ')
    return { label, value: text, kind: 'interpretation' }
  }
  const metricRow = (label: string, pick: (i: CompanyReportInput) => number | null | undefined, unit: string, lowerBetter = false): ReportLine => {
    const vals = inputs.map(pick)
    const nums = vals.filter(num) as number[]
    const mark = nums.length ? (lowerBetter ? Math.min(...nums) : Math.max(...nums)) : null
    const text = inputs
      .map((i, idx) => {
        const v = vals[idx]
        if (!num(v)) return `${i.company.name}: 未公表`
        return `${i.company.name}: ${v}${unit}${mark !== null && v === mark ? ' ◎' : ''}`
      })
      .join(' ／ ')
    return { label, value: text, kind: 'fact' }
  }
  const scores: ReportSection = {
    key: 'cmp-scores',
    title: '企業間のスコア比較（独自指標）',
    kind: 'interpretation',
    lines: [
      axisRow('将来性', (i) => i.growth.growthScore),
      axisRow('生産性', (i) => i.productivity.score),
      axisRow('働きやすさ', (i) => i.workability?.score ?? null),
    ],
  }
  const metrics: ReportSection = {
    key: 'cmp-metrics',
    title: '企業間の労働データ比較（公的データ）',
    kind: 'fact',
    lines: [
      metricRow('月平均残業', (i) => i.company.laborReal?.avgOvertimeHours, 'h/月', true),
      metricRow('有給取得率', (i) => i.company.laborReal?.paidLeaveRate, '%'),
      metricRow('3年以内離職率', (i) => i.company.laborReal?.turnover3yrRate, '%', true),
      metricRow('平均勤続年数', (i) => i.company.laborReal?.avgTenureYears, '年'),
    ],
  }
  return [{ ...scores }, metrics, {
    key: 'cmp-note',
    title: '比較の読み方',
    kind: 'interpretation',
    lines: [{ label: 'ヒント', value: `◎ は${names.length}社中で最も良い値です。未公表項目は比較対象から除外しています。`, kind: 'interpretation' }],
  }]
}

/** 単一 or 複数企業の就職判断レポート表示モデルを生成する（純粋関数）。 */
export function buildReport(inputs: CompanyReportInput[]): ReportModel {
  const type: 'single' | 'comparison' = inputs.length >= 2 ? 'comparison' : 'single'
  const names = inputs.map((i) => i.company.name)
  const ids = inputs.map((i) => i.company.id)
  const signature = `${type}:${[...ids].sort().join('+')}`

  // 各社のセクションをまとめる（複数社のときは社名を接頭）
  const label = (name: string, s: ReportSection): ReportSection =>
    inputs.length > 1 ? { ...s, key: `${s.key}-${name}`, title: `${name}：${s.title}` } : s

  const previewSections: ReportSection[] = []
  const fullSections: ReportSection[] = []
  const sources = new Set<string>()
  let updatedAt = DATA_UPDATED

  for (const inp of inputs) {
    for (const s of sourcesOf(inp)) sources.add(s)
    if (inp.company.laborReal?.asOf) updatedAt = inp.company.laborReal.asOf
    // 無料プレビュー：概要 + 強み（先頭のみ）
    previewSections.push(label(inp.company.name, summarySection(inp)))
    previewSections.push(label(inp.company.name, strengthsSection(inp)))
    // 有料：残りの詳細
    fullSections.push(label(inp.company.name, benchmarkSection(inp)))
    fullSections.push(label(inp.company.name, cautionsSection(inp)))
    fullSections.push(label(inp.company.name, fitSection(inp)))
    fullSections.push(label(inp.company.name, gapsSection(inp)))
    fullSections.push(label(inp.company.name, questionsSection(inp)))
  }

  const comparisonSections = type === 'comparison' ? comparisonOf(inputs) : []

  return {
    price: REPORT_PRICE,
    type,
    title: type === 'comparison' ? `${names.join('・')} の比較レポート` : `${names[0]} の就職判断レポート`,
    updatedAt,
    companyNames: names,
    companyCount: inputs.length,
    persona: describeFit(inputs[0].scores).bestPersona?.key ?? 'none',
    sources: [...sources],
    previewSections,
    fullSections,
    comparisonSections,
    disclaimers: [
      '現在は需要検証中であり、決済は発生しません。',
      '本レポートは就職先を保証するものではありません。',
      '投資助言・法律相談・雇用条件の保証ではありません。',
      '最終判断は必ず企業の公式情報や面接でご確認ください。',
    ],
    signature,
  }
}
