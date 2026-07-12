# Company Analysis — Future-Style Design and Legal-Risk Rebuild

Effective date: 2026-07-12

This is the authoritative one-week execution brief for Codex and Claude Code. The goal is to preserve the existing public-data analysis asset while redesigning its main user experience with the Future Interface Studio design principles and materially reducing legal, reputational, and data-quality risk.

## 1. Product position

The product is not a definitive employer rating service and must not present itself as one.

The product is:

> A job-seeker decision-support service that organizes public company, financial, and workplace data; distinguishes verified facts from independent interpretation; exposes missing data and uncertainty; and helps users prepare better questions for official sources and interviews.

Primary user:

- Japanese job seekers comparing employers.
- Users who want evidence beyond recruiting copy.
- Users who need public-data context, industry comparison, and interview questions.

Primary value:

- Reduce the time needed to gather and compare public information.
- Make data gaps and source dates visible.
- Separate fact, interpretation, and unavailable information.
- Help users identify what must still be confirmed with the company.

## 2. Source branch and Git workflow

Start from the latest head of:

- Repository: `46j9njw9f5-ctrl/46j9njw9f5-ctrl.github.io`
- Existing demand-validation branch/PR: `feature/paid-report-validation-v1` / PR #12

Preferred implementation branch:

`release/company-analysis-legal-design-v1`

Do not direct-push to `main`. Do not merge or deploy without the user's explicit release authorization after the final acceptance report.

Do not rewrite the underlying public-data pipelines or scoring formulas in the first redesign pass unless a verified defect is found and isolated in a separate PR.

## 3. Parallel lanes

Parallel work is approved only with non-overlapping ownership.

### Lane A — Claude Code: legal-language, claims, and methodology audit

Primary outputs:

- `docs/LEGAL_CLAIMS_MATRIX.md`
- `docs/COMPANY_ANALYSIS_RELEASE_AUDIT.md`

Responsibilities:

1. Inventory all user-visible labels and claims related to company quality, future performance, workplace safety, suitability, salary, financial attractiveness, rankings, and recommendations.
2. Classify each as:
   - verified fact,
   - derived calculation,
   - independent interpretation,
   - hypothesis,
   - unavailable/unpublished,
   - prohibited or too risky for release.
3. Produce exact replacement Japanese copy.
4. Audit methodology, privacy, contact, correction-request, data-source, update-date, and disclaimer pages.
5. Specify required in-context disclosures for list cards, detail views, comparison, rankings, regional pages, and the JPY 500 report validation.
6. Review the final implementation and identify release blockers.

Lane A must not initially edit the main React/CSS files assigned to Lane B. It hands off exact copy and rules through the claims matrix.

### Lane B — Codex: design-system extraction and UI implementation

Responsibilities:

1. Translate the Future Interface Studio design principles into a distinct company-analysis design system.
2. Implement the main user flows and disclosures.
3. Preserve data loading, route-level code splitting, existing tests, public-data source behavior, and prerendering.
4. Add or update tests for legal/integrity UI rules.
5. Produce mobile and desktop screenshots and a release PR.

Lane B must not add new scoring dimensions, AI-generated company analysis, accounts, payment processing, PDF generation, user profiles, job applications, or a new backend.

### Integration order

1. Lane A commits the claims matrix and exact replacement copy.
2. Lane B implements the design and disclosure system.
3. Lane A performs a final claims/legal-risk audit.
4. Lane B fixes release blockers only.
5. Final validation report is produced.

## 4. Mandatory terminology changes

Avoid definitive or inflammatory terms where public data cannot support a legal/factual conclusion.

Preferred replacements:

| Avoid or restrict | Preferred user-facing concept |
| --- | --- |
| ブラック企業 / ブラック度 | 公開データ上の労働環境リスク / 確認が必要な労働指標 |
| 安全な企業 / 安全度 | 公開データ上の労働環境確認度 |
| 隠れ優良企業 | 注目企業候補 / 条件に合う可能性がある企業 |
| 将来性が高い | 公開データ上の成長シグナルが強い |
| この人に向いている | 重視条件との一致が見られる / 相性を考える際の参考 |
| おすすめ企業 | 比較候補 / 確認候補 |
| 必ず伸びる / 安定 | 将来を保証しない公開データ上の傾向 |

A legacy internal variable or route name may remain temporarily if changing it creates unnecessary regression risk, but user-visible copy and metadata must follow the safer terminology.

## 5. Legal, reputational, and integrity controls

### Fact versus interpretation

