import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    // 全ユーザープロフィールを取得
    const profilesRef = collection(db, 'userProfiles');
    const profilesSnapshot = await getDocs(profilesRef);
    
    const updates: Promise<void>[] = [];
    let updatedCount = 0;

    // publicIdが空または存在しないプロフィールを更新
    profilesSnapshot.docs.forEach(profileDoc => {
      const data = profileDoc.data();
      
      if (!data.publicId || data.publicId === '') {
        // ランダムなpublicIdを生成
        const generatePublicId = () => {
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          let result = '';
          for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return result;
        };

        const newPublicId = generatePublicId();
        console.log(`Updating profile ${profileDoc.id} with publicId: ${newPublicId}`);
        
        updates.push(
          updateDoc(doc(db, 'userProfiles', profileDoc.id), {
            publicId: newPublicId,
            updatedAt: new Date()
          })
        );
        updatedCount++;
      }
    });

    // 全ての更新を実行
    await Promise.all(updates);
    
    console.log(`Migration completed. Updated ${updatedCount} profiles.`);

    return NextResponse.json({
      success: true,
      data: {
        totalProfiles: profilesSnapshot.size,
        updatedCount
      }
    });

  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Migration failed" 
      },
      { status: 500 }
    );
  }
}