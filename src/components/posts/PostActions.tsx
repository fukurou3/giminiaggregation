'use client';

import { memo } from 'react';
import { Heart } from 'lucide-react';

interface PostActionsProps {
  postUrl: string;
  isFavorited: boolean;
  isUpdatingFavorite: boolean;
  onFavoriteClick: () => void;
  userLoggedIn: boolean;
  favoriteCount?: number;
  title?: string;
  description?: string;
}

const PostActions = memo<PostActionsProps>(({ 
  postUrl, 
  isFavorited, 
  isUpdatingFavorite, 
  onFavoriteClick, 
  userLoggedIn,
  favoriteCount = 0,
  title,
  description
}) => {
  const handleShare = async () => {
    const shareData = {
      title: title || 'ギミニア作品',
      text: description || 'ギミニアで見つけた面白い作品をシェア！',
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        // Web Share API が利用可能な場合
        await navigator.share(shareData);
      } else {
        // フォールバック: クリップボードにコピー
        await navigator.clipboard.writeText(window.location.href);
        // 簡易的な通知（実際のプロジェクトではtoastライブラリを使用することが多い）
        alert('URLをクリップボードにコピーしました！');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('共有に失敗しました:', error);
        // フォールバック: URLをクリップボードにコピー
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('URLをクリップボードにコピーしました！');
        } catch (clipboardError) {
          console.error('クリップボードのコピーにも失敗しました:', clipboardError);
          alert('共有機能が利用できません。URLを手動でコピーしてください。');
        }
      }
    }
  };
  return (
    <div className="flex flex-row gap-4 justify-end">
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors cursor-pointer"
      >
        開く
      </a>
      
      <button
        type="button"
        onClick={onFavoriteClick}
        disabled={!userLoggedIn || isUpdatingFavorite}
        aria-pressed={isFavorited}
        className={`flex items-center gap-1 text-sm font-medium transition-colors text-black hover:text-gray-700 ${(!userLoggedIn || isUpdatingFavorite) ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
      >
        <Heart 
          className={`w-4 h-4 ${isFavorited ? 'fill-current text-red-500' : ''}`} 
        />
        <span>{favoriteCount}</span>
        {isUpdatingFavorite && (
          <div className="ml-1 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" role="status" aria-label="更新中" />
        )}
        {/* SR向け: 状態が変わった時だけ変化するよう key を付ける */}
        <span className="sr-only" aria-live="polite" key={isFavorited ? 'on' : 'off'}>
          {isFavorited ? 'お気に入り済み' : '未お気に入り'}
        </span>
      </button>

      <button 
        type="button"
        onClick={handleShare}
        className="text-black hover:text-gray-700 transition-colors text-sm font-medium"
        aria-label="共有"
      >
        共有
      </button>
    </div>
  );
});

PostActions.displayName = 'PostActions';

export { PostActions };