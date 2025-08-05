'use client';

import Link from 'next/link';
import { Tag, ArrowRight } from 'lucide-react';
import { WorkCard } from '@/components/ui/WorkCard';
import { TopicHighlight } from '@/types/Topic';

interface TopicHighlightSectionProps {
  topicHighlights: TopicHighlight[];
  loading?: boolean;
}

export function TopicHighlightSection({ topicHighlights, loading = false }: TopicHighlightSectionProps) {
  if (loading) {
    return (
      <section className="space-y-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">人気トピック</h2>
            <p className="text-muted-foreground">注目のジャンル・タグ</p>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-32 h-6 bg-muted animate-pulse rounded"></div>
                <div className="w-20 h-4 bg-muted animate-pulse rounded"></div>
              </div>
              <div className="flex flex-wrap gap-4 justify-center">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="bg-muted animate-pulse rounded-xl h-64 w-72"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const displayTopics = topicHighlights.slice(0, 5);

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl">
          <Tag className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">人気トピック</h2>
        </div>
      </div>

      {/* Topic Sections */}
      <div className="space-y-8">
        {displayTopics.map((topicHighlight) => (
          <div key={topicHighlight.topic.id} className="space-y-4">
            {/* Topic Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full font-semibold text-sm ${
                  topicHighlight.topic.color 
                    ? `bg-${topicHighlight.topic.color}-100 text-${topicHighlight.topic.color}-700`
                    : 'bg-primary/10 text-primary'
                }`}>
                  <Tag className="w-4 h-4" />
                  <span>#{topicHighlight.topic.name}</span>
                  <span className="text-xs opacity-75">({topicHighlight.topic.totalPosts})</span>
                </div>
                {topicHighlight.topic.description && (
                  <span className="text-muted-foreground text-sm hidden md:inline">
                    {topicHighlight.topic.description}
                  </span>
                )}
              </div>
              
              <Link 
                href={`/${topicHighlight.topic.type}s/${topicHighlight.topic.id}`}
                className="flex items-center space-x-1 text-primary hover:text-primary/80 font-medium text-sm transition-colors group"
              >
                <span>もっと見る</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Featured Posts Grid */}
            <div className="flex flex-wrap gap-4 justify-center">
              {topicHighlight.featuredPosts.map((post) => (
                <div key={post.id} className="w-72">
                  <WorkCard 
                    post={post} 
                    size="medium"
                  />
                </div>
              ))}
            </div>

            {/* Show message if less than 3 posts */}
            {topicHighlight.featuredPosts.length < 3 && (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">このトピックにはさらに作品が必要です。ぜひ投稿してください！</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {displayTopics.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">まだ人気トピックがありません</h3>
          <p className="text-muted-foreground">作品を投稿して、新しいトピックを作りましょう！</p>
        </div>
      )}

      {/* Browse All Topics */}
      {topicHighlights.length > 5 && (
        <div className="text-center pt-8 border-t border-border">
          <Link 
            href="/topics"
            className="inline-flex items-center space-x-2 bg-muted hover:bg-muted/80 text-foreground px-6 py-3 rounded-full font-medium transition-colors"
          >
            <span>すべてのトピックを見る</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}