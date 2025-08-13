import { Spinner } from "@/components/ui/Spinner";

export function ProfileLoading() {
  return <Spinner />;
}

interface ProfileErrorProps {
  error?: string;
  publicId: string;
  onGoHome: () => void;
}

export function ProfileError({ 
  error, 
  publicId, 
  onGoHome
}: ProfileErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {error || "プロフィールが見つかりません"}
        </h2>
        <p className="text-muted-foreground mb-6">
          指定されたプロフィールID「{publicId}」のユーザーは存在しないか、まだプロフィールが設定されていません。
        </p>
        <div className="space-y-2">
          <button
            onClick={onGoHome}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}