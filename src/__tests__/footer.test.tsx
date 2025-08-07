import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import Footer from '@/components/Footer';

describe('Footer component', () => {
  it('renders links', () => {
    const html = renderToString(<Footer />);
    expect(html).toContain('/terms');
    expect(html).toContain('/privacy');
  });
});
