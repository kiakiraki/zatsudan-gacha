# 雑談ガチャ (zatsudan-gacha)

職場のコミュニケーション促進用の Web ページです。
今日の「会話スタイル」を1つと、「雑談ネタ」を9個ランダムに引いて表示します。
Cloudflare Workers (Workers Assets) で配信します。

## 構成

```
zatsudan-gacha/
├── src/
│   ├── index.ts          # Worker entry（ASSETS にフォワードするだけ）
│   └── client/
│       ├── main.ts       # フロントロジック（抽選＋レンダリング）
│       └── styles.css    # スタイル（ライト/ダーク自動）
├── public/
│   ├── index.html        # 唯一の HTML
│   ├── main.js           # build で生成（git 管理対象外）
│   ├── styles.css        # build でコピー（git 管理対象外）
│   └── data/             # build でコピー（git 管理対象外）
├── data/                 # データのソース（編集対象はこちら）
│   ├── styles.json       # 会話スタイル 4 個
│   ├── topics.json       # 雑談ネタ 250 個
│   └── excluded_ids.json # 配信時に除外する topic id
├── build.mjs             # esbuild ベースのビルドスクリプト
├── package.json
├── pnpm-workspace.yaml   # pnpm 11 の allowBuilds 設定
├── mise.toml             # node / pnpm のバージョン pin
├── tsconfig.json         # ルート（project references のみ）
├── tsconfig.worker.json  # src/index.ts 用（@cloudflare/workers-types）
├── tsconfig.client.json  # src/client/ 用（DOM lib）
└── wrangler.toml
```

> tsconfig を Worker と Client で分けているのは、`@cloudflare/workers-types` の global が DOM の同名 API（`append` など）と競合するためです。

## 抽選ロジック（クライアント側）

- **スタイル**: `styles.json` から 1 個ランダム。同じものが連続しないように、直前と違うものを選ぶ。
- **ネタ**: `topics.json` から `excluded_ids.json` に載っている id を除外したプールを使い、9 個を Fisher–Yates でシャッフルして取得。同じカテゴリは最大 2 個までに制限（プール不足時はその制限を緩和して埋める）。

すべてクライアント側で完結するので、サーバ負荷は最小です。

## セットアップ

前提: [mise](https://mise.jdx.dev/) が入っていること。Cloudflare アカウントと wrangler 認証も必要です。

```bash
mise install      # mise.toml に従って node 24 と pnpm 11 を入れる
pnpm install
```

mise を使わない場合は、Node.js 24 と pnpm 11 を別途用意してください。

## 開発

開発時は 2 つのプロセスを別ターミナルで動かします。

```bash
# 1) アセットビルド（src → public へ）を watch
pnpm build:watch

# 2) Workers のローカル開発サーバ
pnpm dev
```

`pnpm build:watch` は次の3つを面倒見ます。

- `src/client/main.ts` → `public/main.js`（esbuild bundle）
- `src/client/styles.css` → `public/styles.css`（コピー）
- `data/*.json` → `public/data/*.json`（コピー）

データやスタイルだけ書き換えた場合はブラウザをリロードすればOKです。

## デプロイ

```bash
pnpm deploy
```

裏では `pnpm build` を実行してから `wrangler deploy` します。
初回は `wrangler login` でログインしてください。

## データの編集

### スタイル (`data/styles.json`)

```json
[
  { "id": "good-and-new", "name": "Good & New", "description": "..." }
]
```

`id` はユニーク。追加・削除は自由ですが、最低 1 個は必要です（できれば 2 個以上、連続抑制ロジックが活きます）。

### ネタ (`data/topics.json`)

```json
[
  { "id": "topic-001", "category": "tools", "text": "..." }
]
```

カテゴリは 8 種類:

| category    | 内容                                                |
| ----------- | --------------------------------------------------- |
| `tools`     | キーボード/椅子/机周り/文房具などの作業道具         |
| `food`      | コーヒー/お昼/おやつ/料理                           |
| `hobby`     | ゲーム/読書/音楽/映画/スポーツ観戦/写真             |
| `childhood` | 子供のころハマったもの、習い事                      |
| `travel`    | 旅行先、行ってみたい場所                            |
| `bgm`       | 集中/作業中の BGM、好きなジャンル                   |
| `season`    | 季節・天気・年中行事、季節の思い出                  |
| `lifestyle` | 日常のルーティン、暮らしの工夫、最近の気づき        |

新カテゴリを追加した場合は `src/client/main.ts` の `CATEGORY_LABEL` にも日本語ラベルを足すと、タグが日本語で表示されます（無くても英字のまま出ます）。

### 除外リスト (`data/excluded_ids.json`)

「このネタはしばらく外したい」と思ったら id をここに追加するだけです。

```json
{ "excluded_ids": ["topic-042", "topic-117"] }
```

### ネタを大量に追加・再生成したいとき

`docs/topic-generation-prompt.md` に AI 用の生成プロンプトを置いてあります。これまでの運用で気づいた失敗パターン（二者択一、YES/NO、時期依存など）を「悪い例」として明文化してあるので、そのまま AI に渡せば再発を抑えられます。

## 型チェック

```bash
pnpm typecheck
```

## メモ

- `public/index.html` 以外の `public/` 配下は build 生成物なので、編集してもすぐ上書きされます。編集元は `src/` と `data/`。
- ダークモードは OS の設定を尊重します（`prefers-color-scheme`）。
- 抽選は毎回ブラウザ側で実行されます。同じ人が引き直しても異なる結果になります（決定論的に揃えたい場合は seed を入れる改修が必要）。
