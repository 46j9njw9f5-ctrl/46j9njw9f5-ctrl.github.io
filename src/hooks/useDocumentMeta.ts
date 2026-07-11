import { useEffect } from 'react'

// ページごとの <title>・description・canonical・OGP・Twitter Card を設定する。
// 企業データに無い値を説明文に捏造しないこと（呼び出し側の責務）。

export const SITE_ORIGIN = 'https://46j9njw9f5-ctrl.github.io'
export const SITE_NAME = '-0（ゼロ）'

export interface MetaInput {
  title: string
  description: string
  /** 先頭スラッシュ付きのパス（例: '/company/Q53268'） */
  path: string
  ogType?: string
  /** true で noindex（薄い/データ不足ページの検索インデックス除外） */
  noindex?: boolean
  /** 構造化データ（JSON-LD）。ページ離脱時に除去する。 */
  jsonLd?: Record<string, unknown>
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useDocumentMeta({ title, description, path, ogType = 'website', noindex = false, jsonLd }: MetaInput) {
  useEffect(() => {
    const url = SITE_ORIGIN + path
    document.title = title
    upsertMeta('name', 'description', description)
    upsertLink('canonical', url)
    // SPA遷移で状態が残らないよう robots は毎回明示する。
    upsertMeta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow')
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('name', 'twitter:card', 'summary')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)

    // 構造化データ（JSON-LD）。当フックが管理する1枠のみを更新/除去。
    const ID = 'ld-json-managed'
    const existing = document.getElementById(ID)
    if (jsonLd) {
      const el = existing ?? document.createElement('script')
      el.id = ID
      ;(el as HTMLScriptElement).type = 'application/ld+json'
      el.textContent = JSON.stringify(jsonLd)
      if (!existing) document.head.appendChild(el)
    } else if (existing) {
      existing.remove()
    }
  }, [title, description, path, ogType, noindex, jsonLd])
}
