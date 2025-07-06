/**
 * ClickUp MCP Server - Combined Handler
 * 
 * OAuthハンドラーとサイトハンドラーを統合するメインハンドラー。
 */

import { Hono } from "hono";
import { OAuthHandler } from "./oauth-handler";
import { SiteHandler } from "./site-handler";

const app = new Hono<{ Bindings: Env }>();

// サイトハンドラー（ルートページなど）をマウント
app.route("/", SiteHandler);

// OAuthハンドラー（認証関連）をマウント
app.route("/", OAuthHandler);

export { app as CombinedHandler };