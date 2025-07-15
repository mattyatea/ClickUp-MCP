/**
 * ClickUp MCP Server - Utility Functions
 *
 * OAuth認証フローで使用される共通ユーティリティ関数を提供します。
 */

/**
 * 上流サービスの認証URLを構築します
 *
 * @param options 認証URL構築パラメータ
 * @param options.upstream_url 上流サービスのベースURL
 * @param options.client_id アプリケーションのクライアントID
 * @param options.redirect_uri アプリケーションのリダイレクトURI
 * @param options.state 状態パラメータ（オプション）
 * @param options.scope スコープパラメータ（オプション）
 * @param options.response_type レスポンスタイプパラメータ（オプション）
 * @returns 認証URL
 */
export function getUpstreamAuthorizeUrl({
	upstream_url,
	client_id,
	scope,
	redirect_uri,
	state,
	response_type,
}: {
	upstream_url: string;
	client_id: string;
	scope?: string;
	redirect_uri: string;
	state?: string;
	response_type?: string;
}) {
	const upstream = new URL(upstream_url);
	upstream.searchParams.set("client_id", client_id);
	upstream.searchParams.set("redirect_uri", redirect_uri);
	if (scope) upstream.searchParams.set("scope", scope);
	if (state) upstream.searchParams.set("state", state);
	upstream.searchParams.set("response_type", response_type || "code");
	return upstream.href;
}

/**
 * 上流サービスから認証トークンを取得します
 *
 * @param options トークン取得パラメータ
 * @param options.client_id アプリケーションのクライアントID
 * @param options.client_secret アプリケーションのクライアントシークレット
 * @param options.code 認証コード
 * @param options.redirect_uri アプリケーションのリダイレクトURI
 * @param options.upstream_url 上流サービスのトークンエンドポイントURL
 * @returns アクセストークンまたはエラーレスポンスを含むPromise
 */
export async function fetchUpstreamAuthToken({
	client_id,
	client_secret,
	code,
	redirect_uri,
	upstream_url,
}: {
	code: string | undefined;
	upstream_url: string;
	client_secret: string;
	redirect_uri: string;
	client_id: string;
}): Promise<[string, null] | [null, Response]> {
	if (!code) {
		return [null, new Response("Missing code", { status: 400 })];
	}

	const resp = await fetch(upstream_url, {
		body: new URLSearchParams({
			client_id,
			client_secret,
			code,
			redirect_uri,
		}).toString(),
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		method: "POST",
	});

	if (!resp.ok) {
		console.log(await resp.text());
		return [
			null,
			new Response("Failed to fetch access token", { status: 500 }),
		];
	}

	// ClickUpのJSONレスポンスを処理
	const contentType = resp.headers.get("content-type");
	let accessToken: string;

	if (contentType?.includes("application/json")) {
		const body = (await resp.json()) as { access_token: string };
		accessToken = body.access_token;
	} else {
		const body = await resp.formData();
		accessToken = body.get("access_token") as string;
	}

	if (!accessToken) {
		return [null, new Response("Missing access token", { status: 400 })];
	}

	return [accessToken, null];
}

// 認証プロセスからのコンテキスト、暗号化されて認証トークンに保存され、
// DurableMCPにthis.propsとして提供される
export type { UserProps as Props } from "#/types";
