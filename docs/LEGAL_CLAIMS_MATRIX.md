# Legal Claims Matrix — Company Analysis v1

Effective date: 2026-07-12
Authoritative source: `docs/FUTURE_STYLE_LEGAL_REBUILD_EXECUTION.md` (§4, §5, §7)
Scope of this matrix: the three v1 primary surfaces — **company list/search**, **company detail**, **data analysis/dashboard** — plus shared badge components used by them.

This matrix is the hand-off from Lane A (claims audit) to Lane B (implementation). Lane B must use the exact replacement copy and disclosure rules below and must **not** change scoring formulas or data pipelines.

## Classification legend

- **事実 (fact)** — value directly obtained from a named public source.
- **算出値 (derived)** — value mechanically calculated from displayed source data (e.g. a ratio).
- **独自解釈 (interpretation)** — score / grade / percentile / fit conclusion created by this service.
- **未公表/未連携 (unpublished)** — no reliable value available.
- **要改善/禁止 (restrict/prohibit)** — definitive or inflammatory wording not supported by public data; must be replaced.

Rule: interpretations must never be styled to look more authoritative than the facts beneath them. Every 独自解釈 needs a visible "独自指標・将来や実態を保証しない" cue and a methodology link.

---

## A. Company list / search (`HomePage.tsx`, `CompanyCard.tsx`, `Bits.tsx`)

| # | Current user-visible copy | Where | Classification | Replacement copy | Required disclosure |
|---|---|---|---|---|---|
| A1 | `将来性` (grade axis label) | card grade badge, sort | 独自解釈 | keep label `将来性` **but** always tag `独自指標` | Card legend: "将来性・生産性・労働環境は当サイトの独自スコア（将来を保証しません）" |
| A2 | `将来性が高い順` (sort) | controls | 要改善 | `成長シグナルが強い順（独自指標）` | sort options grouped under "並び替え（独自指標）" |
| A3 | `🚀 将来性の高い企業のみ（60点以上）` (filter chip) | filter row | 要改善 | `成長シグナルが強い（独自指標60点以上）` | tooltip: "独自スコア。将来の成長を保証しません" |
| A4 | `安全度` (grade axis label) | card grade badge | 要改善 | `労働環境`（バッジ）／概念名 `公開データ上の労働環境確認度` | badge tag `独自指標`; missing data shows `未連携`, not a low grade |
| A5 | `マッチ度 {n}%` | card pill | 要改善 | `重視条件との一致度 {n}%` | shows only when priorities chosen; note "選んだ重視条件との一致度であり、適性検査ではありません" |
| A6 | `急成長期` / `成長期` / `成熟・安定`（GrowthBadge stage） | card, detail | 要改善 | `成長シグナル：強（若い企業）` / `成長シグナル：中` / `成熟・安定（成長シグナル控えめ）` | tag `独自指標`; never imply guaranteed growth |
| A7 | `⚠ 危険信号 {n}件` | card tagline (demo only) | 要改善 | `確認したい労働指標 {n}件`（デモのみ） | only on demo dataset; label "デモデータ" nearby |
| A8 | `🚀 将来性の高い企業のみ` marketing 🚀 | filter | 独自解釈 | keep emoji, copy per A3 | — |
| A9 | `💎 隠れ優良企業のみ（{n}）` | filter chip | 禁止 | `⭐ 注目企業候補のみ（{n}）` | heuristic note: "規模を露出度の代理に使う目安。実際の知名度・優良性を保証しません" |
| A10 | `お気に入りのみ` / `将来性の高い企業のみ` etc. | filters | 事実(状態) | keep | — |
| A11 | grade letters `S / A / B / C / D` | GradeBadge | 独自解釈 | keep letters | letters are 独自指標; must not use color as the only signal — keep letter + label |
| A12 | `月残業 / 3年離職率 / 有給消化`（card stats, demo metrics） | card | 事実 | keep values; if missing show `未公表`（never 0 as good/bad） | source label already present |
| A13 | `出典: {source}` | card footer | 事実 | keep; add **データ充足度** chip on real dataset | show coverage n/5 for workability items |
| A14 | dataset description "…ブラック度は離職率・残業代等の追加連携で有効化" | dataset-desc | 要改善 | replace `ブラック度` → `労働環境リスクの指標` | — |
| A15 | header sub "…将来性とブラック企業リスクを可視化"（already changed to 労働環境リスク） | header | ✅ 済 | (labor-env risk already applied) | keep |

New required list additions:

- **Data-coverage indicator** on each real-dataset card: `データ充足度 高/中/低（n/5項目）` (derived from existing workability confidence — no new score).
- **Card legend / dataset state**: fact vs interpretation one-liner visible above the grid.
- **No definitive best/worst**: the list must not label the top-sorted company as "最良/一番" anywhere.

---

## B. Company detail (`CompanyDetail.tsx`, `Bits.tsx`, report card)

