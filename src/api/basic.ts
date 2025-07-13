/**
 * ClickUp Tasks - 基本操作
 * 
 * タスクの基本的な操作（取得、更新、担当者変更）
 */

import type { ServiceDependencies } from "#/types";
import { ClickUpFormatters } from "#/utils/formatters";

export class ClickUpTaskBasic {
    private formatters: ClickUpFormatters;

    constructor(private deps: ServiceDependencies) {
        this.formatters = new ClickUpFormatters(deps);
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
        return this.formatters.formatTaskDates(task);
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
        return this.formatters.formatTaskDates(task);
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
        return this.formatters.formatTaskDates(task);
    }
} 