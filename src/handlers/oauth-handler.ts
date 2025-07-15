/**
 * ClickUp MCP Server - OAuth Handler
 *
 * ClickUp OAuth認証フローを処理するHonoアプリケーション。
 * 認証、承認、コールバック、Webhookエンドポイントを提供します。
 */

import type {
	AuthRequest,
	OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import {
	createErrorPageResponse,
	createErrorResponse,
	createSuccessResponse,
} from "#/api/common/error-handler";
import { CLICKUP_CONFIG, SERVER_CONFIG } from "#/config";
import type { UserProps } from "#/types";
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl } from "#/utils";
import {
	clientIdAlreadyApproved,
	parseRedirectApproval,
	renderApprovalDialog,
} from "#/workers-oauth-utils";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

/**
 * リクエストがブラウザからかどうかを判定
 * @param request リクエストオブジェクト
 * @returns ブラウザからのリクエストの場合true
 */
function isBrowserRequest(request: Request): boolean {
	const userAgent = request.headers.get("User-Agent") || "";
	const accept = request.headers.get("Accept") || "";

	// HTMLを受け入れるブラウザからのリクエストかチェック
	return (
		accept.includes("text/html") ||
		userAgent.includes("Mozilla") ||
		userAgent.includes("Chrome") ||
		userAgent.includes("Safari") ||
		userAgent.includes("Firefox") ||
		userAgent.includes("Edge")
	);
}

/**
 * リクエストタイプに応じたエラーレスポンスを生成
 * @param request リクエストオブジェクト
 * @param error エラーメッセージ
 * @param statusCode HTTPステータスコード
 * @param code エラーコード（オプション）
 * @returns 適切な形式のResponseオブジェクト
 */
function createAdaptiveErrorResponse(
	request: Request,
	error: string,
	statusCode: number = 500,
	code?: string,
): Response {
	if (isBrowserRequest(request)) {
		return createErrorPageResponse(error, statusCode, code);
	} else {
		return createErrorResponse(error, statusCode, code);
	}
}

/**
 * OAuth認証開始エンドポイント
 */
app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const { clientId } = oauthReqInfo;

	if (!clientId) {
		return createAdaptiveErrorResponse(
			c.req.raw,
			"無効なリクエストです。クライアントIDが指定されていません。",
			400,
			"invalid_client",
		);
	}

	// クライアントが既に承認済みかチェック
	if (
		await clientIdAlreadyApproved(
			c.req.raw,
			oauthReqInfo.clientId,
			c.env.COOKIE_ENCRYPTION_KEY,
		)
	) {
		return redirectToClickUp(c.req.raw, oauthReqInfo, c.env);
	}

	// 承認ダイアログを表示
	return renderApprovalDialog(c.req.raw, {
		client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
		server: {
			description: SERVER_CONFIG.description,
			logo: SERVER_CONFIG.logo,
			name: SERVER_CONFIG.serverName,
		},
		state: { oauthReqInfo },
	});
});

/**
 * OAuth認証承認処理エンドポイント
 */
app.post("/authorize", async (c) => {
	// フォーム送信を検証し、状態を抽出し、次回承認ダイアログをスキップするためのSet-Cookieヘッダーを生成
	const { state, headers } = await parseRedirectApproval(
		c.req.raw,
		c.env.COOKIE_ENCRYPTION_KEY,
	);

	if (!state.oauthReqInfo) {
		return createAdaptiveErrorResponse(
			c.req.raw,
			"無効なリクエストです。認証状態が正しくありません。",
			400,
			"invalid_state",
		);
	}

	return redirectToClickUp(c.req.raw, state.oauthReqInfo, c.env, headers);
});

/**
 * ClickUpへのリダイレクト処理
 */
async function redirectToClickUp(
	request: Request,
	oauthReqInfo: AuthRequest,
	env: Env,
	headers: Record<string, string> = {},
) {
	return new Response(null, {
		headers: {
			...headers,
			location: getUpstreamAuthorizeUrl({
				client_id: env.CLICKUP_CLIENT_ID,
				redirect_uri: new URL("/callback", request.url).href,
				state: btoa(encodeURIComponent(JSON.stringify(oauthReqInfo))),
				upstream_url: CLICKUP_CONFIG.authorizeUrl,
			}),
		},
		status: 302,
	});
}

/**
 * OAuth コールバックエンドポイント
 *
 * ClickUpからのユーザー認証後のコールバックを処理します。
 * 一時的なコードをアクセストークンに交換し、ユーザーメタデータと
 * 認証トークンをクライアントに渡すトークンのpropsとして保存します。
 * 最後にクライアントのコールバックURLにリダイレクトします。
 */
