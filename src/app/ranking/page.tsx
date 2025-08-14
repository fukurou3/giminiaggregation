'use client'


import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, ChevronDown } from 'lucide-react'
import { Post } from '@/types/Post'
import { PostGrid } from '@/components/ui/PostGrid'
import { useFetch } from '@/lib/api/useApi'
import { createPostFilter } from '@/lib/utils/postFilters'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Spinner } from '@/components/ui/Spinner'

export default function RankingPage() {
  const searchParams = useSearchParams()
  const [period, setPeriod] = useState<'all' | 'week'>('week')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // URLクエリパラメータから初期期間を設定
  useEffect(() => {
    const periodParam = searchParams.get('period')
    if (periodParam === 'all' || periodParam === 'week') {
      setPeriod(periodParam)
    }
  }, [searchParams])

  // 期間に応じてAPIパラメータを変更
  const apiEndpoint = period === 'week' 
    ? `/api/posts?limit=20&sortBy=favorites&period=week`
    : `/api/posts?limit=20&sortBy=favorites`

  const { data: postsResponse, loading } = useFetch<{
    data?: { posts: Post[] }
  }>(apiEndpoint)

  // TODO: リリース前にincludeZeroLikes: falseに変更する
  const postFilter = createPostFilter(true); // 一時的にいいね数0の投稿も表示
  const posts = postFilter(postsResponse?.data?.posts || []);
  
  // デバッグ用: データ構造を確認
  console.log('Ranking Page Debug:', {
    loading,
    apiEndpoint,
    postsResponse,
    rawPosts: postsResponse?.data?.posts,
    filteredPosts: posts,
    firstPost: posts[0]
  });

  const dropdownElement = (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center justify-between px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-muted transition-colors min-w-[120px] relative"
      >
        <span>{period === 'all' ? '全期間' : '今週投稿'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-20 min-w-[120px]">
          <button
            onClick={() => {
              setPeriod('all');
              setIsDropdownOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-t-lg ${
              period === 'all' ? 'text-primary font-medium' : 'text-foreground'
            }`}
          >
            全期間
          </button>
          <button
            onClick={() => {
              setPeriod('week');
              setIsDropdownOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-b-lg ${
              period === 'week' ? 'text-primary font-medium' : 'text-foreground'
            }`}
          >
            今週投稿のみ
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="space-y-6">
          {/* Header */}
          <SectionHeader
            icon={TrendingUp}
            iconGradient={{ from: 'orange-500', to: 'red-500' }}
            title="ランキング"
            titleSize="lg"
            rightElement={dropdownElement}
            loading={loading}
          />

          {/* Grid */}
          <PostGrid
            posts={posts.slice(0, 20)}
            layout="grid"
            responsive={true}
            showRanking={true}
            showViews={false}
            showCategory={false}
            size="medium"
          />

          {/* Empty State */}
          {posts.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                ランキングデータがありません
              </h3>
              <p className="text-muted-foreground">
                作品のいいね数が不足しています
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}