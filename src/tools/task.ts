/**
 * ClickUp MCP Tools - タスク操作関連
 *
 * タスクの取得、更新、担当者設定などの基本的なタスク操作ツールを提供
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ClickUpClient } from "#/api";

/**
 * タスク操作関連のMCPツールを登録
 */
export function registerTaskTools(
	server: McpServer,
	clickupClient: ClickUpClient,
	getAccessToken: () => string,
) {
	// ClickUp チケット確認ツール
	server.tool(
		"getTask",
		`# タスク詳細取得

## 用途
- 特定タスクの全情報確認
- 進捗状況・担当者の確認
- 報告書・レビュー用の詳細データ取得

## 使用場面
- 定期的な進捗確認
- ミーティング前のタスク状況把握
- 引き継ぎ・レビュー時の詳細確認
- トラブルシューティング

## パフォーマンス
- **消費トークン**: 約200-400トークン（詳細情報含む）
- **応答時間**: 1-2秒
- **APIコール**: 1回

## 取得データ
タスク名、説明、ステータス、優先度、担当者、タグ、
期限、開始日、作成・更新日時、所属プロジェクト、URL

## 出力形式
構造化Markdown（見やすい表示）`,
		{
			taskId: z.string().describe("確認するタスクのID"),
		},
		{
			type: "object",
			properties: {
				id: { type: "string", description: "タスクID" },
				name: { type: "string", description: "タスク名" },
				description: { type: "string", description: "タスクの説明" },
				status: { type: "string", description: "現在のステータス" },
				priority: { type: "string", description: "優先度" },
				assignees: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string", description: "担当者ID" },
							username: { type: "string", description: "担当者名" },
							email: { type: "string", description: "担当者メール" },
						},
					},
				},
				tags: {
					type: "array",
					items: { type: "string" },
					description: "タスクに付与されたタグ",
				},
				due_date_readable: {
					type: "string",
					description: "期限（読みやすい形式）",
				},
				url: { type: "string", description: "ClickUpでのタスクURL" },
			},
			required: ["id", "name"],
		},
		async ({ taskId }: { taskId: string }) => {
			try {
				const task = await clickupClient.getTask(getAccessToken(), taskId);
				return {
					content: [
						{
							type: "text",
							text: `# タスク詳細\n\n**${task.name}**\n\nID: ${task.id}\n\n## 基本情報\n- **ステータス**: ${task.status || "未設定"}\n- **優先度**: ${task.priority || "未設定"}\n- **担当者**: ${task.assignees.map((a: any) => a.username).join(", ") || "未割り当て"}\n- **タグ**: ${task.tags.join(", ") || "なし"}\n\n## 説明\n${task.description || "説明なし"}\n\n## 日程\n- **期限**: ${task.due_date_readable || "未設定"}\n- **開始日**: ${task.start_date_readable || "未設定"}\n- **作成日**: ${task.date_created_readable || "不明"}\n- **更新日**: ${task.date_updated_readable || "不明"}\n\n## プロジェクト構造\n- **スペース**: ${task.space?.name || "不明"}\n- **フォルダー**: ${task.folder?.name || "なし"}\n- **リスト**: ${task.list?.name || "不明"}\n\n## ClickUpで確認\n${task.url || `https://app.clickup.com/t/${task.id}`}`,
						},
					],
				};
			} catch (error) {
				throw new Error(
					`チケット情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	);

	// ClickUp チケット更新ツール
	server.tool(
		"updateTask",
		`# タスク更新

## 用途
- タスク名・説明の変更
- ステータスの進行（未開始→進行中→完了）
- 情報の修正・更新

## 使用場面
- 定期的な進捗更新
- 要求仕様の変更対応
- プロジェクト管理での状況更新
- 緊急時の情報修正

## パフォーマンス
- **消費トークン**: 約150-300トークン
- **応答時間**: 1-3秒
- **APIコール**: 1-2回（取得+更新）

## 更新可能項目
- タスク名（name）
- 詳細説明（description）
- ステータス（status）

## 注意点
- 編集権限が必要
- アーカイブ済みタスクは更新不可
- 変更履歴は自動記録`,
		{
			taskId: z.string().describe("更新するタスクのID"),
			name: z.string().optional().describe("新しいタスク名"),
			description: z.string().optional().describe("新しいタスクの説明"),
			status: z.string().optional().describe("新しいステータス"),
		},
		{
			type: "object",
			properties: {
				success: { type: "boolean", description: "更新が成功したかどうか" },
				task: {
					type: "object",
					properties: {
						id: { type: "string", description: "タスクID" },
						name: { type: "string", description: "更新後のタスク名" },
						status: { type: "string", description: "更新後のステータス" },
						date_updated_readable: { type: "string", description: "更新日時" },
						url: { type: "string", description: "ClickUpでのタスクURL" },
					},
					required: ["id", "name"],
				},
			},
			required: ["success", "task"],
		},
		async ({
			taskId,
			name,
			description,
			status,
		}: {
			taskId: string;
			name?: string;
			description?: string;
			status?: string;
		}) => {
			try {
				const task = await clickupClient.updateTask(
					getAccessToken(),
					taskId,
					name,
					description,
					status,
				);
				return {
					content: [
						{
							type: "text",
							text: `# タスク更新完了 ✅\n\n**${task.name}**\n\nID: ${task.id}\n\n更新が正常に完了しました。\n\n## 更新内容\n- **ステータス**: ${task.status || "未設定"}\n- **優先度**: ${task.priority || "未設定"}\n- **担当者**: ${task.assignees.map((a: any) => a.username).join(", ") || "未割り当て"}\n- **更新日時**: ${task.date_updated_readable || "不明"}\n\n## ClickUpで確認\n${task.url || `https://app.clickup.com/t/${task.id}`}`,
						},
					],
				};
			} catch (error) {
				throw new Error(
					`チケットの更新に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	);

	// ClickUp 担当者振り分けツール
	server.tool(
		"assignTask",
		`# 担当者変更

## 用途
- 新規担当者の追加
- 既存担当者の削除
- 担当者の完全入れ替え

## 使用場面
- チーム再編成
- 作業分担の調整
- 休暇・異動時の引き継ぎ
- 専門知識が必要な作業の配置

## パフォーマンス
- **消費トークン**: 約200-350トークン
- **応答時間**: 1-3秒
- **APIコール**: 1-2回

## 操作方式
- **assigneeIds**: 追加する担当者ID（必須）
- **removeAssigneeIds**: 削除する担当者ID（任意）
- 両方指定で入れ替え操作

## 注意点
- タスク編集権限必須
- 担当者には自動通知
- 外部ユーザーは制限あり`,
		{
			taskId: z.string().describe("担当者を変更するタスクのID"),
			assigneeIds: z
				.array(z.string())
				.describe("追加する担当者のユーザーIDリスト"),
			removeAssigneeIds: z
				.array(z.string())
				.optional()
				.describe("削除する担当者のユーザーIDリスト"),
		},
		{
			type: "object",
			properties: {
				success: {
					type: "boolean",
					description: "担当者変更が成功したかどうか",
				},
				task: {
					type: "object",
					properties: {
						id: { type: "string", description: "タスクID" },
						name: { type: "string", description: "タスク名" },
						assignees: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string", description: "担当者ID" },
									username: { type: "string", description: "担当者名" },
									email: { type: "string", description: "担当者メール" },
								},
							},
						},
						status: { type: "string", description: "現在のステータス" },
						date_updated_readable: { type: "string", description: "更新日時" },
						url: { type: "string", description: "ClickUpでのタスクURL" },
					},
					required: ["id", "name", "assignees"],
				},
			},
			required: ["success", "task"],
		},
		async ({
			taskId,
			assigneeIds,
			removeAssigneeIds,
		}: {
			taskId: string;
			assigneeIds: string[];
			removeAssigneeIds?: string[];
		}) => {
			try {
				const task = await clickupClient.assignTask(
					getAccessToken(),
					taskId,
					assigneeIds,
					removeAssigneeIds,
				);
				return {
					content: [
						{
							type: "text",
							text: `# 担当者振り分け完了 👥\n\n**${task.name}**\n\nID: ${task.id}\n\n担当者の振り分けが正常に完了しました。\n\n## 担当者情報\n- **現在の担当者**: ${task.assignees.map((a: any) => `👤 ${a.username} (${a.email})`).join("\n- ") || "未割り当て"}\n- **ステータス**: ${task.status || "未設定"}\n- **優先度**: ${task.priority || "未設定"}\n- **更新日時**: ${task.date_updated_readable || "不明"}\n\n## ClickUpで確認\n${task.url || `https://app.clickup.com/t/${task.id}`}`,
						},
					],
				};
			} catch (error) {
				throw new Error(
					`担当者の振り分けに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	);

	// ClickUp タスク詳細取得ツール（コメント・サブタスク含む）
	server.tool(
		"getTaskDetail",
		`# タスク詳細情報取得（完全版）

## 用途
- タスクの全ての情報を一度に取得
- コメント履歴の確認
- サブタスクの階層構造把握
- アクティビティログの追跡

## 使用場面
- 詳細なレビューや監査時
- タスクの完全な状況把握
- 引き継ぎ時の包括的な情報収集
- プロジェクト報告書作成
- 問題分析とトラブルシューティング

## パフォーマンス
- **消費トークン**: 約500-1500トークン（内容により変動）
- **応答時間**: 2-5秒
- **APIコール**: 3-4回（タスク、コメント、サブタスク）

## 取得データ
基本情報（タスク名、説明、ステータス、優先度、担当者、タグ、期限等）に加えて：
- **コメント履歴**: 全てのコメントと投稿者情報
- **サブタスク**: 関連するサブタスクの一覧
- **添付ファイル**: アップロードされたファイル情報
- **カスタムフィールド**: プロジェクト固有のフィールド値

## 出力形式
構造化されたMarkdown形式で、階層的に情報を表示`,
		{
			taskId: z.string().describe("詳細を取得するタスクのID"),
		},
		{
			type: "object",
			properties: {
				task: {
					type: "object",
					properties: {
						id: { type: "string", description: "タスクID" },
						name: { type: "string", description: "タスク名" },
						description: { type: "string", description: "タスクの説明" },
						status: { type: "string", description: "現在のステータス" },
						priority: { type: "string", description: "優先度" },
						assignees: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string", description: "担当者ID" },
									username: { type: "string", description: "担当者名" },
									email: { type: "string", description: "担当者メール" },
								},
							},
						},
						tags: {
							type: "array",
							items: { type: "string" },
							description: "タスクに付与されたタグ",
						},
						due_date_readable: {
							type: "string",
							description: "期限（読みやすい形式）",
						},
						url: { type: "string", description: "ClickUpでのタスクURL" },
						comment_count: { type: "number", description: "コメント数" },
						has_subtasks: {
							type: "boolean",
							description: "サブタスクがあるかどうか",
						},
					},
					required: ["id", "name"],
				},
				comments: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string", description: "コメントID" },
							comment_text: { type: "string", description: "コメント内容" },
							user: {
								type: "object",
								properties: {
									id: { type: "string", description: "投稿者ID" },
									username: { type: "string", description: "投稿者名" },
								},
							},
							date: { type: "string", description: "投稿日時" },
						},
					},
				},
				subtasks: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string", description: "サブタスクID" },
							name: { type: "string", description: "サブタスク名" },
							status: { type: "string", description: "ステータス" },
							assignees: {
								type: "array",
								items: {
									type: "object",
									properties: {
										id: { type: "string", description: "担当者ID" },
										username: { type: "string", description: "担当者名" },
									},
								},
							},
						},
					},
				},
			},
			required: ["task"],
		},
		async ({ taskId }: { taskId: string }) => {
			try {
				// 現在のワークスペース情報を取得してteamIdを取得
				const teams = await clickupClient.getWorkspaces(getAccessToken());
				const teamId = teams.teams?.[0]?.id;

				if (!teamId) {
					throw new Error("チームIDが見つかりません");
				}

				// タスク詳細を取得
				const taskDetail = await clickupClient.getTaskDetail(
					getAccessToken(),
					taskId,
					teamId,
				);

				// Markdown形式で出力を構築
				let output = `# タスク詳細（完全版）\n\n**${taskDetail.name}**\n\nID: ${taskDetail.id}\n\n`;

				// 基本情報
				output += `## 基本情報\n`;
				output += `- **ステータス**: ${taskDetail.status || "未設定"}\n`;
				output += `- **優先度**: ${taskDetail.priority || "未設定"}\n`;
				output += `- **担当者**: ${taskDetail.assignees.map((a: any) => a.username).join(", ") || "未割り当て"}\n`;
				output += `- **タグ**: ${taskDetail.tags.join(", ") || "なし"}\n\n`;

				// 説明
				output += `## 説明\n${taskDetail.description || "説明なし"}\n\n`;

				// 日程
				output += `## 日程\n`;
				output += `- **期限**: ${taskDetail.due_date_readable || "未設定"}\n`;
				output += `- **開始日**: ${taskDetail.start_date_readable || "未設定"}\n`;
				output += `- **作成日**: ${taskDetail.date_created_readable || "不明"}\n`;
				output += `- **更新日**: ${taskDetail.date_updated_readable || "不明"}\n\n`;

				// プロジェクト構造
				output += `## プロジェクト構造\n`;
				output += `- **スペース**: ${taskDetail.space?.name || "不明"}\n`;
				output += `- **フォルダー**: ${taskDetail.folder?.name || "なし"}\n`;
				output += `- **リスト**: ${taskDetail.list?.name || "不明"}\n\n`;

				// サブタスク
				if (taskDetail.has_subtasks && taskDetail.subtasks.length > 0) {
					output += `## サブタスク (${taskDetail.subtasks.length}件)\n`;
					taskDetail.subtasks.forEach((subtask: any, index: number) => {
						output += `### ${index + 1}. ${subtask.name}\n`;
						output += `- **ID**: ${subtask.id}\n`;
						output += `- **ステータス**: ${subtask.status || "未設定"}\n`;
						output += `- **担当者**: ${subtask.assignees.map((a: any) => a.username).join(", ") || "未割り当て"}\n\n`;
					});
				} else {
					output += `## サブタスク\nサブタスクなし\n\n`;
				}

				// コメント
				if (taskDetail.comment_count > 0 && taskDetail.comments.length > 0) {
					output += `## コメント (${taskDetail.comment_count}件)\n`;
					taskDetail.comments.forEach((comment: any, index: number) => {
						const date = comment.date
							? new Date(parseInt(comment.date)).toLocaleString("ja-JP")
							: "不明";
						output += `### ${index + 1}. ${comment.user?.username || "不明"} - ${date}\n`;
						output += `${comment.comment_text || comment.text || "内容なし"}\n\n`;
					});
				} else {
					output += `## コメント\nコメントなし\n\n`;
				}

				// ClickUpリンク
				output += `## ClickUpで確認\n${taskDetail.url || `https://app.clickup.com/t/${taskDetail.id}`}`;

				return {
					content: [
						{
							type: "text",
							text: output,
						},
					],
				};
			} catch (error) {
				throw new Error(
					`タスク詳細情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	);
}
