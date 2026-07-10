// 業種ごとの「将来性アウトルック」テーブル。
// 一般的な構造トレンド（市場の伸び・逆風）に基づく編集可能な前提値。
// スコア 0–100（高いほど成長市場）。キーワード一致で判定するため、
// 実データ（Wikidata）由来・デモ用シードの双方の業種ラベルに対応する。

interface Outlook {
  score: number
  note: string
}

// 上から順に評価（より具体的・成長性の高いキーワードを先に置く）。
const TABLE: [string, Outlook][] = [
  ['ai', { score: 92, note: 'AI は最も伸びる分野の一つ' }],
  ['半導体', { score: 90, note: '半導体は構造的な需要拡大' }],
  ['インターネット', { score: 88, note: 'デジタル化の追い風' }],
  ['ソフトウェア', { score: 88, note: 'SaaS・クラウドが伸長' }],
  ['it', { score: 86, note: 'IT 需要は拡大基調' }],
  ['ヘルスケア', { score: 80, note: '高齢化で需要増' }],
  ['製薬', { score: 78, note: '創薬・バイオが成長' }],
  ['医療', { score: 78, note: '医療需要は底堅い' }],
  ['コンサル', { score: 72, note: 'DX 需要でコンサルは活況' }],
  ['ゲーム', { score: 72, note: 'エンタメは世界市場が拡大' }],
  ['エンタメ', { score: 70, note: 'コンテンツ需要が拡大' }],
  ['研究', { score: 70, note: 'R&D 型は将来投資が厚い' }],
  ['物流', { score: 64, note: 'EC 拡大が追い風（人手は課題）' }],
  ['運輸', { score: 63, note: 'EC で荷動きは増加' }],
  ['運送', { score: 63, note: 'EC で荷動きは増加' }],
  ['商社', { score: 64, note: '資源・投資で収益源が多様' }],
  ['化学', { score: 66, note: '素材は高機能分野が成長' }],
  ['素材', { score: 64, note: '高機能素材に伸びしろ' }],
  ['精密', { score: 66, note: '精密・光学は技術優位' }],
  ['光学', { score: 66, note: '精密・光学は技術優位' }],
  ['化粧品', { score: 62, note: '化粧品はアジア需要が拡大' }],
  ['日用品', { score: 60, note: '生活必需で安定成長' }],
  ['介護', { score: 62, note: '高齢化で需要は拡大（採用難）' }],
  ['福祉', { score: 60, note: '需要は拡大基調' }],
  ['人材', { score: 60, note: '流動化で人材需要増' }],
  ['広告', { score: 60, note: 'デジタル広告は成長、旧型は縮小' }],
  ['自動車', { score: 60, note: 'EV・電動化で構造転換の只中' }],
  ['輸送機器', { score: 60, note: '電動化で構造転換' }],
  ['通信', { score: 60, note: '通信インフラは安定' }],
  ['食品', { score: 58, note: '食品は安定だが成長は緩やか' }],
  ['飲料', { score: 58, note: '安定需要' }],
  ['エレクトロニクス', { score: 58, note: 'コモディティ化と高付加価値が二極化' }],
  ['エネルギー', { score: 58, note: '脱炭素で再編が進む' }],
  ['インフラ', { score: 56, note: '安定だが成長は限定的' }],
  ['機械', { score: 55, note: '設備投資に連動' }],
  ['重工', { score: 55, note: '防衛・エネルギーで再評価' }],
  ['金融', { score: 55, note: '金利環境と DX が鍵' }],
  ['保険', { score: 54, note: '成熟市場、再編局面' }],
  ['旅行', { score: 55, note: 'インバウンド回復が追い風' }],
  ['観光', { score: 55, note: 'インバウンドで回復' }],
  ['農業', { score: 55, note: 'スマート農業に伸びしろ' }],
  ['教育', { score: 52, note: '少子化逆風だが EdTech は成長' }],
  ['学習', { score: 50, note: '少子化の逆風' }],
  ['建設', { score: 50, note: '国内は成熟、人手不足' }],
  ['不動産', { score: 50, note: '金利と人口動態に左右される' }],
  ['小売', { score: 45, note: 'EC 化で店舗型は逆風' }],
  ['流通', { score: 45, note: '再編・EC 化の圧力' }],
  ['外食', { score: 42, note: '人手不足とコスト高で厳しい' }],
  ['飲食', { score: 42, note: 'コスト高で採算が課題' }],
  ['繊維', { score: 40, note: '国内生産は縮小傾向' }],
  ['アパレル', { score: 42, note: '過当競争・EC 化' }],
  ['鉄鋼', { score: 42, note: '成熟・脱炭素コスト' }],
  ['金属', { score: 44, note: '市況依存' }],
  ['メディア', { score: 40, note: '旧型メディアは縮小' }],
  ['出版', { score: 38, note: '紙媒体は縮小' }],
  ['訪問販売', { score: 30, note: '構造的に縮小・逆風' }],
  ['製造業', { score: 52, note: '分野により差が大きい' }],
  ['サービス', { score: 52, note: '分野により差が大きい' }],
]

const DEFAULT: Outlook = { score: 50, note: '平均的な見通し' }

function matchesKeyword(label: string, key: string): boolean {
  const normalizedKey = key.toLowerCase()
  // ai / it のような短い英字は単語単位で判定し、retail 等への誤一致を防ぐ。
  if (/^[a-z0-9]+$/.test(normalizedKey) && normalizedKey.length <= 2) {
    const escaped = normalizedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(label)
  }
  return label.includes(normalizedKey)
}

/** 業種ラベルから将来性アウトルックを返す。 */
export function industryOutlook(industry: string): Outlook {
  const label = (industry || '').toLowerCase()
  for (const [key, outlook] of TABLE) if (matchesKeyword(label, key)) return outlook
  return DEFAULT
}
