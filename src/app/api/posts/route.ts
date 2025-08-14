import { NextRequest } from 'next/server';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { postSchema } from '@/lib/schemas/postSchema';
import { validateGeminiUrl } from '@/lib/validators/urlValidator';
import { getUserProfile } from '@/lib/userProfile';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import {
  createErrorResponse,
  createSuccessResponse,
  getClientIP,
  mapFirestoreError
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { env } from '@/lib/env';

// Firebase Admin初期化
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.GOOGLE_CLOUD_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}





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
    const period = searchParams.get('period') || 'all'; // all, week
    
    // クエリ制限値（デフォルト10、最大50）
    const queryLimit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

    // Firestoreクエリを構築（公開投稿のみ、削除されていない投稿のみ）
    let postsQuery;
    
    if (featuredOnly) {
      // 注目記事のみ
      postsQuery = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        where('featured', '==', true),
        // 削除された投稿を除外（isDeletedフィールドが存在しないか、falseの場合のみ）
      );
    } else {
      // 通常の公開記事のみ
      postsQuery = query(
        collection(db, 'posts'),
        where('isPublic', '==', true),
        // 削除された投稿を除外（isDeletedフィールドが存在しないか、falseの場合のみ）
      );
    }

    // 制限を適用
    postsQuery = query(postsQuery, limit(queryLimit));

    // データを取得
    const snapshot = await getDocs(postsQuery);
    
    // 投稿データをマッピングしてお気に入り数を動的に計算
    let posts = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // シャードからお気に入り数を取得
        const { getFavoriteCount } = await import('@/lib/favorites');
        const actualFavoriteCount = await getFavoriteCount(doc.id);
        
        // 全Timestampフィールドを安全に変換する関数（ISO文字列に変換）
        const convertTimestamps = (obj: any): any => {
          if (obj && typeof obj === 'object') {
            if (obj.toDate && typeof obj.toDate === 'function') {
              return obj.toDate().toISOString();
            }
            if (Array.isArray(obj)) {
              return obj.map(convertTimestamps);
            }
            const converted: any = {};
            for (const [key, value] of Object.entries(obj)) {
              converted[key] = convertTimestamps(value);
            }
            return converted;
          }
          return obj;
        };

        const convertedData = convertTimestamps(data);
        
        // 削除された投稿または非表示の投稿をスキップ
        if (convertedData.isDeleted === true || convertedData.isHidden === true) {
          return null;
        }
        
        return {
          id: doc.id,
          favoriteCount: actualFavoriteCount, // 実際のお気に入り数で上書き
          ...convertedData,
        };
      })
    );

    // nullの投稿（削除または非表示の投稿）をフィルタリング
    posts = posts.filter(post => post !== null);

    // カテゴリフィルターを適用
    if (categoryFilter && categoryFilter !== 'all') {
      posts = posts.filter(post => post.categoryId === categoryFilter);
    }

    // 期間フィルターを適用（今週のみ）
    if (period === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      posts = posts.filter(post => {
        const postDate = new Date(post.createdAt);
        return postDate >= oneWeekAgo;
      });
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
          // お気に入り数優先、同数の場合は観覧数で判定
          if (b.favoriteCount !== a.favoriteCount) {
            return b.favoriteCount - a.favoriteCount;
          }
          return b.views - a.views;
        case 'createdAt':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    // デバッグ情報を追加
    console.log('Posts API Debug:', {
      totalPosts: posts.length,
      queryLimit,
      sortBy,
      period,
      featuredOnly,
      categoryFilter,
      categoryFilteredCount: categoryFilter ? posts.filter(p => p.categoryId === categoryFilter).length : 'N/A',
      firstPost: posts[0] ? {
        id: posts[0].id,
        title: posts[0].title,
        categoryId: posts[0].categoryId,
        thumbnail: posts[0].thumbnail,
        isPublic: posts[0].isPublic,
        hasRequiredFields: !!(posts[0].thumbnail && posts[0].categoryId && posts[0].title)
      } : null,
      allCategoriesInPosts: [...new Set(posts.map(p => p.categoryId))].slice(0, 10)
    });
    
    return createSuccessResponse({ posts });
  } catch (error) {
    console.error('Posts GET Error:', error);
    return createErrorResponse(
      'server_error',
      'サーバーエラーが発生しました'
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // デバッグ: リクエストボディをログに出力
    console.log('POST Request Body:', JSON.stringify(body, null, 2));
    console.log('Request Body Keys:', Object.keys(body || {}));
    
    // リクエストボディ構造を修正（formDataをフラットに展開）
    const requestData = body.formData || body;
    console.log('Extracted Form Data:', JSON.stringify(requestData, null, 2));
    
    // Zodスキーマでバリデーション
    const validationResult = postSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      // Zodエラーの詳細ログ出力
      console.error('Validation failed:', {
        error: validationResult.error,
        errorType: typeof validationResult.error,
        issues: validationResult.error?.issues,
        errors: validationResult.error?.errors,
        message: validationResult.error?.message,
        requestBody: body
      });
      
      let errorMessages = 'バリデーションエラーが発生しました';
      try {
        // Zod v3の新しい形式に対応
        const issues = validationResult.error?.issues || [];
        if (Array.isArray(issues) && issues.length > 0) {
          const errors = issues.map(issue => 
            `${issue.path?.join('.') || 'unknown'}: ${issue.message}`
          );
          errorMessages = `入力データが無効です: ${errors.join(', ')}`;
        } else {
          errorMessages = `入力データが無効です: ${validationResult.error?.message || String(validationResult.error)}`;
        }
      } catch (err) {
        console.error('Error processing validation errors:', err);
        errorMessages = 'バリデーションエラーの処理中にエラーが発生しました';
      }
      
      return createErrorResponse(
        'validation_failed',
        errorMessages,
        400
      );
    }

    const validatedData = validationResult.data;

    // Firebase Authenticationでユーザーを検証
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('unauthorized', '認証が必要です', 401);
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // ユーザープロフィールを取得
    const userProfile = await getUserProfile(uid);
    if (!userProfile) {
      return createErrorResponse('not_found', 'ユーザーが見つかりません', 404);
    }

    // Gemini URLのバリデーション
    if (!validateGeminiUrl(validatedData.url)) {
      return createErrorResponse(
        'invalid_url',
        'URLはGeminiのワークスペースURLである必要があります',
        400
      );
    }

    // HTMLコンテンツのサニタイズ（説明など）
    const sanitizedData = {
      ...validatedData,
      description: validatedData.description ? sanitizeHtml(validatedData.description) : '',
      problemBackground: validatedData.problemBackground ? sanitizeHtml(validatedData.problemBackground) : undefined,
      useCase: validatedData.useCase ? sanitizeHtml(validatedData.useCase) : undefined,
      uniquePoints: validatedData.uniquePoints ? sanitizeHtml(validatedData.uniquePoints) : undefined,
      futureIdeas: validatedData.futureIdeas ? sanitizeHtml(validatedData.futureIdeas) : undefined,
      // カスタムセクションのサニタイズ
      customSections: validatedData.customSections?.map(section => ({
        ...section,
        title: sanitizeHtml(section.title),
        content: sanitizeHtml(section.content)
      })),
    };

    // undefinedフィールドを除去してFirestoreに投稿を保存
    const cleanSanitizedData = Object.fromEntries(
      Object.entries(sanitizedData).filter(([_, value]) => value !== undefined)
    );
    
    const postData = {
      ...cleanSanitizedData,
      authorId: uid,
      authorUsername: userProfile.username || userProfile.displayName || '匿名ユーザー',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes: 0,
      views: 0,
      isPublic: true,
    };

    // 明示的にDocumentReferenceを作成
    const newPostRef = doc(collection(db, 'posts'));
    await setDoc(newPostRef, postData);

    return createSuccessResponse({
      id: newPostRef.id,
      message: '投稿が作成されました'
    }, '投稿が作成されました', 201);

  } catch (error: any) {
    console.error('Posts POST Error:', error);
    
    // Firebase Admin認証エラーのハンドリング
    if (error.code?.startsWith('auth/')) {
      return createErrorResponse('unauthorized', '認証に失敗しました', 401);
    }

    // Firestoreエラーのマッピング
    const mappedError = mapFirestoreError(error);
    return createErrorResponse(
      mappedError.code, 
      mappedError.message
    );
  }
}
