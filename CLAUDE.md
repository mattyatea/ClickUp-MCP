# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを操作する際の包括的なガイダンスを提供します。プロジェクトの構造、開発ワークフロー、アーキテクチャパターンを理解するためのリファレンスとして機能します。

## プロジェクト概要

**プロジェクト名**: ClickUp MCP Server  
**タイプ**: Cloudflare Workers ベースの OAuth MCP Server  
**目的**: OAuth認証を通じてClickUp APIと連携するMCP（Model Context Protocol）ツールを提供

## 共通コマンド

### 開発コマンド

- `pnpm dev` - ローカル開発サーバーをWranglerで起動（ポート8788）
- `pnpm start` - 代替の開始コマンド（devと同じ）
- `pnpm type-check` - ファイルを出力せずにTypeScriptの型チェックを実行
- `pnpm deploy` - Cloudflare Workersにデプロイ
- `pnpm cf-typegen` - Wrangler設定からTypeScript型を生成

### Cloudflare Workers コマンド

- `npx wrangler secret put CLICKUP_CLIENT_ID` - ClickUp OAuth クライアントIDを設定
- `npx wrangler secret put CLICKUP_CLIENT_SECRET` - ClickUp OAuth クライアントシークレットを設定
- `npx wrangler secret put COOKIE_ENCRYPTION_KEY` - Cookie暗号化キーを設定（32文字）
- `npx wrangler kv:namespace create "OAUTH_KV"` - OAuth用のKVネームスペースを作成
- `npx wrangler dev` - ローカル開発サーバーを開始
- `npx wrangler deploy` - 本番環境にデプロイ
- `npx wrangler logs` - デプロイログを表示

### コード品質コマンド

- `pnpm format` - Biomeを使用してコードをフォーマット
- `pnpm lint` - Biomeによるリント
- `pnpm fix` - Biomeによる自動修正
- `pnpm type-check` - TypeScriptの型チェック

## アーキテクチャ

これはClickUp APIと連携するMCP（Model Context Protocol）ツールを提供する、Cloudflare Workers ベースの OAuth MCP サーバーです。

### 技術スタック

- **ランタイム**: Cloudflare Workers (Edge Runtime)
- **言語**: TypeScript (ES2021、strict mode)
- **フレームワーク**: HTTP処理にHono
- **OAuth**: @cloudflare/workers-oauth-provider
- **MCP**: @modelcontextprotocol/sdk + agents/mcp
- **APIクライアント**: 内蔵のClickUp APIクライアント
- **バリデーション**: Zodスキーマ
- **パッケージマネージャー**: pnpm

### 主要コンポーネント

- **OAuthフロー**: ClickUpとのOAuth認証に`@cloudflare/workers-oauth-provider`を使用
- **MCPサーバー**: `McpAgent`を拡張してClickUp操作用の構造化APIツールを提供
- **Durable Objects**: ステートフルなMCPセッション用に`MyMCP`デュラブルオブジェクトクラスを使用
- **KVストレージ**: OAuthトークンとセッションデータをCloudflare KVに保存
- **MCP通信**: `/sse`エンドポイント経由でリアルタイムMCP通信

### ディレクトリ構造

```
src/
├── index.ts                    # メインアプリケーションエントリーポイント
├── config.ts                   # 設定定数
├── types.ts                    # TypeScript型定義
├── utils.ts                    # ユーティリティ関数
├── workers-oauth-utils.ts      # OAuth専用ユーティリティ
├── api/                        # ClickUp APIクライアント
│   ├── index.ts                # 統合APIクライアント（ClickUpClient）
│   ├── basic.ts                # 基本的なタスク操作（取得・更新・担当者変更）
│   ├── search.ts               # タスク検索・一覧機能
│   ├── advanced-search.ts      # 詳細絞り込み検索機能
│   └── common/                 # 共通ユーティリティ
│       └── error-handler.ts    # エラーハンドリングユーティリティ
├── auth/                       # 認証モジュール
│   └── user.ts                 # ユーザー認証ロジック
├── handlers/                   # リクエストハンドラー
│   ├── combined-handler.ts     # メインルーティングロジック
│   ├── oauth-handler.ts        # OAuthフローハンドラー
│   └── site-handler.ts         # サイトとドキュメンテーションハンドラー
├── tools/                      # MCPツール登録関数
│   ├── index.ts                # ツールオーケストレーション
│   ├── auth.ts                 # 認証関連ツール登録
│   ├── task.ts                 # タスク管理ツール登録
│   └── search.ts               # 検索ツール登録
└── utils/                      # ユーティリティ関数
    └── formatters.ts           # データフォーマッティングユーティリティ
```

### メインエントリーポイント

- `src/index.ts` - メインアプリケーションエントリーポイント、OAuthプロバイダーとMCPエージェントをエクスポート
- `src/handlers/combined-handler.ts` - 全てのハンドラーを統合するメインルーティングロジック
- `src/handlers/oauth-handler.ts` - OAuthフローハンドラー（`/authorize`、`/callback`、`/webhook/clickup`エンドポイント）
- `src/handlers/site-handler.ts` - サイトとドキュメンテーションハンドラー（`/`エンドポイント）
- `src/api/index.ts` - 統合ClickUp APIクライアント（ClickUpClient）
- `src/api/basic.ts` - 基本的なタスク操作の実装
- `src/api/search.ts` - タスク検索機能の実装
- `src/api/advanced-search.ts` - 詳細検索機能の実装
- `src/tools/index.ts` - MCPツール登録のオーケストレーション

### コアアーキテクチャパターン

1. **OAuth認証**: ユーザーはClickUp OAuth経由で認証、トークンはKVに保存
2. **MCPエージェント**: 認証済みセッションはClickUp APIアクセス権限を持つMCPエージェントを作成
3. **ツール登録**: ClickUp操作用の組み込みツールを`init()`メソッドで登録
4. **MCPエンドポイント**: `/sse`はMCP通信用の永続的な接続を提供
5. **Durable Objects**: Cloudflare Durable Objects経由でステートフルセッションを管理

