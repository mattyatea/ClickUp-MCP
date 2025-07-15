/**
 * ClickUp Advanced Search - 詳細絞り込み検索
 *
 * 多様な条件でタスクを詳細に絞り込み検索する機能
 */

import type { ServiceDependencies } from "#/types";
import { ClickUpAuth } from "#/auth/user";
import { ClickUpFormatters } from "#/utils/formatters";

// 詳細検索のフィルター条件インターフェース
export interface AdvancedSearchFilters {
  // 基本検索
  searchTerm?: string;

  // ステータスフィルター
  statuses?: string[];

  // 優先度フィルター（1: Urgent, 2: High, 3: Normal, 4: Low）
  priorities?: number[];

  // 担当者フィルター
  assigneeIds?: string[];

  // 作成者フィルター
  creatorIds?: string[];

  // 日付範囲フィルター（Unix timestamp）
  dueDateFrom?: number;
  dueDateTo?: number;
  startDateFrom?: number;
  startDateTo?: number;
  createdDateFrom?: number;
  createdDateTo?: number;
  updatedDateFrom?: number;
  updatedDateTo?: number;

  // タグフィルター
  tags?: string[];

  // 親タスクフィルター
  parentTaskId?: string;

  // その他のオプション
  includeSubtasks?: boolean;
  includeArchived?: boolean;
  includeClosed?: boolean;

  // カスタムフィールドフィルター
  customFields?: { [fieldId: string]: any };

  // ページネーション
  limit?: number;
  page?: number;

  // 対象チーム
  teamId?: string;
}

// 優先度の定数
export const PRIORITIES = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
} as const;

export class ClickUpAdvancedSearch {
  private auth: ClickUpAuth;
  private formatters: ClickUpFormatters;

  constructor(private deps: ServiceDependencies) {
    this.auth = new ClickUpAuth(deps);
    this.formatters = new ClickUpFormatters(deps);
  }

