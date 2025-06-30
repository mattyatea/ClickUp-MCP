import type { AppConfig } from './types';

export function createAppConfig(env: Env): AppConfig {
    return {
        clickupClientId: env.CLICKUP_CLIENT_ID,
        clickupClientSecret: env.CLICKUP_CLIENT_SECRET,
        cookieEncryptionKey: env.COOKIE_ENCRYPTION_KEY,
        clickupApiBaseUrl: 'https://api.clickup.com/api/v2',
        clickupTokenUrl: 'https://api.clickup.com/api/v2/oauth/token',
        sseHeartbeatInterval: 5000, // 5秒
        sseConnectionTimeout: 30 * 60 * 1000, // 30分
        notificationTtl: 3600, // 1時間
    };
}

export const CLICKUP_AUTHORIZE_URL = 'https://app.clickup.com/api'; 