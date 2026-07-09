// しょくばらぼ（厚労省 職場情報総合サイト）全データの取得・集計（トークン不要）。
//
//   node scripts/enrich-shokuba.mjs
//   SHOKUBA_CSV=/path/to/shokuba_YYYYMMDD.csv node scripts/enrich-shokuba.mjs   # 既存CSVを使う
//
// 約3万社の公開オープンデータ（Shift-JIS）をストリーム解析し、
//  (1) 全国の実データ分析（業種別平均・残業分布など）を src/data/analytics.generated.json に生成
//  (2) 自社85社に法人番号で残業・有給・女性管理職・平均年齢を補完（laborReal）
// する。CSV は無認証の直リンクからダウンロードできる。

import { createReadStream, readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'src', 'data', 'companies.generated.json')
const OUT = join(ROOT, 'src', 'data', 'analytics.generated.json')
const URL = 'https://shokuba.mhlw.go.jp/shokuba/utilize/download010?lang=JA'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// 列インデックス（0始まり）。ヘッダ確認済み。
const COL = { corp: 0, name: 1, pref: 5, industry: 29, age: 178, overtime: 206, paidLeave: 239, women: 408 }

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
const n = (s) => { const m = String(s || '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null }
const inRange = (v, lo, hi) => v !== null && v >= lo && v <= hi

function resolveCsv() {
  if (process.env.SHOKUBA_CSV && existsSync(process.env.SHOKUBA_CSV)) return process.env.SHOKUBA_CSV
  console.log('しょくばらぼ全データをダウンロード中（無認証・約50MB）...')
  const dir = mkdtempSync(join(tmpdir(), 'shokuba-'))
  const zip = join(dir, 'shokuba.zip')
  execSync(`curl -sL -m 300 -A '${UA}' '${URL}' -o '${zip}'`, { stdio: 'ignore' })
  execSync(`unzip -o '${zip}' -d '${dir}'`, { stdio: 'ignore' })
  const csv = execSync(`ls '${dir}'/shokuba_*.csv`).toString().trim()
  return csv
}

async function main() {
  const csvPath = resolveCsv()
  const companies = JSON.parse(readFileSync(DATA, 'utf8'))
  const byCorp = new Map()
  for (const c of companies) if (c.corporateNumber) byCorp.set(String(c.corporateNumber).replace(/[^0-9]/g, ''), c)

  // 集計器
  const ind = new Map() // 業種 -> {count, ot:[sum,n], pl, wm, age}
  const pref = new Map()
  const otHist = new Array(8).fill(0) // 0-10,10-20,...,70+
  let total = 0
  const nat = { ot: [0, 0], pl: [0, 0], wm: [0, 0], age: [0, 0] }
  const add = (agg, key, val) => { if (val === null) return; agg[key][0] += val; agg[key][1]++ }
  const bump = (map, k, ot, pl, wm, age) => {
    if (!k) return
    if (!map.has(k)) map.set(k, { count: 0, ot: [0, 0], pl: [0, 0], wm: [0, 0], age: [0, 0] })
    const a = map.get(k)
    a.count++
    add(a, 'ot', ot); add(a, 'pl', pl); add(a, 'wm', wm); add(a, 'age', age)
  }

  const dec = new TextDecoder('shift_jis')
  const stream = createReadStream(csvPath)
  let header = null, matched = 0
  // 引用符状態を跨いでレコード境界を判定（自由記述欄の改行に対応）
  let rec = '', inQ = false

  const handleRecord = (recStr) => {
        const cols = parseLine(recStr)
        if (!header) { header = cols; return }
        const ot = n(cols[COL.overtime]); const otV = inRange(ot, 0, 200) ? ot : null
        const pl = n(cols[COL.paidLeave]); const plV = inRange(pl, 0, 100) ? pl : null
        const wm = n(cols[COL.women]); const wmV = inRange(wm, 0, 100) ? wm : null
        const age = n(cols[COL.age]); const ageV = inRange(age, 15, 70) ? age : null
        const industry = (cols[COL.industry] || '').trim()
        const prefName = (cols[COL.pref] || '').trim()

        total++
        add(nat, 'ot', otV); add(nat, 'pl', plV); add(nat, 'wm', wmV); add(nat, 'age', ageV)
        bump(ind, industry, otV, plV, wmV, ageV)
        bump(pref, prefName, otV, plV, wmV, ageV)
        if (otV !== null) otHist[Math.min(7, Math.floor(otV / 10))]++

        // 自社への補完
        const corp = (cols[COL.corp] || '').replace(/[^0-9]/g, '')
        const c = byCorp.get(corp)
        if (c) {
          const lr = c.laborReal || { source: '厚労省 女性活躍・両立支援DB / しょくばらぼ', asOf: header && '' }
          if (lr.avgOvertimeHours == null && otV !== null && otV > 0) lr.avgOvertimeHours = otV
          if (lr.paidLeaveRate == null && plV !== null && plV > 0) lr.paidLeaveRate = plV
          if (lr.womenManagerRate == null && wmV !== null) lr.womenManagerRate = wmV
          if (lr.avgAge == null && ageV !== null) lr.avgAge = ageV
          if (!lr.industryJsic && industry) lr.industryJsic = industry
          if (!c.laborReal) { lr.source = 'しょくばらぼ（厚労省）'; c.laborReal = lr }
          matched++
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

  const mean = (t) => (t[1] ? Math.round((t[0] / t[1]) * 10) / 10 : null)
  const toRows = (map, minCount) =>
    [...map.entries()]
      .filter(([k, a]) => k && a.count >= minCount)
      .map(([k, a]) => ({ key: k, count: a.count, avgOvertime: mean(a.ot), avgPaidLeave: mean(a.pl), avgWomenManager: mean(a.wm), avgAge: mean(a.age) }))
      .sort((x, y) => y.count - x.count)

  const analytics = {
    source: 'しょくばらぼ（厚労省 職場情報総合サイト）公開オープンデータ',
    total,
    national: { avgOvertime: mean(nat.ot), avgPaidLeave: mean(nat.pl), avgWomenManager: mean(nat.wm), avgAge: mean(nat.age),
      counts: { overtime: nat.ot[1], paidLeave: nat.pl[1], women: nat.wm[1], age: nat.age[1] } },
    byIndustry: toRows(ind, 50),
    byPrefecture: toRows(pref, 50),
    overtimeHistogram: otHist.map((c, i) => ({ bucket: i < 7 ? `${i * 10}-${i * 10 + 10}h` : '70h+', count: c })),
  }
  writeFileSync(OUT, JSON.stringify(analytics, null, 2), 'utf8')
  writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
  console.log(`✓ 全国 ${total.toLocaleString()} 社を集計 → ${OUT}`)
  console.log(`  業種 ${analytics.byIndustry.length} 区分・都道府県 ${analytics.byPrefecture.length}`)
  console.log(`  自社データ補完: ${matched} 件マッチ`)
}

main().catch((e) => { console.error(e); process.exit(1) })
