// workers-oauth-utils.ts

import type {
	AuthRequest,
	ClientInfo,
} from "@cloudflare/workers-oauth-provider"; // Adjust path if necessary

const COOKIE_NAME = "mcp-approved-clients";
const ONE_YEAR_IN_SECONDS = 31536000;

// --- Helper Functions ---

/**
 * Encodes arbitrary data to a URL-safe base64 string.
 * @param data - The data to encode (will be stringified).
 * @returns A URL-safe base64 encoded string.
 */
function _encodeState(data: any): string {
	try {
		const jsonString = JSON.stringify(data);
		// Use btoa for simplicity, assuming Worker environment supports it well enough
		// For complex binary data, a Buffer/Uint8Array approach might be better
		return btoa(jsonString);
	} catch (e) {
		console.error("Error encoding state:", e);
		throw new Error("Could not encode state");
	}
}

/**
 * Decodes a URL-safe base64 string back to its original data.
 * @param encoded - The URL-safe base64 encoded string.
 * @returns The original data.
 */
function decodeState<T = any>(encoded: string): T {
	try {
		const jsonString = atob(encoded);
		return JSON.parse(jsonString);
	} catch (e) {
		console.error("Error decoding state:", e);
		throw new Error("Could not decode state");
	}
}

/**
 * Imports a secret key string for HMAC-SHA256 signing.
 * @param secret - The raw secret key string.
 * @returns A promise resolving to the CryptoKey object.
 */
async function importKey(secret: string): Promise<CryptoKey> {
	if (!secret) {
		throw new Error(
			"COOKIE_SECRET is not defined. A secret key is required for signing cookies.",
		);
	}
	const enc = new TextEncoder();
	return crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ hash: "SHA-256", name: "HMAC" },
		false, // not extractable
		["sign", "verify"], // key usages
	);
}

/**
 * Signs data using HMAC-SHA256.
 * @param key - The CryptoKey for signing.
 * @param data - The string data to sign.
 * @returns A promise resolving to the signature as a hex string.
 */
async function signData(key: CryptoKey, data: string): Promise<string> {
	const enc = new TextEncoder();
	const signatureBuffer = await crypto.subtle.sign(
		"HMAC",
		key,
		enc.encode(data),
	);
	// Convert ArrayBuffer to hex string
	return Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Verifies an HMAC-SHA256 signature.
 * @param key - The CryptoKey for verification.
 * @param signatureHex - The signature to verify (hex string).
 * @param data - The original data that was signed.
 * @returns A promise resolving to true if the signature is valid, false otherwise.
 */
async function verifySignature(
	key: CryptoKey,
	signatureHex: string,
	data: string,
): Promise<boolean> {
	const enc = new TextEncoder();
	try {
		// Convert hex signature back to ArrayBuffer
		const signatureBytes = new Uint8Array(
			signatureHex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)),
		);
		return await crypto.subtle.verify(
			"HMAC",
			key,
			signatureBytes.buffer,
			enc.encode(data),
		);
	} catch (e) {
		// Handle errors during hex parsing or verification
		console.error("Error verifying signature:", e);
		return false;
	}
}

/**
 * Parses the signed cookie and verifies its integrity.
 * @param cookieHeader - The value of the Cookie header from the request.
 * @param secret - The secret key used for signing.
 * @returns A promise resolving to the list of approved client IDs if the cookie is valid, otherwise null.
 */
async function getApprovedClientsFromCookie(
	cookieHeader: string | null,
	secret: string,
): Promise<string[] | null> {
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";").map((c) => c.trim());
	const targetCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

	if (!targetCookie) return null;

	const cookieValue = targetCookie.substring(COOKIE_NAME.length + 1);
	const parts = cookieValue.split(".");

	if (parts.length !== 2) {
		console.warn("Invalid cookie format received.");
		return null; // Invalid format
	}

	const [signatureHex, base64Payload] = parts;
	const payload = atob(base64Payload); // Assuming payload is base64 encoded JSON string

	const key = await importKey(secret);
	const isValid = await verifySignature(key, signatureHex, payload);

	if (!isValid) {
		console.warn("Cookie signature verification failed.");
		return null; // Signature invalid
	}

	try {
		const approvedClients = JSON.parse(payload);
		if (!Array.isArray(approvedClients)) {
			console.warn("Cookie payload is not an array.");
			return null; // Payload isn't an array
		}
		// Ensure all elements are strings
		if (!approvedClients.every((item) => typeof item === "string")) {
			console.warn("Cookie payload contains non-string elements.");
			return null;
		}
		return approvedClients as string[];
	} catch (e) {
		console.error("Error parsing cookie payload:", e);
		return null; // JSON parsing failed
	}
}

// --- Exported Functions ---

