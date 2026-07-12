# Company Analysis — Release Audit (Lane A)

Effective date: 2026-07-12
Authoritative brief: `docs/FUTURE_STYLE_LEGAL_REBUILD_EXECUTION.md`
Companion: `docs/LEGAL_CLAIMS_MATRIX.md`

This audit covers the three v1 primary surfaces and the supporting legal/methodology pages. It records the required in-context disclosures, the state of each control, and the release blockers Lane B must clear.

## 1. Product-position compliance

The service must present as **job-seeker decision support over public data**, not a definitive employer-rating service.

| Control | State | Action |
|---|---|---|
| Home first-view states purpose + data source + update date | ✅ present (`.subhead` / `.datasrc`) | keep; ensure "断定しない" framing |
| "評価プラットフォーム" tagline | ⚠ borderline | acceptable with "公開データにもとづく参考" nearby |
| Any "格付け/認定" language | ✅ none found | must not add |

## 2. Terminology audit (see matrix §D for the full guard list)

Already applied in earlier work: `ブラック企業/度` → `労働環境リスク` across list/detail/compare/methodology; index.html meta.

Still required for v1 release:

- `安全度` (card grade) → `労働環境`, missing → `未連携` (matrix A4).
- `マッチ度` → `重視条件との一致度` (A5).
- `急成長期` stage wording → `成長シグナル：強（若い企業）` (A6).
- `隠れ優良企業` → `注目企業候補` + heuristic note (A9).
- `将来性が高い順 / 〜のみ` → `成長シグナルが強い…（独自指標）` (A2, A3).
- `ホワイト度` → `労働環境スコア（独自指標）`; `ブラック危険`→`要確認（リスク指標高）` legacy already softened, verify (B6, B7).

## 3. Fact / derived / interpretation / unpublished

| Surface | Required | State |
|---|---|---|
| List card | fact/interpretation legend visible; coverage chip on real data | ⚠ to implement (coverage chip + legend) |
| Detail | four-way key once per view; missing-info block | ⚠ key present partially (report card); add detail-level key + missing block |
| Report card | 事実/解釈/未公表 tags | ✅ present; extend to include 算出値 where a value is a ratio |
| Dashboard | averages labeled with denominator + 独自指標 tag on score chart | ⚠ denominators present; add 独自指標 tag + single denominator note |

## 4. Source, time, coverage

| Control | State | Action |
|---|---|---|
| Source name on card/detail/dashboard | ✅ present | keep |
| Update date on detail/dashboard | ✅ present (`asOf` / データ更新) | keep |
| Coverage/completeness indicator | ⚠ partial (workability confidence) | surface `データ充足度` on list cards + detail header |
| Missing indicators | ⚠ | explicit `未公表/未連携` where absent (not blank, not 0) |
| Old-data warning | ❌ absent | add threshold banner (matrix E OLD_DATA_WARNING); threshold: `asOf` older than ~18 months |
| Methodology link near decisions | ✅ present (`/methodology`) | keep; ensure reachable from detail |

## 5. Company identity and matching

| Control | State | Notes |
|---|---|---|
| Match uses reliable identifier | ✅ labor data joined by **法人番号（corporate number）** in `scripts/enrich-*.mjs` | good; Wikidata id is the entity key |
| Same-name collision prevention | ⚠ relies on corporate-number join for labor; Wikidata entities are distinct ids | acceptable for v1; document that workplace values are only shown when a corporate-number match exists |
| Correction/request channel from detail | ❌ absent | **release blocker** — add correction link (matrix B12) |
| Match source auditable | ⚠ internal (`laborReal.source`, `corporateNumber`) | expose source name in detail (already) |

## 6. Workplace risk controls

- Real companies **never** get an inferred labor-risk score from proxy variables — confirmed: `evaluate()` runs only when `metrics` exists (demo dataset). Real dataset uses only actually-published labor items via `laborReal`. ✅
- Missing data is not converted to a favorable or unfavorable value — verified in report model (`未公表`) and workability confidence. Extend the same rule to list-card `安全度`/`労働環境` grade: **if no source, show 未連携, not a low grade** (matrix A4). ⚠ to implement.
- Department/region/time-period caveat — add to detail labor section. ⚠ minor.

