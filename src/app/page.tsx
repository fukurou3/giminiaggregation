'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@/lib/api';
import { TrendingSection } from '@/components/sections/TrendingSection';
import { ColumnSection } from '@/components/sections/ColumnSection';
import { TopicHighlightSection } from '@/components/sections/TopicHighlightSection';
import { PopularTags } from '@/components/ui/PopularTags';

import { getTopicHighlights } from '@/lib/api/home';
import { TopicHighlight } from '@/types/Topic';
import { Post } from '@/types/Post';


export default function HomePage() {
  const [topicHighlights, setTopicHighlights] = useState<TopicHighlight[]>([]);

  // 共通フックを使用してAPI呼び出しを統一
  const { data: postsResponse, loading } = useFetch<{
    data?: { posts: Post[] };
  }>('/api/posts?limit=50&sortBy=trending');

  const posts = postsResponse?.data?.posts || [];
  
  // Get trending posts (already sorted by API)
  const trendingPosts = posts
    .filter((post: Post) => post.isPublic !== false)
    .slice(0, 4);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* Trending Section */}
        <div id="trending">
          <TrendingSection 
            posts={trendingPosts} 
            loading={loading} 
          />
        </div>


        {/* Popular Tags Section */}
        <div className="bg-muted/30 rounded-2xl p-8">
          <PopularTags 
            title="人気のタグ"
            limit={15}
            sortBy="combined"
            size="md"
            showStats={true}
          />
        </div>

        {/* Column Section */}
        <ColumnSection 
          featuredOnly={true}
          limit={3}
        />

        {/* Topic Highlights Section */}
        <TopicHighlightSection 
          topicHighlights={topicHighlights} 
          loading={loading} 
        />

        {/* Call to Action */}
        <section className="text-center py-12">
          <h2 className="text-xl font-bold text-foreground mb-3">
            あなたの作品も共有しませんか？
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-sm">
            あなたのGemini Canvas作品、ここで紹介してみませんか？<br />
            投稿は簡単。たくさんの人と楽しさを共有しましょう。
          </p>
          
          <div className="flex justify-center gap-4 mt-4 text-sm mb-8">
            <a href="/about-geminicanvas" className="text-blue-500 hover:underline font-medium">
              Gemini Canvasとは？
            </a>
            <a href="/submit" className="text-blue-700 hover:underline font-semibold tracking-wide">
              今すぐ投稿する
            </a>
          </div>

        </section>
      </div>
    </div>
  );
}