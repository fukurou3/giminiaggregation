'use client'


import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, ChevronDown } from 'lucide-react'
import { Post } from '@/types/Post'
import { BaseCard } from '@/components/ui/BaseCard'
import { useFetch } from '@/lib/api/useApi'



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

  const posts = (postsResponse?.data?.posts || []).filter(post => {
    // いいね数が0より大きい投稿のみ表示
    const likes = post.favoriteCount ?? post.likes ?? 0;
    return likes > 0;
  })

  // ヘッダーコンポーネントを共通化
  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ランキング</h1>
          <p className="text-muted-foreground">人気の作品をチェックしよう</p>
        </div>
      </div>
      
      {!loading && (
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-muted transition-colors min-w-[120px] z-50 relative"
          >
            <span>{period === 'all' ? '全期間' : '今週投稿'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[120px]">
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
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section className="space-y-6">
            {renderHeader()}

            {/* Loading skeleton */}
            {/* 大画面：グリッドカード */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-muted animate-pulse rounded-xl h-80"></div>
              ))}
            </div>
            {/* 小画面：横長リスト */}
            <div className="md:hidden space-y-3">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="bg-muted animate-pulse rounded-lg h-24"></div>
              ))}
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="space-y-6">
          {/* Header */}
          {renderHeader()}



          {/* Grid */}
          {/* 大画面：グリッドカード */}
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.slice(0, 20).map((post, index) => {
              const rank = index + 1
              return (
                <BaseCard 
                  key={post.id}
                  post={post} 
                  size="medium"
                  showViews={false}
                  showCategory={false}
                  rank={rank}
                />
              )
            })}
          </div>

          {/* 小画面：横長リスト */}
          <div className="md:hidden space-y-3">
            {posts.slice(0, 20).map((post, index) => {
              const rank = index + 1
              return (
                <BaseCard 
                  key={post.id}
                  post={post} 
                  size="medium"
                  layout="horizontal"
                  showViews={false}
                  showCategory={false}
                  rank={rank}
                />
              )
            })}
          </div>

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