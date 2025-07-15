/**
 * ClickUp MCP Server - Configuration
 *
 * アプリケーションの設定とClickUp API関連の定数を定義します。
 */

import type { AppConfig } from "#/types";

export function createAppConfig(env: Env): AppConfig {
  return {
    clickupClientId: env.CLICKUP_CLIENT_ID,
    clickupClientSecret: env.CLICKUP_CLIENT_SECRET,
    cookieEncryptionKey: env.COOKIE_ENCRYPTION_KEY,
    clickupApiBaseUrl: "https://api.clickup.com/api/v2",
    clickupTokenUrl: "https://api.clickup.com/api/v2/oauth/token",
    notificationTtl: 24 * 3600, // 24時間
  };
}

export const CLICKUP_AUTHORIZE_URL = "https://app.clickup.com/api";

/** サーバー設定 */
export const SERVER_CONFIG = {
  serverName: "ClickUp MCP Server",
  description: "ClickUp OAuth認証を備えたMCPサーバーです。",
  logo: "https://clickup.com/assets/brand/logo-v3-clickup-symbol-only.svg",
};

/** ClickUp API設定 */
export const CLICKUP_CONFIG = {
  authorizeUrl: CLICKUP_AUTHORIZE_URL,
  tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
  userInfoUrl: "https://api.clickup.com/api/v2/user",
  apiBaseUrl: "https://api.clickup.com/api/v2",
};
