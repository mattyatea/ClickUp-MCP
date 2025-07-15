# ClickUp MCP Server

ClickUp APIと連携するMCP（Model Context Protocol）サーバーです。OAuth認証を通じてClickUpのタスク管理機能をAIツールから利用できます。

## 概要

このプロジェクトは、Cloudflare Workers上で動作するMCPサーバーで、ClickUp APIとの統合を提供します。AIアシスタントがClickUpのタスクを読み取り、更新、管理できるようにします。

## 機能

### 認証機能
- OAuth 2.0によるClickUp認証
- セキュアなトークン管理

### タスク管理
- タスクの詳細情報取得（コメント・サブタスク対応）
- タスクの更新（名前、説明、ステータス変更）
- タスクの担当者管理
- タスク検索機能

### 受信箱機能
- 未来のタスク表示
- 完了済みタスク表示
- 未スケジュールタスク表示
- 全タスクの統合ビュー

### ユーザー・チーム管理
- ユーザー情報取得
- ワークスペース一覧取得

## 技術スタック

- **ランタイム**: Cloudflare Workers (Edge Runtime)
- **言語**: TypeScript (ES2021、strict mode)
- **フレームワーク**: Hono (HTTPルーティング)
- **OAuth**: @cloudflare/workers-oauth-provider
- **MCP**: @modelcontextprotocol/sdk
- **バリデーション**: Zod
- **パッケージマネージャー**: pnpm

## セットアップ

### 前提条件

- Node.js 18以上
- pnpm
- Cloudflareアカウント
- ClickUp OAuthアプリケーション

### インストール

```bash
# 依存関係のインストール
pnpm install

# 型定義の生成
pnpm cf-typegen
```

### 環境設定

1. ClickUp OAuthアプリケーションの作成
   - [ClickUp Developer Portal](https://app.clickup.com/settings/apps)でアプリを作成
   - リダイレクトURLに `https://your-domain.workers.dev/callback` を設定

2. シークレットの設定

```bash
# ClickUp OAuth クライアントID
npx wrangler secret put CLICKUP_CLIENT_ID

# ClickUp OAuth クライアントシークレット
npx wrangler secret put CLICKUP_CLIENT_SECRET

# Cookie暗号化キー（32文字）
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

3. KVネームスペースの作成

```bash
npx wrangler kv:namespace create "OAUTH_KV"
```

4. `wrangler.jsonc`の更新
   - 作成されたKVネームスペースIDを設定

## 開発

### ローカル開発サーバーの起動

```bash
pnpm dev
```

デフォルトでポート8788で起動します。

### コマンド一覧

```bash
# 開発サーバー起動
pnpm dev

# 型チェック
pnpm type-check

# コードフォーマット
npx prettier --write .

# 本番環境へのデプロイ
pnpm deploy

# ログの確認
npx wrangler logs
```

## デプロイ

```bash
# 本番環境へのデプロイ
pnpm deploy
```

## 使用方法

1. ブラウザで `https://your-domain.workers.dev` にアクセス
2. 「認証開始」ボタンをクリックしてClickUpと連携
3. 認証完了後、MCPツールとして利用可能

### 利用可能なMCPツール

#### ユーザー・チーム管理
- `getUserInfo` - 認証ユーザー情報取得
- `getWorkspaces` - ワークスペース一覧取得

#### タスク管理
- `getTask` - タスク詳細取得（コメント・サブタスク対応）
- `updateTask` - タスク情報更新
- `assignTask` - タスク担当者管理

#### タスク検索
- `getMyTasks` - 自分のタスク一覧取得
- `searchTasks` - タスク検索

#### 受信箱機能
- `getInboxFutureTasks` - 未来のタスク表示
- `getInboxDoneTasks` - 完了済みタスク表示
- `getInboxUnscheduledTasks` - 未スケジュールタスク表示
- `getInboxAll` - 全タスク統合ビュー

## プロジェクト構造

```
src/
├── index.ts                    # メインエントリーポイント
├── config.ts                   # 設定定数
├── types.ts                    # TypeScript型定義
├── utils.ts                    # ユーティリティ関数
├── api/                        # ClickUp APIクライアント
│   ├── index.ts                # 統合APIクライアント
│   ├── basic.ts                # 基本タスク操作
│   ├── search.ts               # タスク検索機能
│   └── advanced-search.ts      # 詳細検索機能
├── auth/                       # 認証モジュール
│   └── user.ts                 # ユーザー認証ロジック
├── handlers/                   # リクエストハンドラー
│   ├── combined-handler.ts     # メインルーティング
│   ├── oauth-handler.ts        # OAuthフロー
│   └── site-handler.ts         # サイトハンドラー
├── tools/                      # MCPツール登録
│   ├── auth.ts                 # 認証関連ツール
│   ├── task.ts                 # タスク管理ツール
│   └── search.ts               # 検索ツール
└── utils/                      # ユーティリティ
    └── formatters.ts           # データフォーマッター
```

## 開発ガイドライン

### コーディング規約

- TypeScript strict modeを使用
- エラーハンドリングは統一パターンを使用
- MCPツールの説明文は詳細に記述（150-300文字）
- 日本語対応（エラーメッセージ、ツール説明）

### コミット前チェック

```bash
# 型チェック（必須）
pnpm type-check

# コードフォーマット
pnpm format

# リント
pnpm lint
```

## トラブルシューティング

### OAuth認証エラー
- `CLICKUP_CLIENT_ID`と`CLICKUP_CLIENT_SECRET`が正しく設定されているか確認
- リダイレクトURLがClickUpアプリ設定と一致しているか確認

### KVストレージエラー
- KVネームスペースが作成されているか確認
- `wrangler.jsonc`のバインディングが正しいか確認

### 開発サーバーエラー
- ポート8788が使用可能か確認
- Node.jsバージョンが18以上か確認

## ライセンス

[ライセンスを記載]

## 貢献

[貢献ガイドラインはCONTRIBUTING.mdを参照]

