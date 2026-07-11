// 就職判断レポートの購入意向の記録・集計（ブラウザ内のみ）。
// ───────────────────────────────────────────────────────────────
// ・企業名や閲覧履歴を外部へ自動送信しない（localStorage のみ）。
// ・同じ利用者（このブラウザ）・同じ企業構成の連打を、購入希望人数として重複計上しない。
// ・不正な localStorage でも例外を投げず、空の状態で復帰する。

export const STORAGE_KEY = 'zero.report.interest.v1'

export type ReportType = 'single' | 'comparison'
export type Intent = 'buy' | 'enough'

export interface IntentMeta {
  signature: string
  type: ReportType
  companyCount: number
  persona?: string
}

export interface IntentRecord extends IntentMeta {
  intent: Intent
  firstAt: string
  lastAt: string
}

export interface InterestStore {
  version: 1
  /** レポート案内の表示回数（案内到達数） */
  views: number
  /** 企業構成シグネチャごとの最新の反応（重複計上防止） */
  records: Record<string, IntentRecord>
}

function freshStore(): InterestStore {
  return { version: 1, views: 0, records: {} }
}

/** 破損した localStorage でも安全に読む。 */
export function loadStore(): InterestStore {
  try {
    if (typeof localStorage === 'undefined') return freshStore()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshStore()
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return freshStore()
    const p = parsed as Partial<InterestStore>
    const views = typeof p.views === 'number' && p.views >= 0 ? p.views : 0
    const records: Record<string, IntentRecord> = {}
    if (p.records && typeof p.records === 'object') {
      for (const [k, v] of Object.entries(p.records)) {
        if (!v || typeof v !== 'object') continue
        const r = v as Partial<IntentRecord>
        if ((r.intent === 'buy' || r.intent === 'enough') && typeof r.signature === 'string') {
          records[k] = {
            signature: r.signature,
            type: r.type === 'comparison' ? 'comparison' : 'single',
            companyCount: typeof r.companyCount === 'number' ? r.companyCount : 1,
            persona: typeof r.persona === 'string' ? r.persona : undefined,
            intent: r.intent,
            firstAt: typeof r.firstAt === 'string' ? r.firstAt : '',
            lastAt: typeof r.lastAt === 'string' ? r.lastAt : '',
          }
        }
      }
    }
    return { version: 1, views, records }
  } catch {
    return freshStore()
  }
}

function saveStore(store: InterestStore): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* 保存失敗は無視（プライベートモード等） */
  }
}

/** レポート案内が表示されたことを記録（表示回数＝案内到達数）。 */
export function recordGuideView(now = new Date().toISOString()): InterestStore {
  void now
  const store = loadStore()
  store.views += 1
  saveStore(store)
  return store
}

/**
 * 購入意向 / 無料で十分 を記録。同じ企業構成は1件として最新の反応で上書きし、
 * 重複計上しない。firstAt は初回、lastAt は毎回更新。
 */
export function recordIntent(meta: IntentMeta, intent: Intent, now = new Date().toISOString()): InterestStore {
  const store = loadStore()
  const prev = store.records[meta.signature]
  store.records[meta.signature] = {
    signature: meta.signature,
    type: meta.type,
    companyCount: meta.companyCount,
    persona: meta.persona,
    intent,
    firstAt: prev?.firstAt || now,
    lastAt: now,
  }
  saveStore(store)
  return store
}

export interface InterestAggregate {
  guideReach: number
  buyIntent: number
  enough: number
  responded: number
  /** 購入意向率 = 購入意向数 /（購入意向数 + 無料で十分数）。0件時は 0（NaNにしない）。 */
  interestRate: number
  single: { buy: number; enough: number }
  comparison: { buy: number; enough: number }
  lastAt: string | null
  firstAt: string | null
}

export function aggregate(store: InterestStore = loadStore()): InterestAggregate {
  const recs = Object.values(store.records)
  let buy = 0
  let enough = 0
  const single = { buy: 0, enough: 0 }
  const comparison = { buy: 0, enough: 0 }
  let lastAt: string | null = null
  let firstAt: string | null = null
  for (const r of recs) {
    const bucket = r.type === 'comparison' ? comparison : single
    if (r.intent === 'buy') {
      buy++
      bucket.buy++
    } else {
      enough++
      bucket.enough++
    }
    if (r.lastAt && (!lastAt || r.lastAt > lastAt)) lastAt = r.lastAt
    if (r.firstAt && (!firstAt || r.firstAt < firstAt)) firstAt = r.firstAt
  }
  const responded = buy + enough
  const interestRate = responded > 0 ? buy / responded : 0
  return {
    guideReach: store.views,
    buyIntent: buy,
    enough,
    responded,
    interestRate,
    single,
    comparison,
    lastAt,
    firstAt,
  }
}

/** 検証用の JSON 文字列（コピー用）。 */
export function exportJson(store: InterestStore = loadStore()): string {
  return JSON.stringify({ store, aggregate: aggregate(store) }, null, 2)
}

/** すべての記録を消す（UI 側で確認を取ってから呼ぶこと）。 */
export function resetInterest(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
