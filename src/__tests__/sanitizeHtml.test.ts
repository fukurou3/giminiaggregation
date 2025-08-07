import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const dirty = '<div>test</div><script>alert(1)</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<div>test</div>');
  });
});
