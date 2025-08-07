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
  throw new Error('Invalid client environment variables');
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

export const env = { ...clientEnv.data, ...serverEnv };
