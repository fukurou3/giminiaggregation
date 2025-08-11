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
    const profile = {
      id: profileDoc.id,
      ...profileDoc.data(),
      createdAt: profileDoc.data().createdAt?.toDate?.() || null,
      updatedAt: profileDoc.data().updatedAt?.toDate?.() || null,
    } as UserProfile;

    const userId = profile.uid || profile.id;

    let posts: Post[] = [];
    
    try {
      const postsResponse = await fetch(`${request.nextUrl.origin}/api/users/${userId}/posts`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        posts = postsData.data?.posts || [];
      } else {
        const postsRef = collection(db, 'posts');
        const postsQuery = query(
          postsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const postsSnapshot = await getDocs(postsQuery);
        posts = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        } as Post));
      }
    } catch (postsError) {
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