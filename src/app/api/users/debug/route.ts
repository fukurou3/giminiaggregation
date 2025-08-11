import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // 最初の10個のユーザープロフィールを取得
    const profilesRef = collection(db, 'userProfiles');
    const profilesSnapshot = await getDocs(profilesRef);
    
    const profiles = profilesSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    console.log('Debug: Found', profiles.length, 'profiles');
    profiles.forEach((profile, index) => {
      console.log(`Profile ${index + 1}:`, {
        id: profile.id,
        publicId: profile.data.publicId,
        username: profile.data.username,
        uid: profile.data.uid
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        count: profiles.length,
        profiles: profiles.slice(0, 5) // 最初の5個だけ返す
      }
    });

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Debug API failed" 
      },
      { status: 500 }
    );
  }
}