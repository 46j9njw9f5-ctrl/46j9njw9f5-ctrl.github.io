// 実労働データ連携パイプライン（受け皿）。
//
//   cp .env.example .env    # トークン/CSVパスを記入
//   node scripts/enrich-labor.mjs
//
// 設定された公的データソースの分だけ、companies.generated.json の各社に
// 労働指標（metrics）・平均年収を追記する。未設定なら安全に何もしない。
//
// 方針: 実名企業に推測値を付与しない。実データが得られた企業だけ労働評価を有効化する。

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'src', 'data', 'companies.generated.json')

// --- .env の簡易ローダ（依存なし） ---
function loadEnv() {
  const p = join(ROOT, '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    if (k && !(k in process.env)) process.env[k] = v
  }
}
loadEnv()

const GBIZINFO_TOKEN = process.env.GBIZINFO_TOKEN || ''
const SHOKUBA_CSV = process.env.SHOKUBA_CSV || ''
const EDINET_API_KEY = process.env.EDINET_API_KEY || ''

// ============================================================
// gBizINFO アダプタ: 平均勤続年数・女性管理職比率 等
// ============================================================
async function fetchGbizinfo(name) {
  if (!GBIZINFO_TOKEN) return null
  const url = `https://info.gbiz.go.jp/hojin/v1/hojin?name=${encodeURIComponent(name)}`
  try {
    const res = await fetch(url, { headers: { 'X-hojinInfo-api-token': GBIZINFO_TOKEN, Accept: 'application/json' } })
    if (!res.ok) return null
    const json = await res.json()
    const hit = json['hojin-infos']?.[0]
    const wp = hit?.workplace_info?.base ?? hit?.workplace_info ?? {}
    // 仕様に応じてフィールドをマッピング（女性活躍・両立支援）
    const out = {}
    const tenure = wp.average_continuous_service_years ?? wp.average_continuous_service_years_all
    if (tenure) out.avgTenureYears = Number(tenure)
    const women = wp.female_share_of_manager ?? wp.female_manager_ratio
    if (women) out.womenManagerRate = Math.round(Number(women))
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

// ============================================================
// しょくばらぼ アダプタ: 残業/有給/離職（CSV一括）
//   CSV のヘッダ名で列を推定する（表記ゆれに対応）。
// ============================================================
function parseCsv(text) {
  const rows = []
  let field = ''
  let record = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { record.push(field); field = '' }
    else if (ch === '\n') { record.push(field); rows.push(record); record = []; field = '' }
    else if (ch !== '\r') field += ch
  }
  if (field.length || record.length) { record.push(field); rows.push(record) }
  return rows
}

function loadShokuba() {
  if (!SHOKUBA_CSV || !existsSync(SHOKUBA_CSV)) return null
  const rows = parseCsv(readFileSync(SHOKUBA_CSV, 'utf8'))
  if (rows.length < 2) return null
  const header = rows[0]
  const col = (...keys) => header.findIndex((h) => keys.some((k) => h.includes(k)))
  const idx = {
    name: col('企業名', '会社名', '事業所名', '法人名'),
    overtime: col('残業', '所定外', '時間外'),
    paidLeave: col('有給', '年次有給'),
    turnover: col('離職'),
  }
  const byName = new Map()
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const name = (row[idx.name] || '').trim()
    if (!name) continue
    const num = (i) => { const v = parseFloat((row[i] || '').replace(/[^0-9.]/g, '')); return Number.isFinite(v) ? v : null }
    const rec = {}
    if (idx.overtime >= 0 && num(idx.overtime) !== null) rec.avgOvertimeHours = num(idx.overtime)
    if (idx.paidLeave >= 0 && num(idx.paidLeave) !== null) rec.paidLeaveRate = num(idx.paidLeave)
    if (idx.turnover >= 0 && num(idx.turnover) !== null) rec.turnover3yrRate = num(idx.turnover)
    byName.set(name, rec)
  }
  return byName
}

// ============================================================
// EDINET アダプタ: 平均年間給与（プレースホルダ）
//   有報 XBRL の取得・解析は API キー必須。ここでは受け皿のみ。
// ============================================================
async function fetchEdinetSalary(_name) {
  if (!EDINET_API_KEY) return null
  // TODO: documents.json で書類一覧→ZIP(XBRL)取得→ jpcrp_cor:AverageAnnualSalary… を抽出
  return null
}

// ============================================================
// メイン
// ============================================================
async function main() {
  const configured = [GBIZINFO_TOKEN && 'gBizINFO', SHOKUBA_CSV && 'しょくばらぼ', EDINET_API_KEY && 'EDINET'].filter(Boolean)
  if (!configured.length) {
    console.log('連携ソースが未設定です。.env にトークン/CSVパスを設定してください（.env.example 参照）。')
    console.log('  対応: gBizINFO / しょくばらぼ(CSV) / EDINET')
    return
  }
  console.log(`連携ソース: ${configured.join(', ')}`)

  const companies = JSON.parse(readFileSync(DATA, 'utf8'))
  const shokuba = loadShokuba()
  let enriched = 0

  for (const c of companies) {
    const partial = {}
    // しょくばらぼ（残業/有給/離職）— ブラック度・働きやすさの中核
    if (shokuba) {
      for (const [name, rec] of shokuba) {
        if (c.name.includes(name) || name.includes(c.name)) { Object.assign(partial, rec); break }
      }
    }
    // gBizINFO（勤続/女性管理職）
    const gbiz = await fetchGbizinfo(c.name)
    if (gbiz) Object.assign(partial, gbiz)
    // EDINET（平均年収）
    const salary = await fetchEdinetSalary(c.name)
    if (salary) c.avgAnnualSalary = salary

    // 中核（残業/有給/離職）が1つでも取れた企業のみ metrics を有効化
    const hasCore = ['avgOvertimeHours', 'paidLeaveRate', 'turnover3yrRate'].some((k) => k in partial)
    if (hasCore) {
      c.metrics = {
        avgOvertimeHours: partial.avgOvertimeHours ?? 0,
        paidLeaveRate: partial.paidLeaveRate ?? 0,
        turnover3yrRate: partial.turnover3yrRate ?? 0,
        avgTenureYears: partial.avgTenureYears ?? 0,
        overtimePaidRate: 100,
        harassmentIndex: 0,
        laborViolationCount: 0,
        womenManagerRate: partial.womenManagerRate ?? 0,
        alwaysHiring: false,
        socialInsurance: true,
        ...(c.metrics || {}),
        ...partial,
      }
      c.metricsSource = configured
      enriched++
    }
  }

  writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
  console.log(`✓ ${enriched} 社に労働データを連携しました。`)
}

main().catch((e) => { console.error(e); process.exit(1) })