Every major company detail or report output must distinguish:

- **事実**: value directly obtained from a named source.
- **算出値**: value mechanically calculated from displayed source data.
- **独自解釈**: score, grade, percentile interpretation, or fit conclusion created by this service.
- **未公表/未連携**: no reliable value available.

Do not style interpretations so that they appear more authoritative than underlying facts.

### Source, time, and coverage

Display, near the relevant decision surface:

- Source name.
- Data date or last-updated date.
- Data coverage/completeness.
- Missing indicators.
- Methodology link.

If data is materially old, display an old-data warning and reduce the prominence of derived conclusions.

### Company identity and matching

- Do not display company-specific workplace conclusions unless the data match is based on a reliable identifier such as corporate number.
- Prevent same-name company collisions.
- Log or expose the match source internally for audit.
- Provide a correction/request channel linked from company detail pages.

### Workplace risk

- Never infer real-company labor violations, unpaid overtime, harassment, illegal conduct, turnover, or labor-safety conclusions from unrelated proxy variables.
- Show risk/safety analysis only where the specific public or explicitly disclosed source exists.
- Missing data is not good performance and not bad performance.
- Department, job category, region, subsidiary, and time-period differences must be acknowledged where relevant.

### Rankings and highlighted candidates

- Do not rank companies together when data coverage is too different without a visible coverage control.
- Do not call the top result objectively best.
- Show why a company appeared and which axes were unavailable.
- If a highlighted-company rule uses company size as a visibility proxy, label it as a heuristic and do not imply actual public awareness.

### Suitability/fit

- Fit is a comparison against user-selected priorities, not psychological or career aptitude testing.
- Use language such as `重視条件との一致度`.
- Display the chosen axes and available coverage.
- Do not state that a person will succeed, be happy, earn more, or remain employed.

### Investment boundary

Company finance data may be shown as reference information, but the service must not present individualized investment recommendations, buy/sell instructions, return forecasts, or guaranteed valuation conclusions.

### Privacy and analytics

- Keep collection minimal.
- Disclose any analytics or external interest endpoint before sending data.
- Do not claim that browser-local demand metrics are cross-user business evidence.
- If external analytics are enabled, document provider, event fields, purpose, retention, and opt-out handling.

Official references for the audit:

- Consumer Affairs Agency, misleading superiority representation: `https://www.caa.go.jp/policies/policy/representation/fair_labeling/representation_regulation/misleading_representation/`
- Personal Information Protection Commission guidelines: `https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/`
- Consumer Affairs Agency, mail-order rules if paid online sale is later enabled: `https://www.no-trouble.caa.go.jp/what/mailorder/`

This is a product-control brief, not professional legal advice.

## 6. Future Interface Studio design transfer

Use the design principles, not a literal skin copy.

### Transfer

- Strong hierarchy and clear next actions.
- Dark/light system with high contrast and disciplined tokens.
- Consistent spacing, radius, type scale, and status components.
- Cards/panels with visible information boundaries.
- Explicit state, source, loading, error, and recovery behavior.
- Mobile-first layout.
- Keyboard and focus support.
- Reduced-motion support.
- Purposeful motion only where state change benefits comprehension.

### Do not transfer

- Fictional signal scores.
- Portfolio-style decorative metrics.
- Excessive glow or cinematic animation.
- Generic AI imagery.
- Fake live status or presence.
- English-first copy that reduces Japanese comprehension.
- Visual ranking drama that makes uncertain company scores look definitive.

### Desired visual character

`Future-facing evidence interface`: precise, calm, inspectable, data-rich, and credible. Trust and source traceability take priority over spectacle.

## 7. v1 release scope

Prioritize three surfaces:

1. **Company list/search**
   - Search and filters.
   - Clear dataset/source state.
   - Fact/interpretation badges.
   - Data coverage indicator.
   - No definitive best/worst language.

2. **Company detail**
   - Summary of verified facts.
   - Independent signals with visible derivation/methodology.
   - Industry/national benchmark where valid.
   - Data coverage and age.
   - Missing-information block.
   - Interview/official-source confirmation questions.
   - Correction request link.

3. **Data analysis/dashboard**
   - National/industry aggregates with sample-size and source date.
   - Honest axis labels and denominator explanations.
   - No unsupported causal conclusions.

Secondary routes may retain the existing design temporarily if they do not create a safety or navigation break. Do not expand the redesign into every route before the three primary surfaces pass acceptance.

## 8. JPY 500 report validation

Keep PR #12 as demand validation, not a paid product launch.

