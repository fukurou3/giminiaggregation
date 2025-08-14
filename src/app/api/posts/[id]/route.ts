import { NextRequest } from 'next/server';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getClientIP
} from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { updateTagStats } from '@/lib/tags';
import { authenticateUser } from '@/app/api/_middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIP(request);
    
    if (!(await checkRateLimit(ip))) {
      return createErrorResponse(
        'rate_limited',
        'リクエストが多すぎます。しばらく待ってからお試しください',
        429
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const incrementViews = searchParams.get('incrementViews') === 'true';

    // 投稿を取得
    const postRef = doc(db, 'posts', id);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return createErrorResponse(
        'not_found',
        '投稿が見つかりません',
        404
      );
    }

    const rawData = postDoc.data();
    
    // Convert Firestore timestamps to ISO strings for client components
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

    const convertedData = convertTimestamps(rawData);
    const postData = { id, ...convertedData } as { id: string; isPublic?: boolean; views?: number; isDeleted?: boolean; [key: string]: unknown };

    // 削除された投稿をチェック
    if (postData.isDeleted) {
      return createErrorResponse(
        'not_found',
        '投稿が見つかりません',
        404
      );
    }

    // 公開投稿のみ表示
    if (!postData.isPublic) {
      return createErrorResponse(
        'forbidden',
        'この投稿は非公開です',
        403
      );
    }

    // 閲覧数を増加（リクエストされた場合）
    if (incrementViews) {
      // 投稿の閲覧数を更新（非同期）
      updateDoc(postRef, {
        views: increment(1)
      }).catch(error => {
        console.warn(`Failed to increment views for post ${id}:`, error);
      });

      // タグの閲覧数を更新（非同期）
      if (postData.tagIds && Array.isArray(postData.tagIds)) {
        postData.tagIds.forEach((tagId: string) => {
          updateTagStats(tagId, { views: 1 }).catch(error => {
            console.warn(`Failed to update tag views for ${tagId}:`, error);
          });
        });
      }

      // レスポンス用にビュー数を事前に増やす
      postData.views = (postData.views || 0) + 1;
    }

    return createSuccessResponse(
      postData,
      '投稿を取得しました'
    );

  } catch (error) {
    console.error('Post fetch error:', error);
    
    return createErrorResponse(
      'server_error',
      '投稿の取得に失敗しました',
      500
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const { user } = await authenticateUser(request);
    if (!user) {
      return createErrorResponse(
        'unauthorized',
        'ログインが必要です',
        401
      );
    }

    const { id } = await params;
    
    // 投稿を取得
    const postRef = doc(db, 'posts', id);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      return createErrorResponse(
        'not_found',
        '投稿が見つかりません',
        404
      );
    }

    const postData = postDoc.data();
    
    // 投稿の作成者かチェック
    if (postData.authorId !== user.uid) {
      return createErrorResponse(
        'forbidden',
        'この投稿を編集する権限がありません',
        403
      );
    }

    // リクエストボディを解析
    const body = await request.json();
    const { 
      title, 
      description, 
      url, 
      categoryId, 
      customCategory,
      problemBackground,
      useCase,
      uniquePoints,
      futureIdeas,
      tagIds,
      thumbnail,
      prImages,
      customSections,
      acceptInterview
    } = body;

    // バリデーション
    if (!title?.trim()) {
      return createErrorResponse(
        'bad_request',
        'タイトルを入力してください',
        400
      );
    }

    if (!description?.trim()) {
      return createErrorResponse(
        'bad_request',
        '作品概要を入力してください',
        400
      );
    }

    if (!url?.trim()) {
      return createErrorResponse(
        'bad_request',
        '作品URLを入力してください',
        400
      );
    }

    // URL形式チェック
    try {
      new URL(url);
    } catch {
      return createErrorResponse(
        'bad_request',
        '有効なURLを入力してください',
        400
      );
    }

    // 更新データを構築
    const updateData: any = {
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      categoryId: categoryId || '',
      customCategory: customCategory?.trim() || '',
      updatedAt: serverTimestamp()
    };

    // 画像フィールドを追加（存在する場合）
    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail;
    }
    if (prImages !== undefined) {
      updateData.prImages = prImages;
    }
    if (tagIds !== undefined) {
      updateData.tagIds = tagIds;
    }
    if (customSections !== undefined) {
      updateData.customSections = customSections;
    }
    if (acceptInterview !== undefined) {
      updateData.acceptInterview = acceptInterview;
    }

    // オプションフィールドを追加
    if (problemBackground !== undefined) {
      updateData.problemBackground = problemBackground?.trim() || '';
    }
    if (useCase !== undefined) {
      updateData.useCase = useCase?.trim() || '';
    }
    if (uniquePoints !== undefined) {
      updateData.uniquePoints = uniquePoints?.trim() || '';
    }
    if (futureIdeas !== undefined) {
      updateData.futureIdeas = futureIdeas?.trim() || '';
    }

    // Firestoreを更新
    await updateDoc(postRef, updateData);

    return createSuccessResponse(
      { id, ...updateData },
      '投稿を更新しました'
    );

  } catch (error) {
    console.error('Post update error:', error);
    
    return createErrorResponse(
      'server_error',
      '投稿の更新に失敗しました',
      500
    );
  }
}