/**
 * ClickUp Tasks - 検索・一覧
 *
 * タスクの検索と一覧取得機能
 */

import { ClickUpAuth } from "#/auth/user";
import type { ServiceDependencies } from "#/types";
import { ClickUpFormatters } from "#/utils/formatters";

export class ClickUpTaskSearch {
	private auth: ClickUpAuth;
	private formatters: ClickUpFormatters;

	constructor(private deps: ServiceDependencies) {
		this.auth = new ClickUpAuth(deps);
		this.formatters = new ClickUpFormatters(deps);
	}

	/**
	 * 自分がアサインされているタスクを取得
	 * @param accessToken ClickUp APIアクセストークン
	 * @param teamId チームID（省略で全ワークスペース）
	 * @param limit 取得件数（デフォルト: 15）
	 * @param page ページ番号（デフォルト: 0）
	 * @returns アサインされているタスク情報
	 */
	async getMyTasks(
		accessToken: string,
		teamId?: string,
		limit: number = 15,
		page: number = 0,
	) {
		try {
			// まずユーザー情報を取得してユーザーIDを取得
			const userInfo = await this.auth.getUserInfo(accessToken);
			const userId = userInfo.user.id;

			let teams;
			if (teamId) {
				// 特定のチームのみ
				const workspacesData = await this.auth.getWorkspaces(accessToken);
				const team = workspacesData.teams.find((t) => t.id === teamId);
				teams = team ? [team] : [{ id: teamId, name: `Team ${teamId}` }];
			} else {
				// 全ワークスペースを取得
				const workspacesData = await this.auth.getWorkspaces(accessToken);
				teams = workspacesData.teams || [];
			}

			const allMyTasks: any[] = [];

			for (const team of teams) {
				try {
					const url = new URL(
						`${this.deps.config.clickupApiBaseUrl}/team/${team.id}/task`,
					);

					// 自分のユーザーIDをassigneesパラメータに設定
					url.searchParams.set("assignees[]", userId);
					// 取得件数とページを設定
					url.searchParams.set("limit", limit.toString());
					url.searchParams.set("page", page.toString());

					const response = await fetch(url, {
						headers: {
							Authorization: `Bearer ${accessToken}`,
							"Content-Type": "application/json",
						},
					});

					if (!response.ok) {
						console.warn(
							`チーム ${team.id} のタスク取得でエラー: ${response.status}`,
						);
						continue;
					}

					const data = (await response.json()) as { tasks?: any[] };
					if (data.tasks && Array.isArray(data.tasks)) {
						// チーム情報を各タスクに追加し、日付を変換
						const tasksWithTeamInfo = data.tasks.map((task: any) => {
							const formattedTask = this.formatters.formatTaskDates(task);
							return {
								...formattedTask,
								teamId: team.id,
								teamName: team.name || "Unknown Team",
							};
						});
						allMyTasks.push(...tasksWithTeamInfo);
					}
				} catch (error) {
					console.warn(`チーム ${team.id} の処理でエラー:`, error);
				}
			}

			return {
				success: true,
				tasks: allMyTasks,
				totalTasks: allMyTasks.length,
				userId: userId,
				pagination: {
					limit,
					page,
					hasMore: allMyTasks.length === limit,
					nextPage: page + 1,
				},
			};
		} catch (error) {
			throw new Error(
				`自分のタスク情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * タスクを検索
	 * @param accessToken ClickUp APIアクセストークン
	 * @param searchTerm 検索キーワード
	 * @param teamId チームID（省略で全ワークスペース）
	 * @param limit 取得件数（デフォルト: 15）
	 * @param page ページ番号（デフォルト: 0）
	 * @returns 検索結果のタスク一覧
	 */
	async searchTasks(
		accessToken: string,
		searchTerm: string,
		teamId?: string,
		limit: number = 15,
		page: number = 0,
	) {
		try {
			let teams;
			if (teamId) {
				// 特定のチームのみ
				const workspacesData = await this.auth.getWorkspaces(accessToken);
				const team = workspacesData.teams.find((t) => t.id === teamId);
				teams = team ? [team] : [{ id: teamId, name: `Team ${teamId}` }];
			} else {
				// 全ワークスペースを取得
				const workspacesData = await this.auth.getWorkspaces(accessToken);
				teams = workspacesData.teams || [];
			}

			const searchResults: any[] = [];

			for (const team of teams) {
				try {
					const url = new URL(
						`${this.deps.config.clickupApiBaseUrl}/team/${team.id}/task`,
					);

					// 検索キーワードを設定
					url.searchParams.set("search", searchTerm);
					// 取得件数とページを設定
					url.searchParams.set("limit", limit.toString());
					url.searchParams.set("page", page.toString());
					// 完了済みタスクも含める
					url.searchParams.set("include_closed", "true");

					const response = await fetch(url, {
						headers: {
							Authorization: `Bearer ${accessToken}`,
							"Content-Type": "application/json",
						},
					});

					if (!response.ok) {
						console.warn(
							`チーム ${team.id} のタスク検索でエラー: ${response.status}`,
						);
						continue;
					}

					const data = (await response.json()) as { tasks?: any[] };
					if (data.tasks && Array.isArray(data.tasks)) {
						// チーム情報を各タスクに追加し、日付を変換
						const tasksWithTeamInfo = data.tasks.map((task: any) => {
							const formattedTask = this.formatters.formatTaskDates(task);
							return {
								...formattedTask,
								teamId: team.id,
								teamName: team.name || "Unknown Team",
							};
						});
						searchResults.push(...tasksWithTeamInfo);
					}
				} catch (error) {
					console.warn(`チーム ${team.id} の検索でエラー:`, error);
				}
			}

			return {
				success: true,
				searchTerm,
				tasks: searchResults,
				totalTasks: searchResults.length,
				pagination: {
					limit,
					page,
					hasMore: searchResults.length === limit,
					nextPage: page + 1,
				},
			};
		} catch (error) {
			throw new Error(
				`タスクの検索に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
