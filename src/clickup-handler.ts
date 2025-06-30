import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl } from "./utils";
import {
	clientIdAlreadyApproved,
	parseRedirectApproval,
	renderApprovalDialog,
} from "./workers-oauth-utils";
import { createAppConfig, CLICKUP_AUTHORIZE_URL } from "./config";
import { ClickUpService } from "./services/clickup-service";
import { SSEService } from "./services/sse-service";
import { handleError, createSuccessResponse, ApiError } from "./services/error-handler";
import type { UserProps, ServiceDependencies } from "./types";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

// 依存性注入のヘルパー関数
function createServiceDependencies(env: Env): ServiceDependencies {
	return {
		env,
		config: createAppConfig(env),
	};
}

// OAuth認可エンドポイント
app.get("/authorize", async (c) => {
	try {
		const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
		const { clientId } = oauthReqInfo;

		if (!clientId) {
			throw new ApiError("無効なリクエストです", 400, "INVALID_CLIENT_ID");
		}

		const deps = createServiceDependencies(c.env);

		if (await clientIdAlreadyApproved(c.req.raw, clientId, deps.config.cookieEncryptionKey)) {
			return redirectToClickUp(c.req.raw, oauthReqInfo, deps);
		}

		return renderApprovalDialog(c.req.raw, {
			client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
			server: {
				description: "ClickUp OAuth認証とSSEサポートを備えたMCPサーバーです。",
				logo: "https://clickup.com/assets/brand/logo-v3-clickup-symbol-only.svg",
				name: "ClickUp SSE MCP Server",
			},
			state: { oauthReqInfo },
		});
	} catch (error) {
		return handleError(error);
	}
});

// OAuth認可POST処理
app.post("/authorize", async (c) => {
	try {
		const deps = createServiceDependencies(c.env);
		const { state, headers } = await parseRedirectApproval(c.req.raw, deps.config.cookieEncryptionKey);

		if (!state.oauthReqInfo) {
			throw new ApiError("無効なリクエストです", 400, "INVALID_STATE");
		}

		return redirectToClickUp(c.req.raw, state.oauthReqInfo, deps, headers);
	} catch (error) {
		return handleError(error);
	}
});

// ClickUpへのリダイレクト処理
async function redirectToClickUp(
	request: Request,
	oauthReqInfo: AuthRequest,
	deps: ServiceDependencies,
	headers: Record<string, string> = {},
) {
	return new Response(null, {
		headers: {
			...headers,
			location: getUpstreamAuthorizeUrl({
				client_id: deps.config.clickupClientId,
				redirect_uri: new URL("/callback", request.url).href,
				state: btoa(JSON.stringify(oauthReqInfo)),
				upstream_url: CLICKUP_AUTHORIZE_URL,
			}),
		},
		status: 302,
	});
}

/**
 * OAuth コールバックエンドポイント
 * 
 * ClickUpからの認証後のコールバックを処理し、
 * 一時的なコードをアクセストークンに交換し、
 * ユーザーメタデータとアクセストークンをクライアントに渡すトークンに保存します。
 * 最後にクライアントのコールバックURLにリダイレクトします。
 */
app.get("/callback", async (c) => {
	try {
		const deps = createServiceDependencies(c.env);
		const clickupService = new ClickUpService(deps);

		const oauthReqInfo = JSON.parse(atob(c.req.query("state") as string)) as AuthRequest;
		if (!oauthReqInfo.clientId) {
			throw new ApiError("無効なstateパラメータです", 400, "INVALID_STATE");
		}

		// コードをアクセストークンに交換
		const [accessToken, errResponse] = await fetchUpstreamAuthToken({
			client_id: deps.config.clickupClientId,
			client_secret: deps.config.clickupClientSecret,
			code: c.req.query("code"),
			redirect_uri: new URL("/callback", c.req.url).href,
			upstream_url: deps.config.clickupTokenUrl,
		});

		if (errResponse) return errResponse;

		// ClickUpからユーザー情報を取得
		const userData = await clickupService.getUserInfo(accessToken);
		const { id, username, email } = userData.user;

		// MCPクライアントに新しいトークンを返す
		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			metadata: {
				label: username,
			},
			// MyMCPでthis.propsとして利用可能
			props: {
				accessToken,
				email,
				id,
				username,
			} as UserProps,
			request: oauthReqInfo,
			scope: oauthReqInfo.scope,
			userId: username,
		});

		return Response.redirect(redirectTo);
	} catch (error) {
		return handleError(error);
	}
});

/**
 * リアルタイム更新用のSSEエンドポイント
 */
app.get("/sse", async (c) => {
	try {
		const userId = c.req.query("userId");
		if (!userId) {
			throw new ApiError("userIdパラメータが必要です", 400, "MISSING_USER_ID");
		}

		const deps = createServiceDependencies(c.env);
		const sseService = new SSEService(deps);

		return await sseService.createSSEConnection(userId);
	} catch (error) {
		return handleError(error);
	}
});

/**
 * ClickUp Webhookエンドポイント
 */
app.post("/webhook/clickup", async (c) => {
	try {
		const payload = await c.req.json();
		const deps = createServiceDependencies(c.env);
		const sseService = new SSEService(deps);

		// WebhookイベントをKV経由ですべての関連ユーザーにブロードキャスト
		await sseService.storeWebhookEvent(payload);

		return createSuccessResponse({ message: "Webhookを受信しました" });
	} catch (error) {
		return handleError(error);
	}
});

/**
 * ヘルスチェックエンドポイント
 */
app.get("/health", async (c) => {
	try {
		return createSuccessResponse({
			status: "healthy",
			service: "ClickUp SSE Server"
		});
	} catch (error) {
		return handleError(error);
	}
});

export { app as ClickUpHandler };
