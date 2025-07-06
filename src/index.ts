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

		// 基本的なテストツール
		this.server.tool(
			"add",
			"2つの数値を足し算します",
			{ a: z.number(), b: z.number() },
			async ({ a, b }: { a: number; b: number }) => ({
				content: [{ text: String(a + b), type: "text" }],
			}),
		);

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

		// ClickUp スペース取得ツール
		this.server.tool(
			"getSpaces",
			"指定されたチームのClickUpスペースを取得します",
			{
				teamId: z.string().describe("チームID"),
				archived: z.boolean().optional().describe("アーカイブされたスペースを含める"),
			},
			async ({ teamId, archived }: { teamId: string; archived?: boolean }) => {
				try {
					const data = await clickupTools.getSpaces(this.props.accessToken, teamId, archived);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`スペース情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp フォルダー取得ツール
		this.server.tool(
			"getFolders",
			"指定されたスペースのClickUpフォルダーを取得します",
			{
				spaceId: z.string().describe("スペースID"),
				archived: z.boolean().optional().describe("アーカイブされたフォルダーを含める"),
			},
			async ({ spaceId, archived }: { spaceId: string; archived?: boolean }) => {
				try {
					const data = await clickupTools.getFolders(this.props.accessToken, spaceId, archived);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`フォルダー情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp フォルダー内リスト取得ツール
		this.server.tool(
			"getListsInFolder",
			"指定されたフォルダー内のClickUpリストを取得します",
			{
				folderId: z.string().describe("フォルダーID"),
				archived: z.boolean().optional().describe("アーカイブされたリストを含める"),
			},
			async ({ folderId, archived }: { folderId: string; archived?: boolean }) => {
				try {
					const data = await clickupTools.getListsInFolder(this.props.accessToken, folderId, archived);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`フォルダー内リスト情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp スペース内リスト取得ツール
		this.server.tool(
			"getListsInSpace",
			"指定されたスペース直下のClickUpリストを取得します（フォルダーなし）",
			{
				spaceId: z.string().describe("スペースID"),
				archived: z.boolean().optional().describe("アーカイブされたリストを含める"),
			},
			async ({ spaceId, archived }: { spaceId: string; archived?: boolean }) => {
				try {
					const data = await clickupTools.getListsInSpace(this.props.accessToken, spaceId, archived);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`スペース内リスト情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 全リスト取得ツール
		this.server.tool(
			"getAllLists",
			"ワークスペース全体からリストを検索・取得します（階層構造付き）",
			{
				teamId: z.string().optional().describe("特定のチームIDに限定（省略で全ワークスペース）"),
				archived: z.boolean().optional().describe("アーカイブされたアイテムを含める"),
			},
			async ({ teamId, archived }: { teamId?: string; archived?: boolean }) => {
				try {
					const data = await clickupTools.getAllLists(this.props.accessToken, teamId, archived);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`全リスト情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp タスク取得ツール
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
					const data = await clickupTools.getTasks(this.props.accessToken, listId, {
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

		// ClickUp タスク作成ツール
		this.server.tool(
			"createTask",
			"ClickUpで新しいタスクを作成します",
			{
				listId: z.string().describe("タスクを作成するリストのID"),
				name: z.string().describe("タスク名"),
				description: z.string().optional().describe("タスクの説明"),
				assignees: z.array(z.string()).optional().describe("担当者のユーザーIDリスト"),
				tags: z.array(z.string()).optional().describe("タグのリスト"),
				status: z.string().optional().describe("タスクのステータス"),
				priority: z.number().optional().describe("優先度 (1:緊急, 2:高, 3:普通, 4:低)"),
				dueDate: z.number().optional().describe("期限日 (Unixタイムスタンプ)"),
				timeEstimate: z.number().optional().describe("予想所要時間 (ミリ秒)"),
			},
			async ({ listId, name, description, assignees, tags, status, priority, dueDate, timeEstimate }: {
				listId: string;
				name: string;
				description?: string;
				assignees?: string[];
				tags?: string[];
				status?: string;
				priority?: number;
				dueDate?: number;
				timeEstimate?: number;
			}) => {
				try {
					const taskData: any = { name };
					if (description) taskData.description = description;
					if (assignees) taskData.assignees = assignees;
					if (tags) taskData.tags = tags;
					if (status) taskData.status = status;
					if (priority) taskData.priority = priority;
					if (dueDate) {
						taskData.due_date = dueDate;
						taskData.due_date_time = true;
					}
					if (timeEstimate) taskData.time_estimate = timeEstimate;

					const data = await clickupTools.createTask(this.props.accessToken, listId, taskData);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`タスクの作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp タスク更新ツール
		this.server.tool(
			"updateTask",
			"ClickUpタスクを更新します",
			{
				taskId: z.string().describe("更新するタスクのID"),
				name: z.string().optional().describe("新しいタスク名"),
				description: z.string().optional().describe("新しいタスクの説明"),
				status: z.string().optional().describe("新しいステータス"),
				priority: z.number().optional().describe("新しい優先度 (1:緊急, 2:高, 3:普通, 4:低)"),
				dueDate: z.number().optional().describe("新しい期限日 (Unixタイムスタンプ)"),
				timeEstimate: z.number().optional().describe("新しい予想所要時間 (ミリ秒)"),
				addAssignees: z.array(z.string()).optional().describe("追加する担当者のユーザーIDリスト"),
				removeAssignees: z.array(z.string()).optional().describe("削除する担当者のユーザーIDリスト"),
				archived: z.boolean().optional().describe("アーカイブ状態"),
			},
			async ({ taskId, name, description, status, priority, dueDate, timeEstimate, addAssignees, removeAssignees, archived }: {
				taskId: string;
				name?: string;
				description?: string;
				status?: string;
				priority?: number;
				dueDate?: number;
				timeEstimate?: number;
				addAssignees?: string[];
				removeAssignees?: string[];
				archived?: boolean;
			}) => {
				try {
					const updateData: any = {};
					if (name) updateData.name = name;
					if (description) updateData.description = description;
					if (status) updateData.status = status;
					if (priority) updateData.priority = priority;
					if (dueDate) {
						updateData.due_date = dueDate;
						updateData.due_date_time = true;
					}
					if (timeEstimate) updateData.time_estimate = timeEstimate;
					if (addAssignees || removeAssignees) {
						updateData.assignees = {};
						if (addAssignees) updateData.assignees.add = addAssignees;
						if (removeAssignees) updateData.assignees.rem = removeAssignees;
					}
					if (archived !== undefined) updateData.archived = archived;

					const data = await clickupTools.updateTask(this.props.accessToken, taskId, updateData);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`タスクの更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp タスク削除ツール
		this.server.tool(
			"deleteTask",
			"ClickUpタスクを削除します",
			{
				taskId: z.string().describe("削除するタスクのID"),
			},
			async ({ taskId }: { taskId: string }) => {
				try {
					const data = await clickupTools.deleteTask(this.props.accessToken, taskId);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`タスクの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 時間追跡開始ツール
		this.server.tool(
			"startTimeTracking",
			"ClickUpタスクの時間追跡を開始します",
			{
				taskId: z.string().describe("時間追跡を開始するタスクのID"),
				description: z.string().describe("作業内容の説明"),
			},
			async ({ taskId, description }: { taskId: string; description: string }) => {
				try {
					const data = await clickupTools.startTimeTracking(this.props.accessToken, taskId, description);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`時間追跡の開始に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 時間追跡停止ツール
		this.server.tool(
			"stopTimeTracking",
			"ClickUpタスクの時間追跡を停止します",
			{
				taskId: z.string().describe("時間追跡を停止するタスクのID"),
				intervalId: z.string().describe("停止する時間エントリのID"),
			},
			async ({ taskId, intervalId }: { taskId: string; intervalId: string }) => {
				try {
					const data = await clickupTools.stopTimeTracking(this.props.accessToken, taskId, intervalId);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`時間追跡の停止に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 時間エントリ取得ツール
		this.server.tool(
			"getTimeEntries",
			"ClickUpタスクの時間追跡エントリを取得します",
			{
				taskId: z.string().describe("時間追跡エントリを取得するタスクのID"),
			},
			async ({ taskId }: { taskId: string }) => {
				try {
					const data = await clickupTools.getTimeEntries(this.props.accessToken, taskId);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`時間追跡エントリの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 時間エントリ作成ツール
		this.server.tool(
			"createTimeEntry",
			"ClickUpタスクに時間エントリを手動で作成します",
			{
				taskId: z.string().describe("時間エントリを作成するタスクのID"),
				description: z.string().describe("作業内容の説明"),
				start: z.number().describe("開始時間 (Unixタイムスタンプ)"),
				duration: z.number().describe("作業時間 (ミリ秒)"),
				billable: z.boolean().optional().describe("課金対象かどうか"),
				tags: z.array(z.string()).optional().describe("タグのリスト"),
			},
			async ({ taskId, description, start, duration, billable, tags }: {
				taskId: string;
				description: string;
				start: number;
				duration: number;
				billable?: boolean;
				tags?: string[];
			}) => {
				try {
					const timeData: any = { description, start, duration };
					if (billable !== undefined) timeData.billable = billable;
					if (tags) timeData.tags = tags;

					const data = await clickupTools.createTimeEntry(this.props.accessToken, taskId, timeData);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`時間エントリの作成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 時間エントリ更新ツール
		this.server.tool(
			"updateTimeEntry",
			"ClickUpタスクの時間エントリを更新します",
			{
				taskId: z.string().describe("時間エントリを更新するタスクのID"),
				intervalId: z.string().describe("更新する時間エントリのID"),
				description: z.string().optional().describe("新しい作業内容の説明"),
				start: z.number().optional().describe("新しい開始時間 (Unixタイムスタンプ)"),
				duration: z.number().optional().describe("新しい作業時間 (ミリ秒)"),
				billable: z.boolean().optional().describe("課金対象かどうか"),
				tags: z.array(z.string()).optional().describe("新しいタグのリスト"),
			},
			async ({ taskId, intervalId, description, start, duration, billable, tags }: {
				taskId: string;
				intervalId: string;
				description?: string;
				start?: number;
				duration?: number;
				billable?: boolean;
				tags?: string[];
			}) => {
				try {
					const updateData: any = {};
					if (description) updateData.description = description;
					if (start) updateData.start = start;
					if (duration) updateData.duration = duration;
					if (billable !== undefined) updateData.billable = billable;
					if (tags) updateData.tags = tags;

					const data = await clickupTools.updateTimeEntry(this.props.accessToken, taskId, intervalId, updateData);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`時間エントリの更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 時間エントリ削除ツール
		this.server.tool(
			"deleteTimeEntry",
			"ClickUpタスクの時間エントリを削除します",
			{
				taskId: z.string().describe("時間エントリを削除するタスクのID"),
				intervalId: z.string().describe("削除する時間エントリのID"),
			},
			async ({ taskId, intervalId }: { taskId: string; intervalId: string }) => {
				try {
					const data = await clickupTools.deleteTimeEntry(this.props.accessToken, taskId, intervalId);
					return {
						content: [
							{
								text: JSON.stringify(data, null, 2),
								type: "text",
							},
						],
					};
				} catch (error) {
					throw new Error(`時間エントリの削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
				}
			},
		);

		// ClickUp 自分のタスク取得ツール
		this.server.tool(
			"getMyTasks",
			"自分がアサインされているClickUpタスクを取得します",
			{
				teamId: z.string().optional().describe("特定のチームIDに限定（省略で全ワークスペース）"),
				archived: z.boolean().optional().describe("アーカイブされたタスクを含める"),
				page: z.number().optional().describe("ページネーション用のページ番号"),
				statuses: z.array(z.string()).optional().describe("特定のステータスのタスクのみ取得"),
				subtasks: z.boolean().optional().describe("サブタスクを含める"),
				includeClosed: z.boolean().optional().describe("完了済みタスクを含める"),
			},
			async ({ teamId, archived, page, statuses, subtasks, includeClosed }: {
				teamId?: string;
				archived?: boolean;
				page?: number;
				statuses?: string[];
				subtasks?: boolean;
				includeClosed?: boolean;
			}) => {
				try {
					const data = await clickupTools.getMyTasks(this.props.accessToken, teamId, {
						archived,
						page,
						statuses,
						subtasks,
						include_closed: includeClosed,
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
					throw new Error(`自分のタスク情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
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
