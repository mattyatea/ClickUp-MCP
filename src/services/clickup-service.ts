import type { ClickUpUserResponse, ServiceDependencies } from '../types';

export class ClickUpService {
    constructor(private deps: ServiceDependencies) { }

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

    async getWorkspaces(accessToken: string) {
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
} 