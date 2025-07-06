/**
 * ClickUp MCP Server - ClickUp API Tools
 * 
 * ClickUp APIとの通信を担当するツールクラス。
 * コア機能のみを提供する軽量版。
 */

import type {
    ClickUpUserResponse,
    ServiceDependencies,
    ClickUpWorkspacesResponse
} from '../types';

export class ClickUpTools {
    constructor(private deps: ServiceDependencies) { }

    /**
     * ClickUpのタイムスタンプを人間が読める形式に変換
     * @param timestamp ClickUpタイムスタンプ（ミリ秒）
     * @returns 日本時間の日付文字列
     */
    private formatTimestamp(timestamp: string | number | null): string | null {
        if (!timestamp || timestamp === "0") return null;
        
        const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
        if (isNaN(date.getTime())) return null;
        
        return date.toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * タスクデータの日付フィールドを人間が読める形式に変換
     * @param task 元のタスクデータ
     * @returns 日付が変換されたタスクデータ
     */
    private formatTaskDates(task: any): any {
        return {
            ...task,
            // 人間が読める形式の日付フィールドを追加
            due_date_readable: task.due_date ? this.formatTimestamp(task.due_date) : null,
            start_date_readable: task.start_date ? this.formatTimestamp(task.start_date) : null,
            date_created_readable: task.date_created ? this.formatTimestamp(task.date_created) : null,
            date_updated_readable: task.date_updated ? this.formatTimestamp(task.date_updated) : null,
            date_done_readable: task.date_done ? this.formatTimestamp(task.date_done) : null
        };
    }

    /**
     * 認証されたユーザーの情報を取得
     * @param accessToken ClickUp APIアクセストークン
     * @returns ユーザー情報
     */
    async getUserInfo(accessToken: string): Promise<ClickUpUserResponse> {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/user`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpユーザー情報の取得に失敗しました: ${response.status}`);
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
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpワークスペース情報の取得に失敗しました: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 自分がアサインされているタスクを取得
     * @param accessToken ClickUp APIアクセストークン
     * @param teamId チームID（省略で全ワークスペース）
     * @returns アサインされているタスク情報
     */
    async getMyTasks(accessToken: string, teamId?: string) {
        try {
            // まずユーザー情報を取得してユーザーIDを取得
            const userInfo = await this.getUserInfo(accessToken);
            const userId = userInfo.user.id;

            let teams;
            if (teamId) {
                // 特定のチームのみ
                const workspacesData = await this.getWorkspaces(accessToken);
                const team = workspacesData.teams.find(t => t.id === teamId);
                teams = team ? [team] : [{ id: teamId, name: `Team ${teamId}` }];
            } else {
                // 全ワークスペースを取得
                const workspacesData = await this.getWorkspaces(accessToken);
                teams = workspacesData.teams || [];
            }

            const allMyTasks: any[] = [];

            for (const team of teams) {
                try {
                    const url = new URL(`${this.deps.config.clickupApiBaseUrl}/team/${team.id}/task`);

                    // 自分のユーザーIDをassigneesパラメータに設定
                    url.searchParams.set('assignees[]', userId);
                    // 取得件数を15件に設定
                    url.searchParams.set('limit', '15');

                    const response = await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        console.warn(`チーム ${team.id} のタスク取得でエラー: ${response.status}`);
                        continue;
                    }

                    const data = await response.json() as { tasks?: any[] };
                    if (data.tasks && Array.isArray(data.tasks)) {
                        // チーム情報を各タスクに追加し、日付を変換
                        const tasksWithTeamInfo = data.tasks.map((task: any) => {
                            const formattedTask = this.formatTaskDates(task);
                            return {
                                ...formattedTask,
                                teamId: team.id,
                                teamName: team.name || 'Unknown Team'
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
                userId: userId
            };
        } catch (error) {
            throw new Error(`自分のタスク情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * チケット（タスク）の詳細を確認
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @returns タスクの詳細情報
     */
    async getTask(accessToken: string, taskId: string) {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpタスク情報の取得に失敗しました: ${response.status}`);
        }

        const task = await response.json();
        return this.formatTaskDates(task);
    }

    /**
     * タスクを更新（チケットの更新）
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @param name 新しいタスク名（オプション）
     * @param description 新しいタスクの説明（オプション）
     * @param status 新しいステータス（オプション）
     * @returns 更新されたタスク情報
     */
    async updateTask(
        accessToken: string, 
        taskId: string, 
        name?: string, 
        description?: string, 
        status?: string
    ) {
        const updateData: any = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (status) updateData.status = status;

        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ClickUpタスクの更新に失敗しました: ${response.status} - ${errorText}`);
        }

        const task = await response.json();
        return this.formatTaskDates(task);
    }

    /**
     * タスクに担当者を振り分け（アサイン）
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @param assigneeIds 追加する担当者のユーザーIDリスト
     * @param removeAssigneeIds 削除する担当者のユーザーIDリスト（オプション）
     * @returns 更新されたタスク情報
     */
    async assignTask(
        accessToken: string, 
        taskId: string, 
        assigneeIds: string[], 
        removeAssigneeIds?: string[]
    ) {
        const updateData: any = {
            assignees: {
                add: assigneeIds
            }
        };

        if (removeAssigneeIds && removeAssigneeIds.length > 0) {
            updateData.assignees.rem = removeAssigneeIds;
        }

        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ClickUpタスクの担当者変更に失敗しました: ${response.status} - ${errorText}`);
        }

        const task = await response.json();
        return this.formatTaskDates(task);
    }

    /**
     * タスクを検索
     * @param accessToken ClickUp APIアクセストークン
     * @param searchTerm 検索キーワード
     * @param teamId チームID（省略で全ワークスペース）
     * @returns 検索結果のタスク一覧
     */
    async searchTasks(accessToken: string, searchTerm: string, teamId?: string) {
        try {
            let teams;
            if (teamId) {
                // 特定のチームのみ
                const workspacesData = await this.getWorkspaces(accessToken);
                const team = workspacesData.teams.find(t => t.id === teamId);
                teams = team ? [team] : [{ id: teamId, name: `Team ${teamId}` }];
            } else {
                // 全ワークスペースを取得
                const workspacesData = await this.getWorkspaces(accessToken);
                teams = workspacesData.teams || [];
            }

            const searchResults: any[] = [];

            for (const team of teams) {
                try {
                    const url = new URL(`${this.deps.config.clickupApiBaseUrl}/team/${team.id}/task`);

                    // 検索キーワードを設定
                    url.searchParams.set('search', searchTerm);
                    // 取得件数を15件に設定
                    url.searchParams.set('limit', '15');
                    // 完了済みタスクも含める
                    url.searchParams.set('include_closed', 'true');

                    const response = await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        console.warn(`チーム ${team.id} のタスク検索でエラー: ${response.status}`);
                        continue;
                    }

                    const data = await response.json() as { tasks?: any[] };
                    if (data.tasks && Array.isArray(data.tasks)) {
                        // チーム情報を各タスクに追加し、日付を変換
                        const tasksWithTeamInfo = data.tasks.map((task: any) => {
                            const formattedTask = this.formatTaskDates(task);
                            return {
                                ...formattedTask,
                                teamId: team.id,
                                teamName: team.name || 'Unknown Team'
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
                totalTasks: searchResults.length
            };
        } catch (error) {
            throw new Error(`タスクの検索に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 