### MCPツールカテゴリ

- **ユーザー & チーム**: `getUserInfo`、`getWorkspaces`
- **タスク管理**: `getTask`、`updateTask`、`assignTask`
- **タスク発見**: `getMyTasks`、`searchTasks`、`advancedSearchTasks`
- **ユーティリティ**: `add`（テスト用の基本的な数学演算）

## 環境設定

### 必要なシークレット（wrangler.jsonc）

- `CLICKUP_CLIENT_ID` - ClickUp OAuthアプリケーションクライアントID
- `CLICKUP_CLIENT_SECRET` - ClickUp OAuthアプリケーションクライアントシークレット
- `COOKIE_ENCRYPTION_KEY` - Cookie用の32文字の暗号化キー

### 環境変数

- `DEV_PORT` - 開発サーバーポート（デフォルト: 8788）

### KVネームスペース

- `OAUTH_KV` - OAuthトークンとセッションデータを保存

### Durable Objects

- `MyMCP` - ステートフルなMCPセッションを処理

## OAuth設定

### OAuthスコープ

アプリケーションは完全なAPIアクセス用のデフォルトClickUp OAuthスコープを使用：

- デフォルトスコープはワークスペース、スペース、フォルダ、リスト、タスクへの読み書きアクセスを提供
- 時間追跡エントリの作成と管理用の時間追跡権限を含む

### OAuthエンドポイント

- `/authorize` - OAuthフローを開始
- `/callback` - OAuthコールバックを処理
- `/sse` - MCP通信用のSSEエンドポイント

## 開発ワークフロー

### 開始方法

1. 依存関係をインストール: `pnpm install`
2. シークレットを設定: `npx wrangler secret put CLICKUP_CLIENT_ID`
3. KVネームスペースを作成: `npx wrangler kv:namespace create "OAUTH_KV"`
4. 開発を開始: `pnpm dev`

### 開発のベストプラクティス

- コミット前に常に`pnpm type-check`を実行
- 一貫したコードフォーマットのためにBiomeを使用（`pnpm format`）
- TypeScriptのstrict modeガイドラインに従う
- 中央集権化されたエラーハンドラーを使用して適切なエラーハンドリングを実装
- 入力検証にZodスキーマを使用
- **MCPツールの説明文は詳細に書く**: `server.tool()`の第二引数（説明文）にどういう場面でどういうふうに使えるか、取得・変更できる具体的項目、出力形式、使用ケースなどを明記し、AIのツール選択時のトークン消費量を最小化する（「AI向け MCP Tool 実装ガイドライン」参照）

### テスト

- 開発サーバー経由での手動テスト
- `pnpm type-check`による型チェック
- 統合テスト用のプレビューへのデプロイ

## 主要依存関係

### 本番依存関係

- `@cloudflare/workers-oauth-provider` (^0.0.5) - Workers用のOAuthプロバイダー
- `@modelcontextprotocol/sdk` (^1.13.0) - MCPプロトコル実装
- `agents` (^0.0.95) - MCPエージェントフレームワーク
- `hono` (^4.8.2) - リクエスト処理用のHTTPフレームワーク
- `workers-mcp` (^0.0.13) - Workers用のMCPユーティリティ
- `zod` (^3.25.67) - ツールスキーマ用のランタイム型検証

### 開発依存関係

- `@cloudflare/workers-types` (^4.20250620.0) - Cloudflare Workers型定義
- `@biomejs/biome` (^1.10.2) - コードフォーマッティングとリンティング
- `typescript` (^5.8.3) - TypeScriptコンパイラ
- `wrangler` (^4.20.5) - Cloudflare Workers CLI

## エラーハンドリング

### 中央集権化されたエラーハンドリング

- `src/api/common/error-handler.ts` - API操作用の中央集権化されたエラーハンドリング
- 全ツールはtry-catchブロックで一貫したエラーハンドリングを使用
- OAuthエラーは適応的フォーマット（ブラウザ用HTML、API用JSON）でHTTPエラーレスポンスを返す
- APIエラーはMCPレスポンス用に適切にフォーマット

### エラーパターン

- 全てのAPI呼び出しでtry-catchブロック
- MCPツールレスポンスを通じた適切なエラー伝播
- デバッグと監視のためのログ

## TypeScript設定

### コンパイラオプション

- **Target**: ES2021
- **Module**: ES2022
- **Module Resolution**: Bundler
- **Strict Mode**: 有効
- **No Emit**: True（Workersがバンドリングを処理）
- **Node互換性**: 互換性フラグ経由で有効

### 型定義

- `worker-configuration.d.ts`のカスタムワーカー型
- ランタイム検証用のZodスキーマ
- MCPツールとレスポンスの適切な型付け

## デプロイメント

### 本番デプロイメント

1. 全てのシークレットが本番環境で設定されていることを確認
2. `pnpm type-check`を実行してコードを検証
3. `pnpm deploy`でデプロイ
4. `npx wrangler logs`でログを監視

### 環境の考慮事項

- Cloudflare Workers Edge Runtime
- 状態管理用のDurable Objects
- OAuthトークン用のKVストレージ
- 監視用の可観測性が有効

## コードスタイルガイドライン

### 一般原則

- TypeScriptのstrict modeに従う
- 説明的な変数名と関数名を使用
- 適切なエラーハンドリングを実装
- promiseよりもasync/awaitを使用
- 継承よりもコンポジションを選択

### ファイル構成

- 関連機能をモジュールでグループ化
- 適切な場所でバレルエクスポートを使用
- ハンドラー、ツール、ユーティリティを分離して保持
- 一貫した命名規則に従う

## 一般的な問題と解決策

### OAuth問題

- `CLICKUP_CLIENT_ID`と`CLICKUP_CLIENT_SECRET`が適切に設定されていることを確認
- KVネームスペース設定を確認
- OAuthリダイレクトURLがClickUpアプリ設定と一致することを確認