/**
 * Checks if a given client ID has already been approved by the user,
 * based on a signed cookie.
 *
 * @param request - The incoming Request object to read cookies from.
 * @param clientId - The OAuth client ID to check approval for.
 * @param cookieSecret - The secret key used to sign/verify the approval cookie.
 * @returns A promise resolving to true if the client ID is in the list of approved clients in a valid cookie, false otherwise.
 */
export async function clientIdAlreadyApproved(
	request: Request,
	clientId: string,
	cookieSecret: string,
): Promise<boolean> {
	if (!clientId) return false;
	const cookieHeader = request.headers.get("Cookie");
	const approvedClients = await getApprovedClientsFromCookie(
		cookieHeader,
		cookieSecret,
	);

	return approvedClients?.includes(clientId) ?? false;
}

/**
 * Configuration for the approval dialog
 */
export interface ApprovalDialogOptions {
	/**
	 * Client information to display in the approval dialog
	 */
	client: ClientInfo | null;
	/**
	 * Server information to display in the approval dialog
	 */
	server: {
		name: string;
		logo?: string;
		description?: string;
	};
	/**
	 * Arbitrary state data to pass through the approval flow
	 * Will be encoded in the form and returned when approval is complete
	 */
	state: Record<string, any>;
	/**
	 * Name of the cookie to use for storing approvals
	 * @default "mcp_approved_clients"
	 */
	cookieName?: string;
	/**
	 * Secret used to sign cookies for verification
	 * Can be a string or Uint8Array
	 * @default Built-in Uint8Array key
	 */
	cookieSecret?: string | Uint8Array;
	/**
	 * Cookie domain
	 * @default current domain
	 */
	cookieDomain?: string;
	/**
	 * Cookie path
	 * @default "/"
	 */
	cookiePath?: string;
	/**
	 * Cookie max age in seconds
	 * @default 30 days
	 */
	cookieMaxAge?: number;
}

/**
 * Generates the HTML content for the OAuth approval dialog
 * @param serverName - The sanitized server name
 * @param clientName - The sanitized client name
 * @param serverDescription - The sanitized server description
 * @param logoUrl - The sanitized logo URL
 * @param clientUri - The sanitized client URI
 * @param policyUri - The sanitized policy URI
 * @param tosUri - The sanitized terms of service URI
 * @param redirectUris - Array of sanitized redirect URIs
 * @param contacts - The sanitized contact information
 * @param encodedState - The encoded state for the form
 * @param requestPathname - The current request pathname for form action
 * @returns The complete HTML content as a string
 */
