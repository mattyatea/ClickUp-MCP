/**
 * ClickUp MCP Server - ClickUp API Service
 * 
 * ClickUp APIとの通信を担当するサービスクラス。
 * ユーザー情報、ワークスペース、タスクなどの取得機能を提供します。
 */

import type {
    ClickUpUserResponse,
    ServiceDependencies,
    ClickUpWorkspacesResponse,
    ClickUpSpacesResponse,
    ClickUpFoldersResponse,
    ClickUpListsResponse,
    ClickUpAllListsResponse,
    ClickUpSpaceWithLists,
    ClickUpListWithLocation
} from '../types';

export class ClickUpService {
    constructor(private deps: ServiceDependencies) { }

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
     * 指定されたチームのスペース情報を取得
     * @param accessToken ClickUp APIアクセストークン
     * @param teamId チームID
     * @param archived アーカイブされたスペースを含める
     * @returns スペース情報
     */
    async getSpaces(accessToken: string, teamId: string, archived?: boolean): Promise<ClickUpSpacesResponse> {
        const url = new URL(`${this.deps.config.clickupApiBaseUrl}/team/${teamId}/space`);

        if (archived !== undefined) {
            url.searchParams.set('archived', archived.toString());
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpスペース情報の取得に失敗しました: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 指定されたスペースのフォルダー情報を取得
     * @param accessToken ClickUp APIアクセストークン
     * @param spaceId スペースID
     * @param archived アーカイブされたフォルダーを含める
     * @returns フォルダー情報
     */
    async getFolders(accessToken: string, spaceId: string, archived?: boolean): Promise<ClickUpFoldersResponse> {
        const url = new URL(`${this.deps.config.clickupApiBaseUrl}/space/${spaceId}/folder`);

        if (archived !== undefined) {
            url.searchParams.set('archived', archived.toString());
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpフォルダー情報の取得に失敗しました: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 指定されたフォルダーのリスト情報を取得
     * @param accessToken ClickUp APIアクセストークン
     * @param folderId フォルダーID
     * @param archived アーカイブされたリストを含める
     * @returns リスト情報
     */
    async getListsInFolder(accessToken: string, folderId: string, archived?: boolean): Promise<ClickUpListsResponse> {
        const url = new URL(`${this.deps.config.clickupApiBaseUrl}/folder/${folderId}/list`);

        if (archived !== undefined) {
            url.searchParams.set('archived', archived.toString());
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpリスト情報の取得に失敗しました: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 指定されたスペース直下のリスト情報を取得（フォルダーなし）
     * @param accessToken ClickUp APIアクセストークン
     * @param spaceId スペースID
     * @param archived アーカイブされたリストを含める
     * @returns リスト情報
     */
    async getListsInSpace(accessToken: string, spaceId: string, archived?: boolean): Promise<ClickUpListsResponse> {
        const url = new URL(`${this.deps.config.clickupApiBaseUrl}/space/${spaceId}/list`);

        if (archived !== undefined) {
            url.searchParams.set('archived', archived.toString());
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpリスト情報の取得に失敗しました: ${response.status}`);
        }

        return response.json();
    }

    /**
     * ワークスペース全体からリストを検索・取得
     * @param accessToken ClickUp APIアクセストークン
     * @param teamId チームID（オプション）
     * @param archived アーカイブされたアイテムを含める
     * @returns 全リスト情報（階層構造付き）
     */
    async getAllLists(accessToken: string, teamId?: string, archived?: boolean): Promise<ClickUpAllListsResponse> {
        try {
            // まずワークスペースを取得
            let teams;
            if (teamId) {
                // 特定のチームのみ - ワークスペース情報を取得してチーム詳細を確認
                const workspacesData = await this.getWorkspaces(accessToken);
                const team = workspacesData.teams.find(t => t.id === teamId);
                teams = team ? [team] : [{ id: teamId, name: `Team ${teamId}` }];
            } else {
                // 全ワークスペースを取得
                const workspacesData = await this.getWorkspaces(accessToken);
                teams = workspacesData.teams || [];
            }

            const allLists: ClickUpSpaceWithLists[] = [];

            for (const team of teams) {
                try {
                    // スペースを取得
                    const spacesData = await this.getSpaces(accessToken, team.id, archived);
                    const spaces = spacesData.spaces || [];

                    for (const space of spaces) {
                        const spaceInfo: ClickUpSpaceWithLists = {
                            teamId: team.id,
                            teamName: team.name || 'Unknown Team',
                            spaceId: space.id,
                            spaceName: space.name,
                            lists: []
                        };

                        try {
                            // スペース直下のリストを取得
                            const spaceListsData = await this.getListsInSpace(accessToken, space.id, archived);
                            const spaceLists = spaceListsData.lists || [];
                            spaceInfo.lists.push(...spaceLists.map((list: any): ClickUpListWithLocation => ({
                                ...list,
                                location: 'space'
                            })));

                            // フォルダーを取得
                            const foldersData = await this.getFolders(accessToken, space.id, archived);
                            const folders = foldersData.folders || [];

                            for (const folder of folders) {
                                try {
                                    // フォルダー内のリストを取得
                                    const folderListsData = await this.getListsInFolder(accessToken, folder.id, archived);
                                    const folderLists = folderListsData.lists || [];
                                    spaceInfo.lists.push(...folderLists.map((list: any): ClickUpListWithLocation => ({
                                        ...list,
                                        location: 'folder',
                                        folderId: folder.id,
                                        folderName: folder.name
                                    })));
                                } catch (error) {
                                    console.warn(`フォルダー ${folder.id} のリスト取得でエラー:`, error);
                                }
                            }
                        } catch (error) {
                            console.warn(`スペース ${space.id} の処理でエラー:`, error);
                        }

                        allLists.push(spaceInfo);
                    }
                } catch (error) {
                    console.warn(`チーム ${team.id} の処理でエラー:`, error);
                }
            }

            return {
                success: true,
                data: allLists,
                totalLists: allLists.reduce((total, space) => total + space.lists.length, 0)
            };
        } catch (error) {
            throw new Error(`全リスト情報の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 指定されたリストのタスクを取得
     * @param accessToken ClickUp APIアクセストークン
     * @param listId リストID
     * @param options 取得オプション
     * @returns タスク情報
     */
    async getTasks(accessToken: string, listId: string, options?: {
        archived?: boolean;
        page?: number;
    }) {
        const url = new URL(`${this.deps.config.clickupApiBaseUrl}/list/${listId}/task`);

        if (options?.archived !== undefined) {
            url.searchParams.set('archived', options.archived.toString());
        }
        if (options?.page !== undefined) {
            url.searchParams.set('page', options.page.toString());
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`ClickUpタスク情報の取得に失敗しました: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 新しいタスクを作成
     * @param accessToken ClickUp APIアクセストークン
     * @param listId リストID
     * @param taskData タスクデータ
     * @returns 作成されたタスク情報
     */
    async createTask(accessToken: string, listId: string, taskData: {
        name: string;
        description?: string;
        assignees?: string[];
        tags?: string[];
        status?: string;
        priority?: number;
        due_date?: number;
        due_date_time?: boolean;
        time_estimate?: number;
        start_date?: number;
        start_date_time?: boolean;
        notify_all?: boolean;
        parent?: string;
        links_to?: string;
        check_required_custom_fields?: boolean;
        custom_fields?: Array<{
            id: string;
            value: any;
        }>;
    }) {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/list/${listId}/task`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ClickUpタスクの作成に失敗しました: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * タスクを更新
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @param updateData 更新データ
     * @returns 更新されたタスク情報
     */
    async updateTask(accessToken: string, taskId: string, updateData: {
        name?: string;
        description?: string;
        status?: string;
        priority?: number;
        due_date?: number;
        due_date_time?: boolean;
        time_estimate?: number;
        start_date?: number;
        start_date_time?: boolean;
        assignees?: {
            add?: string[];
            rem?: string[];
        };
        archived?: boolean;
    }) {
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

        return response.json();
    }

    /**
     * タスクを削除
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @returns 削除結果
     */
    async deleteTask(accessToken: string, taskId: string) {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ClickUpタスクの削除に失敗しました: ${response.status} - ${errorText}`);
        }

        return { success: true, message: 'タスクが正常に削除されました' };
    }

    /**
     * 時間追跡エントリを作成
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @param timeData 時間データ
     * @returns 作成された時間追跡エントリ
     */
    async createTimeEntry(accessToken: string, taskId: string, timeData: {
        description: string;
        start: number;
        billable?: boolean;
        duration: number;
        assignee?: string;
        tags?: string[];
    }) {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}/time`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(timeData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`時間追跡エントリの作成に失敗しました: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * タスクの時間追跡エントリを取得
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @returns 時間追跡エントリ一覧
     */
    async getTimeEntries(accessToken: string, taskId: string) {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}/time`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`時間追跡エントリの取得に失敗しました: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 時間追跡エントリを更新
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @param intervalId 時間エントリID
     * @param updateData 更新データ
     * @returns 更新された時間追跡エントリ
     */
    async updateTimeEntry(accessToken: string, taskId: string, intervalId: string, updateData: {
        description?: string;
        start?: number;
        duration?: number;
        billable?: boolean;
        tags?: string[];
    }) {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}/time/${intervalId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`時間追跡エントリの更新に失敗しました: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * 時間追跡エントリを削除
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @param intervalId 時間エントリID
     * @returns 削除結果
     */
    async deleteTimeEntry(accessToken: string, taskId: string, intervalId: string) {
        const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/task/${taskId}/time/${intervalId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`時間追跡エントリの削除に失敗しました: ${response.status} - ${errorText}`);
        }

        return { success: true, message: '時間追跡エントリが正常に削除されました' };
    }

    /**
     * 実行中の時間追跡を開始
     * @param accessToken ClickUp APIアクセストークン
     * @param taskId タスクID
     * @param description 作業内容の説明
     * @returns 開始された時間追跡情報
     */
    async startTimeTracking(accessToken: string, taskId: string, description: string) {
        const timeData = {
            description,
            start: Date.now(),
            billable: false,
            duration: 0, // 実行中は0
        };

        return this.createTimeEntry(accessToken, taskId, timeData);
    }

    /**
 * 実行中の時間追跡を停止
 * @param accessToken ClickUp APIアクセストークン
 * @param taskId タスクID
 * @param intervalId 時間エントリID
 * @returns 停止された時間追跡情報
 */
    async stopTimeTracking(accessToken: string, taskId: string, intervalId: string) {
        const timeEntries = await this.getTimeEntries(accessToken, taskId) as { data: Array<{ id: string; start: number }> };
        const currentEntry = timeEntries.data.find((entry) => entry.id === intervalId);

        if (!currentEntry) {
            throw new Error('指定された時間追跡エントリが見つかりません');
        }

        const duration = Date.now() - currentEntry.start;

        return this.updateTimeEntry(accessToken, taskId, intervalId, {
            duration,
        });
    }

    /**
     * 自分がアサインされているタスクを取得
     * @param accessToken ClickUp APIアクセストークン
     * @param teamId チームID（省略で全ワークスペース）
     * @param options 取得オプション
     * @returns アサインされているタスク情報
     */
    async getMyTasks(accessToken: string, teamId?: string, options?: {
        archived?: boolean;
        page?: number;
        statuses?: string[];
        subtasks?: boolean;
        include_closed?: boolean;
    }) {
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

                    // その他のオプションを設定
                    if (options?.archived !== undefined) {
                        url.searchParams.set('archived', options.archived.toString());
                    }
                    if (options?.page !== undefined) {
                        url.searchParams.set('page', options.page.toString());
                    }
                    if (options?.statuses) {
                        options.statuses.forEach(status => {
                            url.searchParams.append('statuses[]', status);
                        });
                    }
                    if (options?.subtasks !== undefined) {
                        url.searchParams.set('subtasks', options.subtasks.toString());
                    }
                    if (options?.include_closed !== undefined) {
                        url.searchParams.set('include_closed', options.include_closed.toString());
                    }

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
                        // チーム情報を各タスクに追加
                        const tasksWithTeamInfo = data.tasks.map((task: any) => ({
                            ...task,
                            teamId: team.id,
                            teamName: team.name || 'Unknown Team'
                        }));
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
} 