## 7. Rankings and highlighted candidates

- Regional/list rankings mix companies of different coverage → add coverage context and never call the top "objectively best". ⚠ soften copy (matrix A2/A3/A9).
- `注目企業候補`（旧 隠れ優良）heuristic uses size as a visibility proxy → must be labeled heuristic, must not imply real public awareness. ⚠ add note.

## 8. Suitability / fit

- Reframe as `重視条件との一致度`; show chosen axes + coverage; never predict success/happiness/income/retention. `describeFit` output already avoids outcome guarantees; copy changes in matrix A5/B3 + FIT_CAVEAT. ⚠ apply.

## 9. Investment boundary

- Finance data shown as reference only; no buy/sell, no return forecast, no valuation guarantee. Detail money tab already says "投資助言ではありません". ✅ keep; ensure the phrase remains on the finance tab.

## 10. Privacy and analytics

- `track()` is no-op unless `VITE_ANALYTICS_ENDPOINT` set; report interest is localStorage-only and labeled browser-local. ✅
- Requirement: report-validation summary must state metrics are **browser-local, not total market demand** (matrix / report). ✅ present (`運営者向け・ローカル`); keep.
- If an external endpoint is enabled later, document provider/fields/purpose/retention/opt-out in `/privacy`. (Not enabled in v1.)

## 11. Release blockers (Lane B must clear before acceptance)

1. **Correction/report-error link** reachable from every company detail. (matrix B12)
2. **`安全度`/`労働環境` card grade must show `未連携` when no source**, never a low grade from missing data. (A4)
3. **Prohibited definitive terms** removed from list/detail/dashboard (guard test). (matrix §D)
4. **Coverage indicator** on real-dataset list cards and detail header.
5. **Missing-info block** on detail.
6. **Old-data warning** when `asOf` exceeds threshold.
7. **Fit copy** → `重視条件との一致度` with FIT_CAVEAT.
8. **`注目企業候補`** rename + heuristic note.
9. Existing test baseline (111) not reduced; new legal/integrity tests pass; build + prerender succeed; 320–390px no overflow.

## 11b. Data-quality finding — missing-as-zero (RELEASE BLOCKER, separate defect PR)

Automated 100-company sample audit (documented sampling: 大/小規模・上場/非上場・全業種・高/低カバレッジ・類似名) results:

- 実データセットに労働リスク入力（`metrics`）を持つ実企業：**0**（推定リスクスコアなし ✅）
- `laborReal` あり × 法人番号なし（同定不可）：**0**（労働値は法人番号一致時のみ ✅）
- カバレッジ算出可能：全サンプル ✅

**Finding:** 全データで `paidLeaveRate === 0` または `avgTenureYears === 0` の企業が **約92社**。うち約90社は出典 `しょくばらぼ（厚労省）` だが、`scripts/add-shokuba-companies.mjs` の取り込みが有給列を `inRange(値,0,100)`（0を許容）で判定しているため、**未記入セルが 0 として保存**されている（`enrich-shokuba.mjs` は `>0` のみ採用しており不整合）。

- 影響：企業詳細・カードに「有給取得率 0%」を**事実として表示**してしまう（§5・§9違反）。働きやすさスコアも 0 を実値として使うため不当に低くなりうる。
- 規模：約1.1%（8,300社中92社）。
- 対応方針（ブリーフ §2 / §13 準拠）：**本デザインPRではデータ・パイプライン・スコアを変更しない**。検証済み欠陥として**別PR**で、`add-shokuba-companies.mjs` の有給/勤続の取り込みを `>0` に統一し、該当セルを `null`（未公表）へ是正して再生成する。是正までは公開リリースのブロッカーとする。

## 12. Non-blockers / accepted for v1

- Legacy internal identifiers (`blackScore`, `gems`, route/query keys) unchanged.
- Secondary routes (region pages, fixed pages) keep current design; terminology guard still applies to their copy already shipped.
- Scoring formulas and data pipelines unchanged (per brief §2, §13).

## 13. Recommendation on the JPY 500 validation

Safe to expose as **需要検証（決済なし）** provided: product name keeps a validation label, four-way distinction preserved, locked content makes no unsupported claim, and local-only interest is labeled browser-local. All currently satisfied in PR #12; keep during this release.
