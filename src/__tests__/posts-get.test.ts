import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/posts/route';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('@/lib/api/utils', () => ({
  getClientIP: () => '127.0.0.1',
  createErrorResponse: (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ code, message }), { status }),
  createSuccessResponse: (data: any, message = 'ok', status = 200) =>
    new Response(JSON.stringify({ ...data, message }), { status }),
}));

vi.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve(true)),
}));

const { getDocs } = require('firebase/firestore');
const { checkRateLimit } = require('@/lib/api/rateLimiter');

describe('GET /api/posts', () => {
  it('returns posts successfully', async () => {
    (getDocs as any).mockResolvedValueOnce({
      docs: [
        {
          id: 'p1',
          data: () => ({
            title: 't1',
            url: 'u1',
            description: 'd1',
            tagIds: [],
            categoryId: 'other',
            tags: [],
            isPublic: true,
            createdAt: { toDate: () => new Date('2020-01-01') },
            favoriteCount: 0,
            views: 0,
          }),
        },
      ],
    });

    const req = new NextRequest('http://localhost/api/posts');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
  });

  it('handles rate limit errors', async () => {
    checkRateLimit.mockResolvedValueOnce(false);

    const req = new NextRequest('http://localhost/api/posts');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.code).toBe('rate_limited');
  });

  it('handles server errors', async () => {
    (getDocs as any).mockRejectedValueOnce(new Error('firestore error'));

    const req = new NextRequest('http://localhost/api/posts');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.code).toBe('server_error');
  });
});
