/**
 * ClickUp MCP Server - Type Definitions
 *
 * このファイルには、プロジェクト全体で使用される型定義が含まれています。
 */

export interface UserProps extends Record<string, unknown> {
	id: string;
	username: string;
	email: string;
	accessToken: string;
}

export interface ClickUpUser {
	id: string;
	username: string;
	email: string;
}

export interface ClickUpUserResponse {
	user: ClickUpUser;
}

export interface AppConfig {
	clickupClientId: string;
	clickupClientSecret: string;
	cookieEncryptionKey: string;
	clickupApiBaseUrl: string;
	clickupTokenUrl: string;
	notificationTtl: number;
}

export interface ServiceDependencies {
	env: Env;
	config: AppConfig;
}

export interface WebhookPayload {
	event: string;
	[key: string]: any;
}

export interface ClickUpTeam {
	id: string;
	name: string;
	color?: string;
	avatar?: string;
}

export interface ClickUpSpace {
	id: string;
	name: string;
	color?: string;
	private: boolean;
	avatar?: string;
	admin_can_manage?: boolean;
	statuses?: any[];
	multiple_assignees?: boolean;
	features?: any;
}

export interface ClickUpFolder {
	id: string;
	name: string;
	orderindex: number;
	override_statuses: boolean;
	hidden: boolean;
	space: {
		id: string;
		name: string;
	};
	task_count: string;
	archived: boolean;
	statuses: any[];
	lists: any[];
	permission_level: string;
}

export interface ClickUpList {
	id: string;
	name: string;
	orderindex: number;
	status?: any;
	priority?: any;
	assignee?: any;
	task_count?: number;
	due_date?: string;
	due_date_time?: boolean;
	start_date?: string;
	start_date_time?: boolean;
	folder: {
		id: string;
		name: string;
		hidden: boolean;
		access: boolean;
	};
	space: {
		id: string;
		name: string;
		access: boolean;
	};
	archived: boolean;
	override_statuses?: boolean;
	statuses?: any[];
	permission_level: string;
}

export interface ClickUpWorkspacesResponse {
	teams: ClickUpTeam[];
}

export interface ClickUpSpacesResponse {
	spaces: ClickUpSpace[];
}

export interface ClickUpFoldersResponse {
	folders: ClickUpFolder[];
}

export interface ClickUpListsResponse {
	lists: ClickUpList[];
}

export interface ClickUpListWithLocation extends ClickUpList {
	location: "space" | "folder";
	folderId?: string;
	folderName?: string;
}

export interface ClickUpSpaceWithLists {
	teamId: string;
	teamName: string;
	spaceId: string;
	spaceName: string;
	lists: ClickUpListWithLocation[];
}

export interface ClickUpAllListsResponse {
	success: boolean;
	data: ClickUpSpaceWithLists[];
	totalLists: number;
}