function generateApprovalDialogHtml(
	serverName: string,
	clientName: string,
	serverDescription: string,
	logoUrl: string,
	clientUri: string,
	policyUri: string,
	tosUri: string,
	redirectUris: string[],
	contacts: string,
	encodedState: string,
	requestPathname: string,
): string {
	return `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${clientName} | 認証リクエスト</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon">
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
        <style>
          :root {
            --primary-color: #4f46e5;
            --primary-hover: #3730a3;
            --secondary-color: #64748b;
            --success-color: #059669;
            --error-color: #dc2626;
            --warning-color: #d97706;
            --border-color: #e2e8f0;
            --text-color: #1e293b;
            --text-secondary: #64748b;
            --background-color: #ffffff;
            --background-secondary: #f8fafc;
            --card-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --border-radius: 12px;
            --border-radius-lg: 16px;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", -apple-system, BlinkMacSystemFont, 
                         "Segoe UI", "Noto Sans JP", Roboto, sans-serif;
            line-height: 1.7;
            color: var(--text-color);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            font-size: 16px;
          }
          
          .container {
            max-width: 520px;
            margin: 0 auto;
            padding: 2rem 1rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .main-card {
            background-color: var(--background-color);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--card-shadow);
            overflow: hidden;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.08"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.08"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          }
          
          .header-content {
            position: relative;
            z-index: 1;
          }
          
          .logo {
            width: 64px;
            height: 64px;
            margin: 0 auto 1rem;
            border-radius: var(--border-radius);
            object-fit: contain;
            background: rgba(255, 255, 255, 0.1);
            padding: 8px;
            display: block;
          }
          
          .server-title {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          
          .server-description {
            margin: 0.5rem 0 0 0;
            opacity: 0.9;
            font-size: 0.95rem;
          }
          
          .content {
            padding: 2rem;
          }
          
          .access-request {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .access-title {
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-color);
          }
          
          .client-name-highlight {
            color: var(--primary-color);
            font-weight: 700;
          }
          
          .access-description {
            color: var(--text-secondary);
            font-size: 0.95rem;
            margin: 0;
          }
          
          .client-info {
            background: var(--background-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            margin-bottom: 2rem;
          }
          
          .client-detail {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 0.5rem;
            margin-bottom: 1rem;
            align-items: start;
          }
          
          .client-detail:last-child {
            margin-bottom: 0;
          }
          
          .detail-label {
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 0.9rem;
          }
          
          .detail-value {
            font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
            word-break: break-all;
            font-size: 0.9rem;
            line-height: 1.5;
          }
          
          .detail-value a {
            color: var(--primary-color);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s ease;
          }
          
          .detail-value a:hover {
            border-bottom-color: var(--primary-color);
          }
          
          .redirect-uri {
            background: white;
            padding: 0.5rem;
            border-radius: 6px;
            margin-bottom: 0.25rem;
            border: 1px solid var(--border-color);
            font-size: 0.85rem;
          }
          
          .info-message {
            background: rgba(79, 70, 229, 0.05);
            border: 1px solid rgba(79, 70, 229, 0.2);
            border-radius: var(--border-radius);
            padding: 1rem;
            margin-bottom: 2rem;
            font-size: 0.95rem;
            color: var(--text-secondary);
          }
          
          .actions {
            display: flex;
            gap: 1rem;
            justify-content: stretch;
          }
          
          .button {
            flex: 1;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            font-weight: 600;
            cursor: pointer;
            border: none;
            font-size: 1rem;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }
          
          .button:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
          }
          
          .button-primary {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
          }
          
          .button-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
          }
          
          .button-primary:active {
            transform: translateY(0);
          }
          
          .button-secondary {
            background-color: white;
            border: 2px solid var(--border-color);
            color: var(--text-secondary);
          }
          
          .button-secondary:hover {
            border-color: var(--primary-color);
            color: var(--primary-color);
            transform: translateY(-1px);
          }
          
          /* レスポンシブデザイン */
          @media (max-width: 640px) {
            .container {
              padding: 1rem;
              min-height: auto;
              justify-content: flex-start;
              padding-top: 2rem;
            }
            
            .content {
              padding: 1.5rem;
            }
            
            .header {
              padding: 1.5rem;
            }
            
            .client-detail {
              grid-template-columns: 1fr;
              gap: 0.25rem;
            }
            
            .detail-label {
              font-weight: 700;
            }
            
            .actions {
              flex-direction: column;
            }
            
            .server-title {
              font-size: 1.25rem;
            }
          }
          
          /* アニメーション */
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .main-card {
            animation: slideIn 0.5s ease;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="main-card">
            <div class="header">
              <div class="header-content">
                ${logoUrl ? `<img src="${logoUrl}" alt="${serverName} ロゴ" class="logo">` : ""}
                <h1 class="server-title">${serverName}</h1>
                ${serverDescription ? `<p class="server-description">${serverDescription}</p>` : ""}
              </div>
            </div>
            
            <div class="content">
              <div class="access-request">
                <h2 class="access-title">
                  <span class="client-name-highlight">${clientName || "新しいMCPクライアント"}</span>がアクセスを要求しています
                </h2>
                <p class="access-description">
                  このクライアントが${serverName}への認証を求めています
                </p>
              </div>
              
              <div class="client-info">
                <div class="client-detail">
                  <div class="detail-label">名前:</div>
                  <div class="detail-value">
                    ${clientName}
                  </div>
                </div>
                
                ${
									clientUri
										? `
                  <div class="client-detail">
                    <div class="detail-label">ウェブサイト:</div>
                    <div class="detail-value">
                      <a href="${clientUri}" target="_blank" rel="noopener noreferrer">
                        ${clientUri}
                      </a>
                    </div>
                  </div>
                `
										: ""
								}
                
                ${
									policyUri
										? `
                  <div class="client-detail">
                    <div class="detail-label">プライバシーポリシー:</div>
                    <div class="detail-value">
                      <a href="${policyUri}" target="_blank" rel="noopener noreferrer">
                        ${policyUri}
                      </a>
                    </div>
                  </div>
                `
										: ""
								}
                
                ${
									tosUri
										? `
                  <div class="client-detail">
                    <div class="detail-label">利用規約:</div>
                    <div class="detail-value">
                      <a href="${tosUri}" target="_blank" rel="noopener noreferrer">
                        ${tosUri}
                      </a>
                    </div>
                  </div>
                `
										: ""
								}
                
                ${
									redirectUris.length > 0
										? `
                  <div class="client-detail">
                    <div class="detail-label">リダイレクトURI:</div>
                    <div class="detail-value">
                      ${redirectUris.map((uri) => `<div class="redirect-uri">${uri}</div>`).join("")}
                    </div>
                  </div>
                `
										: ""
								}
                
                ${
									contacts
										? `
                  <div class="client-detail">
                    <div class="detail-label">連絡先:</div>
                    <div class="detail-value">${contacts}</div>
                  </div>
                `
										: ""
								}
              </div>
              
              <div class="info-message">
                承認すると、このMCPクライアントが${serverName}にアクセスできるようになり、認証を完了するためにリダイレクトされます。
              </div>
              
              <form method="post" action="${requestPathname}">
                <input type="hidden" name="state" value="${encodedState}">
                
                <div class="actions">
                  <button type="button" class="button button-secondary" onclick="window.history.back()">キャンセル</button>
                  <button type="submit" class="button button-primary">承認する</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Renders an approval dialog for OAuth authorization
 * The dialog displays information about the client and server
 * and includes a form to submit approval
 *
 * @param request - The HTTP request
 * @param options - Configuration for the approval dialog
 * @returns A Response containing the HTML approval dialog
 */
export function renderApprovalDialog(
	request: Request,
	options: ApprovalDialogOptions,
): Response {
	const { client, server, state } = options;

	// Encode state for form submission
	const encodedState = btoa(JSON.stringify(state));

	// Sanitize any untrusted content
	const serverName = sanitizeHtml(server.name);
	const clientName = client?.clientName
		? sanitizeHtml(client.clientName)
		: "Unknown MCP Client";
	const serverDescription = server.description
		? sanitizeHtml(server.description)
		: "";

	// Safe URLs
	const logoUrl = server.logo ? sanitizeHtml(server.logo) : "";
	const clientUri = client?.clientUri ? sanitizeHtml(client.clientUri) : "";
	const policyUri = client?.policyUri ? sanitizeHtml(client.policyUri) : "";
	const tosUri = client?.tosUri ? sanitizeHtml(client.tosUri) : "";

	// Client contacts
	const contacts =
		client?.contacts && client.contacts.length > 0
			? sanitizeHtml(client.contacts.join(", "))
			: "";

	// Get redirect URIs
	const redirectUris =
		client?.redirectUris && client.redirectUris.length > 0
			? client.redirectUris.map((uri) => sanitizeHtml(uri))
			: [];

	// Generate HTML for the approval dialog
	const htmlContent = generateApprovalDialogHtml(
		serverName,
		clientName,
		serverDescription,
		logoUrl,
		clientUri,
		policyUri,
		tosUri,
		redirectUris,
		contacts,
		encodedState,
		new URL(request.url).pathname,
	);

	return new Response(htmlContent, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
		},
	});
}

/**
 * Result of parsing the approval form submission.
 */
export interface ParsedApprovalResult {
	/** The original state object passed through the form. */
	state: any;
	/** Headers to set on the redirect response, including the Set-Cookie header. */
	headers: Record<string, string>;
}

/**
 * Parses the form submission from the approval dialog, extracts the state,
 * and generates Set-Cookie headers to mark the client as approved.
 *
 * @param request - The incoming POST Request object containing the form data.
 * @param cookieSecret - The secret key used to sign the approval cookie.
 * @returns A promise resolving to an object containing the parsed state and necessary headers.
 * @throws If the request method is not POST, form data is invalid, or state is missing.
 */
export async function parseRedirectApproval(
	request: Request,
	cookieSecret: string,
): Promise<ParsedApprovalResult> {
	if (request.method !== "POST") {
		throw new Error("Invalid request method. Expected POST.");
	}

	let state: any;
	let clientId: string | undefined;

	try {
		const formData = await request.formData();
		const encodedState = formData.get("state");

		if (typeof encodedState !== "string" || !encodedState) {
			throw new Error("Missing or invalid 'state' in form data.");
		}

		state = decodeState<{ oauthReqInfo?: AuthRequest }>(encodedState); // Decode the state
		clientId = state?.oauthReqInfo?.clientId; // Extract clientId from within the state

		if (!clientId) {
			throw new Error("Could not extract clientId from state object.");
		}
	} catch (e) {
		console.error("Error processing form submission:", e);
		// Rethrow or handle as appropriate, maybe return a specific error response
		throw new Error(
			`Failed to parse approval form: ${e instanceof Error ? e.message : String(e)}`,
		);
	}

	// Get existing approved clients
	const cookieHeader = request.headers.get("Cookie");
	const existingApprovedClients =
		(await getApprovedClientsFromCookie(cookieHeader, cookieSecret)) || [];

	// Add the newly approved client ID (avoid duplicates)
	const updatedApprovedClients = Array.from(
		new Set([...existingApprovedClients, clientId]),
	);

	// Sign the updated list
	const payload = JSON.stringify(updatedApprovedClients);
	const key = await importKey(cookieSecret);
	const signature = await signData(key, payload);
	const newCookieValue = `${signature}.${btoa(payload)}`; // signature.base64(payload)

	// Generate Set-Cookie header
	const headers: Record<string, string> = {
		"Set-Cookie": `${COOKIE_NAME}=${newCookieValue}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${ONE_YEAR_IN_SECONDS}`,
	};

	return { headers, state };
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param unsafe - The unsafe string that might contain HTML
 * @returns A safe string with HTML special characters escaped
 */
function sanitizeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