app.get("/callback", async (c) => {
	try {
		// 状態からoauthReqInfoを取得
		const stateParam = c.req.query("state");
		if (!stateParam) {
			return createAdaptiveErrorResponse(
				c.req.raw,
				"認証状態パラメータが見つかりません。",
				400,
				"missing_state",
			);
		}

		const oauthReqInfo = JSON.parse(
			decodeURIComponent(atob(stateParam)),
		) as AuthRequest;
		if (!oauthReqInfo.clientId) {
			return createAdaptiveErrorResponse(
				c.req.raw,
				"無効な認証状態です。認証プロセスを最初からやり直してください。",
				400,
				"invalid_state",
			);
		}

		// ClickUpからのエラーをチェック
		const error = c.req.query("error");
		if (error) {
			const errorDescription =
				c.req.query("error_description") || "認証が拒否されました";
			return createAdaptiveErrorResponse(
				c.req.raw,
				`認証に失敗しました: ${errorDescription}`,
				400,
				error,
			);
		}

		const code = c.req.query("code");
		if (!code) {
			return createAdaptiveErrorResponse(
				c.req.raw,
				"認証コードが見つかりません。",
				400,
				"missing_code",
			);
		}

		// コードをアクセストークンに交換
		const [accessToken, errResponse] = await fetchUpstreamAuthToken({
			client_id: c.env.CLICKUP_CLIENT_ID,
			client_secret: c.env.CLICKUP_CLIENT_SECRET,
			code,
			redirect_uri: new URL("/callback", c.req.url).href,
			upstream_url: CLICKUP_CONFIG.tokenUrl,
		});

		if (errResponse) {
			return createAdaptiveErrorResponse(
				c.req.raw,
				"アクセストークンの取得に失敗しました。",
				500,
				"token_exchange_failed",
			);
		}

		// ClickUpからユーザー情報を取得
		const userResponse = await fetch(CLICKUP_CONFIG.userInfoUrl, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!userResponse.ok) {
			return createAdaptiveErrorResponse(
				c.req.raw,
				"ClickUpからユーザー情報を取得できませんでした。しばらく時間をおいてから再度お試しください。",
				500,
				"user_info_fetch_failed",
			);
		}

		const userData = (await userResponse.json()) as {
			user: { id: string; username: string; email: string };
		};
		const { id, username, email } = userData.user;

		// MCPクライアントに新しいトークンを返す
		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			metadata: {
				label: username,
			},
			// MyMCPクラス内でthis.propsとして利用可能
			props: {
				accessToken,
				email,
				id,
				username,
			} as UserProps,
			request: oauthReqInfo,
			scope: oauthReqInfo.scope,
			// ユーザーIDとして安全な文字列を使用（日本語ユーザー名対応）
			userId: id, // usernameの代わりにidを使用
		});

		return Response.redirect(redirectTo);
	} catch (error) {
		console.error("Callback endpoint error:", error);
		return createAdaptiveErrorResponse(
			c.req.raw,
			"認証処理中に予期しないエラーが発生しました。もう一度お試しください。",
			500,
			"internal_error",
		);
	}
});

/**
 * ClickUp Webhookエンドポイント
 *
 * McpAgentがリアルタイム通信を自動的に処理するため、
 * ここではイベントログとして記録のみ行います。
 */
app.post("/webhook/clickup", async (c) => {
	const payload = await c.req.json();

	// WebhookイベントをKVに記録（ログとして）
	const webhookKey = `webhook:${Date.now()}:${Math.random().toString(36).substring(7)}`;
	await c.env.OAUTH_KV.put(
		webhookKey,
		JSON.stringify({
			...payload,
			timestamp: new Date().toISOString(),
		}),
		{ expirationTtl: 24 * 3600 }, // 24時間
	);

	console.log(`ClickUp Webhook received: ${payload.event}`);

	return createSuccessResponse({
		message: "Webhookを受信しました",
		event: payload.event,
	});
});

/**
 * Faviconエンドポイント
 * ClickUpのfaviconをプロキシして提供します
 */
app.get("/favicon.ico", async (c) => {
	try {
		// ClickUpのfaviconを取得
		const response = await fetch("https://clickup.com/favicon.ico");

		if (!response.ok) {
			// フォールバック: リダイレクト
			return c.redirect("https://clickup.com/favicon.ico", 301);
		}

		const favicon = await response.arrayBuffer();

		return new Response(favicon, {
			headers: {
				"Content-Type": "image/x-icon",
				"Cache-Control": "public, max-age=86400", // 24時間キャッシュ
			},
		});
	} catch (_error) {
		// エラー時はリダイレクト
		return c.redirect("https://clickup.com/favicon.ico", 301);
	}
});

/**
 * ヘルスチェックエンドポイント
 */
app.get("/health", async (_c) => {
	return createSuccessResponse({
		status: "healthy",
		service: SERVER_CONFIG.serverName,
	});
});

/**
 * 404 Not Found ハンドラー
 */
app.notFound((c) => {
	return createAdaptiveErrorResponse(
		c.req.raw,
		"お探しのページは見つかりませんでした。URLを確認してください。",
		404,
		"not_found",
	);
});

/**
 * 一般的なエラーハンドラー
 */
app.onError((error, c) => {
	console.error("Unexpected error:", error);
	return createAdaptiveErrorResponse(
		c.req.raw,
		"サーバーで予期しないエラーが発生しました。しばらく時間をおいてから再度お試しください。",
		500,
		"internal_server_error",
	);
});

export { app as OAuthHandler };
