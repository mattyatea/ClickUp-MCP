export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    timestamp: string;
}

export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    timestamp: string;
}

export type ApiResponse<T = any> = ErrorResponse | SuccessResponse<T>;

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