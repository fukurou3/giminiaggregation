import { ArrowLeft, AlertCircle } from "lucide-react";

interface SettingsHeaderSectionProps {
  onBack: () => void;
  error?: string | null;
  success?: boolean;
}

export function SettingsHeaderSection({ onBack, error, success }: SettingsHeaderSectionProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="戻る"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">プロフィール設定</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">プロフィールを保存しました</p>
        </div>
      )}
    </>
  );
}