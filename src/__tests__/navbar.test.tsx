import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Navbar } from '@/components/Navbar';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ userProfile: null }),
}));

vi.mock('@/lib/auth', () => ({
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
}));

describe('Navbar component', () => {
  it('renders navigation links', () => {
    const html = renderToString(<Navbar />);
    expect(html).toContain('ランキング');
    expect(html).toContain('カテゴリ');
    expect(html).toContain('コラム');
  });
});
