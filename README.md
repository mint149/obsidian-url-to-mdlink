# URL to Markdown Link (obsidian-url-to-mdlink)

カーソルのある行に書かれた Web ページの URL を、ページタイトルを取得して Markdown 形式のリンクに変換する Obsidian プラグインです。

```
https://obsidian.md/
↓
[Obsidian - Sharpen your thinking](https://obsidian.md/)
```

## 使い方

1. 変換したい URL がある行にカーソルを置く
2. コマンドパレット（`Ctrl/Cmd + P`）で **URL to Markdown Link: Convert URLs on current line to Markdown links** を実行
3. タイトルの取得が終わると、その行の URL が `[タイトル](URL)` に置き換わる

ホットキーは Obsidian の「設定 → ホットキー」で割り当てられます。

## 仕様

- 1 行に複数の URL があれば、すべて並列でタイトルを取得して変換します。
- `<https://...>` 形式の自動リンクも変換します。
- 次のものは変換しません：既存の Markdown リンク・画像（`[..](..)` / `![..](..)`）、インラインコード、`[[wikilink]]`、参照定義（`[id]: URL`）。
- URL 末尾の句読点（`.` `,` `。` `、` `」` など）や、対応の取れない `)` は URL に含めません。
- タイトルは `<title>` を優先し、無ければ `og:title`、`twitter:title` を使います。
- 文字コードは HTTP ヘッダ、`<meta charset>`、BOM から判定します（Shift_JIS や EUC-JP のページにも対応）。
- タイトル内の `[` `]` はエスケープします。
- タイトルが取れなかった URL はそのまま残し、理由を通知で表示します。
- 取得中に行が編集されたりノートが切り替わったりした場合は、誤って書き換えないよう変換を中止します。
- 通信には Obsidian の `requestUrl` を使うため、CORS の制限を受けません。

## 開発

```bash
npm install
npm run dev     # ウォッチビルド（main.js を出力）
npm run build   # 型チェック + 本番ビルド
npm test        # ユニットテスト
```

### BRAT でインストール（モバイル含む）

1. コミュニティプラグインから **Obsidian42 - BRAT** をインストールして有効化
2. BRAT の設定で「Add Beta plugin」を選び、`mint149/obsidian-url-to-mdlink` を入力
3. 「設定 → コミュニティプラグイン」で **URL to Markdown Link** を有効化

### リリース手順

`manifest.json` の `version` を上げて main に反映すると、GitHub Actions がビルドし、`main.js` / `manifest.json` を添付した Release（タグ名はバージョン、`v` なし）を作成します。同じバージョンの Release が既にある場合は何もしません。

```bash
npm version patch   # manifest.json / versions.json も更新される
git push && git push --tags
```

### 手動インストール

`main.js` と `manifest.json` を、Vault の `.obsidian/plugins/url-to-mdlink/` にコピーし、「設定 → コミュニティプラグイン」で有効化してください。