### MCPツール問題

- Zodで入力スキーマを検証
- 一貫したエラーハンドリングパターンを使用
- 適切なJSONフォーマットのためのツールレスポンステスト

### 開発問題

- ローカル開発に`pnpm dev`を使用
- wrangler.jsonc内の互換性フラグを確認
- Node.js互換性が有効であることを確認

## タスク完了のベストプラクティス

### 開発ワークフロー

- 全てのタスクが終了したら、`pnpm type-check`を実行して型エラーがないかを確認してください。型エラーがあったら修正してください

## Biome設定とフォーマッティング

このプロジェクトでは、PrettierからBiomeに移行してコードフォーマッティングとリンティングを統一しています。

### Biome設定（biome.json）

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "**/*.ts",
      "**/*.js",
      "**/*.json",
      "**/*.md",
      "**/*.html",
      "**/*.css",
      "**/*.scss",
      "**/*.yaml",
      "**/*.yml"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

### フォーマッティング規則

- **インデント**: タブ（4スペース相当）
- **引用符**: ダブルクォート（"）
- **自動import整理**: 有効
- **推奨ルール**: 全て有効
- **対象ファイル**: TypeScript、JavaScript、JSON、Markdown、HTML、CSS、YAML

### 開発ワークフロー

1. **開発中**: 
   - エディターでの自動フォーマット設定を推奨
   - VS Codeの場合：Biome拡張機能をインストール

2. **コミット前**:
   ```bash
   pnpm format    # コードフォーマット
   pnpm lint      # リンティング
   pnpm fix       # 自動修正可能な問題を修正
   pnpm type-check # 型チェック
   ```

3. **CI/CD**:
   - GitHub ActionsでBiomeによるフォーマット・リンティングチェック
   - フォーマット違反やリンティングエラーがある場合はビルド失敗

### エディター設定

VS Codeの場合、`.vscode/settings.json`に以下を追加することを推奨：

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit"
  }
}
```

### 移行のメリット

- **パフォーマンス**: BiomeはRustで書かれており、Prettierより高速
- **統一性**: フォーマッティングとリンティングが一つのツールで完結
- **設定シンプル**: 一つの設定ファイルで全てを管理
- **IDE統合**: VS Code、WebStorm等で優れた統合サポート

# AI向け MCP Tool 実装ガイドライン

## 概要

MCPサーバーのAI使用を最適化し、トークン消費とThinking時間を削減するためのガイドラインです。

## ツール説明文（第二引数）の設計原則

### ❌ 避けるべき説明文

```typescript
// 曖昧で判断に迷う
"タスクに関する操作を行います";
"チケットを処理します";
"情報を取得します";

// 過度に詳細で冗長
"ClickUpプラットフォームのAPIを使用してタスクの詳細情報を取得し、フォーマットされた形式で返却します";
```

### ✅ 推奨する説明文

```typescript
// 詳細で具体的、使用ケースと機能を明記
"指定されたタスクIDのClickUpチケット詳細を完全取得します。タスク名・説明・現在ステータス・優先度・担当者一覧（名前・メール）・タグ・期限日・開始日・作成日・更新日・所属スペース/フォルダー/リスト情報・ClickUp直接リンクを含む全項目を構造化されたMarkdown形式で表示。進捗確認・レビュー・報告書作成に最適";

"ClickUpチケットの基本情報を編集・更新するツールです。タスク名の変更（リネーム）・詳細説明文の追加/修正・ステータス変更（未開始→進行中→完了など）が可能。複数フィールドの同時一括更新に対応し、変更履歴も自動記録。プロジェクト管理・進捗更新・情報整理・ワークフロー進行に使用。更新後は変更内容をMarkdown形式で確認表示";

