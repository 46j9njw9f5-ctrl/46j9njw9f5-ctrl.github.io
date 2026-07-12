// しょくばらぼ（厚労省 職場情報総合サイト）から、働きやすさ＋基本データを持つ
// 実在企業を大量に追加する。実データのみ（推測値なし）。ブラック度(metrics)は付けない。
//
//   node scripts/add-shokuba-companies.mjs
//   SHOKUBA_CSV=/path/to/shokuba.csv CAP=8000 node scripts/add-shokuba-companies.mjs
//
// 併せて、全企業（Wikidata由来・しょくばらぼ由来）の業種を統一カテゴリへ正規化する。
// 再実行可能: 既存の sk-* 企業を一旦除去してから CAP 件を再追加する。

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
const CAP = Number(process.env.CAP || 8000)

const COL = {
  corp: 0, name: 1, pref: 5, size: 27, industry: 29, web: 31, founded: 35, sec: 36,
  tenure: 156, age: 178, overtime: 206, paidLeave: 239, women: 408,
}

const ACCENTS = ['#7c6cb2', '#4f9d94', '#4f9679', '#ab7d2c', '#5688ac', '#a9769a', '#6b8fb0', '#8a7bb8']

// 統一業種カテゴリ（キーワード一致で判定。Wikidata・JSIC 双方の表記に対応）。
// 上から順に評価するので、より具体的なものを先に置く。
const CANON = [
  [/半導体|エレクトロ|電機|電子|精密|光学|electronics|optics/i, '電機・精密・半導体'],
  [/\bit\b|ｉｔ|ソフトウェア|ソフトウエア|インターネット|情報通信|通信|テクノロジ|software|internet/i, 'IT・通信'],
  [/自動車|輸送機器|機械|重工|造船|産業機械|automobile|machinery/i, '自動車・機械'],
  [/医薬|製薬|医療|ヘルスケア|介護|福祉|バイオ|生物工学|病院|pharma|health|biotech/i, '医薬・医療・介護'],
  [/化学|素材|鉄鋼|金属|化粧品|日用品|繊維|アパレル|ゴム|窯業|セメント|chemical|material|steel/i, '化学・素材・金属'],
  [/食品|飲料|食物|酒|醸造|水産加工|food|beverage/i, '食品・飲料'],
  [/金融|銀行|保険|証券|信販|リース|投資|finance|bank|insurance/i, '金融・保険'],
  [/建設|不動産|土木|住宅|建築|construction|real ?estate/i, '建設・不動産'],
  [/物流|運輸|運送|海運|水運|航空|鉄道|倉庫|郵便|logistics|transport|shipping/i, '運輸・物流'],
  [/電気|電力|ガス|石油|エネルギー|水道|再生可能|熱供給|energy|utility/i, 'エネルギー・インフラ'],
  [/メディア|出版|広告|マーケ|ゲーム|エンタメ|エンターテ|アニメ|映画|放送|音楽|フォノグラフィック|プロレス|コンテンツ|media|game|entertainment/i, 'メディア・広告・エンタメ'],
  [/教育|学習|人材|スクール|塾|英語|学術研究|education|recruit/i, '教育・人材'],
  [/商社|貿易|trading/i, '商社・卸売'],
  [/小売|流通|ストア|スーパー|百貨店|コンビニ|卸売|retail|store/i, '小売・流通'],
  [/農業|林業|漁業|水産|agriculture|fishery/i, '農林・水産'],
  [/宿泊|飲食|外食|旅行|観光|娯楽|生活関連|冠婚|結婚|美容|清掃|警備|派遣|求人|非営利|複合サービス|専門・技術|サービス|service/i, '生活・サービス'],
  [/製造|工業|製作|製紙|印刷|家具|楽器|たばこ|タバコ|宇宙|鉱業|manufactur/i, '製造業'],
]