Required controls:

- Explicitly state that no payment occurs.
- Name the product `就職判断レポート（需要検証）` or another equally clear validation label.
- Show free preview versus hypothetical paid value.
- Preserve `事実 / 算出値 / 独自解釈 / 未公表` distinctions.
- Do not expose locked content that makes unsupported claims.
- Interest data stored only in localStorage must be labeled as browser-local and not represented as total market demand.
- An external endpoint may be added only if privacy disclosure and minimal-event design are completed.
- Do not add payment, PDF generation, membership, or account login in this one-week release.

## 9. Data-quality acceptance criteria

Release blockers:

- Real-company labor-risk values are not inferred without a supporting source.
- Missing values are never converted to zero or a favorable value.
- Company identity collisions are prevented or explicitly quarantined.
- Source/update-date/coverage are visible in company details.
- Derived scores expose methodology and available-input coverage.
- Rankings do not mix materially incomparable coverage without warning/control.
- Old data is flagged.
- Correction/contact path works.
- Representative companies are manually sampled across large/small, public/private, multiple industries, high/low coverage, and same/similar names.

Minimum human sample audit before release: 100 company pages or all available pages if fewer, using a documented sampling method. Automation may select the sample and prepare the checklist; a human records acceptance/rejection for high-risk mismatches.

## 10. Technical acceptance criteria

- Clean install succeeds.
- All existing tests pass; no reduction from the current baseline.
- New legal/integrity tests pass.
- TypeScript/build/prerender succeeds.
- Every primary route works at 320px and 390px with no horizontal overflow.
- Long company names do not break layout.
- Keyboard and focus behavior works for search, filters, details, comparison, tabs, and dialogs.
- Meaning is not conveyed by color alone.
- Reduced-motion mode remains usable.
- Loading, data failure, empty results, missing data, and old-data states have clear recovery or explanation.
- No console error or uncaught page error.
- Privacy/methodology/contact/correction routes are reachable.
- Internal and external links are validated.

Required screenshots:

- Company list at desktop and 390px.
- Company detail with high coverage at desktop and 390px.
- Company detail with low coverage/missing data at 390px.
- Data dashboard at desktop and 390px.
- Report-validation card at 390px.
- Methodology/correction disclosure at 390px.

## 11. Required tests

Add focused tests for:

- Prohibited definitive terms do not appear in released user-facing surfaces except clearly quoted/explained legacy terminology.
- Fact/derived/interpretation/unpublished labels render correctly.
- Missing workplace data does not produce a real-company labor-risk score.
- Coverage reduction behaves as specified.
- Old-data warning appears at the chosen threshold.
- Correction/contact link exists in detail pages.
- Report validation states no payment occurs.
- Local-only interest metrics are labeled local-only.
- Long names and 320–390px layouts do not overflow.
- Existing 111-test baseline or the actual latest baseline is not reduced.

## 12. Final report format

The PR/final report must include:

1. Product-positioning changes.
2. All user-visible terminology changes.
3. Claims removed, weakened, or reclassified.
4. Design-system changes.
5. Data-quality checks and 100-company sample results.
6. Changed files.
7. Test/type/build/prerender results.
8. Mobile/desktop screenshots.
9. Remaining legal, reputational, privacy, data, and accessibility risks.
10. Explicit statement: merge performed or not; deployment performed or not.
11. Recommendation on whether the JPY 500 validation is safe to expose publicly.

## 13. Stop conditions

Stop and report rather than expanding scope if:

- A requested conclusion requires guessing unavailable company or employee information.
- Reliable company identity matching cannot be established.
- The change would alter core scoring formulas or data pipelines without a separate defect analysis.
- Payment, accounts, personalized profiling, or external personal-data storage becomes necessary.
- A legal/claims statement would require inventing operator or data facts.
- Two agents need to edit the same shared file concurrently without handoff.
- Baseline tests or prerender fail for reasons outside the scoped work.

## 14. One-week definition of done

The release is complete when a user can:

1. Search and compare companies through the redesigned primary flows.
2. See which information is fact, calculation, interpretation, or unpublished.
3. See source, date, and coverage before relying on a conclusion.
4. Understand that the service supports but does not replace official information, interviews, or personal judgment.
5. Submit a correction/contact request.
6. Use the primary flows on a 390px phone without layout failure.
7. Express interest in the hypothetical JPY 500 report without payment or misleading collection claims.

Do not treat the number of companies, screens, scores, or features as completion. Completion is trustworthy decision support with observable demand signals.