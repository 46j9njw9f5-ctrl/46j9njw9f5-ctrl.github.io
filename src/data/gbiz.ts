// gBizINFO（経済産業省）法人情報の変換（純粋関数）。
// ───────────────────────────────────────────────────────────────
// gBizINFO REST API `/v1/hojin/{corporate_number}` の HojinInfo を、
// 表示用の「事実」フィールドへ変換する。推測は一切せず、存在する値のみを採る。
// 出典は gBizINFO（経済産業省・法人番号で同定）。

import type { GbizCertification, GbizInfo } from '../types'
export type { GbizCertification, GbizInfo } from '../types'

const numOrUndef = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : undefined
}
const strOrUndef = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s : undefined
}

/** gBizINFO の 1法人レコード（HojinInfo）を表示用の事実へ変換。値が無い項目は入れない。 */
export function parseHojin(rec: Record<string, unknown> | null | undefined, asOf?: string): GbizInfo | null {
  if (!rec || typeof rec !== 'object') return null
  const certsRaw = Array.isArray(rec.certification) ? (rec.certification as Record<string, unknown>[]) : []
  const certifications: GbizCertification[] = certsRaw
    .map((c) => ({
      title: strOrUndef(c.title) ?? '',
      category: strOrUndef(c.category),
      target: strOrUndef(c.target),
      approvedOn: strOrUndef(c.date_of_approval),
    }))
    .filter((c) => c.title)

  const rep = [strOrUndef(rec.representative_position), strOrUndef(rec.representative_name)]
    .filter(Boolean)
    .join(' ')

  const out: GbizInfo = {
    capitalStock: numOrUndef(rec.capital_stock),
    established: strOrUndef(rec.date_of_establishment),
    employees: numOrUndef(rec.employee_number),
    womenEmployees: numOrUndef(rec.company_size_female),
    menEmployees: numOrUndef(rec.company_size_male),
    representative: rep || undefined,
    businessSummary: strOrUndef(rec.business_summary),
    certifications,
    subsidyCount: Array.isArray(rec.subsidy) ? rec.subsidy.length : undefined,
    procurementCount: Array.isArray(rec.procurement) ? rec.procurement.length : undefined,
    source: 'gBizINFO（経済産業省）',
    asOf: asOf ?? strOrUndef(rec.update_date),
  }

  // 何も事実が無ければ null（未連携扱い）。
  const hasAny =
    out.capitalStock != null ||
    out.established ||
    out.employees != null ||
    out.representative ||
    out.businessSummary ||
    out.certifications.length > 0 ||
    (out.subsidyCount ?? 0) > 0 ||
    (out.procurementCount ?? 0) > 0
  return hasAny ? out : null
}

// 求職者に関係の深い認定（表示で強調するためのキーワード）。
const NOTABLE = ['くるみん', 'えるぼし', 'ユースエール', '健康経営', '安全衛生優良', 'もにす', 'プラチナ']
export function isNotableCertification(title: string): boolean {
  return NOTABLE.some((k) => title.includes(k))
}
