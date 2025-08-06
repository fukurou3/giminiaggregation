'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Hash, Flag, Eye, Heart, Users } from 'lucide-react';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { useFetch } from '@/lib/api';
import { TagSearchResult } from '@/types/Tag';
import { Post } from '@/types/Post';

interface TagSearchResponse {
  data: TagSearchResult & { posts: Post[] };
}

export default function TagSearchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tagId = params.tag as string;
  const categoryFilter = searchParams.get('category') || 'all';
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter);
  const [showReportModal, setShowReportModal] = useState(false);

  // URLのクエリパラメータを構築
  const queryString = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';

  const { data: response, loading, error } = useFetch<TagSearchResponse>(`/api/tags/${tagId}${queryString}`);

  const result = response?.data;
  const tag = result?.tag;
  const posts = result?.posts || [];
  const totalCount = result?.totalCount || 0;
  const categoryStats = result?.categoryStats || [];

  // カテゴリ選択の変更
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const url = new URL(window.location.href);
    if (category === 'all') {
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', category);
    }
    window.history.pushState({}, '', url.toString());
  };

  // タグ通報
  const handleReport = async (reason: string) => {
    try {
      // 実装は後で追加（認証が必要）
      console.log('Report tag:', tagId, reason);
      setShowReportModal(false);
    } catch (error) {
      console.error('Report failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-screen-xl mx-auto">
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-12 bg-muted rounded-lg w-1/3 mb-4"></div>
              <div className="h-6 bg-muted rounded-lg w-1/2 mb-8"></div>
            </div>
            {/* 大画面：グリッドカード */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-muted animate-pulse rounded-xl h-80"></div>
              ))}
            </div>
            {/* 小画面：横長リスト */}
            <div className="md:hidden space-y-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-muted animate-pulse rounded-lg h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tag) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center py-16">
            <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              タグが見つかりません
            </h3>
            <p className="text-muted-foreground">
              指定されたタグは存在しないか、削除された可能性があります
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-screen-xl mx-auto">
        {/* タグヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Hash className="w-8 h-8 text-primary" />
              <div>
<h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
                  <span>{tag.name}</span>
                  {tag.isOfficial && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      公式
                    </span>
                  )}
                  <span className="text-muted-foreground text-sm font-normal ml-4 translate-y-1">
                    合計: {totalCount}件
                  </span>
                </h1>
              </div>
            </div>
            
            {/* タグ統計とアクション */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">

                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span>{tag.favorites.toLocaleString()}</span>
                </div>

              </div>
              
              <button
                onClick={() => setShowReportModal(true)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                title="タグを通報"
              >
                <Flag className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* カテゴリフィルター */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange('all')}
className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${ 
                selectedCategory === 'all'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              すべて ({totalCount})
            </button>
            
            {categoryStats.map((stat) => (
              <button
                key={stat.categoryId}
                onClick={() => handleCategoryChange(stat.categoryId)}
className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${ 
                  selectedCategory === stat.categoryId
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >{stat.categoryName} ({stat.count})
              </button>
            ))}
          </div>
        </div>

        {/* 投稿一覧 */}
        {posts.length > 0 ? (
          <>
            {/* カテゴリ別表示 */}
            {selectedCategory === 'all' ? (
              // すべてのカテゴリを表示
              <div className="space-y-8">
                {categoryStats.map((stat) => {
                  const categoryPosts = posts.filter(post => 
                    post.categoryId === stat.categoryId
                  );
                  
                  if (categoryPosts.length === 0) return null;

                  return (
                    <div key={stat.categoryId}>
                      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                        {stat.categoryName}
                      </h2>
                      
                      {/* 大画面：グリッドカード */}
                      <div className="hidden min-[681px]:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoryPosts.map((post) => (
                          <CategoryCard
                            key={post.id}
                            post={post}
                            layout="vertical"
                          />
                        ))}
                      </div>

                      {/* 小画面：横長リスト */}
                      <div className="max-[680px]:block hidden space-y-3">
                        {categoryPosts.map((post) => (
                          <CategoryCard
                      key={post.id}
                      post={post}
                      layout="horizontal"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // 選択されたカテゴリのみ表示
              <>
                {/* 大画面：グリッドカード */}
                <div className="hidden min-[680px]:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {posts.map((post) => (
                    <CategoryCard
                      key={post.id}
                      post={post}
                      layout="vertical"
                    />
                  ))}
                </div>

                {/* 小画面：横長リスト */}
                <div className="max-[679px]:block hidden space-y-3">
                  {posts.map((post) => (
                    <CategoryCard
                      key={post.id}
                      post={post}
                      layout="horizontal"
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              投稿が見つかりません
            </h3>
            <p className="text-muted-foreground">
              このタグの投稿はまだありません
            </p>
          </div>
        )}

        {/* 通報モーダル */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">タグを通報</h3>
              <p className="text-muted-foreground mb-4">
                「{tag.name}」を通報する理由を選択してください
              </p>
              
              <div className="space-y-2 mb-6">
                {[
                  '不適切な内容',
                  'スパム・宣伝',
                  '誤解を招く内容',
                  '著作権侵害',
                  'その他'
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => handleReport(reason)}
                    className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}