function stripCode(s) {
  return String(s || '').replace(/^[A-Za-z0-9]+[:：]/, '').replace(/（他に分類されないもの）/g, '').replace(/，/g, '・').trim()
}
function toCanon(label) {
  const t = stripCode(label)
  for (const [re, cat] of CANON) if (re.test(t)) return cat
  return 'その他'
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
const num = (s) => { const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null }
const inRange = (v, lo, hi) => v !== null && v >= lo && v <= hi

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
  let companies = JSON.parse(readFileSync(DATA, 'utf8'))

  // 再実行時は既存の sk-* を除去（CAP で総数を制御）
  companies = companies.filter((c) => !String(c.id).startsWith('sk-'))

  // 全企業の業種を統一カテゴリへ正規化（生ラベルは industryRaw に温存）
  for (const c of companies) {
    if (!c.industryRaw) c.industryRaw = [c.industry]
    c.industry = toCanon(c.industry)
  }

  const seenCorp = new Set()
  const seenName = new Set()
  for (const c of companies) {
    if (c.corporateNumber) seenCorp.add(String(c.corporateNumber).replace(/\D/g, ''))
    seenName.add(c.name)
  }

  const candidates = []
  const dec = new TextDecoder('shift_jis')
  const stream = createReadStream(csvPath)
  let header = null, rec = '', inQ = false

  const handle = (recStr) => {
    const cols = parseLine(recStr)
    if (!header) { header = cols; return }
    const corp = String(cols[COL.corp] || '').replace(/\D/g, '')
    const name = String(cols[COL.name] || '').trim()
    if (!corp || !name || seenCorp.has(corp) || seenName.has(name)) return
    const emp = num(cols[COL.size])
    if (!inRange(emp, 1, 5_000_000)) return
    const ot = inRange(num(cols[COL.overtime]), 0, 200) ? num(cols[COL.overtime]) : null
    // 有給取得率・平均勤続年数の「0」は未記入セルの誤取り込みが大半のため、未公表(null)として扱う
    // （enrich-shokuba.mjs と同じ >0 条件に統一。0 を欠損値としてそのまま保存しない）。
    const pl = inRange(num(cols[COL.paidLeave]), 0.01, 100) ? num(cols[COL.paidLeave]) : null
    const wm = inRange(num(cols[COL.women]), 0, 100) ? num(cols[COL.women]) : null
    if (ot === null && pl === null && wm === null) return
    const age = inRange(num(cols[COL.age]), 15, 70) ? num(cols[COL.age]) : null
    const tenure = inRange(num(cols[COL.tenure]), 0.01, 50) ? num(cols[COL.tenure]) : null
    const jsicRaw = String(cols[COL.industry] || '').trim()
    const foundedM = String(cols[COL.founded] || '').match(/(\d{4})/)
    candidates.push({
      corp, name, jsicRaw,
      industry: toCanon(cols[COL.industry]),
      pref: stripCode(cols[COL.pref]),
      emp: Math.round(emp),
      founded: foundedM ? Number(foundedM[1]) : null,
      listed: Boolean(String(cols[COL.sec] || '').replace(/\D/g, '')),
      web: String(cols[COL.web] || '').trim(),
      ot, pl, wm, age, tenure,
      fill: (ot !== null) + (pl !== null) + (wm !== null) + (age !== null),
    })
    seenCorp.add(corp)
    seenName.add(name)
  }

  await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      const text = dec.decode(chunk, { stream: true })
      for (const ch of text) {
        if (ch === '\r') continue
        if (ch === '\n' && !inQ) { handle(rec); rec = ''; continue }
        if (ch === '"') inQ = !inQ
        rec += ch
      }
    })
    stream.on('end', () => { if (rec.trim()) handle(rec); resolve() })
    stream.on('error', reject)
  })

  candidates.sort((a, b) => (b.fill - a.fill) || (b.emp - a.emp))
  const picked = candidates.slice(0, CAP)

  let idx = 0
  for (const x of picked) {
    const laborReal = { source: 'しょくばらぼ（厚労省）' }
    if (x.jsicRaw) laborReal.industryJsic = x.jsicRaw
    if (x.ot !== null) laborReal.avgOvertimeHours = x.ot
    if (x.pl !== null) laborReal.paidLeaveRate = x.pl
    if (x.wm !== null) laborReal.womenManagerRate = x.wm
    if (x.age !== null) laborReal.avgAge = x.age
    if (x.tenure !== null) laborReal.avgTenureYears = x.tenure
    companies.push({
      id: `sk-${x.corp}`,
      name: x.name,
      industry: x.industry,
      industryRaw: x.jsicRaw ? [stripCode(x.jsicRaw)] : undefined,
      location: x.pref || '—',
      employees: x.emp,
      founded: x.founded,
      listed: x.listed,
      ...(x.web ? { website: x.web } : {}),
      accent: ACCENTS[idx++ % ACCENTS.length],
      corporateNumber: x.corp,
      laborReal,
      source: {
        name: 'しょくばらぼ（厚労省 職場情報総合サイト）',
        license: '公開オープンデータ',
        url: 'https://shokuba.mhlw.go.jp/',
      },
    })
  }

  writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
  const cats = [...new Set(companies.map((c) => c.industry))]
  console.log(`✓ しょくばらぼから ${picked.length}社を追加（候補 ${candidates.length}社）`)
  console.log(`✓ 合計: ${companies.length}社 / 業種カテゴリ ${cats.length}種`)
  console.log(`  カテゴリ: ${cats.join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
