import type { GbizInfo } from '../types'
import { isNotableCertification } from '../data/gbiz'
import { formatYen } from '../ui'

// gBizINFO（経済産業省）由来の「事実」を表示する。すべて出典つき・推測なし。
// company.gbiz が無ければ何も出さない（未連携）。
export function GbizFacts({ gbiz }: { gbiz?: GbizInfo }) {
  if (!gbiz) return null
  const kv: { label: string; value: string }[] = []
  if (gbiz.capitalStock != null) kv.push({ label: '資本金', value: formatYen(gbiz.capitalStock) })
  if (gbiz.established) kv.push({ label: '設立', value: gbiz.established })
  if (gbiz.employees != null) {
    const mf =
      gbiz.womenEmployees != null || gbiz.menEmployees != null
        ? `（男${gbiz.menEmployees ?? '—'}・女${gbiz.womenEmployees ?? '—'}）`
        : ''
    kv.push({ label: '従業員数', value: `${gbiz.employees.toLocaleString()}名${mf}` })
  }
  if (gbiz.representative) kv.push({ label: '代表者', value: gbiz.representative })
  if (gbiz.subsidyCount) kv.push({ label: '補助金 採択', value: `${gbiz.subsidyCount}件` })
  if (gbiz.procurementCount) kv.push({ label: '官公需 実績', value: `${gbiz.procurementCount}件` })

  return (
    <section className="gbiz" aria-label="公的登録・認定（gBizINFO）">
      <div className="gbiz__head">
        🏛 公的登録・認定 <span className="rtag rtag--fact">事実</span>
      </div>

      {gbiz.certifications.length > 0 && (
        <div className="gbiz__certs">
          {gbiz.certifications.map((c, i) => (
            <span
              key={i}
              className={`gbiz__cert ${isNotableCertification(c.title) ? 'gbiz__cert--notable' : ''}`}
              title={[c.category, c.target, c.approvedOn].filter(Boolean).join(' / ')}
            >
              {isNotableCertification(c.title) ? '✔ ' : ''}
              {c.title}
            </span>
          ))}
        </div>
      )}

      {kv.length > 0 && (
        <ul className="gbiz__kv">
          {kv.map((x) => (
            <li key={x.label}>
              <span className="gbiz__kv-label">{x.label}</span>
              <span className="gbiz__kv-value">{x.value}</span>
            </li>
          ))}
        </ul>
      )}

      {gbiz.businessSummary && <p className="gbiz__summary">{gbiz.businessSummary}</p>}

      <div className="gbiz__src">
        出典：{gbiz.source}（法人番号で同定）{gbiz.asOf ? ` ／ ${gbiz.asOf} 時点` : ''}
      </div>
    </section>
  )
}