"現在認証ユーザーに割り当てられているClickUpタスクの一覧を取得します。各タスクのID・名前・ステータス・優先度・期限・担当者・所属リスト・ClickUpリンクを含む詳細情報をページネーション対応で表示。進捗管理・日次レビュー・作業計画立案・チーム調整・優先度確認に使用。緊急度や期限に応じた視覚的表示（絵文字）で直感的な状況把握が可能";
```

### 説明文の最適化ルール

1. **動詞を明確に**: 「確認」「更新」「振り分け」「検索」「取得」など具体的な動作
2. **対象を明示**: 「チケット（タスク）」「ユーザー情報」「ワークスペース」
3. **詳細な機能説明**: 取得/変更できる具体的項目を列挙（名前・ステータス・担当者・期限など）
4. **使用ケースを明記**: どのような場面で使うツールかを具体的に記述
5. **出力形式を説明**: Markdown形式・構造化表示・視覚的表現（絵文字）等
6. **専門用語を統一**: 「チケット（タスク）」のように併記で理解を助ける
7. **敬語は使わない**: 「します」で統一、「いたします」は避ける

## パラメータ設計の最適化

### ❌ 非効率なパラメータ設計

```typescript
{
    // 型が曖昧
    id: z.any().describe("ID"),
    // 説明が不十分
    data: z.object({}).describe("データ"),
    // オプション過多
    option1: z.string().optional(),
    option2: z.string().optional(),
    option3: z.string().optional(),
    // ...
}
```

### ✅ 効率的なパラメータ設計

```typescript
{
    // 型と用途が明確
    taskId: z.string().describe("確認するタスクのID"),
    // 必須パラメータを最小限に
    name: z.string().optional().describe("新しいタスク名"),
    // グループ化で理解しやすく
    assigneeIds: z.array(z.string()).describe("追加する担当者のユーザーIDリスト"),
}
```

### パラメータ最適化ルール

1. **必須パラメータを最小限に**: AIの判断コストを削減
2. **型を明確に指定**: `string`, `number`, `boolean`, `array`
3. **説明は具体例を含む**: 「タスクのID（例: 123abc）」
4. **関連パラメータをグループ化**: 同じ目的のパラメータは近くに配置
5. **デフォルト値を活用**: オプション引数にはデフォルト値を設定

## レスポンススキーマの効率化

### ❌ 非効率なレスポンス

```typescript
{
    type: "object",
    properties: {
        // 深すぎるネスト
        data: {
            type: "object",
            properties: {
                task: {
                    type: "object",
                    properties: {
                        details: { /* ... */ }
                    }
                }
            }
        },
        // 不要な詳細情報
        metadata: { /* 大量のメタデータ */ }
    }
}
```

### ✅ 効率的なレスポンス

```typescript
{
    type: "object",
    properties: {
        // フラットな構造
        id: { type: "string", description: "タスクID" },
        name: { type: "string", description: "タスク名" },
        status: { type: "string", description: "現在のステータス" },
        // 必要最小限の情報
        assignees: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    username: { type: "string" }
                }
            }
        }
    },
    required: ["id", "name"] // 必須フィールドを明確に
}
```

## エラーハンドリングの標準化

### 統一されたエラー形式

```typescript
try {
  const result = await clickupClient.someMethod();
  return { content: [{ type: "text", text: formatResult(result) }] };
} catch (error) {
  // 標準化されたエラーメッセージ
  throw new Error(`操作に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
}
```

### エラーメッセージの原則

1. **一貫性**: 「〜に失敗しました」で統一
2. **具体性**: 「チケット情報の取得に失敗」など操作を明記
3. **簡潔性**: 20文字以内を目指す

## トークン効率化のテクニック

### 1. レスポンス内容の最適化

```typescript
// ❌ 冗長なレスポンス
text: `タスクの詳細情報を以下に示します。このタスクは...（長い説明）`;

// ✅ 簡潔なレスポンス
text: `# タスク詳細\n\n**${task.name}**\n\nID: ${task.id}\n\n## 基本情報\n- **ステータス**: ${task.status}\n...`;
```

### 2. 構造化された出力

- Markdownを活用した見やすい構造
- 箇条書きでの情報整理
- 絵文字を使った視覚的な区別（✅ ❌ 👥 📋）

### 3. 必要最小限の情報

```typescript
// AIが判断に必要な情報のみを含める
const essentialData = {
  id: task.id,
  name: task.name,
  status: task.status,
  assignees: task.assignees.map((a) => a.username),
};
```

## Thinking削減のためのベストプラクティス

### 1. 明確な命名規則

```typescript
// 動詞 + 対象 の形式
"getTask"; // 取得 + タスク
"updateTask"; // 更新 + タスク
"assignTask"; // 割り当て + タスク
"searchTasks"; // 検索 + タスク（複数）
```

### 2. 予測可能なパラメータ名

```typescript
// 一貫した命名
taskId; // 常にこの形式
assigneeIds; // 複数の場合は複数形
listId; // 対象を明確に
workspaceId; // スコープを明示
```

### 3. スキーマ説明の標準化

```typescript
// パターン化された説明文
{ type: "string", description: "〜のID" }
{ type: "string", description: "新しい〜" }
{ type: "array", description: "〜のリスト" }
{ type: "boolean", description: "〜かどうか" }
```

## 実装チェックリスト

### ツール定義時

- [ ] 説明文は15文字以内で具体的
- [ ] パラメータは必要最小限
- [ ] 型定義が明確
- [ ] レスポンススキーマがフラット構造
- [ ] エラーハンドリングが統一されている

### コード品質

- [ ] 命名規則が一貫している
- [ ] 不要なオプションパラメータがない
- [ ] レスポンス形式が標準化されている
- [ ] トークン使用量が最適化されている

### AI使用体験

- [ ] 説明文から用途が即座に判断できる
- [ ] パラメータが直感的に理解できる
- [ ] エラーメッセージが分かりやすい
- [ ] レスポンスが構造化されている

## 効果測定

### 最適化前後の比較指標

1. **Thinking時間**: ツール選択の迷い時間
2. **トークン使用量**: リクエスト/レスポンスサイズ
3. **エラー率**: 不適切なツール使用の頻度
4. **ユーザー満足度**: 期待通りの結果を得られる割合

このガイドラインに従うことで、AIが効率的にMCPツールを使用し、ユーザーエクスペリエンスを向上させることができます。

## 実装例の詳細説明文テンプレート

### 基本形式

```
[動作] + [対象] + [詳細機能] + [取得/変更項目] + [出力形式] + [使用ケース]
```

### 完成版ツール説明文の特徴

- **150-300文字程度**: AIが必要な情報を全て把握できる適切な長さ
- **項目の明記**: 取得・変更できる具体的なデータを列挙
- **使用場面の提示**: 実際の業務でどう使うかを具体的に記述
- **技術仕様の説明**: ページネーション・Markdown出力・視覚的表示等
- **処理結果の説明**: 何がどのような形式で返されるかを明確化

これにより、AIがツール選択時に迷うことなく、ユーザーの意図に最も適したツールを瞬時に判断できるようになります。

# コーディング規則

## 1. 開発環境・ワークフロー規則

### 必須チェック

- **コミット前**: 必ず `pnpm type-check` を実行
- **コードフォーマット**: 必ず `pnpm format` を実行（Biome使用）
- **リンティング**: 必ず `pnpm lint` を実行
- **環境構築**: 必要なシークレットとKVネームスペースを設定

### 開発サーバー

```bash
# ローカル開発サーバー起動（ポート8788）
pnpm dev
```

### 禁止事項

- `any`型の使用
- ハードコードされた設定値
- 秘密情報のコードへの埋め込み
- 一貫性のないエラーハンドリング

## 2. TypeScript コーディング規則

### 基本方針

- **厳密モード**: strict mode を使用
- **型定義**: 明示的に記述、`any`型を避ける
- **非同期処理**: async/await を使用、Promise チェーンは避ける

### 型定義パターン

```typescript
// ✅ 良い例
function processTask(task: Task): Promise<ProcessedTask> {
  return processTaskAsync(task);
}

// ❌ 悪い例
function processTask(task: any): any {
  return processTaskAsync(task);
}
```

### インポート規則

```typescript
// パスマッピング使用
import type { ServiceDependencies } from "#/types";
import { ClickUpAuth } from "#/auth/user";
```

## 3. アーキテクチャパターン

### MCPサーバー実装

```typescript
export class MyMCP extends McpAgent<Env, Record<string, never>, UserProps> {
  server = new McpServer({
    name: "ClickUp MCP Server",
    version: "1.0.0",
  });

  async init() {
    const clickupClient = new ClickUpClient(deps);
    const getAccessToken = () => this.props.accessToken;

    registerAuthTools(this.server, clickupClient, getAccessToken);
    registerTaskTools(this.server, clickupClient, getAccessToken);
  }
}
```

### 依存性注入パターン

```typescript
export class ClickUpClient {
  constructor(private deps: ServiceDependencies) {
    this.auth = new ClickUpAuth(deps);
    this.taskBasic = new ClickUpTaskBasic(deps);
  }
}
```

### 機能別モジュール分割

- `src/api/` - API クライアント実装
- `src/tools/` - MCP ツール登録関数
- `src/handlers/` - HTTP リクエストハンドラー
- `src/auth/` - 認証関連ロジック

### ClickUp APIクライアント詳細構造

#### 統合クライアント（ClickUpClient）

```typescript
// src/api/index.ts
export class ClickUpClient {
  private auth: ClickUpAuth;
  private taskBasic: ClickUpTaskBasic;
  private taskSearch: ClickUpTaskSearch;
  private advancedSearch: ClickUpAdvancedSearch;
  private formatters: DataFormatters;

  constructor(deps: ServiceDependencies) {
    this.auth = new ClickUpAuth(deps);
    this.taskBasic = new ClickUpTaskBasic(deps);
    this.taskSearch = new ClickUpTaskSearch(deps);
    this.advancedSearch = new ClickUpAdvancedSearch(deps);
    this.formatters = new DataFormatters(deps);
  }

  // 認証関連
  async getUserInfo(accessToken: string): Promise<UserInfo>
  async getWorkspaces(accessToken: string): Promise<Workspace[]>

  // タスク基本操作
  async getTask(accessToken: string, taskId: string): Promise<Task>
  async updateTask(accessToken: string, taskId: string, updates: TaskUpdate): Promise<Task>
  async assignTask(accessToken: string, taskId: string, assigneeIds: string[]): Promise<Task>

  // タスク検索
  async getMyTasks(accessToken: string, page?: number, limit?: number): Promise<PaginatedTasks>
  async searchTasks(accessToken: string, query: string, page?: number, limit?: number): Promise<PaginatedTasks>
  async advancedSearchTasks(accessToken: string, filters: AdvancedSearchFilters): Promise<PaginatedTasks>
}
```

#### 基本タスク操作（ClickUpTaskBasic）

```typescript
// src/api/basic.ts
export class ClickUpTaskBasic {
  // タスク詳細取得
  async getTask(accessToken: string, taskId: string): Promise<Task>
  
  // タスク更新（名前、説明、ステータス等）
  async updateTask(accessToken: string, taskId: string, updates: TaskUpdate): Promise<Task>
  
  // 担当者変更
  async assignTask(accessToken: string, taskId: string, assigneeIds: string[]): Promise<Task>
  
  // その他のタスク操作
  async createTask(accessToken: string, listId: string, taskData: CreateTaskData): Promise<Task>
  async deleteTask(accessToken: string, taskId: string): Promise<void>
}
```

#### タスク検索（ClickUpTaskSearch）

```typescript
// src/api/search.ts
export class ClickUpTaskSearch {
  // 自分のタスク取得
  async getMyTasks(accessToken: string, page: number = 0, limit: number = 15): Promise<PaginatedTasks>
  
  // キーワード検索
  async searchTasks(accessToken: string, query: string, page: number = 0, limit: number = 15): Promise<PaginatedTasks>
  
  // チーム内のタスク取得
  async getTeamTasks(accessToken: string, teamId: string, page?: number, limit?: number): Promise<PaginatedTasks>
}
```

#### 詳細検索（ClickUpAdvancedSearch）

```typescript
// src/api/advanced-search.ts
export class ClickUpAdvancedSearch {
  // 高度な絞り込み検索
  async advancedSearchTasks(accessToken: string, filters: AdvancedSearchFilters): Promise<PaginatedTasks>
  
  // カスタムフィールドによる検索
  async searchByCustomFields(accessToken: string, customFields: CustomFieldFilter[]): Promise<PaginatedTasks>
  
  // 日付範囲による検索
  async searchByDateRange(accessToken: string, dateRange: DateRangeFilter): Promise<PaginatedTasks>
  
  // 複合条件検索
  async searchWithMultipleFilters(accessToken: string, filters: MultipleFilters): Promise<PaginatedTasks>
}
```

#### データフォーマッター（DataFormatters）

```typescript
// src/utils/formatters.ts
export class DataFormatters {
  // タスク情報のフォーマット
  formatTaskData(task: any): FormattedTask
  
  // 日付フォーマット
  formatTimestamp(timestamp: string | number | null): string | null
  
  // ユーザー情報のフォーマット
  formatUserData(user: any): FormattedUser
  
  // ワークスペース情報のフォーマット
  formatWorkspaceData(workspace: any): FormattedWorkspace
  
  // ページネーション情報のフォーマット
  formatPaginationData(data: any[], total: number, page: number, limit: number): PaginatedResponse
}
```

### 依存性注入パターン

```typescript
// 依存性の型定義
export interface ServiceDependencies {
  env: Env;
  config: AppConfig;
}

// 各クラスは統一された依存性を受け取る
export class ClickUpAuth {
  constructor(private deps: ServiceDependencies) {}
}

export class ClickUpTaskBasic {
  constructor(private deps: ServiceDependencies) {}
}

export class ClickUpTaskSearch {
  constructor(private deps: ServiceDependencies) {}
}
```

## 4. MCP Tool 実装規則

### ツール登録パターン

```typescript
export function registerAuthTools(server: McpServer, clickupClient: ClickUpClient, getAccessToken: () => string) {
  server.tool("getUserInfo", "ClickUpから認証されたユーザー情報を取得します", {}, responseSchema, async () => {
    // 実装
  });
}
```

### 説明文作成規則

- **詳細で具体的**: 取得・変更できる具体的項目を列挙
- **使用ケース明記**: どのような場面で使うかを記述
- **出力形式説明**: Markdown形式・構造化表示等を説明
- **150-300文字程度**: AIが必要な情報を全て把握できる適切な長さ

### レスポンス形式

```typescript
// 成功時
return {
  content: [
    {
      text: JSON.stringify(data, null, 2),
      type: "text",
    },
  ],
};

// エラー時
throw new Error(`操作に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
```

## 5. エラーハンドリング規則

### 統一パターン

```typescript
try {
  const data = await clickupClient.someMethod(getAccessToken());
  return {
    content: [
      {
        text: JSON.stringify(data, null, 2),
        type: "text",
      },
    ],
  };
} catch (error) {
  throw new Error(`〜の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
}
```

### API呼び出しパターン

```typescript
const response = await fetch(url, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});

if (!response.ok) {
  throw new Error(`API呼び出し失敗: ${response.status}`);
}
```

### 適応的エラーレスポンス

```typescript
function createAdaptiveErrorResponse(request: Request, error: string, statusCode: number) {
  if (isBrowserRequest(request)) {
    return createErrorPageResponse(error, statusCode);
  } else {
    return createErrorResponse(error, statusCode);
  }
}
```

## 6. コードスタイル規則

### 一般原則

- **説明的命名**: 変数名と関数名を説明的に記述
- **コンポジション優先**: 継承よりもコンポジションを選択
- **モジュール分割**: 関連機能をモジュールでグループ化

### 命名規則

```typescript
// 動詞 + 対象 の形式
"getTask"; // 取得 + タスク
"updateTask"; // 更新 + タスク
"assignTask"; // 割り当て + タスク
"searchTasks"; // 検索 + タスク（複数）
```

### ファイル構成

```
src/
├── index.ts          # エントリーポイント
├── handlers/         # リクエストハンドラー
├── tools/            # MCPツール実装
├── auth/             # OAuth認証
└── utils/            # ユーティリティ
```

## 7. 日本語対応規則

### 文言統一

- **ツール説明文**: 日本語で記述
- **エラーメッセージ**: 日本語で提供
- **敬語**: 「します」で統一、「いたします」は避ける
- **専門用語**: 「チケット（タスク）」のように併記

### レスポンス形式

```typescript
// Markdown形式での構造化表示
text: `# タスク詳細\n\n**${task.name}**\n\nID: ${task.id}\n\n## 基本情報\n- **ステータス**: ${task.status}\n...`;
```

## 8. セキュリティ規則

### 秘密情報管理

```bash
# 必要なシークレット
npx wrangler secret put CLICKUP_CLIENT_ID
npx wrangler secret put CLICKUP_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

### ログ出力

- **開発環境**: `console.log` 使用可能
- **本番環境**: 機密情報をログに含めない
- **エラー情報**: 詳細に記録

## 9. パフォーマンス規則

### トークン効率化

- **簡潔なレスポンス**: 冗長な説明文を避ける
- **構造化出力**: Markdownを活用した見やすい構造
- **必要最小限**: AIが判断に必要な情報のみを含める

### 並列処理

```typescript
// 複数の非同期処理は並列実行
const [tasks, workspaces] = await Promise.all([clickupClient.getMyTasks(accessToken), clickupClient.getWorkspaces(accessToken)]);
```

## 10. テスト・品質管理規則

### 型チェック

```bash
# 必須実行
pnpm type-check
```

### デバッグ

- **ローカル開発**: `pnpm dev` を使用
- **ログ確認**: `npx wrangler logs` でログを監視
- **型エラー修正**: すべての型エラーを解決してからコミット

### コミット規約

- `feat:` 新機能追加
- `fix:` バグ修正
- `docs:` ドキュメント更新
- `style:` コードスタイル修正
- `refactor:` リファクタリング
- `test:` テスト追加・修正
- `chore:` その他の変更

## 11. OAuth認証規則

### 認証フロー

```typescript
// MyMCPクラス内でthis.propsとして利用可能
props: {
  accessToken,
  email,
  id,
  username,
} as UserProps
```

### スコープ設定

- デフォルトスコープでワークスペース、スペース、フォルダ、リスト、タスクへの読み書きアクセス
- 時間追跡エントリの作成と管理用の時間追跡権限を含む

## 12. 実装完了時の必須チェック

### 開発完了時

1. `pnpm type-check` を実行して型エラーがないことを確認
2. `pnpm format` でコードをフォーマット（Biome使用）
3. `pnpm lint` でリンティングを実行
4. 全てのエラーハンドリングが統一されていることを確認
5. MCPツールの説明文が詳細で具体的であることを確認
6. 日本語対応が適切であることを確認

### デプロイ前

1. 必要なシークレットが設定されていることを確認
2. KVネームスペースが作成されていることを確認
3. テスト実行とログ確認
4. OAuth設定が正しいことを確認

これらの規則に従うことで、一貫性のある保守可能なコードベースを維持できます。

# 汎用的なMCPサーバー開発ガイド

このClickUpプロジェクトで培った経験を基に、どの外部API統合でも使える汎用的なMCPサーバー開発のベストプラクティスをまとめます。

## 1. 基本アーキテクチャパターン

### MCPサーバーの基本構造

```typescript
// 基本的なMCPサーバークラス
export class MyMCP extends McpAgent<Env, Record<string, never>, UserProps> {
  server = new McpServer({
    name: "Your API MCP Server",
    version: "1.0.0",
    icon: "https://example.com/icon.ico",
  });

  async init() {
    // 依存性注入の設定
    const deps: ServiceDependencies = {
      env: this.env,
      config: createAppConfig(this.env),
    };

    // APIクライアントの初期化
    const apiClient = new YourApiClient(deps);
    const getAccessToken = () => this.props.accessToken;

    // 機能別ツール登録
    registerAuthTools(this.server, apiClient, getAccessToken);
    registerCoreTools(this.server, apiClient, getAccessToken);
    registerSearchTools(this.server, apiClient, getAccessToken);
  }
}
```

### 依存性注入パターン

```typescript
// 依存性の型定義
export interface ServiceDependencies {
  env: Env;
  config: AppConfig;
}

// 統合APIクライアント
export class YourApiClient {
  private auth: AuthService;
  private core: CoreService;
  private search: SearchService;
  private formatters: DataFormatters;

  constructor(private deps: ServiceDependencies) {
    this.auth = new AuthService(deps);
    this.core = new CoreService(deps);
    this.search = new SearchService(deps);
    this.formatters = new DataFormatters(deps);
  }

  // 公開メソッド
  async getUser(accessToken: string) {
    return this.auth.getUser(accessToken);
  }

  async getData(accessToken: string, id: string) {
    const rawData = await this.core.getData(accessToken, id);
    return this.formatters.formatData(rawData);
  }
}
```

## 2. ツール設計の黄金律

### 説明文の最適化パターン

```typescript
// ✅ 効果的な説明文の例
server.tool(
  "toolName",
  `# ツール名・概要

## 用途
- 主要な用途1
- 主要な用途2
- 主要な用途3

## 使用場面
- 具体的な使用場面1
- 具体的な使用場面2
- 業務での活用例

## パフォーマンス
- **消費トークン**: 約XXX-XXXトークン
- **応答時間**: X-X秒
- **APIコール**: X回

## 取得・変更データ
具体的なデータ項目を列挙（名前、ID、ステータス、作成日等）

## 出力形式
Markdown形式・構造化表示・視覚的表現（絵文字）等の説明`,
  parameterSchema,
  responseSchema,
  handler,
);
```

### パラメータ設計の原則

```typescript
// 効率的なパラメータ設計
{
    // 必須パラメータを最小限に
    id: z.string().describe("対象リソースのID"),

    // オプションパラメータはデフォルト値を設定
    limit: z.number().optional().default(15).describe("取得件数（デフォルト: 15、最大: 100）"),

    // 関連パラメータをグループ化
    assigneeIds: z.array(z.string()).optional().describe("担当者IDのリスト"),
    removeAssigneeIds: z.array(z.string()).optional().describe("削除する担当者IDのリスト"),

    // 型を明確に指定
    includeArchived: z.boolean().optional().default(false).describe("アーカイブ済みを含むかどうか")
}
```

## 3. エラーハンドリングの標準化

### 統一されたエラーレスポンス

```typescript
// エラーレスポンスの型定義
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}

// 統一されたエラーハンドラー
export class ErrorHandler {
  static createErrorResponse(error: string, statusCode: number = 500, code?: string): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error,
        code,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  static createAdaptiveErrorResponse(request: Request, error: string, statusCode: number, code?: string): Response {
    // ブラウザからのリクエストかどうかを判定
    const isBrowser = this.isBrowserRequest(request);

    if (isBrowser) {
      return this.createErrorPageResponse(error, statusCode, code);
    } else {
      return this.createErrorResponse(error, statusCode, code);
    }
  }

  private static isBrowserRequest(request: Request): boolean {
    const userAgent = request.headers.get("User-Agent") || "";
    const accept = request.headers.get("Accept") || "";

    return accept.includes("text/html") || userAgent.includes("Mozilla") || userAgent.includes("Chrome");
  }
}
```

### MCPツールのエラーハンドリング

```typescript
// 統一されたMCPツールエラーパターン
async function mcpToolHandler(args: any): Promise<any> {
  try {
    const result = await apiClient.someMethod(getAccessToken(), args);

    return {
      content: [
        {
          text: JSON.stringify(result, null, 2),
          type: "text",
        },
      ],
    };
  } catch (error) {
    // 統一されたエラー形式
    throw new Error(`操作に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

## 4. 型安全性の確保

### Zodスキーマの活用

```typescript
// パラメータスキーマの定義
const UpdateResourceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// レスポンススキーマの定義
const ResourceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// 型の生成
type UpdateResourceParams = z.infer<typeof UpdateResourceSchema>;
type ResourceResponse = z.infer<typeof ResourceResponseSchema>;
```

### 厳密な型定義

```typescript
// 基本的な型定義
export interface UserProps extends Record<string, unknown> {
  id: string;
  username: string;
  email: string;
  accessToken: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
}

export interface ServiceDependencies {
  env: Env;
  config: AppConfig;
}
```

## 5. 認証・セキュリティパターン

### OAuth実装の標準パターン

```typescript
// OAuthフロー
app.get("/authorize", async (c) => {
  const { redirectTo } = await c.env.OAUTH_PROVIDER.initializeAuthorization({
    metadata: { label: "API Integration" },
    request: c.req.raw,
    redirectTo: getUpstreamAuthorizeUrl({
      upstream_url: "https://api.example.com/oauth/authorize",
      client_id: c.env.API_CLIENT_ID,
      redirect_uri: `${getRequestOrigin(c.req.raw)}/callback`,
      scope: "read write",
    }),
    scope: "read write",
  });

  return Response.redirect(redirectTo);
});

app.get("/callback", async (c) => {
  try {
    const { code } = await c.env.OAUTH_PROVIDER.validateAuthorizationRequest(c.req.raw);

    // トークン取得
    const tokenResponse = await fetchUpstreamAuthToken({
      upstream_url: "https://api.example.com/oauth/token",
      client_id: c.env.API_CLIENT_ID,
      client_secret: c.env.API_CLIENT_SECRET,
      code,
      redirect_uri: `${getRequestOrigin(c.req.raw)}/callback`,
    });

    const { access_token } = tokenResponse;

    // ユーザー情報取得
    const userResponse = await fetch("https://api.example.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userData = await userResponse.json();

    // セッション完了
    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      metadata: { label: userData.username },
      props: {
        accessToken: access_token,
        email: userData.email,
        id: userData.id,
        username: userData.username,
      } as UserProps,
      request: c.req.raw,
      scope: "read write",
      userId: userData.username,
    });

    return Response.redirect(redirectTo);
  } catch (error) {
    return ErrorHandler.createAdaptiveErrorResponse(c.req.raw, "認証処理中にエラーが発生しました", 500);
  }
});
```

### 秘密情報管理

```bash
# 必要なシークレット
npx wrangler secret put API_CLIENT_ID
npx wrangler secret put API_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

## 6. データ処理・フォーマッターパターン

### 汎用的なデータフォーマッター

```typescript
export class DataFormatters {
  constructor(private deps: ServiceDependencies) {}

  /**
   * タイムスタンプを人間が読める形式に変換
   */
  formatTimestamp(timestamp: string | number | null): string | null {
    if (!timestamp) return null;

    const date = new Date(typeof timestamp === "string" ? parseInt(timestamp) : timestamp);
    if (isNaN(date.getTime())) return null;

    return date.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * APIレスポンスを標準形式に変換
   */
  formatApiResponse(data: any): any {
    return {
      // 基本情報
      id: data.id,
      name: data.name,
      description: data.description || null,
      status: data.status,

      // 日付情報（人間が読める形式）
      created_at: this.formatTimestamp(data.created_at),
      updated_at: this.formatTimestamp(data.updated_at),

      // 関連データ
      assignees:
        data.assignees?.map((assignee: any) => ({
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
        })) || [],

      // タグ
      tags: data.tags?.map((tag: any) => tag.name) || [],

      // URL
      url: data.url || null,
    };
  }

  /**
   * 大量データの並列処理
   */
  async fetchDataByIds(accessToken: string, ids: string[], page: number = 0, limit: number = 15) {
    const paginatedIds = ids.slice(page * limit, (page + 1) * limit);

    const dataPromises = paginatedIds.map(async (id: string) => {
      try {
        const response = await fetch(`${this.deps.config.apiBaseUrl}/data/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          return this.formatApiResponse(data);
        }
        return null;
      } catch (error) {
        console.warn(`データID ${id} の取得に失敗:`, error);
        return null;
      }
    });

    const results = (await Promise.all(dataPromises)).filter((data) => data !== null);
    return { data: results, total: ids.length };
  }
}
```

## 7. テスト・品質管理

### 開発ワークフロー

```bash
# 必須チェック
pnpm type-check      # 型チェック
pnpm lint           # コードリンティング
pnpm format         # コードフォーマット
pnpm test           # テスト実行
```

### 品質チェックリスト

- [ ] 全てのMCPツールに詳細な説明文がある
- [ ] エラーハンドリングが統一されている
- [ ] 型定義が厳密である
- [ ] 秘密情報がハードコードされていない
- [ ] パフォーマンス情報が記載されている
- [ ] 日本語対応が適切である

## 8. デプロイメント・運用

### 環境設定

```typescript
// 設定ファイルの例
export function createAppConfig(env: Env): AppConfig {
  return {
    apiBaseUrl: env.API_BASE_URL || "https://api.example.com/v1",
    tokenUrl: env.TOKEN_URL || "https://api.example.com/oauth/token",
    clientId: env.API_CLIENT_ID,
    clientSecret: env.API_CLIENT_SECRET,
    encryptionKey: env.COOKIE_ENCRYPTION_KEY,
    rateLimitPerMinute: 100,
    timeoutMs: 30000,
  };
}
```

### 監視・ログ

```typescript
// ログ設定
export class Logger {
  static info(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : "");
  }

  static error(message: string, error: Error) {
    console.error(`[ERROR] ${message}`, {
      message: error.message,
      stack: error.stack,
    });
  }

  static warn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data) : "");
  }
}
```

## 9. パフォーマンス最適化

### 並列処理の活用

```typescript
// 複数のAPIコールを並列実行
const [userData, projectData, taskData] = await Promise.all([
  apiClient.getUser(accessToken),
  apiClient.getProjects(accessToken),
  apiClient.getTasks(accessToken),
]);
```

### レスポンスサイズの最適化

```typescript
// 必要最小限の情報のみを返す
function createOptimizedResponse(data: any[]) {
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    // 不要な大きなデータは除外
    // rawData: item.rawData  // コメントアウト
  }));
}
```

## 10. 実装チェックリスト

### アーキテクチャ

- [ ] McpAgentを適切に拡張している
- [ ] 依存性注入パターンを使用している
- [ ] 機能別にモジュールを分割している
- [ ] 統合クライアントクラスを作成している

### ツール設計

- [ ] 説明文が150-300文字で具体的である
- [ ] パフォーマンス情報を記載している
- [ ] 使用場面を明記している
- [ ] パラメータが最小限である

### 品質・セキュリティ

- [ ] エラーハンドリングが統一されている
- [ ] 型定義が厳密である
- [ ] 秘密情報が適切に管理されている
- [ ] 適切なログ出力を行っている

### パフォーマンス

- [ ] 並列処理を活用している
- [ ] レスポンスサイズが最適化されている
- [ ] 適切なページネーションを実装している
- [ ] キャッシュ戦略を検討している

このガイドに従うことで、どの外部API統合でも効率的で保守可能なMCPサーバーを構築できます。特に、AIの使用効率とユーザーエクスペリエンスを最大化するための実装パターンを提供しています。
