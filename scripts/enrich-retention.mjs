// しょくばらぼ（厚労省 職場情報総合サイト）から「平均勤続年数」「新卒3年以内離職率」を
// 実データで補完する（トークン不要・推測値なし）。
//
//   node scripts/enrich-retention.mjs
//   SHOKUBA_CSV=/path/to/shokuba_YYYYMMDD.csv node scripts/enrich-retention.mjs  # 既存CSVを使う
//
// 既存の残業・有給・女性管理職には手を触れず、勤続年数・離職率の2項目だけを
// 法人番号でマッチして laborReal に追加する。列は「位置」ではなく「列名」で照合するため、
// CSV 改訂で列がずれても壊れない。
//
// 注意：これらの項目は若者雇用促進法などの届出企業（主に新卒採用のある企業）のみが
// 公表しており、公開データ上は全体の数%に限られる。取得できた会社にのみ付与する。

import { createReadStream, readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'src', 'data', 'companies.generated.json')
const URL = 'https://shokuba.mhlw.go.jp/shokuba/utilize/download010?lang=JA'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// 必要な列の「列名」。位置ではなく名前で引くことで、CSV改訂の列ズレに強くする。
const H = {
  corp: '法人番号',
  tenure: '正社員の平均継続勤務年数',
  hires: '新卒者の採用・定着状況(前年度/2年度前/3年度前)-男女計',
  leaves: '新卒者の採用・定着状況(前年度/2年度前/3年度前)-離職者数',
}

function parseLine(line) {
  const out = []
  let f = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) { if (c === '"' && line[i + 1] === '"') { f += '"'; i++ } else if (c === '"') q = false; else f += c }
    else if (c === '"') q = true
    else if (c === ',') { out.push(f); f = '' }
    else f += c
  }
  out.push(f)
  return out
}
const num = (s) => { const m = String(s || '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null }
// '1人/1人/3人'（前年度/2年度前/3年度前）→ 合計。全て空なら null。
const sum3 = (s) => {
  if (!s || !String(s).trim()) return null
  const parts = String(s).split('/').map((x) => num(x))
  if (parts.every((p) => p === null)) return null
  return parts.reduce((a, b) => a + (b || 0), 0)
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function resolveCsv() {
  if (process.env.SHOKUBA_CSV && existsSync(process.env.SHOKUBA_CSV)) return process.env.SHOKUBA_CSV
  console.log('しょくばらぼ全データをダウンロード中（無認証・約50MB）...')
  const dir = mkdtempSync(join(tmpdir(), 'shokuba-'))
  const zip = join(dir, 'shokuba.zip')
  execSync(`curl -sL -m 300 -A '${UA}' '${URL}' -o '${zip}'`, { stdio: 'ignore' })
  execSync(`unzip -o '${zip}' -d '${dir}'`, { stdio: 'ignore' })
  return execSync(`ls '${dir}'/shokuba_*.csv`).toString().trim()
}

async function main() {
  const csvPath = resolveCsv()
  const companies = JSON.parse(readFileSync(DATA, 'utf8'))
  const byCorp = new Map()
  for (const c of companies) if (c.corporateNumber) byCorp.set(String(c.corporateNumber).replace(/[^0-9]/g, ''), c)

  const dec = new TextDecoder('shift_jis')
  const stream = createReadStream(csvPath)
  let rec = '', inQ = false
  let header = null
  let idx = null // 列名 → 位置
  let matched = 0, addedTenure = 0, addedTurnover = 0

  const handleRecord = (recStr) => {
    const cols = parseLine(recStr)
    if (!header) {
      header = cols
      idx = {}
      for (const [k, name] of Object.entries(H)) {
        const i = header.indexOf(name)
        if (i < 0) throw new Error(`列が見つかりません: ${name}`)
        idx[k] = i
      }
      return
    }
    const corp = (cols[idx.corp] || '').replace(/[^0-9]/g, '')
    const c = byCorp.get(corp)
    if (!c) return
    matched++
    const lr = c.laborReal || { source: 'しょくばらぼ（厚労省）' }
    let added = false

    // 平均勤続年数（正社員の平均継続勤務年数）
    const tenure = num(cols[idx.tenure])
    if (lr.avgTenureYears == null && tenure !== null && tenure > 0) {
      lr.avgTenureYears = Math.round(tenure * 10) / 10
      addedTenure++
      added = true
    }

    // 新卒3年以内離職率 = 直近3年の離職者合計 / 採用者合計 ×100（採用実績がある企業のみ）
    const hires = sum3(cols[idx.hires])
    const leaves = sum3(cols[idx.leaves])
    if (lr.turnover3yrRate == null && hires !== null && hires > 0 && leaves !== null) {
      lr.turnover3yrRate = Math.round(clamp((leaves / hires) * 100, 0, 100) * 10) / 10
      addedTurnover++
      added = true
    }

    // 実際に項目を足した会社だけを更新（差分を最小化し、鮮度表記の誤りを防ぐ）。
    if (added) {
      if (!c.laborReal) c.laborReal = lr
      // 追加した2項目の取得日を記録（既存項目の asOf は変えない）。
      c.laborReal.retentionAsOf = '2026-07-11'
    }
  }

  await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      const text = dec.decode(chunk, { stream: true })
      for (const ch of text) {
        if (ch === '\r') continue
        if (ch === '\n' && !inQ) { handleRecord(rec); rec = ''; continue }
        if (ch === '"') inQ = !inQ
        rec += ch
      }
    })
    stream.on('end', () => { if (rec.trim()) handleRecord(rec); resolve() })
    stream.on('error', reject)
  })

  writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
  console.log(`✓ 法人番号マッチ: ${matched} 件`)
  console.log(`  平均勤続年数を追加: ${addedTenure} 社`)
  console.log(`  3年以内離職率を追加: ${addedTurnover} 社`)
}

main().catch((e) => { console.error(e); process.exit(1) })
