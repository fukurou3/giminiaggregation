'use client'

import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { Post } from '@/types/Post'
import { WorkCard } from '@/components/ui/WorkCard'
import { useFetch } from '@/lib/api/useApi'

interface RankingPageProps {
  searchParams?: Promise<{
    sortBy?: string
  }>
}

export default function RankingPage({ searchParams }: RankingPageProps) {
  const [selectedSort, setSelectedSort] = useState('trending')

  useEffect(() => {
    const loadSearchParams = async () => {
      if (searchParams) {
        const params = await searchParams
        setSelectedSort(params.sortBy || 'trending')
      }
    }
    loadSearchParams()
  }, [searchParams])

  const { data: postsResponse, loading } = useFetch<{
    data?: { posts: Post[] }
  }>(`/api/posts?limit=20&sortBy=${selectedSort}`)

  const posts = postsResponse?.data?.posts || []

  const getRankingBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600'
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500'
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600'
    return 'bg-gradient-to-br from-blue-400 to-blue-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section className="space-y-6">
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
            </div>

            {/* Sort Options */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'trending', label: 'トレンド' },
                { key: 'views', label: '閲覧数' },
                { key: 'favorites', label: 'お気に入り' },
                { key: 'createdAt', label: '新着' }
              ].map((sort) => (
                <div key={sort.key} className="px-4 py-2 bg-muted animate-pulse rounded-lg w-20 h-8"></div>
              ))}
            </div>

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
          </div>

          {/* Sort Options */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'trending', label: 'トレンド' },
              { key: 'views', label: '閲覧数' },
              { key: 'favorites', label: 'お気に入り' },
              { key: 'createdAt', label: '新着' }
            ].map((sort) => (
              <button
                key={sort.key}
                onClick={() => setSelectedSort(sort.key)}
className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  selectedSort === sort.key
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {sort.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {/* 大画面：グリッドカード */}
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.slice(0, 20).map((post, index) => {
              const rank = index + 1
              return (
                <div key={post.id} className="relative">
                  {/* Ranking Badge */}
                  <div className="absolute -top-2 -left-2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRankingBadgeColor(rank)}`}>
                      {rank}
                    </div>
                  </div>
                  
                  <WorkCard 
                    post={post} 
                    size="medium"
                  />
                </div>
              )
            })}
          </div>

          {/* 小画面：横長リスト */}
          <div className="md:hidden space-y-3">
            {posts.slice(0, 20).map((post, index) => {
              const rank = index + 1
              return (
                <div key={post.id} className="relative">
                  {/* Ranking Badge */}
                  <div className="absolute -top-1 -left-1 z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${getRankingBadgeColor(rank)}`}>
                      {rank}
                    </div>
                  </div>
                  
                  <WorkCard 
                    post={post} 
                    size="medium"
                    layout="horizontal"
                  />
                </div>
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
                しばらく時間をおいてから再度お試しください
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}