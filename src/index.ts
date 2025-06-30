import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { ClickUpHandler } from "./clickup-handler";
import { createAppConfig } from "./config";
import { ClickUpService } from "./services/clickup-service";
import { SSEService } from "./services/sse-service";
import type { UserProps, ServiceDependencies } from "./types";

const ALLOWED_USERNAMES = new Set<string>([
	// Add ClickUp usernames of users who should have access
	// For example: 'yourusername', 'coworkerusername'
]);

export class MyMCP extends McpAgent<Env, Record<string, never>, UserProps> {
	server = new McpServer({
		name: "ClickUp SSE Server",
		version: "1.0.0",
	});

	async init() {
		const deps: ServiceDependencies = {
			env: this.env,
			config: createAppConfig(this.env),
		};
		const clickupService = new ClickUpService(deps);
		const sseService = new SSEService(deps);

		// Test tool
		this.server.tool(
			"add",
			"2つの数値を足し算します",
			{ a: z.number(), b: z.number() },
			async ({ a, b }: { a: number; b: number }) => ({
				content: [{ text: String(a + b), type: "text" }],
			}),
		);

		// ClickUp user info tool
		this.server.tool(
			"getUserInfo",
			"ClickUpから認証されたユーザー情報を取得します",
			{},
			async () => {
				try {
					const data = await clickupService.getUserInfo(this.props.accessToken);
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
			},
		);

		// Get ClickUp workspaces tool
		this.server.tool(
			"getWorkspaces",
			"ユーザーのClickUpワークスペースを取得します",
			{},
			async () => {
				try {
					const data = await clickupService.getWorkspaces(this.props.accessToken);
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
			},
		);

		// Get ClickUp tasks tool
		this.server.tool(
			"getTasks",
			"ClickUpリストからタスクを取得します",
			{
				listId: z.string().describe("ClickUpリストのID"),
				archived: z.boolean().optional().describe("アーカイブされたタスクを含める"),
				page: z.number().optional().describe("ページネーション用のページ番号"),
			},
			async ({ listId, archived, page }: { listId: string; archived?: boolean; page?: number }) => {
				try {
					const data = await clickupService.getTasks(this.props.accessToken, listId, {
						archived,
						page,
					});
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`タスク情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// Send SSE notification tool
		this.server.tool(
			"sendSSENotification",
			"SSE経由で接続されたクライアントに通知を送信します",
			{
				type: z.string().describe("通知のタイプ"),
				message: z.string().describe("通知メッセージ"),
				data: z.record(z.any()).optional().describe("送信する追加データ"),
			},
			async ({ type, message, data }: { type: string; message: string; data?: Record<string, any> }) => {
				try {
					const notification = {
						type,
						message,
						data,
						timestamp: new Date().toISOString(),
						userId: this.props.id,
					};

					await sseService.storeNotification(notification);

					return {
						content: [
							{
								text: `通知を送信しました: ${JSON.stringify(notification)}`,
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`通知の送信に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);
	}
}

export default new OAuthProvider({
	apiHandler: MyMCP.mount("/sse") as any,
	apiRoute: "/sse",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: ClickUpHandler as any,
	tokenEndpoint: "/token",
});
