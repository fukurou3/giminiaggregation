import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AIクライアント設定
 * モデルやAPIキーの切り替えはここで完結
 */
export class AIClient {
  private genai: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = "gemma-3n-e4b-it") {
    this.genai = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  /**
   * テキスト生成を実行（コスト制御付き）
   */
  async generateText(prompt: string): Promise<string> {
    const model = this.genai.getGenerativeModel({ 
      model: this.modelName,
      generationConfig: {
        maxOutputTokens: 256,      // 出力トークン数制限（コスト制御）
        temperature: 0.3,          // 一貫性重視の低温度設定
        topP: 0.8,                 // 適度な多様性
        topK: 40,                  // トークン選択の範囲制限
      },
    });
    
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  }
}

/**
 * デフォルトAIクライアントのインスタンスを作成
 * 環境変数からAPIキーを取得
 */
export function createAIClient(): AIClient {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENAI_API_KEY is not configured");
  }
  return new AIClient(apiKey);
}