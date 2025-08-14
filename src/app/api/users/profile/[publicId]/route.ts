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
      posts = postsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // 削除された投稿をスキップ
        if (data.isDeleted === true) {
          return null;
        }
        
        return {
          id: doc.id,
          title: data.title || '',
          url: data.url || '',
          description: data.description || '',
          tags: data.tags || [],
          tagIds: data.tagIds || [],
          category: data.category || 'その他',
          categoryId: data.categoryId || 'other',
          customCategory: data.customCategory || undefined,
          thumbnailUrl: data.thumbnailUrl || '',
          authorId: data.authorId || '',
          authorUsername: data.authorUsername || '匿名ユーザー',
          authorPublicId: data.authorPublicId || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || undefined,
          likes: data.likes || 0,
          favoriteCount: data.favoriteCount || 0, // TODO: シャードから取得するように修正が必要
          views: data.views || 0,
          featured: data.featured || false,
          isPublic: data.isPublic !== false,
          ogpTitle: data.ogpTitle || null,
          ogpDescription: data.ogpDescription || null,
          ogpImage: data.ogpImage || null,
        } as Post;
      })
      .filter(post => post !== null) // 削除された投稿を除外
      // 一時的にクライアント側ソートを復活（インデックス作成まで）
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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