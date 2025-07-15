/**
 * ClickUp Auth - ユーザー認証
 *
 * ユーザー情報とワークスペース関連の機能
 */

import type {
	ClickUpUserResponse,
	ClickUpWorkspacesResponse,
	ServiceDependencies,
} from "#/types";

export class ClickUpAuth {
	constructor(private deps: ServiceDependencies) {}

	/**
	 * 認証されたユーザーの情報を取得
	 * @param accessToken ClickUp APIアクセストークン
	 * @returns ユーザー情報
	 */
	async getUserInfo(accessToken: string): Promise<ClickUpUserResponse> {
		const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/user`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`ClickUpユーザー情報の取得に失敗しました: ${response.status}`,
			);
		}

		return response.json();
	}

	/**
	 * ユーザーのワークスペース（チーム）情報を取得
	 * @param accessToken ClickUp APIアクセストークン
	 * @returns ワークスペース情報
	 */
	async getWorkspaces(accessToken: string): Promise<ClickUpWorkspacesResponse> {
		const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/team`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`ClickUpワークスペース情報の取得に失敗しました: ${response.status}`,
			);
		}

		return response.json();
	}
}
