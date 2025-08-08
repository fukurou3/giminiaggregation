import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string(),
});

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ALLOWED_ORIGIN_PROD: z.string(),
  CORS_ALLOWED_ORIGIN_DEV: z.string(),
  SENTRY_DSN: z.string().optional(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number(),
  REDIS_ENABLED: z.coerce.boolean().optional(),
  RECAPTCHA_MIN_SCORE: z.coerce.number().default(0.5),
  RECAPTCHA_SECRET_KEY: z.string(),
  GOOGLE_CLOUD_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string(),
  GOOGLE_CLOUD_STORAGE_BUCKET: z.string(),
  FAVORITE_SHARD_COUNT: z.coerce.number().default(10),
});

const clientEnv = clientSchema.safeParse(process.env);
if (!clientEnv.success) {
  console.error('Invalid client environment variables:', clientEnv.error.flatten().fieldErrors);
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
  
  // In development, just warn and use fallback values instead of crashing
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using fallback environment variables for development');
  } else {
    throw new Error('Invalid client environment variables');
  }
}

let serverEnv: z.infer<typeof serverSchema> = {} as any;
if (typeof window === 'undefined') {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid server environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  serverEnv = parsed.data;
}

// Create fallback env object for development when validation fails
const fallbackClientEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
};

export const env = { 
  ...(clientEnv.success ? clientEnv.data : fallbackClientEnv), 
  ...serverEnv 
};
