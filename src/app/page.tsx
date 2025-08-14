'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@/lib/api';
import { TrendingSection } from '@/components/sections/TrendingSection';
import { ColumnSection } from '@/components/sections/ColumnSection';
import { TopicHighlightSection } from '@/components/sections/TopicHighlightSection';
import { Spinner } from '@/components/ui/Spinner';
import { getTopicHighlights } from '@/lib/api/home';
import { TopicHighlight } from '@/types/Topic';
import { Post } from '@/types/Post';
import { createPostFilter } from '@/lib/utils/postFilters';


export default function HomePage() {
  const [topicHighlights, setTopicHighlights] = useState<TopicHighlight[]>([]);

  // 共通フックを使用してAPI呼び出しを統一
  const { data: postsResponse, loading } = useFetch<{
    data?: { posts: Post[] };
  }>('/api/posts?limit=50&sortBy=trending');

  const posts = postsResponse?.data?.posts || [];
  
  // TODO: リリース前にincludeZeroLikes: falseに変更する
  const postFilter = createPostFilter(true); // 一時的にいいね数0の投稿も表示
  const trendingPosts = postFilter(posts).slice(0, 4);

  useEffect(() => {
    const loadTopicHighlights = async () => {
      try {
        const topics = await getTopicHighlights();
        setTopicHighlights(topics);
      } catch (error) {
        console.error('Failed to load topic highlights:', error);
      }
    };

    loadTopicHighlights();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* Topic Highlights Section */}
        <TopicHighlightSection 
          topicHighlights={topicHighlights} 
          loading={loading} 
        />

        {/* Column Section */}
        <ColumnSection 
          featuredOnly={true}
          limit={3}
        />

        {/* Trending Section */}
        <div id="trending">
          <TrendingSection 
            posts={trendingPosts} 
            loading={loading} 
          />
        </div>


      </div>
    </div>
  );
}