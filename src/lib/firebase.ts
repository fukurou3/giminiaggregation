import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { env } from './env';

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// App Check を初期化（reCAPTCHA v3プロバイダーを使用）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    if (env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY !== 'YOUR_RECAPTCHA_SITE_KEY_HERE') {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('App Check initialized successfully');
    } else {
      console.log('ReCAPTCHA key not configured, skipping App Check');
    }
  } catch (error) {
    console.warn('App Check initialization failed:', error);
  }
} else if (typeof window !== 'undefined') {
  console.log('Development mode: App Check disabled');
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
