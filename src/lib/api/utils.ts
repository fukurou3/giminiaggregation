import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { env } from '@/lib/env';

// Determine allowed origin based on environment
const allowedOrigin =
  env.NODE_ENV === 'production'
    ? env.CORS_ALLOWED_ORIGIN_PROD
    : env.CORS_ALLOWED_ORIGIN_DEV;

// CORS headers configuration
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': allowedOrigin ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

// API error types
export type ApiErrorType = 
  | 'rate_limited' 
  | 'invalid_request' 
  | 'validation_failed'
  | 'unauthorized' 
  | 'invalid_url'
  | 'server_error'
  | 'permission_denied'
  | 'network_error'
  | 'not_implemented'
  | 'not_found'
  | 'forbidden'
  | 'profile_incomplete'
  | 'invalid_category'
  | 'invalid_reason'
  | 'tag_flagged'
  | 'invalid_query';

// Standard API error response interface
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorType;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

// Standard API success response interface
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// Create standardized error response
export function createErrorResponse(
  error: ApiErrorType,
  message: string,
  status: number = 400,
  details?: Array<{ field: string; message: string }>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      ...(details && { details }),
    },
    { status, headers: CORS_HEADERS }
  );
}

// Create standardized success response
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      ...(data && { data }),
      ...(message && { message }),
    },
    { status, headers: CORS_HEADERS }
  );
}

// Extract IP address from request
export function getClientIP(request: Request & { ip?: string }): string {
  const ip =
    request.ip ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-client-ip') ||
    request.headers.get('fastly-client-ip');

  if (ip) {
    return ip;
  }

  const tempId = randomUUID();
  console.warn(`Client IP could not be determined. Using temporary ID: ${tempId}`);
  return tempId;
}

// Enhanced error message mapping for Firestore errors
export function mapFirestoreError(error: Error): { code: ApiErrorType; message: string } {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('permission')) {
    return {
      code: 'permission_denied',
      message: 'データベースへの書き込み権限がありません'
    };
  }
  
  if (errorMessage.includes('network')) {
    return {
      code: 'network_error',
      message: 'ネットワークエラーが発生しました'
    };
  }
  
  return {
    code: 'server_error',
    message: 'サーバーエラーが発生しました'
  };
}