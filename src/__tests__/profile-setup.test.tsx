import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ProfileSetup } from '@/components/ProfileSetup';

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/userProfile', () => ({
  setupUserProfile: vi.fn(),
  generateUniquePublicId: vi.fn(async () => 'public123'),
}));

describe('ProfileSetup component', () => {
  it('renders form fields', () => {
    const html = renderToString(<ProfileSetup uid="u1" onComplete={() => {}} />);
    expect(html).toContain('公開ID');
    expect(html).toContain('ユーザー名');
  });
});
