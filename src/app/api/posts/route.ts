import { NextRequest } from 'next/server';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { postSchema } from '@/lib/schemas/postSchema';
import { validateGeminiUrl } from '@/lib/validators/urlValidator';
import { getUserProfile } from '@/lib/userProfile';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP, 
  mapFirestoreError 
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';





export async function GET(request: NextRequest) {
  try {
    // IPアドレスを取得してレート制限チェック
    const ip = getClientIP(request);
    
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        'リクエストが多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const featuredOnly = searchParams.get('featured') === 'true';
    const categoryFilter = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, trending, views, favorites
    
    // クエリ制限値（デフォルト10、最大50）
    const queryLimit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

    // Firestoreクエリを構築（公開投稿のみ）
    let postsQuery;
    
    if (featuredOnly) {
      // 注目記事のみ
      postsQuery = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        where('featured', '==', true)
      );
    } else {
      // 通常の公開記事のみ
      postsQuery = query(
        collection(db, 'posts'),
        where('isPublic', '==', true)
      );
    }

    // 制限を適用
    postsQuery = query(postsQuery, limit(queryLimit));

    // データを取得
    const snapshot = await getDocs(postsQuery);
    
    let posts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        url: data.url || '',
        description: data.description || '',
        tags: data.tags || [],
        tagIds: data.tagIds || [], // tagIds配列を追加
        category: data.category || 'その他',
        categoryId: data.categoryId || 'other', // categoryIdを追加
        customCategory: data.customCategory || undefined,
        thumbnailUrl: data.thumbnailUrl || '',
        authorId: data.authorId || '',
        authorUsername: data.authorUsername || '匿名ユーザー',
        isPublic: data.isPublic !== false, // Default to true if not explicitly false
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || undefined,
        likes: data.likes || 0,
        favoriteCount: data.favoriteCount || 0,
        views: data.views || 0,
        featured: data.featured || false,
        ogpTitle: data.ogpTitle || null,
        ogpDescription: data.ogpDescription || null,
        ogpImage: data.ogpImage || null,
      };
    });

    // カテゴリフィルターを適用
    if (categoryFilter && categoryFilter !== 'all') {
      posts = posts.filter(post => post.categoryId === categoryFilter);
    }

    // ソートを適用
    posts = posts
    // ソート方法に応じてクライアント側でソート
    .sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          return (b.favoriteCount + b.views) - (a.favoriteCount + a.views);
        case 'views':
          return b.views - a.views;
        case 'favorites':
          return b.favoriteCount - a.favoriteCount;
        case 'createdAt':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    // ログ出力（監査用）
    console.log(`Posts fetched: ${posts.length} items - IP: ${ip}`);

    return createSuccessResponse(
      { posts, total: posts.length },
      `${posts.length}件の投稿を取得しました`
    );

  } catch (error) {
    console.error('Posts fetch error:', error);
    
    return createErrorResponse(
      'server_error',
      '投稿の取得に失敗しました',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();

    // IPアドレスを取得（プロキシを考慮）
    const ip = getClientIP(request);

    // レート制限チェック
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        '投稿が多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    // 基本的なバリデーション
    if (!body.formData) {
      return createErrorResponse(
        'invalid_request',
        '投稿データが提供されていません'
      );
    }

    // Zodスキーマでバリデーション
    const validationResult = postSchema.safeParse(body.formData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return createErrorResponse(
        'validation_failed',
        '入力データに不備があります',
        400,
        errors
      );
    }

    const { formData, userInfo } = body;

    // ユーザー情報の確認
    if (!userInfo || !userInfo.uid) {
      return createErrorResponse(
        'unauthorized',
        'ログインが必要です',
        401
      );
    }

    // ユーザープロフィールを取得
    const userProfile = await getUserProfile(userInfo.uid);
    if (!userProfile || !userProfile.isSetupComplete) {
      return createErrorResponse(
        'profile_incomplete',
        'プロフィールの設定が完了していません',
        400
      );
    }

    // URL の再検証（サーバー側で二重チェック）
    if (formData.url) {
      const urlValidationResult = await validateGeminiUrl(formData.url);
      if (!urlValidationResult.isValid) {
        return createErrorResponse(
          'invalid_url',
          urlValidationResult.message || '無効なGemini共有リンクです'
        );
      }
    }

    // タグとカテゴリの処理
    const tags = formData.tags || [];
    const tagIds: string[] = [];
    
    // タグを作成または取得してIDを収集
    if (tags.length > 0) {
      const { createOrGetTag } = await import('@/lib/tags');
      const tagPromises = tags.map((tagName: string) => 
        createOrGetTag(tagName.trim(), false)
      );
      const createdTags = await Promise.all(tagPromises);
      tagIds.push(...createdTags.map(tag => tag.id));
    }

    // カテゴリIDの取得
    const { findCategoryByName } = await import('@/lib/constants/categories');
    const categoryObj = findCategoryByName(formData.category);
    
    if (!categoryObj) {
      return createErrorResponse(
        'invalid_category',
        '無効なカテゴリが指定されました'
      );
    }

    // 投稿データの準備
    const postData = {
      title: formData.title,
      url: formData.url,
      description: formData.description,
      tagIds: tagIds, // タグID配列
      categoryId: categoryObj.id, // カテゴリID
      ...(formData.category === 'その他' && formData.customCategory
        ? { customCategory: formData.customCategory }
        : {}),
      thumbnailUrl: formData.thumbnailUrl || '',
      isPublic: formData.isPublic !== false, // デフォルトはtrue
      
      // システム自動設定項目
      authorId: userInfo.uid,
      authorUsername: userProfile.username,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes: 0,
      favoriteCount: 0,
      views: 0,
      featured: false,
      
      // OGPデータ（URL検証で取得したもの）
      ogpTitle: body.ogpData?.title || null,
      ogpDescription: body.ogpData?.description || null,
      ogpImage: body.ogpData?.image || null,
    };

      // Firestoreに保存
      const docRef = await addDoc(collection(db, 'posts'), postData);

      // 分散カウンター用のシャードを初期化
      const SHARD_COUNT = parseInt(process.env.FAVORITE_SHARD_COUNT || '10', 10);
      const shardPromises = Array.from({ length: SHARD_COUNT }).map((_, idx) =>
        setDoc(doc(db, `posts/${docRef.id}/favoriteShards/${idx}`), { count: 0 })
      );
      
      // タグ統計の更新（非同期）
      const updateTagsPromises = tagIds.map(async (tagId) => {
        try {
          const { updateTagStats, updateTagCategoryCount } = await import('@/lib/tags');
          await updateTagStats(tagId, { count: 1 });
          await updateTagCategoryCount(tagId, categoryObj.id, 1);
        } catch (error) {
          console.warn(`Failed to update tag stats for ${tagId}:`, error);
        }
      });

      await Promise.all([...shardPromises, ...updateTagsPromises]);

    // ログ出力（デバッグ・監査用）
    console.log(`Post created: ${docRef.id} by ${userInfo.uid} - IP: ${ip}`);

    return createSuccessResponse(
      { postId: docRef.id },
      '投稿が正常に作成されました'
    );

  } catch (error) {
    console.error('Post creation error:', error);
    
    // Firestoreエラーの詳細分析
    const { code, message } = error instanceof Error 
      ? mapFirestoreError(error) 
      : { code: 'server_error' as const, message: 'サーバーエラーが発生しました' };

    return createErrorResponse(code, message, 500);
  }
}

// OPTIONS メソッド（プリフライトリクエスト）のハンドリング
export async function OPTIONS() {
  return createSuccessResponse(undefined, undefined, 200);
}