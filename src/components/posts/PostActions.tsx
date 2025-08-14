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
}

const PostActions = memo<PostActionsProps>(({ 
  postUrl, 
  isFavorited, 
  isUpdatingFavorite, 
  onFavoriteClick, 
  userLoggedIn,
  favoriteCount = 0
}) => {
  return (
    <div className="flex flex-row gap-4 lg:justify-end">
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
      >
        開く
      </a>
      
      <button
        onClick={onFavoriteClick}
        disabled={!userLoggedIn || isUpdatingFavorite}
        className={`flex items-center gap-1 text-sm font-medium transition-colors text-black hover:text-gray-700 ${(!userLoggedIn || isUpdatingFavorite) ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
      >
        <Heart 
          className={`w-4 h-4 ${isFavorited ? 'fill-current text-red-500' : ''}`} 
        />
        <span>{favoriteCount}</span>
        {isUpdatingFavorite && (
          <div className="ml-1 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      <button 
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