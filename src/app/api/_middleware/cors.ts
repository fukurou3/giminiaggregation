import { NextResponse } from "next/server";

/**
 * 共通CORS設定
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.NEXT_PUBLIC_APP_URL || 'same-origin',
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "X-API-Version": "1.0",
};

/**
 * OPTIONS リクエスト処理（CORS プリフライト）
 */
export function handleOptions() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * 許可されていないHTTPメソッドのレスポンス
 */
export function handleMethodNotAllowed() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { ...corsHeaders, "Allow": "POST" } }
  );
}