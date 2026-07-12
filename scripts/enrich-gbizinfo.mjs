// gBizINFO（経済産業省）から事実データを補完する。
// ───────────────────────────────────────────────────────────────
// 資本金・設立日・従業員数（男女別）・代表者・事業概要・公的認定（くるみん/えるぼし/
// ユースエール/健康経営 等）・補助金/調達件数を、法人番号で突合して company.gbiz に追加する。
// 推測は一切しない（存在する値のみ）。出典は gBizINFO（経済産業省）。
//
// 必須：無料のアクセストークン（gBizINFO で登録・申請）。私（AI）は代理登録できないため、
// 取得したトークンを環境変数で渡すこと：
//
//   GBIZINFO_TOKEN=xxxxxxxx node scripts/enrich-gbizinfo.mjs
//   （試験実行）GBIZINFO_TOKEN=xxxx GBIZ_LIMIT=50 node scripts/enrich-gbizinfo.mjs
//
// 参考：API仕様 https://api.info.gbiz.go.jp/hojin/v3/api-docs（トークン不要で閲覧可）

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src', 'data', 'companies.generated.json')
const TOKEN = process.env.GBIZINFO_TOKEN || ''
const BASE = process.env.GBIZ_BASE || 'https://info.gbiz.go.jp/hojin/v1/hojin'
const LIMIT = process.env.GBIZ_LIMIT ? Number(process.env.GBIZ_LIMIT) : Infinity
const DELAY_MS = Number(process.env.GBIZ_DELAY || 250) // 節度あるレート

if (!TOKEN) {
  console.error(
    [
      'GBIZINFO_TOKEN が未設定です。gBizINFO の無料アクセストークンが必要です。',
      '取得手順：',
      '  1) https://info.gbiz.go.jp/ で「APIの利用」→アカウント登録（メール）',
      '  2) アクセストークンを発行',
      '  3) GBIZINFO_TOKEN=<トークン> node scripts/enrich-gbizinfo.mjs',
    ].join('\n'),
  )
  process.exit(1)
}

// src/data/gbiz.ts と同じ変換ロジック（.mjs から .ts を import できないため移植）。
const numOrUndef = (v) => {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : undefined
}
const strOrUndef = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

function parseHojin(rec, asOf) {
  if (!rec || typeof rec !== 'object') return null
  const certs = Array.isArray(rec.certification) ? rec.certification : []
  const certifications = certs
    .map((c) => ({
      title: strOrUndef(c.title) ?? '',
      category: strOrUndef(c.category),
      target: strOrUndef(c.target),
      approvedOn: strOrUndef(c.date_of_approval),
    }))
    .filter((c) => c.title)
  const rep = [strOrUndef(rec.representative_position), strOrUndef(rec.representative_name)].filter(Boolean).join(' ')
  const out = {
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
  const hasAny =
    out.capitalStock != null || out.established || out.employees != null || out.representative ||
    out.businessSummary || out.certifications.length > 0 || (out.subsidyCount ?? 0) > 0 || (out.procurementCount ?? 0) > 0
  // undefined を落として整形
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
  return hasAny ? out : null
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchHojin(corp) {
  const url = `${BASE}/${corp}`
  const res = await fetch(url, { headers: { 'X-hojinInfo-api-token': TOKEN, Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`gBizINFO ${res.status} for ${corp}`)
  const json = await res.json()
  const list = json['hojin-infos'] || json.hojinInfos || []
  return list[0] ?? null
}

async function main() {
  const companies = JSON.parse(readFileSync(DATA, 'utf8'))
  const targets = companies.filter((c) => c.corporateNumber).slice(0, LIMIT === Infinity ? undefined : LIMIT)
  console.log(`対象（法人番号あり）：${targets.length} 社を gBizINFO で照会します…`)

  let enriched = 0
  let withCert = 0
  let failed = 0
  let i = 0
  for (const c of companies) {
    if (!c.corporateNumber) continue
    if (LIMIT !== Infinity && i >= LIMIT) break
    i++
    const corp = String(c.corporateNumber).replace(/[^0-9]/g, '')
    try {
      const rec = await fetchHojin(corp)
      const g = parseHojin(rec)
      if (g) {
        c.gbiz = g
        enriched++
        if (g.certifications.length) withCert++
      }
    } catch (e) {
      failed++
      if (failed <= 5) console.warn('  照会失敗:', corp, String(e.message || e))
    }
    if (i % 200 === 0) console.log(`  …${i} 社処理（補完 ${enriched}）`)
    await sleep(DELAY_MS)
  }

  writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
  console.log(`✓ gBizINFO 補完：${enriched} 社（うち公的認定あり ${withCert} 社）／失敗 ${failed}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
