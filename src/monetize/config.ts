// 収益化（マネタイズ）設定
// ───────────────────────────────────────────────────────────────
// ここに ID / リンクを入れるだけで、その瞬間から広告・アフィリエイトが有効化されます。
// 何も入れなければ広告枠は一切表示されません（＝偽リンクや空枠を公開しない安全な既定）。
//
// ● ID の入れ方は 2 通り。どちらでもOK（環境変数が優先）:
//   1) 環境変数（推奨・コミット不要）:
//        .env.local  もしくは GitHub Actions の env に
//        VITE_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
//        VITE_ADSENSE_SLOT=1234567890
//   2) 下の DEFAULTS を直接書き換える（AdSense の pub-ID・アフィリンクは
//      どのみちブラウザに配信される公開情報なので、コミットしても問題ありません）。

export interface AffiliateOffer {
  id: string
  provider: string // サービス名（例: doda）
  title: string // 見出し
  description: string // 一言説明
  cta: string // ボタン文言
  url: string // ← ここを A8.net 等で発行したあなたのアフィリエイトリンクに差し替える
  accent?: string // アクセント色（任意, CSS 変数名 or 色）
}

// import.meta.env は Vite がビルド時に埋め込む。テスト(node)でも安全に読めるようガード。
const env = (typeof import.meta !== 'undefined' && import.meta.env) || ({} as Record<string, string>)

const DEFAULTS = {
  // 例: 'ca-pub-1234567890123456'
  adsenseClient: 'ca-pub-6937804420410845',
  // 例: '1234567890'（AdSense 管理画面で広告ユニットを作ると発行される）
  adsenseSlot: '',
}

export const monetize = {
  adsenseClient: String(env.VITE_ADSENSE_CLIENT ?? DEFAULTS.adsenseClient).trim(),
  adsenseSlot: String(env.VITE_ADSENSE_SLOT ?? DEFAULTS.adsenseSlot).trim(),

  // アフィリエイト案件のテンプレート。
  // url を "https://example.com/..." のまま置いておくと表示されません（未設定扱い）。
  // A8.net / もしもアフィリエイト等で発行したリンクに差し替えると自動で表示されます。
  affiliates: [
    {
      id: 'agent-1',
      provider: '転職エージェント',
      title: '将来性の高い業界へ、プロと一緒に',
      description: '成長業界の非公開求人を紹介。登録は無料、相談だけでもOK。',
      cta: '無料で相談してみる',
      url: 'https://example.com/replace-with-your-affiliate-link',
      accent: 'var(--excellent)',
    },
    {
      id: 'scout-1',
      provider: 'スカウト型サービス',
      title: '待っているだけで、優良企業から声がかかる',
      description: '職務経歴を登録するとホワイト企業からスカウトが届く。',
      cta: '無料登録する',
      url: 'https://example.com/replace-with-your-affiliate-link',
      accent: 'var(--standard)',
    },
    {
      id: 'shindan-1',
      provider: '適職診断',
      title: 'あなたに合う仕事を、数分の診断で',
      description: '強み・価値観から向いている職種を可視化。就活の軸づくりに。',
      cta: '無料で診断する',
      url: 'https://example.com/replace-with-your-affiliate-link',
      accent: 'var(--accent)',
    },
  ] as AffiliateOffer[],
}

// サイト情報・法令ページ用（プライバシーポリシー等の表示に使用）。
// AdSense / アフィリエイト審査ではこれらの記載が実質必須。
export const site = {
  name: '-0（ゼロ）',
  url: 'https://46j9njw9f5-ctrl.github.io/',
  // 運営者名。審査の信頼性のため実名 or ハンドルネームを推奨。あとで自由に変更可。
  operator: 'ゆう',
  // お問い合わせ先。既定は GitHub の Issue ページ（公開情報）。
  // メールにしたい場合はここを 'mailto:あなた@example.com' 等に変更。
  contactUrl: 'https://github.com/46j9njw9f5-ctrl/-0/issues',
  contactLabel: 'GitHub の Issue ページ',
  // ポリシー最終更新日（表示用の固定文字列）。
  policyUpdated: '2026年7月',
}

/** AdSense が有効に設定されているか（pub-ID とスロットの両方が必要） */
export function hasAdsense(): boolean {
  return monetize.adsenseClient.startsWith('ca-pub-') && monetize.adsenseSlot.length > 0
}

/** 実リンクに差し替え済みの案件だけを返す（プレースホルダは除外） */
export function activeAffiliates(): AffiliateOffer[] {
  return monetize.affiliates.filter(
    (a) => a.url && !a.url.includes('example.com') && a.url.startsWith('http'),
  )
}

/** 広告・アフィリエイトのいずれかが有効か（法令表記の出し分けに使用） */
export function hasAnyAds(): boolean {
  return hasAdsense() || activeAffiliates().length > 0
}
