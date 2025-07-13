/**
 * ClickUp API Client - 統合インデックス
 * 
 * すべてのClickUp関連クラスを統合して、統一されたAPIクライアントインターフェースを提供
 */

import type { ServiceDependencies } from "#/types";
import { ClickUpAuth } from "#/auth/user";
import { ClickUpTaskBasic } from "#/api/basic";
import { ClickUpTaskSearch } from "#/api/search";
import { ClickUpAdvancedSearch, type AdvancedSearchFilters } from "#/api/advanced-search";
import { ClickUpFormatters } from "#/utils/formatters";

export class ClickUpClient {
    private auth: ClickUpAuth;
    private taskBasic: ClickUpTaskBasic;
    private taskSearch: ClickUpTaskSearch;
    private advancedSearch: ClickUpAdvancedSearch;
    private formatters: ClickUpFormatters;

    constructor(private deps: ServiceDependencies) {
        this.auth = new ClickUpAuth(deps);
        this.taskBasic = new ClickUpTaskBasic(deps);
        this.taskSearch = new ClickUpTaskSearch(deps);
        this.advancedSearch = new ClickUpAdvancedSearch(deps);
        this.formatters = new ClickUpFormatters(deps);
    }

    // ============== ユーザー・認証関連 ==============

    async getUserInfo(accessToken: string) {
        return this.auth.getUserInfo(accessToken);
    }

    async getWorkspaces(accessToken: string) {
        return this.auth.getWorkspaces(accessToken);
    }

    // ============== タスク基本操作 ==============

    async getTask(accessToken: string, taskId: string) {
        return this.taskBasic.getTask(accessToken, taskId);
    }

    async updateTask(
        accessToken: string,
        taskId: string,
        name?: string,
        description?: string,
        status?: string
    ) {
        return this.taskBasic.updateTask(accessToken, taskId, name, description, status);
    }

    async assignTask(
        accessToken: string,
        taskId: string,
        assigneeIds: string[],
        removeAssigneeIds?: string[]
    ) {
        return this.taskBasic.assignTask(accessToken, taskId, assigneeIds, removeAssigneeIds);
    }

    // ============== タスク検索・一覧 ==============

    async getMyTasks(accessToken: string, teamId?: string, limit: number = 15, page: number = 0) {
        return this.taskSearch.getMyTasks(accessToken, teamId, limit, page);
    }

    async searchTasks(accessToken: string, searchTerm: string, teamId?: string, limit: number = 15, page: number = 0) {
        return this.taskSearch.searchTasks(accessToken, searchTerm, teamId, limit, page);
    }

    // ============== 詳細検索 ==============

    async searchTasksAdvanced(accessToken: string, filters: AdvancedSearchFilters) {
        return this.advancedSearch.searchTasksAdvanced(accessToken, filters);
    }

    async getAvailableStatuses(accessToken: string, spaceId: string) {
        return this.advancedSearch.getAvailableStatuses(accessToken, spaceId);
    }

    async getCustomFields(accessToken: string, listId: string) {
        return this.advancedSearch.getCustomFields(accessToken, listId);
    }

    createSearchFilters(): AdvancedSearchFilters {
        return this.advancedSearch.createFilters();
    }

    createPriorityFilter(priorities: ('urgent' | 'high' | 'normal' | 'low')[]): number[] {
        return this.advancedSearch.createPriorityFilter(priorities);
    }

    createDateRangeFilter(fromDate: Date, toDate: Date): { from: number, to: number } {
        return this.advancedSearch.createDateRangeFilter(fromDate, toDate);
    }
}

// 個別のクラスもエクスポート（必要に応じて直接利用可能）
export { ClickUpAuth } from "#/auth/user";
export { ClickUpTaskBasic } from "#/api/basic";
export { ClickUpTaskSearch } from "#/api/search";
export { ClickUpAdvancedSearch, type AdvancedSearchFilters, PRIORITIES } from "#/api/advanced-search";
export { ClickUpFormatters } from "#/utils/formatters"; 