import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  getDoc,
  doc,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { Post } from '@/types/Post';
import { UserProfile } from '@/types/User';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  
  try {
    if (!publicId) {
      return NextResponse.json(
        { error: "Public ID is required" },
        { status: 400 }
      );
    }

    // ページネーション用クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const lastCreatedAt = searchParams.get('lastCreatedAt');
    const lastDocId = searchParams.get('lastDocId');

    const profilesRef = collection(db, 'userProfiles');
    const profileQuery = query(
      profilesRef,
      where('publicId', '==', publicId),
      limit(1)
    );
    const profileSnapshot = await getDocs(profileQuery);
    
    if (profileSnapshot.empty) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const profileDoc = profileSnapshot.docs[0];
    const profileData = profileDoc.data();
    
    // 削除されたユーザーの場合は404を返す
    if (profileData.isDeleted) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    const profile = {
      id: profileDoc.id,
      ...profileData,
      createdAt: profileData.createdAt?.toDate?.() || null,
      updatedAt: profileData.updatedAt?.toDate?.() || null,
    } as UserProfile;

    const userId = profile.uid || profile.id;

    let posts: Post[] = [];
    
    try {
      // 最適化されたクエリ：正しい順序、高速、ページネーション対応
      const postsRef = collection(db, 'posts');
      
      // 一時的にインデックス不要なクエリに変更（動作確認用）
      let postsQuery = query(
        postsRef,
        where('authorId', '==', userId),
        where('isPublic', '==', true),
        limit(20)
      );
      
      const postsSnapshot = await getDocs(postsQuery);
      // 投稿データをマッピングしてお気に入り数を動的に計算
      posts = await Promise.all(
        postsSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          
          // 削除された投稿をスキップ
          if (data.isDeleted === true) {
            return null;
          }
          
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
          
          const result = {
            id: doc.id,
            favoriteCount: actualFavoriteCount, // 実際のお気に入り数で上書き
            ...convertedData,
          };
          
          // デバッグ: サムネイル情報をログ出力
          console.log('Profile API Post Debug:', {
            postId: doc.id,
            title: result.title,
            thumbnail: result.thumbnail,
            hasThumbnail: !!result.thumbnail,
            thumbnailLength: result.thumbnail?.length,
            originalThumbnail: data.thumbnail,
            allFields: Object.keys(data)
          });
          
          return result;
        })
      );

      // nullの投稿（削除された投稿）をフィルタリング
      posts = posts.filter(post => post !== null)
        // 一時的にクライアント側ソートを復活（インデックス作成まで）
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
    } catch (postsError) {
      console.error('Posts fetch error:', postsError);
      posts = [];
    }

    // プライバシー設定に応じて情報をフィルタリング
    const publicProfile = {
      uid: profile.uid || profile.id,
      username: profile.username,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      coverImage: profile.coverImage,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      twitter: profile.twitter,
      github: profile.github,
      email: profile.showEmail ? profile.email : null,
      publicId: profile.publicId,
      createdAt: profile.createdAt,
      isVerified: profile.isVerified,
      badges: profile.badges || [],
    };

    const filteredPosts = posts.filter(post => post.status === 'published' || !post.status);

    return NextResponse.json({
      success: true,
      data: {
        profile: publicProfile,
        posts: filteredPosts
      }
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch user profile",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}