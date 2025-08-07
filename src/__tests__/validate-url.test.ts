import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/validate-url/route';

vi.mock('@/lib/validators/urlValidator', () => ({
  validateGeminiUrl: vi.fn(),
}));

vi.mock('@/lib/api/utils', () => ({
  getClientIP: () => '127.0.0.1',
  CORS_HEADERS: {},
}));

vi.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve(true)),
}));

const { validateGeminiUrl } = require('@/lib/validators/urlValidator');

describe('validate-url API', () => {
  it('returns success for valid URL', async () => {
    validateGeminiUrl.mockResolvedValue({ isValid: true, status: 'valid', message: 'ok' });

    const req = new NextRequest('http://localhost/api/validate-url', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://gemini.google.com/share/abc123' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ isValid: true, status: 'valid', message: 'ok' });
  });

  it('returns error for invalid URL', async () => {
    validateGeminiUrl.mockResolvedValue({ isValid: false, status: 'invalid_format', message: 'invalid' });

    const req = new NextRequest('http://localhost/api/validate-url', {
      method: 'POST',
      body: JSON.stringify({ url: 'invalid-url' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.isValid).toBe(false);
    expect(json.status).toBe('invalid_format');
  });

  it('returns 400 when url is missing', async () => {
    const req = new NextRequest('http://localhost/api/validate-url', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
