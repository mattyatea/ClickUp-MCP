/**
 * ClickUp MCP Server - Main Entry Point
 *
 * CloudflareのAgentsSDKを使用したMCPサーバーの実装。
 * ClickUp OAuth認証とMCPツールを提供します。
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { CombinedHandler } from "#/handlers/combined-handler";
import { createAppConfig } from "#/config";
import { ClickUpClient } from "#/api";
import type { UserProps, ServiceDependencies } from "#/types";
import { registerAuthTools } from "#/tools/auth";
import { registerTaskTools } from "#/tools/task";
import { registerSearchTools } from "#/tools/search";

/**
 * ClickUp MCP サーバークラス
 * CloudflareのMcpAgentを拡張して、ClickUp特有の機能を提供
 */
export class MyMCP extends McpAgent<Env, Record<string, never>, UserProps> {
  server = new McpServer({
    name: "ClickUp MCP Server",
    version: "1.0.0",
    icon: "https://clickup.com/favicon.ico",
  });

  async init() {
    const deps: ServiceDependencies = {
      env: this.env,
      config: createAppConfig(this.env),
    };
    const clickupClient = new ClickUpClient(deps);

    // アクセストークン取得のヘルパー関数
    const getAccessToken = () => this.props.accessToken;

    // 機能別にMCPツールを登録
    registerAuthTools(this.server, clickupClient, getAccessToken);
    registerTaskTools(this.server, clickupClient, getAccessToken);
    registerSearchTools(this.server, clickupClient, getAccessToken);
  }
}

// OAuth Provider設定とエクスポート
export default new OAuthProvider({
  apiHandler: MyMCP.mount("/sse") as any,
  apiRoute: "/sse",
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: CombinedHandler as any,
  tokenEndpoint: "/token",
});
