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
  doc
} from 'firebase/firestore';
import { Post } from '@/types/Post';
import { UserProfile } from '@/types/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  console.log('Profile API called with publicId:', params.publicId);
  
  try {
    const { publicId } = params;

    if (!publicId) {
      return NextResponse.json(
        { error: "Public ID is required" },
        { status: 400 }
      );
    }

    // publicIdでユーザープロフィールを検索
    console.log('Searching for profile with publicId:', publicId);
    
    let profilesRef, profileQuery, profileSnapshot;
    
    try {
      console.log('Step 1: Creating collection reference...');
      profilesRef = collection(db, 'userProfiles');
      console.log('Step 1: Success');
      
      console.log('Step 2: Creating query...');
      profileQuery = query(
        profilesRef,
        where('publicId', '==', publicId),
        limit(1)
      );
      console.log('Step 2: Success');
      
      console.log('Step 3: Executing query...');
      profileSnapshot = await getDocs(profileQuery);
      console.log('Step 3: Success');
    } catch (queryError) {
      console.error('Query error:', queryError);
      throw new Error(`Database query failed: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
    }
    console.log('Profile query result - empty:', profileSnapshot.empty);
    console.log('Profile query result - size:', profileSnapshot.size);
    
    if (profileSnapshot.empty) {
      console.log('No profile found for publicId:', publicId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const profileDoc = profileSnapshot.docs[0];
    const profile = {
      id: profileDoc.id,
      ...profileDoc.data(),
      createdAt: profileDoc.data().createdAt?.toDate?.() || null,
      updatedAt: profileDoc.data().updatedAt?.toDate?.() || null,
    } as UserProfile;

    const userId = profile.uid;
    console.log('Step 4: Getting user posts for userId:', userId);

    // ユーザーの投稿を取得
    let postsSnapshot;
    try {
      const postsRef = collection(db, 'posts');
      const postsQuery = query(
        postsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      postsSnapshot = await getDocs(postsQuery);
      console.log('Step 4: Posts query success, found', postsSnapshot.size, 'posts');
    } catch (postsError) {
      console.error('Posts query error:', postsError);
      // 投稿の取得に失敗してもプロフィール表示は継続
      postsSnapshot = { docs: [] };
    }
    const posts: Post[] = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    } as Post));

    // ユーザーのお気に入りを取得
    console.log('Step 5: Getting user favorites for userId:', userId);
        let favorites: Post[] = [];
    try {
      const favoritesRef = collection(db, 'users', userId, 'favorites');
      const favoritesSnapshot = await getDocs(favoritesRef);
      console.log('Step 5: Favorites query success, found', favoritesSnapshot.size, 'favorites');
      
      const favoritePostIds = favoritesSnapshot.docs.map(doc => doc.id);
      
      // お気に入りの投稿詳細を取得
      console.log('Step 6: Getting favorite post details...');
      for (const postId of favoritePostIds) {
        try {
      const postDoc = await getDoc(doc(db, 'posts', postId));
      if (postDoc.exists()) {
        favorites.push({
          id: postDoc.id,
          ...postDoc.data(),
          createdAt: postDoc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: postDoc.data().updatedAt?.toDate?.() || new Date(),
        } as Post);
          }
        } catch (postError) {
          console.error(`Error getting post ${postId}:`, postError);
          // 個別の投稿取得エラーは継続
        }
      }
      console.log('Step 6: Favorite posts processed, got', favorites.length, 'posts');
    } catch (favoritesError) {
      console.error('Favorites query error:', favoritesError);
      // お気に入りの取得に失敗してもプロフィール表示は継続
      favorites = [];
    }

    // 統計情報を計算
    console.log('Step 7: Calculating stats...');
    const stats = {
      totalPosts: posts.length,
      totalFavorites: favorites.length,
      totalViews: posts.reduce((sum, post) => sum + (post.views || 0), 0),
    };
    console.log('Step 7: Stats calculated:', stats);

    // プライバシー設定に応じて情報をフィルタリング
    const publicProfile = {
      uid: profile.uid,
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

    console.log('Step 8: Creating response...');
    console.log('Public profile created:', Object.keys(publicProfile));
    
    const filteredPosts = posts.filter(post => post.status === 'published' || !post.status);
    const filteredFavorites = favorites.filter(fav => fav.status === 'published' || !fav.status);
    
    console.log('Step 8: Filtered posts:', filteredPosts.length, '/', posts.length);
    console.log('Step 8: Filtered favorites:', filteredFavorites.length, '/', favorites.length);

    return NextResponse.json({
      success: true,
      data: {
        profile: publicProfile,
        posts: filteredPosts,
        favorites: filteredFavorites,
        stats
      }
    });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      publicId
    });
    
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