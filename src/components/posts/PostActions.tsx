'use client';

import { memo } from 'react';
import { Heart } from 'lucide-react';

interface PostActionsProps {
  postUrl: string;
  isFavorited: boolean;
  isUpdatingFavorite: boolean;
  onFavoriteClick: () => void;
  userLoggedIn: boolean;
}

const PostActions = memo<PostActionsProps>(({ 
  postUrl, 
  isFavorited, 
  isUpdatingFavorite, 
  onFavoriteClick, 
  userLoggedIn 
}) => {
  return (
    <div className="flex flex-row gap-3 lg:justify-end">
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <span>開く</span>
      </a>
      
      <button
        onClick={onFavoriteClick}
        disabled={!userLoggedIn || isUpdatingFavorite}
        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
          isFavorited
            ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            : "bg-card border-border text-foreground hover:bg-muted/50"
        } ${(!userLoggedIn || isUpdatingFavorite) ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'}
      >
        <Heart 
          className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} 
        />
        <span>{isFavorited ? 'お気に入り' : 'お気に入り'}</span>
        {isUpdatingFavorite && (
          <div className="ml-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      <button 
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-colors"
        aria-label="共有"
      >
        <span>共有</span>
      </button>
    </div>
  );
});

PostActions.displayName = 'PostActions';

export { PostActions };