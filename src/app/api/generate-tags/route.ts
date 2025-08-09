import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TagGenerationService } from "@/lib/ai/service";

const bodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  max: z.number().int().min(1).max(10).optional().default(5),
  locale: z.enum(["ja", "en"]).optional().default("ja"),
  existingTags: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    // リクエストをバリデーション
    const validatedData = bodySchema.parse(await req.json());
    
    // タグ生成サービスを呼び出し
    const result = await TagGenerationService.generateTags(validatedData);
    
    return NextResponse.json(result);
    
  } catch (error: unknown) {
    console.error("Generate tags API error:", error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "タグ生成に失敗しました" }, 
      { status: 400 }
    );
  }
}