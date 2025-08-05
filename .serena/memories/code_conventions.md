# Code Style and Conventions

## TypeScript Configuration
- Strict mode enabled
- Path mapping: `@/*` → `./src/*`
- ESNext modules with bundler resolution

## File Naming
- Components: PascalCase (`HomePage.tsx`)
- Hooks: camelCase (`useAuth.ts`)
- Utilities: camelCase (`firebase.ts`)
- Types: PascalCase (`Post.ts`)

## Component Structure
```typescript
interface Props {
  // Props definition
}

export default function ComponentName({ prop }: Props) {
  // Component logic
  return (
    // JSX
  );
}
```

## API Response Format
```typescript
{
  data: T | null;
  error?: string;
  success: boolean;
}
```

## State Management
- Local state: `useState`
- Global state: Zustand stores
- Forms: React Hook Form + Zod validation

## ESLint Configuration
- Next.js recommended config
- TypeScript support
- Core Web Vitals rules