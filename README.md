# ClickUp MCP Server

ClickUpのOAuth認証を使用したMCP (Model Context Protocol) サーバーです。Cloudflare Workersで動作し、Cloudflareの公式AgentsSDKを使用してリアルタイム通信をサポートしています。

## 機能

- ✅ ClickUp OAuth 2.0 認証
- ✅ Cloudflare公式AgentsSDKによるリアルタイム通信
- ✅ MCP (Model Context Protocol) サポート
- ✅ ClickUp API との統合
- ✅ **詳細タスク検索** - 複数条件でのタスク絞り込み
- ✅ Webhook サポート
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
   - **Redirect URL**: `https://clickup-mcp-server.your-subdomain.workers.dev/callback`
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

⚠️ **重要**: セキュリティのため、機密情報は必ず環境変数として設定してください。

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

**注意**: `.dev.vars`ファイルは`.gitignore`に含まれており、コミットされません。

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
curl https://clickup-mcp-server.your-subdomain.workers.dev/health
```

### 8. ClickUp OAuth設定の更新

デプロイ後、ClickUpのOAuthアプリ設定で以下を更新：

- **Redirect URL**: `https://clickup-mcp-server.your-subdomain.workers.dev/callback`
- **Webhook URL** (オプション): `https://clickup-mcp-server.your-subdomain.workers.dev/webhook/clickup`

## 使用方法

### MCP クライアントからの接続

Cloudflareの公式AgentsSDKを使用しているため、MCPクライアントから直接接続できます：

```javascript
// MCPクライアントの設定例
const mcpServerUrl = 'https://clickup-mcp-server.your-subdomain.workers.dev/sse';
// AgentsSDKが自動的にSSE接続とリアルタイム通信を管理
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

#### `sendClickUpNotification`
ClickUpのWebhookイベントを監視して通知を送信
- `eventType`: 監視するイベントタイプ (task_created, task_updated等)
- `message`: 通知メッセージ

#### `searchTasksAdvanced` (新機能)
詳細な条件でタスクを絞り込み検索
- `filters`: 詳細検索フィルター（以下の条件を指定可能）
  - **基本検索**: キーワード、チーム指定
  - **ステータス**: 進行中、完了、レビュー中など
  - **優先度**: 緊急、高、普通、低
  - **担当者**: 特定のユーザーでフィルタリング
  - **日付範囲**: 期日、作成日、更新日での範囲指定
  - **タグ**: 特定のタグでフィルタリング
  - **カスタムフィールド**: カスタムフィールドの値での絞り込み
  - **親タスク**: サブタスクでの絞り込み

**使用例**: [examples/advanced-search-examples.md](examples/advanced-search-examples.md) を参照

### Webhook

ClickUpのWebhookイベントを受信：

```bash
# Webhook URL を ClickUp に設定
https://clickup-mcp-server.your-subdomain.workers.dev/webhook/clickup
```

## API エンドポイント

### 認証
- `GET /authorize` - OAuth認証開始
- `POST /authorize` - 認証承認
- `GET /callback` - OAuth コールバック

### MCP
- `/sse` - MCP接続エンドポイント（AgentsSDKが自動管理）

### Webhook
- `POST /webhook/clickup` - ClickUp Webhook受信

### その他
- `GET /health` - ヘルスチェック

## ディレクトリ構造

```
clickup-mcp-server/
├── src/
│   ├── index.ts              # メインエントリポイント（McpAgent）
│   ├── clickup-handler.ts    # ClickUp OAuth ハンドラー
│   ├── services/
│   │   ├── clickup-service.ts # ClickUp API サービス
│   │   └── error-handler.ts   # エラーハンドリング
│   ├── types.ts              # 型定義
│   ├── config.ts             # 設定
│   ├── utils.ts              # ユーティリティ関数
│   └── workers-oauth-utils.ts # OAuth ユーティリティ
├── package.json
├── wrangler.jsonc            # Cloudflare Workers 設定
├── tsconfig.json
├── .dev.vars.example         # 環境変数サンプル
└── README.md
```

## セキュリティ考慮事項

⚠️ **重要なセキュリティガイドライン**

- **機密情報の管理**: Client ID、Client Secret、暗号化キーは**絶対に**コードにハードコードしないでください
- **環境変数の使用**: すべての機密情報は環境変数または Wrangler secrets として管理してください
- **定期的な更新**: Cookie暗号化キーは定期的に更新してください
- **認証の検証**: ユーザー認証状態の適切な検証を行ってください
- **通信の暗号化**: Cloudflare AgentsSDKによる安全なMCP通信を使用してください

## 開発

### ローカル開発

```bash
npm run dev
```

開発サーバーは `http://localhost:8788` で起動します。MCPクライアントから `/sse` エンドポイントに接続できます。

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

### MCP接続エラー
- OAuth認証が正しく完了しているか確認
- MCPクライアントの設定が正しいか確認
- ネットワーク接続を確認

### OAuth認証エラー
- ClickUp Client ID/Secret が正しく設定されているか確認
- Redirect URL が正しく設定されているか確認
- Cookie暗号化キーが32文字であることを確認
- **環境変数が正しく設定されているか確認**

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
npm create cloudflare@latest clickup-mcp-server --template=hello-world

# 依存関係インストール
npm install

# Cloudflareログイン
npx wrangler login

# KV作成
npx wrangler kv:namespace create "OAUTH_KV"

# シークレット設定（本番環境）
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

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

問題が発生した場合は、GitHubのIssuesでお知らせください。
