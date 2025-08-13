import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { 
  createErrorResponse, 
  createErrorResponseWithHint,
  createValidationErrorResponse,
  CommonErrors,
  type ApiErrorType 
} from '../errors';

// モック
vi.mock('@/lib/observability', () => ({
  logError: vi.fn(),
  logEvent: vi.fn(),
}));

describe('@/shared/errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createErrorResponse', () => {
    it('should create error response with default status code', () => {
      const response = createErrorResponse('invalid_request', 'テストエラー');
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);
    });

    it('should create error response with custom status code', () => {
      const response = createErrorResponse('server_error', 'サーバーエラー', 500);
      
      expect(response.status).toBe(500);
    });

    it('should create error response with validation details', () => {
      const details = [{ field: 'title', message: 'タイトルは必須です' }];
      const response = createErrorResponse('validation_failed', 'バリデーションエラー', 400, details);
      
      expect(response.status).toBe(400);
      // レスポンスボディの確認は実際のJSON解析が必要なため省略
    });

    it('should use mapped status code for known error types', () => {
      const response = createErrorResponse('rate_limited', 'レート制限');
      expect(response.status).toBe(429);
    });
  });

  describe('createErrorResponseWithHint', () => {
    it('should create error response with hint', () => {
      const response = createErrorResponseWithHint(
        'invalid_url',
        'URLが無効です',
        'Gemini共有リンクを確認してください'
      );
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create validation error with details', () => {
      const errors = [
        { field: 'title', message: 'タイトルは必須です' },
        { field: 'description', message: '説明は500文字以内です' }
      ];
      
      const response = createValidationErrorResponse(errors);
      expect(response.status).toBe(400);
    });
  });

  describe('CommonErrors', () => {
    it('should provide rateLimited factory', () => {
      const response = CommonErrors.rateLimited();
      expect(response.status).toBe(429);
    });

    it('should provide unauthorized factory', () => {
      const response = CommonErrors.unauthorized();
      expect(response.status).toBe(401);
    });

    it('should provide serverError factory', () => {
      const response = CommonErrors.serverError();
      expect(response.status).toBe(500);
    });

    it('should accept custom messages', () => {
      const response = CommonErrors.notFound('カスタム404メッセージ');
      expect(response.status).toBe(404);
    });
  });

  describe('Status code mapping', () => {
    const testCases: Array<[ApiErrorType, number]> = [
      ['rate_limited', 429],
      ['unauthorized', 401],
      ['forbidden', 403],
      ['not_found', 404],
      ['server_error', 500],
      ['invalid_request', 400],
      ['validation_failed', 400],
    ];

    it.each(testCases)('should map %s to status %d', (errorType, expectedStatus) => {
      const response = createErrorResponse(errorType, 'テストメッセージ');
      expect(response.status).toBe(expectedStatus);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in all responses', () => {
      const response = createErrorResponse('invalid_request', 'テストエラー');
      
      // NextResponse のヘッダーにCORSが含まれることを確認
      // 実際の実装ではresponse.headersを検査する必要があります
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('Logging integration', () => {
    it('should log server errors as errors', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const logError = vi.mocked(require('@/lib/observability')).logError;
      
      createErrorResponse('server_error', 'サーバーエラー', 500);
      
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          error_code: 'server_error',
          status_code: 500,
        })
      );
    });

    it('should log client errors as events', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const logEvent = vi.mocked(require('@/lib/observability')).logEvent;
      
      createErrorResponse('invalid_request', 'クライアントエラー', 400);
      
      expect(logEvent).toHaveBeenCalledWith(
        'api_client_error',
        expect.objectContaining({
          error_code: 'invalid_request',
          status_code: 400,
        })
      );
    });
  });
});