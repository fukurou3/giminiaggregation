import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <h2 className="text-2xl font-bold">ページが見つかりません</h2>
      <p className="text-muted-foreground">
        お探しのページは削除されたか、URLが間違っている可能性があります。
      </p>
      <Link
        href="/"
        className="rounded bg-primary px-4 py-2 text-primary-foreground"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
