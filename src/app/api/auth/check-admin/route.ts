import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);
    
    return NextResponse.json({
      isAdmin: !!admin,
      email: admin?.email || null
    });
    
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { isAdmin: false, email: null },
      { status: 200 } // エラーでも200を返してクライアントサイドでハンドリング
    );
  }
}