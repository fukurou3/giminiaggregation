import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string(),

  CORS_ALLOWED_ORIGIN_PROD: z.string().optional(),
  CORS_ALLOWED_ORIGIN_DEV: z.string().optional(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_ENABLED: z.string().optional(),

  RECAPTCHA_MIN_SCORE: z.coerce.number().default(0.5),
  RECAPTCHA_SECRET_KEY: z.string(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string(),

  GOOGLE_CLOUD_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .transform((key) => key.replace(/\\n/g, '\n')),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_CLOUD_STORAGE_BUCKET: z.string(),

  FAVORITE_SHARD_COUNT: z.coerce.number().default(10),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _env.data;
