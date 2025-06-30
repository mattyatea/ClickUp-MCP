# ClickUp SSE Server

ClickUpのOAuth認証を使用したServer-Sent Events (SSE) サーバーです。Cloudflare Workersで動作し、MCP (Model Context Protocol) をサポートしています。

## 機能

- ✅ ClickUp OAuth 2.0 認証
- ✅ Server-Sent Events (SSE) によるリアルタイム通信
- ✅ ClickUp API との統合
- ✅ Webhook サポート
- ✅ MCP ツールの提供
- ✅ Cloudflare Workers での動作

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Cloudflareアカウントの準備

```bash
# Cloudflareにログイン（初回のみ）
npx wrangler login

# または、APIトークンを使用する場合
export CLOUDFLARE_API_TOKEN=your-api-token
```

### 3. ClickUp OAuth アプリケーションの作成

1. [ClickUp Apps](https://app.clickup.com/settings/apps) にアクセス
2. 「Create an App」をクリック
3. アプリケーション情報を入力：
   - **App Name**: あなたのアプリ名
   - **Description**: アプリの説明
   - **Redirect URL**: `https://clickup-sse-oauth.your-subdomain.workers.dev/callback`
4. Client ID と Client Secret を取得

### 4. Cloudflare KV Namespaceの作成

```bash
# KV namespace を作成
npx wrangler kv:namespace create "OAUTH_KV"

# 本番用も作成（オプション）
npx wrangler kv:namespace create "OAUTH_KV" --preview false
```

出力されたKV Namespace IDを `wrangler.jsonc` の `kv_namespaces` セクションに設定：

```json
"kv_namespaces": [
  {
    "binding": "OAUTH_KV",
    "id": "ここに表示されたKV_ID",
    "preview_id": "ここにpreview_id（あれば）"
  }
]
```

### 5. 環境変数の設定

#### 開発環境用

`.dev.vars` ファイルを作成：

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` ファイルを編集：

```bash
CLICKUP_CLIENT_ID=your-clickup-client-id
CLICKUP_CLIENT_SECRET=your-clickup-client-secret
COOKIE_ENCRYPTION_KEY=your-32-character-encryption-key
```

#### 本番環境用

Cloudflare Workers にシークレットを設定：

```bash
# ClickUp OAuth設定
npx wrangler secret put CLICKUP_CLIENT_ID
# プロンプトが表示されたら、ClickUpのClient IDを入力

npx wrangler secret put CLICKUP_CLIENT_SECRET
# プロンプトが表示されたら、ClickUpのClient Secretを入力

# Cookie暗号化キー（32文字のランダム文字列）
npx wrangler secret put COOKIE_ENCRYPTION_KEY
# プロンプトが表示されたら、32文字のランダム文字列を入力
# 生成例: openssl rand -hex 32
```

### 6. デプロイ

#### 開発環境での実行

```bash
npm run dev
```

開発サーバーは `http://localhost:8788` で起動します。

#### 本番環境へのデプロイ

```bash
# 初回デプロイ
npm run deploy

# または wrangler コマンドを直接使用
npx wrangler deploy
```

### 7. デプロイ後の確認

デプロイが完了したら、以下のURLでサービスが動作していることを確認：

```bash
# ヘルスチェック
curl https://clickup-sse-oauth.your-subdomain.workers.dev/health

# SSE接続テスト
curl -N https://clickup-sse-oauth.your-subdomain.workers.dev/sse?userId=test-user
```

### 8. ClickUp OAuth設定の更新

デプロイ後、ClickUpのOAuthアプリ設定で以下を更新：

- **Redirect URL**: `https://clickup-sse-oauth.your-subdomain.workers.dev/callback`
- **Webhook URL** (オプション): `https://clickup-sse-oauth.your-subdomain.workers.dev/webhook/clickup`

## 使用方法

### SSE 接続

SSE エンドポイントに接続してリアルタイム通知を受信：

```javascript
const eventSource = new EventSource('https://clickup-sse-oauth.your-subdomain.workers.dev/sse?userId=your-user-id');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('受信:', data);
};
```

### MCP ツール

OAuth認証後、以下のMCPツールが利用可能になります：

#### `getUserInfo`
認証済みユーザーの情報を取得

#### `getWorkspaces`
ユーザーのClickUpワークスペース一覧を取得

#### `getTasks`
指定されたリストのタスクを取得
- `listId`: ClickUpリストのID
- `archived`: アーカイブされたタスクを含めるかどうか (オプション)
- `page`: ページネーション用のページ番号 (オプション)

#### `sendSSENotification`
SSE経由で通知を送信
- `type`: 通知のタイプ
- `message`: 通知メッセージ
- `data`: 追加データ (オプション)

#### `generateImage` (許可されたユーザーのみ)
Cloudflare AI を使用して画像を生成
- `prompt`: 画像の説明
- `steps`: 拡散ステップ数 (4-8)

### Webhook

ClickUpのWebhookイベントを受信：

```bash
# Webhook URL を ClickUp に設定
https://clickup-sse-oauth.your-subdomain.workers.dev/webhook/clickup
```

## API エンドポイント

### 認証
- `GET /authorize` - OAuth認証開始
- `POST /authorize` - 認証承認
- `GET /callback` - OAuth コールバック

### SSE
- `GET /sse?userId={userId}` - SSE接続エンドポイント

### Webhook
- `POST /webhook/clickup` - ClickUp Webhook受信

### その他
- `GET /health` - ヘルスチェック

## テスト

`test-sse.html` ファイルを開いてSSE接続をテストできます：

1. ブラウザで `test-sse.html` を開く
2. Server URL に `http://localhost:8788/sse`（開発）または `https://your-domain.workers.dev/sse`（本番）を入力
3. User ID を入力
4. 「接続」ボタンをクリック
5. リアルタイム通知の受信を確認

## ディレクトリ構造

```
clickup-sse/
├── src/
│   ├── index.ts              # メインエントリポイント
│   ├── clickup-handler.ts    # ClickUp OAuth & SSE ハンドラー
│   ├── utils.ts              # ユーティリティ関数
│   └── workers-oauth-utils.ts # OAuth ユーティリティ
├── test-sse.html             # SSE テスト用HTML
├── package.json
├── wrangler.jsonc            # Cloudflare Workers 設定
├── tsconfig.json
├── .dev.vars.example         # 環境変数サンプル
└── README.md
```

## 開発

### ローカル開発

```bash
npm run dev
```

開発サーバーは `http://localhost:8788` で起動します。

### 型チェック

```bash
npm run type-check
```

### 設定確認

```bash
# Wrangler設定確認
npx wrangler whoami

# KV一覧確認
npx wrangler kv:namespace list

# シークレット一覧確認
npx wrangler secret list
```

### デプロイ

```bash
# 本番デプロイ
npm run deploy

# 特定の環境にデプロイ
npx wrangler deploy --env production

# デプロイログ確認
npx wrangler tail
```

## トラブルシューティング

### デプロイエラー
```bash
# Wrangler認証確認
npx wrangler whoami

# 設定ファイル確認
npx wrangler deploy --dry-run

# 詳細ログでデプロイ
npx wrangler deploy --verbose
```

### SSE接続エラー
- User IDパラメータが正しく設定されているか確認
- CORS設定が正しいか確認
- ネットワーク接続を確認

### OAuth認証エラー
- ClickUp Client ID/Secret が正しく設定されているか確認
- Redirect URL が正しく設定されているか確認
- Cookie暗号化キーが32文字であることを確認

### KVエラー
```bash
# KV接続テスト
npx wrangler kv:key list --binding=OAUTH_KV

# KVデータ確認
npx wrangler kv:key get "test-key" --binding=OAUTH_KV
```

### Webhook受信エラー
- ClickUpでWebhook URLが正しく設定されているか確認
- Webhook エンドポイントが公開されているか確認

## よく使うコマンド集

```bash
# 新規プロジェクト作成
npm create cloudflare@latest clickup-sse-oauth --template=hello-world

# 依存関係インストール
npm install

# Cloudflareログイン
npx wrangler login

# KV作成
npx wrangler kv:namespace create "OAUTH_KV"

# シークレット設定
npx wrangler secret put CLICKUP_CLIENT_ID
npx wrangler secret put CLICKUP_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY

# 開発実行
npm run dev

# 本番デプロイ
npm run deploy

# ログ監視
npx wrangler tail

# 設定確認
npx wrangler whoami
npx wrangler secret list
npx wrangler kv:namespace list
```

## セキュリティ考慮事項

- Client Secret は環境変数として安全に管理
- Cookie暗号化キーは定期的に更新
- CORS設定は必要最小限に制限
- ユーザー認証状態の適切な検証

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

問題が発生した場合は、GitHubのIssuesでお知らせください。