| # | Current copy | Classification | Replacement copy | Required disclosure |
|---|---|---|---|---|
| B1 | `◎ 強み` | 独自解釈 | `◎ 強み（スコア分析にもとづく解釈）` | already tagged in report; apply to detail overview too |
| B2 | `△ 気になる点` | 独自解釈 | `△ 確認したい点（解釈）` | — |
| B3 | `🧭 こんな人に向いている` | 要改善 | `🧭 重視条件との一致が見られる点（参考）` | keep existing fit-note; add "適性・内定可能性の予測ではありません" |
| B4 | `データ充足度：高/中/低（n/5項目）` | 算出値 | keep | already present; extend to 事実/算出値/独自解釈/未公表 four-way key |
| B5 | `労働環境リスクスコアの根拠`（risk tab, demo） | 独自解釈 | `労働環境リスクスコアの根拠（独自指標・デモ）` | demo-only; note real companies show no risk score without source |
| B6 | `ホワイト度 {n} / 100`（risk tab） | 要改善 | `労働環境スコア（独自指標） {n} / 100` | — |
| B7 | `優良（ホワイト）/ 標準 / 要注意 / 労働環境リスク：高`（riskLevel labels） | 要改善 | `公開データ上：良好 / 標準 / 要確認 / 要確認（リスク指標高）` | never "ブラック"; demo dataset only |
| B8 | `リスク度`（Donut caption） | 独自解釈 | keep `リスク度（独自指標）` | — |
| B9 | Notice: "労働環境リスク（離職率・残業代・法令違反など）は追加の公的データ連携で有効化" | ✅ ほぼ可 | keep | clarifies missing≠bad |
| B10 | Missing labor items | 未公表 | show explicit "未公表/未連携" block | **required missing-info block** |
| B11 | Sources / update date `出典 / データ更新` | 事実 | keep; add **coverage** + **old-data warning** | if `asOf` older than threshold, show old-data banner |
| B12 | (none) correction link | — | **add** `情報の誤りを報告する` → contact/correction | **release blocker if absent** |
| B13 | (none) interview questions | — | already in report; **surface a short list in detail** free area | mark 解釈 |
| B14 | `平均年収 {n} 万円`（risk tab, only if present） | 事実 | keep only when actually present; never fabricate | — |

Fact/interpretation four-way key must appear once per detail view.

---

## C. Data analysis / dashboard (`Dashboard.tsx`, `charts.tsx`)

| # | Current copy | Classification | Replacement copy | Required disclosure |
|---|---|---|---|---|
| C1 | `📊 全国の労働実態（実データ）` | 事実(集計) | keep | already shows `出典: しょくばらぼ … 集計対象 {N}社` |
| C2 | KPI tiles `平均残業時間/月`, `有給取得率`, `女性管理職比率`, `従業員の平均年齢` + `{n}社が公表` | 算出値(平均) | keep + denominator | each tile keeps "n社が公表" (denominator) — already present |
| C3 | `業種別 平均残業時間（長い順・上位12）` `n={count}` | 算出値 | keep | sample size per bar already present |
| C4 | `残業時間の分布（公表企業）` | 事実(分布) | keep | denominator label "公表企業のみ" already present |
| C5 | `🏢 {dataset} の分析（{n}社）` `業種別 平均将来性スコア` | 独自解釈 | `業種別 平均将来性スコア（独自指標）` | tag 独自指標; no causal claim |
| C6 | (implicit) any "業種Xは危険/優良" causal phrasing | 禁止 | none present — must not be added | — |
| C7 | (none) axis/denominator explanation | — | **add** one honest note: "平均は公表企業のみの単純平均。母数が小さい業種はぶれます" | — |

Dashboard must not present any unsupported causal conclusion (e.g. "残業が多い業種は離職が多い").

---

## D. Prohibited-term guard (for automated test)

User-facing released surfaces (list/detail/dashboard) must **not** contain, except as clearly quoted/explained legacy terminology:

- `ブラック企業`, `ブラック度`
- `安全な企業`（as a definitive claim）
- `おすすめ企業`, `一番良い`, `最良`, `ベスト企業`
- `必ず伸びる`, `将来性は確実`, `安定です`（断定）
- `隠れ優良企業`（→ 注目企業候補）

Legacy internal identifiers (`blackScore`, `whiteScore`, route/query keys, `gems`) may remain; only user-visible copy and metadata are governed.

---

## E. Shared disclosure strings (single source of truth for Lane B)

- FOUR_WAY_KEY: `事実＝出典から直接取得 ／ 算出値＝出典データからの計算 ／ 独自解釈＝当サイトの評価 ／ 未公表＝公開データなし`
- SCORE_CAVEAT: `将来性・生産性・労働環境の各スコアは公開データにもとづく当サイトの独自指標で、将来や実態を保証しません。`
- FIT_CAVEAT: `「一致度」は選んだ重視条件との比較であり、適性検査・内定可能性の予測ではありません。`
- COVERAGE_LABEL: `データ充足度`
- OLD_DATA_WARNING: `このデータは {asOf} 時点で、更新から時間が経っています。最新の状況は公式情報でご確認ください。`
- CORRECTION_CTA: `情報の誤りを報告する`
- MISSING_BLOCK_TITLE: `未公表・未連携の項目`
