# .cursor/rules 構造ガイド

このディレクトリには、Cursor IDEで使用する開発規則が整理されています。CLAUDE.mdの内容を反映した包括的なルールセットです。

## 📁 ファイル構造と責務

### 🔄 **汎用的な開発規則**（どのプロジェクトでも使用可能）

#### `development-workflow.mdc`
**環境設定・デプロイ・開発プロセス**
- 🔧 環境設定（シークレット、KV、環境変数）
- 🚀 開発サーバーの起動方法
- 📦 デプロイメント手順
- 🐛 デバッグ・ログ設定
- 📝 コミット規約
- 🚨 トラブルシューティング

#### `typescript-coding.mdc`
**TypeScriptコーディング規約**
- 🎯 基本方針（厳密モード、型安全性）
- 📝 型定義パターン
- 🔧 関数定義規約
- 📦 インポート・エクスポート規約
- 🛡️ エラーハンドリング
- 🎨 命名規約

#### `code-quality.mdc`
**品質管理・テスト・禁止事項**
- 🚫 禁止事項（any型、機密情報ハードコード等）
- ✅ 品質基準とチェックリスト
- 🧪 テスト戦略
- 📊 メトリクス・監視
- 🔧 静的解析ツール
- 📋 コードレビューガイド

### 🎯 **プロジェクト固有の規則**（このClickUpプロジェクト専用）

#### `mcp-implementation.mdc`
**MCP Tool実装ガイドライン（詳細版）**
- 🛠️ ツール登録パターン
- 📝 説明文最適化（AI向けガイドライン含む）
- 🔄 レスポンススキーマ設計
- 🌐 日本語対応
- 📋 新しいツール追加手順
- 🚀 トークン効率化テクニック

#### `clickup-integration.mdc`
**ClickUp API統合のベストプラクティス**
- 🔗 API呼び出しパターン
- 📊 レート制限対応
- 🔐 認証・セキュリティ
- 🎛️ 設定定数
- 📋 主要エンドポイント一覧

#### `architecture.mdc`
**アーキテクチャパターン**
- 🏗️ MCPサーバー実装構造
- 🔌 依存性注入パターン
- 📂 機能別モジュール分割
- 🔄 OAuth認証フロー
- 🎯 統合クライアントパターン

## 🔍 どのファイルを参照すべきか

| やりたいこと | 参照するファイル |
|-------------|----------------|
| 開発環境の設定 | `development-workflow.mdc` |
| TypeScriptコードの書き方 | `typescript-coding.mdc` |
| コード品質の確保 | `code-quality.mdc` |
| MCPツールの実装 | `mcp-implementation.mdc` |
| ClickUp API呼び出し | `clickup-integration.mdc` |
| 全体的な設計パターン | `architecture.mdc` |

## 🚀 新しい開発者向けクイックスタート

### 1. 環境設定（初回のみ）
```bash
# development-workflow.mdc を参照
pnpm install
npx wrangler secret put CLICKUP_CLIENT_ID
npx wrangler secret put CLICKUP_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
npx wrangler kv:namespace create "OAUTH_KV"
```

### 2. 開発開始
```bash
# 開発サーバー起動
pnpm dev

# 型チェック
pnpm type-check

# フォーマット
npx prettier --write .
```

### 3. 新機能開発

#### MCPツールを追加する場合
1. `mcp-implementation.mdc` を参照
2. `src/tools/` に新しいツールファイルを作成
3. `src/index.ts` でツールを登録

#### ClickUp API を呼び出す場合
1. `clickup-integration.mdc` を参照
2. `src/api/` に新しいAPIクライアントを作成
3. エラーハンドリングを統一

### 4. コード品質確保
```bash
# 品質チェック（コミット前に必須）
pnpm type-check
npx prettier --write .
```

## 📋 各ファイルの`alwaysApply`設定

| ファイル | `alwaysApply` | 理由 |
|---------|---------------|------|
| `development-workflow.mdc` | `true` | 開発プロセスは常に適用 |
| `typescript-coding.mdc` | `true` | TypeScriptコーディング規約は常に適用 |
| `code-quality.mdc` | `true` | 品質管理は常に適用 |
| `mcp-implementation.mdc` | `true` | MCPツール関連は常に適用 |
| `clickup-integration.mdc` | `true` | ClickUp API関連は常に適用 |
| `architecture.mdc` | `true` | アーキテクチャは常に適用 |

## 🔄 ファイルの更新・保守

### 更新タイミング
- **汎用ファイル**: 新しいベストプラクティス発見時
- **プロジェクト固有ファイル**: 機能追加・変更時
- **全体**: 大きな設計変更時

### 更新手順
1. 該当するファイルを編集
2. `git add .cursor/rules/`
3. `git commit -m "docs: ルール更新"`
4. チーム全体に変更を通知

## 📝 よくある質問

### Q: 新しいルールを追加したい
A: 適切な既存ファイルに追加するか、新しいファイルを作成してください。

### Q: 他のプロジェクトでも使いたい
A: 汎用的なファイル（development-workflow, typescript-coding, code-quality）をコピーして使用してください。

### Q: ルールが矛盾している
A: 優先順位は以下の通りです：
1. プロジェクト固有 > 汎用的
2. 新しいルール > 古いルール
3. 具体的 > 抽象的

## 🎯 次のステップ

1. 全てのファイルを一度読み通す
2. 実際のコードで実践する
3. 疑問点があれば適切なファイルを参照
4. 改善点があれば積極的に提案・更新

このルール構造により、開発者は必要な情報を素早く見つけ、一貫性のある高品質なコードを書くことができます。