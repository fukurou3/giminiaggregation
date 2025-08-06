'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Menu, X } from 'lucide-react';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { useFetch } from '@/lib/api';
import { Post } from '@/types/Post';



// 運営設定カテゴリ（投稿画面と同じ）
const PRESET_CATEGORIES = [
  { id: 'business', name: 'ビジネス・業務支援', description: '業務効率化、生産性向上、プロジェクト管理など' },
  { id: 'education', name: '学習・教育', description: '勉強支援ツール、教育用コンテンツ、スキルアップ' },
  { id: 'development', name: '開発・テクニカル', description: 'プログラミング、開発支援、技術文書など' },
  { id: 'creative', name: 'クリエイティブ・デザイン', description: 'デザイン、画像生成、クリエイティブ制作' },
  { id: 'knowledge', name: '情報管理・ナレッジ', description: 'データ整理、知識管理、情報収集' },
  { id: 'lifestyle', name: 'ライフスタイル', description: '日常生活、趣味、健康管理など' },
  { id: 'social', name: 'ソーシャル・コミュニケーション', description: 'SNS活用、コミュニケーション支援' },
  { id: 'chatbot', name: 'チャットボット', description: '対話AI、自動応答、カスタマーサポート' },
  { id: 'game', name: 'ゲーム・エンターテインメント', description: 'ゲーム、娯楽、エンターテインメント' },
  { id: 'other', name: 'その他', description: '分類不能なもの、ニッチ系' }
];

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isSidebarFixed, setIsSidebarFixed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);
  
  // Dynamic layout state
  const [layoutPhase, setLayoutPhase] = useState<'phase1' | 'phase2' | 'phase3' | 'phase4'>('phase1');
  const [contentWidth, setContentWidth] = useState<number | undefined>(undefined);
  const [spacerWidth, setSpacerWidth] = useState<number | undefined>(undefined);

  // Layout constants
  const SIDEBAR_WIDTH = 192; // w-48 = 12rem = 192px
  const MAX_CONTENT_WIDTH = 1280; // max-w-screen-xl
  const MAX_SPACER_WIDTH = 192; // w-48 = 12rem = 192px
  const MOBILE_BREAKPOINT = 768; // md breakpoint

  // Calculate layout phase and dimensions
  const calculateLayout = useCallback((containerWidth: number) => {
    console.log('🔍 Layout Calculation:', {
      containerWidth,
      SIDEBAR_WIDTH,
      MAX_CONTENT_WIDTH,
      MAX_SPACER_WIDTH,
      MOBILE_BREAKPOINT
    });

    // Phase 4: Mobile view
    if (containerWidth < MOBILE_BREAKPOINT) {
      console.log('📱 Phase 4: Mobile');
      setLayoutPhase('phase4');
      setContentWidth(undefined);
      setSpacerWidth(undefined);
      return;
    }

    // Calculate collision point
    const collisionWidth = SIDEBAR_WIDTH + MAX_CONTENT_WIDTH + MAX_SPACER_WIDTH;
    console.log('💥 Collision width:', collisionWidth);
    
    // Phase 1: Wide screen - everything fits comfortably
    if (containerWidth >= collisionWidth) {
      console.log('🖥️ Phase 1: Wide screen');
      setLayoutPhase('phase1');
      setContentWidth(undefined); // Use CSS flexbox
      setSpacerWidth(undefined); // Use CSS flexbox
      return;
    }

    // Calculate minimum width needed for content area only (no spacer)
    const minRequiredWidth = SIDEBAR_WIDTH + MAX_CONTENT_WIDTH;
    console.log('🔧 Min required width:', minRequiredWidth);
    
    // Phase 2: Collision started - spacer shrinks while content stays fixed
    if (containerWidth >= minRequiredWidth) {
      const calculatedSpacerWidth = containerWidth - SIDEBAR_WIDTH - MAX_CONTENT_WIDTH;
      console.log('⚖️ Phase 2: Spacer shrinking', { calculatedSpacerWidth });
      setLayoutPhase('phase2');
      setContentWidth(MAX_CONTENT_WIDTH); // Fixed content width
      setSpacerWidth(calculatedSpacerWidth); // Shrinking spacer
      return;
    }

    // Phase 3: Spacer disappeared - content starts shrinking
    const calculatedContentWidth = containerWidth - SIDEBAR_WIDTH;
    console.log('📉 Phase 3: Content shrinking', { calculatedContentWidth });
    setLayoutPhase('phase3');
    setContentWidth(calculatedContentWidth); // Shrinking content
    setSpacerWidth(0); // No spacer
  }, []);

  // APIから投稿データを取得
  const { data: postsResponse, loading, error } = useFetch<{
    data?: { posts: Post[] };
  }>('/api/posts?limit=100');

  const posts = postsResponse?.data?.posts || [];

  // 実際にデータがあるカテゴリを取得（isPublicがundefinedの場合は公開とみなす）
  const actualCategories = [...new Set(posts.filter(post => post.isPublic !== false).map(post => post.category))];
  
  // PRESET_CATEGORIESにない実際のカテゴリを動的に追加
  const additionalCategories = actualCategories
    .filter(categoryName => !PRESET_CATEGORIES.find(preset => preset.name === categoryName))
    .map(categoryName => ({
      id: categoryName.toLowerCase().replace(/[・／\s]+/g, '-'),
      name: categoryName,
      description: `${categoryName}に関する作品`
    }));
  
  // 全カテゴリを表示（データがないものも含む）
  const displayCategories = [...PRESET_CATEGORIES, ...additionalCategories];

  // 選択されたカテゴリの作品を取得
  const getSelectedCategoryPosts = () => {
    return posts
      .filter(post => post.isPublic !== false && post.category === selectedCategory)
      .slice(0, 20);
  };

  // カテゴリごとの作品数を取得
  const getCategoryCount = (categoryName: string) => {
    return posts.filter(post => post.isPublic !== false && post.category === categoryName).length;
  };

  // デバッグ情報
  console.log('Categories Debug:', {
    loading,
    error,
    postsCount: posts.length,
    actualCategories,
    presetCategories: PRESET_CATEGORIES.map(c => c.name),
    additionalCategories: additionalCategories.map(c => c.name),
    displayCategories: displayCategories.map(c => c.name),
    displayCategoriesCount: displayCategories.length,
    selectedCategory,
    selectedCategoryPosts: getSelectedCategoryPosts().length,
    // Layout debug
    layoutPhase,
    contentWidth,
    spacerWidth
  });

  // データが読み込まれたら最初のカテゴリを選択（データがあるものを優先）
  useEffect(() => {
    if (!loading && displayCategories.length > 0 && !selectedCategory) {
      // データがあるカテゴリを優先して選択
      const categoryWithData = displayCategories.find(cat => getCategoryCount(cat.name) > 0);
      const defaultCategory = categoryWithData || displayCategories[0];
      console.log('Setting default category:', defaultCategory.name);
      setSelectedCategory(defaultCategory.name);
    }
  }, [loading, displayCategories.length, selectedCategory, posts.length]);

  // 横長リスト表示時の初回読み込みでモーダルを自動で開く
  useEffect(() => {
    if (layoutPhase === 'phase4' && !loading && displayCategories.length > 0 && isInitialLoad) {
      setIsSidebarOpen(true);
      setIsInitialLoad(false);
    }
  }, [layoutPhase, loading, displayCategories.length, isInitialLoad]);

  // ページアクセス時の処理（上部タブからのアクセスを検出）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && layoutPhase === 'phase4') {
        setIsSidebarOpen(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [layoutPhase]);

  // 右スワイプでカテゴリモーダルを開く（phase4のタッチデバイスのみ）
  useEffect(() => {
    // phase4かつタッチデバイスの場合のみ
    if (layoutPhase !== 'phase4' || !('ontouchstart' in window)) return;

    let startX = 0;
    let startY = 0;
    const minSwipeDistance = 50;
    const maxVerticalDistance = 100;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = Math.abs(endY - startY);

      // 右スワイプかつ縦方向の動きが少ない場合（画面上のどこからでも）
      if (deltaX > minSwipeDistance && deltaY < maxVerticalDistance) {
        console.log('Right swipe detected, opening modal');
        setIsSidebarOpen(true);
      }
    };

    const mainContent = document.querySelector('main') || document.body;
    mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });

    console.log('Touch swipe listeners added for phase4');

    return () => {
      mainContent.removeEventListener('touchstart', handleTouchStart);
      mainContent.removeEventListener('touchend', handleTouchEnd);
      console.log('Touch swipe listeners removed');
    };
  }, [layoutPhase]);

  // サイドバー外をクリックした時に閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  // Sticky sidebar scroll handler
  useEffect(() => {
    // Skip on mobile layout
    if (layoutPhase === 'phase4') return;

    const HEADER_HEIGHT = 80; // Adjust based on your header height

    const handleScroll = () => {
      if (sidebarContainerRef.current) {
        const { top } = sidebarContainerRef.current.getBoundingClientRect();
        if (top <= HEADER_HEIGHT) {
          setIsSidebarFixed(true);
        } else {
          setIsSidebarFixed(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [layoutPhase]);

  // Window resize listener for dynamic layout
  useEffect(() => {
    // Ensure we're on client side
    if (typeof window === 'undefined') {
      console.log('⚠️ Window not available (SSR)');
      return;
    }

    console.log('🚀 Setting up window resize listener');

    const handleResize = () => {
      const windowWidth = window.innerWidth;
      console.log('📏 Window width changed:', windowWidth);
      calculateLayout(windowWidth);
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Initial calculation with small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const initialWidth = window.innerWidth;
      console.log('🎯 Initial window width:', initialWidth);
      calculateLayout(initialWidth);
    }, 50);

    return () => {
      console.log('🧹 Cleaning up window resize listener');
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [calculateLayout]);

  // カテゴリ選択時の処理
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    // カテゴリ選択後はモーダルを閉じる
    setIsSidebarOpen(false);
  };


  const selectedCategoryPosts = getSelectedCategoryPosts();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          {/* Left Sidebar - Loading */}
          <div className="w-48 flex-shrink-0">
            <div className="bg-muted animate-pulse h-screen"></div>
          </div>
          {/* Main Content - Loading */}
          <div className="flex-1">
            <div className="max-w-screen-xl mx-auto px-4 py-8">
              <div className="space-y-4 mt-4 md:mt-0">
                <div className="bg-muted animate-pulse rounded-lg h-12 w-1/3"></div>
                <div className="bg-muted animate-pulse rounded-lg h-6 w-1/2"></div>
                <div className="grid gap-6 auto-fit-category-cards">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-xl h-80"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Right Smart Spacer - Loading */}
          <div className="w-48 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Hamburger Button - Only in Phase 4 */}
      {layoutPhase === 'phase4' && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden absolute top-27 left-4 z-40 p-2 hover:bg-muted rounded-md transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Overlay - Only in Phase 4 */}
      {layoutPhase === 'phase4' && isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" />
      )}

      {/* Layout Container */}
      <div className="flex min-w-0 w-full" ref={sidebarContainerRef}>
        {/* Left Sidebar - Outside padding, screen left edge */}
        <div
          ref={sidebarRef}
          className={`
            w-48 flex-shrink-0
            ${layoutPhase === 'phase4'
              ? `fixed z-40 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
              : ''
            }
          `}
          style={{
            display: layoutPhase === 'phase4' ? undefined : 'block',
            position: layoutPhase === 'phase4' ? 'fixed' : (isSidebarFixed ? 'fixed' : 'static'),
            top: layoutPhase === 'phase4' ? '0' : (isSidebarFixed ? '80px' : undefined),
            height: layoutPhase === 'phase4' ? '100vh' : undefined,
            zIndex: layoutPhase === 'phase4' ? 40 : (isSidebarFixed ? 10 : undefined),
          }}
        >
          <div 
            className="bg-background border-r border-border overflow-y-auto h-full relative"
            style={{width: '192px', minWidth: '192px', maxWidth: '192px'}} 
          >
              {/* Fixed Mobile Header - Only in Phase 4 */}
              {layoutPhase === 'phase4' && (
                <div className="sticky bg-background p-4 z-10" style={{top: '92px'}}>
                  <div className="flex items-center">
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-2 hover:bg-muted rounded-md transition-colors mr-2"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-base font-semibold text-foreground flex items-center">
                      カテゴリ
                    </h2>
                  </div>
                </div>
              )}

              {/* Content wrapper with appropriate padding */}
              <div 
                className={layoutPhase === 'phase4' ? "pt-23 px-3 pb-3" : "px-3 py-8"}
                style={{width: '190px', minWidth: '190px', maxWidth: '190px'}}
              >

              {/* Desktop Header - Show in all phases except mobile */}
              <h2 className={`${layoutPhase === 'phase4' ? 'hidden' : 'block'} text-base font-semibold text-foreground mb-3 flex items-center`}>
                <div className="p-2 mr-2">
                  <Menu className="w-5 h-5" />
                </div>
                カテゴリ
              </h2>
            
              <div className="space-y-1">
              {displayCategories.map((category) => {
                const count = getCategoryCount(category.name);
                const hasData = count > 0;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.name)}
                    className={`w-full text-left px-2 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === category.name
                        ? 'bg-primary/20 text-foreground font-medium'
                        : 'hover:bg-muted text-foreground hover:text-foreground'
                    }`}
                  >
                    <span>
                      {category.name} <span className="text-sm opacity-75">({count})</span>
                    </span>
                  </button>
                );
              })}
              </div>
              </div>
            </div>
        </div>

        {/* Layout spacer to prevent content jumping when sidebar becomes fixed */}
        {layoutPhase !== 'phase4' && isSidebarFixed && (
          <div className="w-48 flex-shrink-0" />
        )}

        {/* Main Content - Centered with padding */}
        <div 
          style={{
            width: layoutPhase === 'phase2' || layoutPhase === 'phase3' ? 
              (contentWidth ? `${contentWidth}px` : 'auto') : undefined,
            flexGrow: layoutPhase === 'phase1' || layoutPhase === 'phase4' ? 1 : 0,
            flexShrink: layoutPhase === 'phase2' ? 0 : 1,
            minWidth: 0
          }}
        >
          <div 
            className={layoutPhase === 'phase1' ? "max-w-screen-xl mx-auto px-4 py-8" : layoutPhase === 'phase4' ? "px-4 pt-8 pb-8" : "px-4 py-8"}
            style={{
              maxWidth: layoutPhase === 'phase1' ? undefined : 'none'
            }}
          >
            {/* Header */}
            <div className="mb-8 mt-0">
              {layoutPhase === 'phase4' ? (
                // Mobile layout: Category info positioned relative to external hamburger
                <div className="ml-13">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {selectedCategory}
                  </h1>
                  <p className="text-muted-foreground">
                    {displayCategories.find(cat => cat.name === selectedCategory)?.description}
                  </p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    {selectedCategoryPosts.length} 作品
                  </div>
                </div>
              ) : (
                // Desktop layout: Normal layout
                <>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {selectedCategory}
                  </h1>
                  <p className="text-muted-foreground">
                    {displayCategories.find(cat => cat.name === selectedCategory)?.description}
                  </p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    {selectedCategoryPosts.length} 作品
                  </div>
                </>
              )}
              
              {/* エラー表示 */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                  エラー: {error}
                </div>
              )}
            </div>

            {/* Category Posts Grid */}
            {selectedCategoryPosts.length > 0 ? (
              <>
                {console.log('🎨 Grid Rendering Debug:', {
                  layoutPhase,
                  showGrid: layoutPhase !== 'phase4',
                  showHorizontal: layoutPhase === 'phase4',
                  postsCount: selectedCategoryPosts.length
                })}
                
                {/* Desktop: Auto-fit Grid - Show in Phase 1, 2, 3 */}
                {layoutPhase !== 'phase4' && (
                  <div className="grid gap-6 auto-fit-category-cards">
                    {selectedCategoryPosts.map((post) => (
                      <CategoryCard
                        key={post.id}
                        post={post}
                        layout="vertical"
                      />
                    ))}
                  </div>
                )}

                {/* Mobile: Horizontal Layout - Show in Phase 4 only */}
                {layoutPhase === 'phase4' && (
                  <div className="space-y-3">
                    {selectedCategoryPosts.map((post) => (
                      <CategoryCard
                        key={post.id}
                        post={post}
                        layout="horizontal"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  このカテゴリにはまだ作品がありません
                </h3>
                <p className="text-muted-foreground">
                  作品が投稿されるとここに表示されます
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Smart Spacer */}
        <div 
          className={layoutPhase === 'phase4' ? "hidden" : ""}
          style={{
            width: layoutPhase === 'phase1' ? '192px' : (spacerWidth !== undefined ? `${spacerWidth}px` : undefined),
            flexShrink: 0,
            display: spacerWidth === 0 ? 'none' : undefined
          }}
        />
      </div>
    </div>
  );
}