  /**
   * 詳細条件でタスクを検索
   */
  async searchTasksAdvanced(accessToken: string, filters: AdvancedSearchFilters) {
    try {
      // チーム情報を取得
      let teams;
      if (filters.teamId) {
        const workspacesData = await this.auth.getWorkspaces(accessToken);
        const team = workspacesData.teams.find((t) => t.id === filters.teamId);
        teams = team ? [team] : [{ id: filters.teamId, name: `Team ${filters.teamId}` }];
      } else {
        const workspacesData = await this.auth.getWorkspaces(accessToken);
        teams = workspacesData.teams || [];
      }

      const searchResults: any[] = [];

      for (const team of teams) {
        try {
          const url = new URL(`${this.deps.config.clickupApiBaseUrl}/team/${team.id}/task`);

          // パラメータを設定
          this.setSearchParameters(url, filters);

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            console.warn(`チーム ${team.id} の詳細検索でエラー: ${response.status}`);
            continue;
          }

          const data = (await response.json()) as { tasks?: any[] };
          if (data.tasks && Array.isArray(data.tasks)) {
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
          console.warn(`チーム ${team.id} の詳細検索でエラー:`, error);
        }
      }

      // カスタムフィールドでの追加フィルタリング（クライアント側で実行）
      let filteredResults = searchResults;
      if (filters.customFields) {
        filteredResults = this.filterByCustomFields(searchResults, filters.customFields);
      }

      return {
        success: true,
        filters,
        tasks: filteredResults,
        totalTasks: filteredResults.length,
        pagination: {
          limit: filters.limit || 15,
          page: filters.page || 0,
          hasMore: filteredResults.length === (filters.limit || 15),
          nextPage: (filters.page || 0) + 1,
        },
      };
    } catch (error) {
      throw new Error(`詳細タスク検索に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * URLにサーチパラメータを設定
   */
  private setSearchParameters(url: URL, filters: AdvancedSearchFilters) {
    // 基本検索キーワード
    if (filters.searchTerm) {
      url.searchParams.set("search", filters.searchTerm);
    }

    // ページネーション
    url.searchParams.set("limit", (filters.limit || 15).toString());
    url.searchParams.set("page", (filters.page || 0).toString());

    // ステータスフィルター
    if (filters.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach((status) => {
        url.searchParams.append("statuses[]", status);
      });
    }

    // 優先度フィルター
    if (filters.priorities && filters.priorities.length > 0) {
      filters.priorities.forEach((priority) => {
        url.searchParams.append("priorities[]", priority.toString());
      });
    }

    // 担当者フィルター
    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      filters.assigneeIds.forEach((assigneeId) => {
        url.searchParams.append("assignees[]", assigneeId);
      });
    }

    // 作成者フィルター
    if (filters.creatorIds && filters.creatorIds.length > 0) {
      filters.creatorIds.forEach((creatorId) => {
        url.searchParams.append("creators[]", creatorId);
      });
    }

    // タグフィルター
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag) => {
        url.searchParams.append("tags[]", tag);
      });
    }

    // 親タスクフィルター
    if (filters.parentTaskId) {
      url.searchParams.set("parent", filters.parentTaskId);
    }

    // 日付フィルター
    if (filters.dueDateFrom) {
      url.searchParams.set("due_date_gt", filters.dueDateFrom.toString());
    }
    if (filters.dueDateTo) {
      url.searchParams.set("due_date_lt", filters.dueDateTo.toString());
    }
    if (filters.startDateFrom) {
      url.searchParams.set("start_date_gt", filters.startDateFrom.toString());
    }
    if (filters.startDateTo) {
      url.searchParams.set("start_date_lt", filters.startDateTo.toString());
    }
    if (filters.createdDateFrom) {
      url.searchParams.set("date_created_gt", filters.createdDateFrom.toString());
    }
    if (filters.createdDateTo) {
      url.searchParams.set("date_created_lt", filters.createdDateTo.toString());
    }
    if (filters.updatedDateFrom) {
      url.searchParams.set("date_updated_gt", filters.updatedDateFrom.toString());
    }
    if (filters.updatedDateTo) {
      url.searchParams.set("date_updated_lt", filters.updatedDateTo.toString());
    }

    // その他のオプション
    if (filters.includeSubtasks !== undefined) {
      url.searchParams.set("subtasks", filters.includeSubtasks.toString());
    }
    if (filters.includeArchived !== undefined) {
      url.searchParams.set("include_archived", filters.includeArchived.toString());
    }
    if (filters.includeClosed !== undefined) {
      url.searchParams.set("include_closed", filters.includeClosed.toString());
    }
  }

  /**
   * カスタムフィールドによるフィルタリング（クライアント側）
   */
  private filterByCustomFields(tasks: any[], customFields: { [fieldId: string]: any }) {
    return tasks.filter((task) => {
      if (!task.custom_fields) return false;

      return Object.entries(customFields).every(([fieldId, expectedValue]) => {
        const customField = task.custom_fields.find((cf: any) => cf.id === fieldId);
        if (!customField) return false;

        // カスタムフィールドの値をチェック
        const actualValue = customField.value;

        if (Array.isArray(expectedValue)) {
          // 配列の場合は配列に含まれているかチェック
          return expectedValue.includes(actualValue);
        } else if (typeof expectedValue === "object" && expectedValue.min !== undefined && expectedValue.max !== undefined) {
          // 範囲指定の場合
          const numValue = Number(actualValue);
          return numValue >= expectedValue.min && numValue <= expectedValue.max;
        } else {
          // 通常の値比較
          return actualValue === expectedValue;
        }
      });
    });
  }

  /**
   * ステータス一覧を取得
   */
  async getAvailableStatuses(accessToken: string, spaceId: string) {
    try {
      const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/space/${spaceId}/status`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ステータス一覧の取得に失敗: ${response.status}`);
      }

      const data = (await response.json()) as { statuses?: any[] };
      return data.statuses || [];
    } catch (error) {
      throw new Error(`ステータス一覧の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * カスタムフィールド一覧を取得
   */
  async getCustomFields(accessToken: string, listId: string) {
    try {
      const response = await fetch(`${this.deps.config.clickupApiBaseUrl}/list/${listId}/field`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`カスタムフィールド一覧の取得に失敗: ${response.status}`);
      }

      const data = (await response.json()) as { fields?: any[] };
      return data.fields || [];
    } catch (error) {
      throw new Error(`カスタムフィールド一覧の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 検索条件を簡単に作成するヘルパーメソッド
   */
  createFilters(): AdvancedSearchFilters {
    return {
      limit: 15,
      page: 0,
      includeClosed: false,
      includeArchived: false,
      includeSubtasks: true,
    };
  }

  /**
   * 優先度でフィルターを作成
   */
  createPriorityFilter(priorities: ("urgent" | "high" | "normal" | "low")[]): number[] {
    const priorityMap = {
      urgent: PRIORITIES.URGENT,
      high: PRIORITIES.HIGH,
      normal: PRIORITIES.NORMAL,
      low: PRIORITIES.LOW,
    };
    return priorities.map((p) => priorityMap[p]);
  }

  /**
   * 日付範囲でフィルターを作成
   */
  createDateRangeFilter(fromDate: Date, toDate: Date): { from: number; to: number } {
    return {
      from: Math.floor(fromDate.getTime()),
      to: Math.floor(toDate.getTime()),
    };
  }
}
