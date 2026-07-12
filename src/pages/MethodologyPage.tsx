import { PageShell } from '../components/PageShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { analytics } from '../data'
import { site } from '../monetize/config'

export default function MethodologyPage() {
  useDocumentMeta({
    title: 'スコアの算出方法（将来性・生産性・働きやすさ） | -0（ゼロ）',
    description:
      '将来性・生産性・働きやすさスコアの構成要素、労働環境リスクの算出条件、欠損データの補正方法、データソースを説明します。スコアは将来を保証しない独自の参考指標です。',
    path: '/methodology',
    ogType: 'article',
  })

  return (
    <PageShell
      title="スコアの算出方法"
      lead="各スコアがどの実データから、どのように計算されるかを開示します。スコアは将来を保証するものではなく、独自ロジックによる参考指標です。"
    >
      <section className="page__section">
        <h2 className="page__h2">🚀 将来性スコアの構成要素</h2>
        <p>
          業種の将来性（構造的な市場トレンド）、売上高の成長率（CAGR）、従業員数の成長、
          成長ステージ（企業年齢）、事業規模の安定性、上場による資本アクセスを合成します。
          各要因の寄与（重み）は企業詳細の「将来性」タブで根拠つきに開示しています。
        </p>
      </section>

      <section className="page__section">
        <h2 className="page__h2">📈 生産性スコアの構成要素</h2>
        <p>
          一人当たり売上高を対数スケールで評価します。売上高・従業員数などの実データが
          取得できた企業でのみ算出し、取得できない場合は表示しません（0 点にはしません）。
        </p>
      </section>

      <section className="page__section">
        <h2 className="page__h2">🌱 働きやすさスコアの構成要素</h2>
        <p>
          月平均残業時間、年次有給休暇取得率、女性管理職比率、平均勤続年数、平均年齢などの
          公的データを用います。開示されている項目だけで重みを再配分し、業種・全国平均との
          比較も併せて示します。項目が 1 つしかない場合は「参考値」として強い断定を避けます。
        </p>
      </section>

      <section className="page__section">
        <h2 className="page__h2">🛡 労働環境リスク（労働環境スコア）の算出条件</h2>
        <p>
          離職率・残業代支給率・労基署の是正勧告など、<b>公的または明示されたデータがある場合にのみ</b>
          算出します。実在企業に推測値を当てはめて労働環境リスクを付けることはしません。データが無い企業では
          「労働環境スコア」は表示されず、働きやすさなど取得できた指標のみを示します。
        </p>
      </section>

      <section className="page__section">
        <h2 className="page__h2">🔧 欠損データの補正方法</h2>
        <p>
          データが欠損する評価要因は、<b>0 点として扱わず</b>、利用可能な要因だけで重みを動的に再正規化します。
          相性診断（重視条件との一致度）では、選択した軸の充足率が低い場合に中立値（50）へ縮約し、半数未満しか
          データが無い場合は「比較不能」とします。これにより、情報が少ない企業が過大にも過小にも評価
          されないようにしています。企業詳細には「データ充足度（高/中/低）」を表示します。
        </p>
      </section>

      <section className="page__section">
        <h2 className="page__h2">📚 データソース</h2>
        <ul className="page__list">
          <li>
            <b>Wikidata</b>（CC0）: 従業員数・設立年・売上高・業種・上場市場などの事実データ。
          </li>
          <li>
            <b>厚生労働省 女性活躍・両立支援データベース</b>（公開データ）: 残業・有給・女性管理職 等。
          </li>
          <li>
            <b>しょくばらぼ（厚労省 職場情報総合サイト）</b>（公開オープンデータ・全 {analytics.total.toLocaleString()} 社）:
            働きやすさの実データと業種別・全国平均。
          </li>
        </ul>
        <p className="page__muted">
          スコアは上記の公開データと独自ロジックに基づく参考指標であり、正確性・完全性・将来の成果を
          保証するものではありません。最終更新：{site.policyUpdated}。
        </p>
      </section>
    </PageShell>
  )
}
