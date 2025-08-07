'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <h2 className="text-2xl font-bold">エラーが発生しました</h2>
      <p className="text-muted-foreground">
        申し訳ありません。予期しないエラーが発生しました。
      </p>
      <button
        onClick={() => reset()}
        className="rounded bg-primary px-4 py-2 text-primary-foreground"
      >
        再試行
      </button>
    </div>
  );
}
