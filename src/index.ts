/**
 * ClickUp MCP Server - Main Entry Point
 * 
 * CloudflareのAgentsSDKを使用したMCPサーバーの実装。
 * ClickUp OAuth認証とMCPツールを提供します。
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { CombinedHandler } from "./handlers/combined-handler";
import { createAppConfig } from "./config";
import { ClickUpTools } from "./tools/clickup-tools";
import type { UserProps, ServiceDependencies } from "./types";

/**
 * ClickUp MCP サーバークラス
 * CloudflareのMcpAgentを拡張して、ClickUp特有の機能を提供
 */
export class MyMCP extends McpAgent<Env, Record<string, never>, UserProps> {
	server = new McpServer({
		name: "ClickUp MCP Server",
		version: "1.0.0",
		icon: "https://clickup.com/favicon.ico",
	});

	async init() {
		const deps: ServiceDependencies = {
			env: this.env,
			config: createAppConfig(this.env),
		};
		const clickupTools = new ClickUpTools(deps);

		// ClickUp ユーザー情報取得ツール
		this.server.tool(
			"getUserInfo",
			"ClickUpから認証されたユーザー情報を取得します",
			{},
			async () => {
				try {
					const data = await clickupTools.getUserInfo(this.props.accessToken);
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

		// ClickUp ワークスペース取得ツール
		this.server.tool(
			"getWorkspaces",
			"ユーザーのClickUpワークスペースを取得します",
			{},
			async () => {
				try {
					const data = await clickupTools.getWorkspaces(this.props.accessToken);
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

		// ClickUp チケット確認ツール
		this.server.tool(
			"getTask",
			"ClickUpチケット（タスク）の詳細を確認します",
			{
				taskId: z.string().describe("確認するタスクのID"),
			},
			async ({ taskId }: { taskId: string }) => {
				try {
					const data = await clickupTools.getTask(this.props.accessToken, taskId);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`チケット情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp チケット更新ツール
		this.server.tool(
			"updateTask",
			"ClickUpチケット（タスク）を更新します",
			{
				taskId: z.string().describe("更新するタスクのID"),
				name: z.string().optional().describe("新しいタスク名"),
				description: z.string().optional().describe("新しいタスクの説明"),
				status: z.string().optional().describe("新しいステータス"),
			},
			async ({ taskId, name, description, status }: {
				taskId: string;
				name?: string;
				description?: string;
				status?: string;
			}) => {
				try {
					const data = await clickupTools.updateTask(this.props.accessToken, taskId, name, description, status);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`チケットの更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 担当者振り分けツール
		this.server.tool(
			"assignTask",
			"ClickUpチケット（タスク）に担当者を振り分けます",
			{
				taskId: z.string().describe("担当者を変更するタスクのID"),
				assigneeIds: z.array(z.string()).describe("追加する担当者のユーザーIDリスト"),
				removeAssigneeIds: z.array(z.string()).optional().describe("削除する担当者のユーザーIDリスト"),
			},
			async ({ taskId, assigneeIds, removeAssigneeIds }: {
				taskId: string;
				assigneeIds: string[];
				removeAssigneeIds?: string[];
			}) => {
				try {
					const data = await clickupTools.assignTask(this.props.accessToken, taskId, assigneeIds, removeAssigneeIds);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`担当者の振り分けに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 自分のタスク確認ツール
		this.server.tool(
			"getMyTasks",
			"自分がアサインされているClickUpタスクを取得します",
			{
				teamId: z.string().optional().describe("特定のチームIDに限定（省略で全ワークスペース）"),
				limit: z.number().optional().default(15).describe("取得件数（デフォルト: 15、最大: 100）"),
				page: z.number().optional().default(0).describe("ページ番号（0から開始）"),
			},
			async ({ teamId, limit = 15, page = 0 }: { teamId?: string; limit?: number; page?: number }) => {
				try {
					const data = await clickupTools.getMyTasks(this.props.accessToken, teamId, limit, page);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`自分のタスク情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp タスク検索ツール
		this.server.tool(
			"searchTasks",
			"ClickUpタスクをキーワードで検索します",
			{
				searchTerm: z.string().describe("検索キーワード（タスク名や説明から検索）"),
				teamId: z.string().optional().describe("特定のチームIDに限定（省略で全ワークスペース）"),
				limit: z.number().optional().default(15).describe("取得件数（デフォルト: 15、最大: 100）"),
				page: z.number().optional().default(0).describe("ページ番号（0から開始）"),
			},
			async ({ searchTerm, teamId, limit = 15, page = 0 }: { searchTerm: string; teamId?: string; limit?: number; page?: number }) => {
				try {
					const data = await clickupTools.searchTasks(this.props.accessToken, searchTerm, teamId, limit, page);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`タスクの検索に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

	}
}

// OAuth Provider設定とエクスポート
export default new OAuthProvider({
	apiHandler: MyMCP.mount("/sse") as any,
	apiRoute: "/sse",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: CombinedHandler as any,
	tokenEndpoint: "/token",
});
