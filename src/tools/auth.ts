/**
 * ClickUp MCP Tools - 認証・ユーザー関連
 * 
 * ユーザー情報やワークスペース取得などの認証関連ツールを提供
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ClickUpClient } from "#/api";

/**
 * 認証・ユーザー関連のMCPツールを登録
 */
export function registerAuthTools(server: McpServer, clickupClient: ClickUpClient, getAccessToken: () => string) {
    // ClickUp ユーザー情報取得ツール
    server.tool(
        "getUserInfo",
        `# ユーザー情報取得

## 用途
- API接続テスト・認証確認
- 現在のログインユーザーの確認
- トラブルシューティング時のアカウント特定

## 使用場面
- セッション開始時の認証状態確認
- 複数アカウント使用時のユーザー識別
- サポート対応でのアカウント情報確認

## パフォーマンス
- **消費トークン**: 約50-100トークン
- **応答時間**: 0.5-1秒
- **APIコール**: 1回（軽量）
`,
        {},
        {
            type: "object",
            properties: {
                user: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "ユーザーID" },
                        username: { type: "string", description: "ユーザー名" },
                        email: { type: "string", description: "メールアドレス" }
                    },
                    required: ["id", "username", "email"]
                }
            },
            required: ["user"]
        },
        async () => {
            try {
                const data = await clickupClient.getUserInfo(getAccessToken());
                return {
                    content: [
                        {
                            text: JSON.stringify(data, null, 2),
                            type: "text",
                        },
                    ],
                };
            } catch (error) {
                throw new Error(`ユーザー情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // ClickUp ワークスペース取得ツール
    server.tool(
        "getWorkspaces",
        `# ワークスペース一覧取得

## 用途
- 利用可能なチーム・ワークスペースの確認
- チーム切り替え前の選択肢表示
- 権限範囲の確認

## 使用場面
- 初回セットアップ時のワークスペース選択
- マルチチーム環境での作業範囲確認
- 他のツール使用前のteamId特定

## パフォーマンス
- **消費トークン**: 約100-200トークン
- **応答時間**: 1-2秒
- **APIコール**: 1回

## 取得データ
各チームのID、名前、カラー、アバター画像URL

## 注意点
このツールで取得したteamIdは他の検索ツールで必須パラメータとして使用`,
        {},
        {
            type: "object",
            properties: {
                teams: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "チームID" },
                            name: { type: "string", description: "チーム名" },
                            color: { type: "string", description: "チームカラー" },
                            avatar: { type: "string", description: "チームアバター" }
                        },
                        required: ["id", "name"]
                    }
                }
            },
            required: ["teams"]
        },
        async () => {
            try {
                const data = await clickupClient.getWorkspaces(getAccessToken());
                return {
                    content: [
                        {
                            text: JSON.stringify(data, null, 2),
                            type: "text",
                        },
                    ],
                };
            } catch (error) {
                throw new Error(`ワークスペース情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
} 