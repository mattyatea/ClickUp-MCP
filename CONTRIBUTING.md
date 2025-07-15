# 貢献ガイドライン

ClickUp MCP Server プロジェクトへの貢献を歓迎します！

## 問題報告

何か問題を見つけた場合は、以下の方法で報告してください：

### ClickUpでの報告

問題を発見した場合は、ClickUpに下記の形で作成し、**@mattyatea** をアサインしてください。

- 問題の詳細な説明
- 再現手順
- 期待される動作
- 実際の動作
- 環境情報（OS、Claude Desktopなどのバージョンなど)
### GitHubでの報告

GitHubのIssueでも問題ないです。
その際は以下の情報を含めてください：

- 問題の詳細な説明
- 再現手順
- 期待される動作
- 実際の動作
- 環境情報（OS、Claude Desktopなどのバージョンなど)

## プルリクエスト

プルリクエストも大歓迎です！以下のガイドラインに従ってください。

### PRを作成する前に

1. **ブランチの作成**
   ```bash
   git checkout -b feature/your-feature-name
   # または
   git checkout -b fix/your-fix-name
   ```

2. **コードの品質チェック**
   ```bash
   # TypeScriptの型チェック
   pnpm type-check
   
   # Lintチェック
   pnpm lint
   
   # コードフォーマット
   pnpm fix
   ```

3. **コミットメッセージ**
   - 日本語または英語で明確に記載
   - 変更内容が分かるように具体的に

### コーディング規則

1. **TypeScript**
   - `any`型は使用しない
   - strict modeを維持
   - 適切な型定義を行う

2. **MCPツール開発**
   - 詳細な説明文（150-300文字）を必ず記載
   - エラーハンドリングを適切に実装
   - パフォーマンス情報を含める

3. **命名規則**
   - 変数名: camelCase
   - 定数: UPPER_SNAKE_CASE
   - クラス/インターフェース: PascalCase
   - ファイル名: kebab-case

4. **インポート**
   - パスマッピング（`#/`）を使用
   - 相対パスは避ける

### 新機能の追加

新しいClickUp APIツールを追加する場合：

1. `src/tools/`に新しいツールファイルを作成
2. ツールの実装（以下の形式で説明文を記載）：
   ```typescript
   `# ツール名
   
   ## 用途
   - 主要な用途1
   - 主要な用途2
   
   ## 使用場面
   - 具体的な使用場面
   
   ## パフォーマンス
   - **消費トークン**: 約XXX-XXXトークン
   - **応答時間**: X-X秒
   - **APIコール**: X回
   
   ## 取得・変更データ
   具体的なデータ項目を列挙
   
   ## 出力形式
   JSON形式で〜を返却`
   ```

3. `src/tools/index.ts`でエクスポート
4. `src/index.ts`の`init()`メソッドで登録

### テスト

現在、自動テストは実装されていませんが、以下の手動テストを行ってください：

1. ローカルで動作確認
   ```bash
   pnpm dev
   ```

2. Claude Codeでツールの動作を確認

## ドキュメント

コードの変更に応じて、以下のドキュメントも更新してください：

- README.md - 新機能や変更点を反映
- CLAUDE.md - 実装ガイドラインの更新が必要な場合

## 質問・相談

実装方法や設計について質問がある場合は：

1. GitHubのDiscussionsで相談
2. ClickUpで @mattyatea に質問
3. PRのドラフトを作成してフィードバックを求める

## ライセンス

このプロジェクトに貢献することで、あなたのコードがMITライセンスの下で公開されることに同意したものとみなされます。

## 参考リンク

- [ClickUp API ドキュメント](https://clickup.com/api)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript スタイルガイド](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)

ご協力ありがとうございます！🚀