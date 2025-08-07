let Sentry: any = null;

try {
  // 動的に読み込み、パッケージ未インストール時の失敗を防ぐ
  Sentry = require('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
} catch {
  // 監視サービスが利用できない場合はログ出力のみを行う
}

export const logInfo = (message: string, context?: Record<string, unknown>) => {
  if (context) {
    console.log(message, context);
  } else {
    console.log(message);
  }
};

export const logError = (error: unknown, context?: Record<string, unknown>) => {
  if (context) {
    console.error(error, context);
  } else {
    console.error(error);
  }

  if (Sentry) {
    const err = error instanceof Error ? error : new Error(String(error));
    Sentry.captureException(err, { extra: context });
  }
};
