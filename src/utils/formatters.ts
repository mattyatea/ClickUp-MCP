/**
 * ClickUp Utils - フォーマッター
 *
 * ClickUpデータのフォーマットとユーティリティ関数
 */

import type { ServiceDependencies } from "#/types";

export class ClickUpFormatters {
	constructor(private deps: ServiceDependencies) {}

	/**
	 * ClickUpのタイムスタンプを人間が読める形式に変換
	 * @param timestamp ClickUpタイムスタンプ（ミリ秒）
	 * @returns 日本時間の日付文字列
	 */
	formatTimestamp(timestamp: string | number | null): string | null {
		if (!timestamp || timestamp === "0") return null;

		const date = new Date(
			typeof timestamp === "string" ? parseInt(timestamp) : timestamp,
		);
		if (Number.isNaN(date.getTime())) return null;

		return date.toLocaleString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	}

	/**
	 * タスクデータから必要な情報のみを抽出し、日付を人間が読める形式に変換
	 * @param task 元のタスクデータ
	 * @returns 必要な情報のみを含むタスクデータ
	 */
	formatTaskDates(task: any): any {
		return {
			// 基本情報
			id: task.id,
			name: task.name,
			description: task.description || null,
			status: task.status?.status || null,

			// 担当者
			assignees:
				task.assignees?.map((assignee: any) => ({
					id: assignee.id,
					username: assignee.username,
					email: assignee.email,
				})) || [],

			// 優先度
			priority: task.priority?.priority || null,
			priority_color: task.priority?.color || null,

			// 日付（人間が読める形式）
			due_date_readable: task.due_date
				? this.formatTimestamp(task.due_date)
				: null,
			start_date_readable: task.start_date
				? this.formatTimestamp(task.start_date)
				: null,
			date_created_readable: task.date_created
				? this.formatTimestamp(task.date_created)
				: null,
			date_updated_readable: task.date_updated
				? this.formatTimestamp(task.date_updated)
				: null,
			date_done_readable: task.date_done
				? this.formatTimestamp(task.date_done)
				: null,

			// プロジェクト情報
			list: task.list
				? {
						id: task.list.id,
						name: task.list.name,
					}
				: null,
			folder: task.folder
				? {
						id: task.folder.id,
						name: task.folder.name,
					}
				: null,
			space: task.space
				? {
						id: task.space.id,
						name: task.space.name,
					}
				: null,

			// タグ
			tags: task.tags?.map((tag: any) => tag.name) || [],

			// URL
			url: task.url || null,

			// 時間見積もり・実績
			time_estimate: task.time_estimate || null,
			time_spent: task.time_spent || null,
		};
	}

	/**
	 * APIレスポンスがIDのみの形式の場合、個別にタスク詳細を取得
	 * @param accessToken ClickUp APIアクセストークン
	 * @param ids タスクIDの配列
	 * @param teamId チームID
	 * @param page ページ番号
	 * @param limit ページサイズ
	 * @returns フォーマット済みタスクの配列
	 */
	async fetchTasksByIds(
		accessToken: string,
		ids: string[],
		teamId: string,
		page: number = 0,
		limit: number = 15,
	) {
		const paginatedIds = ids.slice(page * limit, (page + 1) * limit);

		const taskPromises = paginatedIds.map(async (taskId: string) => {
			try {
				const taskResponse = await fetch(
					`${this.deps.config.clickupApiBaseUrl}/task/${taskId}`,
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							"Content-Type": "application/json",
						},
					},
				);

				if (taskResponse.ok) {
					const taskData = await taskResponse.json();
					const formattedTask = this.formatTaskDates(taskData);
					return {
						...formattedTask,
						teamId: teamId,
						teamName: "Team",
					};
				}
				return null;
			} catch (error) {
				console.warn(`タスクID ${taskId} の取得に失敗:`, error);
				return null;
			}
		});

		const tasks = (await Promise.all(taskPromises)).filter(
			(task) => task !== null,
		);
		return { tasks, totalIds: ids.length };
	}
}
