import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/posts/route';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(async () => ({ id: 'post1' })),
  serverTimestamp: vi.fn(() => 'now'),
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('@/lib/api/utils', () => ({
  getClientIP: () => '127.0.0.1',
  createErrorResponse: (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ code, message }), { status }),
  createSuccessResponse: (data: any, message = 'ok', status = 200) =>
    new Response(JSON.stringify({ ...data, message }), { status }),
  mapFirestoreError: (e: Error) => ({ code: 'server_error', message: e.message }),
}));

vi.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/userProfile', () => ({
  getUserProfile: vi.fn(() => Promise.resolve({ username: 'user', isSetupComplete: true })),
}));

vi.mock('@/lib/validators/urlValidator', () => ({
  validateGeminiUrl: vi.fn(() => Promise.resolve({ isValid: true, message: 'ok' })),
}));

vi.mock('@/lib/constants/categories', () => ({
  findCategoryByName: () => ({ id: 'cat1', name: 'その他' }),
}));

vi.mock('@/lib/schemas/postSchema', () => ({
  postSchema: { safeParse: () => ({ success: true }) },
}));

vi.mock('@/lib/tags', () => ({
  createOrGetTag: vi.fn((name: string) => Promise.resolve({ id: name })),
  updateTagStats: vi.fn(),
  updateTagCategoryCount: vi.fn(),
}));

const { validateGeminiUrl } = require('@/lib/validators/urlValidator');
const { addDoc } = require('firebase/firestore');

const baseBody = {
  formData: {
    title: 'title',
    url: 'https://gemini.google.com/share/abc123',
    description: 'desc',
    tags: [],
    category: 'その他',
  },
  userInfo: { uid: 'u1' },
};

describe('posts API', () => {
  it('creates post successfully', async () => {
    const req = new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      body: JSON.stringify(baseBody),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.postId).toBeDefined();
  });

  it('returns error when URL invalid', async () => {
    validateGeminiUrl.mockResolvedValueOnce({ isValid: false, message: 'invalid', status: 'invalid_format' });

    const req = new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      body: JSON.stringify(baseBody),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const json = await res.json();
    expect(json.code).toBe('invalid_url');
  });

  it('sanitizes script tags from input', async () => {
    const malicious = '<p>safe</p><script>alert(1)</script>';
    const req = new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        ...baseBody,
        formData: { ...baseBody.formData, title: malicious, description: malicious }
      }),
      headers: { 'content-type': 'application/json' }
    });

    await POST(req);
    const saved = addDoc.mock.calls[0][1];
    expect(saved.title).toBe('<p>safe</p>');
    expect(saved.description).toBe('<p>safe</p>');
  });
});
