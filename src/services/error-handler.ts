/**
 * ClickUp MCP Server - Error Handler
 * 
 * エラーハンドリングとAPIレスポンス生成を担当するユーティリティ。
 * 統一されたエラーレスポンス形式を提供します。
 */

/** エラーレスポンスの型定義 */
export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    timestamp: string;
}

/** 成功レスポンスの型定義 */
export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    timestamp: string;
}

/** APIレスポンスの共通型 */
export type ApiResponse<T = any> = ErrorResponse | SuccessResponse<T>;

/**
 * カスタムAPIエラークラス
 * HTTPステータスコードとエラーコードを含むエラー情報を管理
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * HTMLエラーページを生成
 * @param error エラーメッセージ
 * @param statusCode HTTPステータスコード
 * @param code エラーコード（オプション）
 * @returns HTMLエラーページのコンテンツ
 */
function generateErrorPageHtml(
    error: string,
    statusCode: number,
    code?: string
): string {
    const errorTitle = statusCode === 401 ? 'アクセスが拒否されました' :
        statusCode === 403 ? 'アクセス権限がありません' :
            statusCode === 404 ? 'ページが見つかりません' :
                statusCode >= 500 ? 'サーバーエラー' : 'エラー';

    return `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusCode} ${errorTitle} | ClickUp MCP Server</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon">
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
        <style>
          :root {
            --primary-color: #4f46e5;
            --error-color: #dc2626;
            --text-color: #1e293b;
            --text-secondary: #64748b;
            --background-color: #ffffff;
            --border-color: #e2e8f0;
            --border-radius: 12px;
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
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .error-container {
            max-width: 500px;
            margin: 0 auto;
            padding: 2rem;
            background: var(--background-color);
            border-radius: var(--border-radius);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            text-align: center;
          }
          
          .error-icon {
            font-size: 4rem;
            color: var(--error-color);
            margin-bottom: 1rem;
          }
          
          .error-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-color);
            margin: 0 0 1rem 0;
          }
          
          .error-message {
            color: var(--text-secondary);
            margin: 0 0 1.5rem 0;
            font-size: 1rem;
          }
          
          .error-code {
            background: #f8fafc;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 0.75rem;
            font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
          }
          
          .back-button {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: var(--primary-color);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background-color 0.2s ease;
          }
          
          .back-button:hover {
            background: #3730a3;
          }
          
          .timestamp {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h1 class="error-title">${errorTitle}</h1>
          <p class="error-message">${error}</p>
          ${code ? `<div class="error-code">エラーコード: ${code}</div>` : ''}
          <a href="javascript:history.back()" class="back-button">戻る</a>
          <div class="timestamp">
            ${new Date().toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })}
          </div>
        </div>
      </body>
    </html>
    `;
}

/**
 * エラーレスポンスを生成（JSON形式）
 * @param error エラーメッセージ
 * @param statusCode HTTPステータスコード
 * @param code エラーコード（オプション）
 * @returns Responseオブジェクト
 */
export function createErrorResponse(
    error: string,
    statusCode: number = 500,
    code?: string
): Response {
    const errorResponse: ErrorResponse = {
        success: false,
        error,
        code,
        timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

/**
 * HTMLエラーレスポンスを生成
 * @param error エラーメッセージ
 * @param statusCode HTTPステータスコード
 * @param code エラーコード（オプション）
 * @returns HTMLエラーページのResponseオブジェクト
 */
export function createErrorPageResponse(
    error: string,
    statusCode: number = 500,
    code?: string
): Response {
    const htmlContent = generateErrorPageHtml(error, statusCode, code);

    return new Response(htmlContent, {
        status: statusCode,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
    });
}

/**
 * 成功レスポンスを生成
 * @param data レスポンスデータ
 * @param statusCode HTTPステータスコード
 * @returns Responseオブジェクト
 */
export function createSuccessResponse<T>(
    data: T,
    statusCode: number = 200
): Response {
    const successResponse: SuccessResponse<T> = {
        success: true,
        data,
        timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(successResponse), {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

/**
 * エラーを統一された形式で処理
 * @param error キャッチされたエラー
 * @returns エラーレスポンス
 */
export function handleError(error: unknown): Response {
    console.error('エラーが発生しました:', error);

    if (error instanceof ApiError) {
        return createErrorResponse(error.message, error.statusCode, error.code);
    }

    if (error instanceof Error) {
        return createErrorResponse(error.message);
    }

    return createErrorResponse('予期しないエラーが発生しました');
} 