import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createErrorResponse, createSuccessResponse, getClientIP } from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { env } from '@/lib/env';

const RECAPTCHA_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE = env.RECAPTCHA_MIN_SCORE;

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return createErrorResponse('invalid_request', 'トークンがありません');
    }

    const ip = getClientIP(request);
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse('rate_limited', 'リクエストが多すぎます', 429);
    }

    const ua = request.headers.get('user-agent') || '';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    console.log(`favorite verify: ipHash=${ipHash}, ua=${ua}`);

    const params = new URLSearchParams({
      secret: env.RECAPTCHA_SECRET_KEY,
      response: token,
    });
    const verifyRes = await fetch(RECAPTCHA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = await verifyRes.json();

    if (!data.success || (data.score ?? 0) < MIN_SCORE) {
      return createErrorResponse('invalid_request', 'reCAPTCHA検証に失敗しました', 400);
    }

    return createSuccessResponse({ score: data.score });
  } catch (err) {
    console.error('reCAPTCHA verify error', err);
    return createErrorResponse('server_error', '検証に失敗しました', 500);
  }
}

export async function OPTIONS() {
  return createSuccessResponse(undefined, undefined, 200);
}
