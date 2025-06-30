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

export interface SSENotification {
    type: string;
    message: string;
    data?: Record<string, any>;
    timestamp: string;
    userId?: string;
}

export interface AppConfig {
    clickupClientId: string;
    clickupClientSecret: string;
    cookieEncryptionKey: string;
    clickupApiBaseUrl: string;
    clickupTokenUrl: string;
    sseHeartbeatInterval: number;
    sseConnectionTimeout: number;
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