// 欠損の0埋め是正（検証済みデータ欠陥）。
// ───────────────────────────────────────────────────────────────
// scripts/add-shokuba-companies.mjs が有給取得率・平均勤続年数の未記入セルを 0 として
// 保存していたため、companies.generated.json に有給0%・勤続0年が混入していた。
// 0 はこの2項目では実在しない公表値のため、未公表(削除)へ是正する。
// スコア計算式・データ取得処理は変更しない（既存生成物の値の是正のみ）。
//
//   node scripts/fix-missing-as-zero.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src', 'data', 'companies.generated.json')

const companies = JSON.parse(readFileSync(DATA, 'utf8'))
let plFixed = 0
let tenureFixed = 0

for (const c of companies) {
  const lr = c.laborReal
  if (!lr) continue
  // 有給取得率0% は未記入セルの誤取り込み → 未公表へ
  if (lr.paidLeaveRate === 0) {
    delete lr.paidLeaveRate
    plFixed++
  }
  // 平均勤続年数0年 は稼働企業では実在しない → 未公表へ
  if (lr.avgTenureYears === 0) {
    delete lr.avgTenureYears
    tenureFixed++
  }
}

writeFileSync(DATA, JSON.stringify(companies, null, 2), 'utf8')
console.log(`✓ 有給取得率0%を未公表へ是正: ${plFixed} 社`)
console.log(`✓ 平均勤続年数0年を未公表へ是正: ${tenureFixed} 社`)
