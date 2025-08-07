import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ColumnDetail } from '@/components/columns/ColumnDetail';

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  }
}));

describe('ColumnDetail sanitization', () => {
  it('removes script tags from body', () => {
    const column = {
      id: '1',
      title: 'title',
      slug: 'slug',
      author: 'author',
      excerpt: 'excerpt',
      category: 'cat',
      createdAt: new Date(),
      views: 0,
      likes: 0,
      isPublished: true,
      body: '<p>safe</p><script>alert(1)</script>'
    };

    const html = renderToString(<ColumnDetail column={column} />);
    expect(html).toContain('<p>safe</p>');
    expect(html).not.toContain('<script>');
  });
});
