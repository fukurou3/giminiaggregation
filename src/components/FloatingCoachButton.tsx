"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2, CheckCircle, AlertCircle, LogIn } from "lucide-react";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

interface FloatingCoachButtonProps {
  title: string;
  categoryId: string;
  tagIds: string[];
  overview: string;
  optional: {
    problem?: string;
    background?: string;
    scenes?: string;
    users?: string;
    differentiation?: string;
    extensions?: string;
  };
  appUrl?: string;
  onAdviceGenerated?: (advice: CoachResponse | null) => void;
}

interface CoachResponse {
  version: string;
  timestamp: string;
  advice: {
    refinedOverview: string;
    headlineIdeas: string[];
    goodPoints: string[];
  };
  questionnaire: Array<{
    field: "problem" | "background" | "scenes" | "users" | "differentiation" | "extensions";
    question: string;
  }>;
  retryAfter?: number;
}

export function FloatingCoachButton(props: FloatingCoachButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastGeneratedInput, setLastGeneratedInput] = useState<string>("");

  // 入力内容の品質チェック関数
  const isValidContent = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 5) return false;
    
    const repeatingPattern = /(.)\1{2,}/;
    if (repeatingPattern.test(trimmed)) return false;
    
    const hiraganaRepeating = /([あ-ん])\1{2,}/;
    if (hiraganaRepeating.test(trimmed)) return false;
    
    const meaningfulPattern = /[あ-ん]{3,}|(.)\1{2,}|\s+/g;
    const meaningfulChars = trimmed.replace(meaningfulPattern, '');
    return meaningfulChars.length >= 3;
  };

  // 入力内容のハッシュを生成（変化チェック用）
  const generateInputHash = () => {
    const input = {
      title: props.title.trim(),
      categoryId: props.categoryId.trim(),
      tagIds: props.tagIds.sort(), // タグの順序による影響を排除
      overview: props.overview.trim(),
      optional: props.optional,
      appUrl: props.appUrl?.trim(),
    };
    return JSON.stringify(input);
  };

  const currentInputHash = generateInputHash();
  const hasInputChanged = currentInputHash !== lastGeneratedInput;
  
  const canGenerate = props.title.trim().length > 0 && 
                     props.categoryId.trim().length > 0 &&
                     props.overview.trim().length >= 5 && 
                     isValidContent(props.overview) &&
                     hasInputChanged;

  // 再ログイン処理
  const handleReLogin = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthError(false);
      setError(null);
    } catch (error) {
      console.error("Re-login failed:", error instanceof Error ? error.constructor.name : 'UnknownError');
      setError("ログインに失敗しました");
    }
  };

  const handleExecute = async () => {
    if (!canGenerate || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAuthError(false);
    setSuccess(false);

    // タイムアウト制御
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 20000);

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken?.();
      
      if (!idToken) {
        setAuthError(true);
        throw new Error("ログインが必要です");
      }

      const requestBody = {
        title: props.title.trim(),
        categoryId: props.categoryId.trim(),
        tagIds: props.tagIds,
        overview: props.overview.trim(),
        optional: props.optional,
        appUrl: props.appUrl?.trim(),
        locale: "ja",
      };

      console.log("Coach draft request:", requestBody);

      const response = await fetch("/api/coach-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          const waitTime = errorData.retryAfter || 60;
          throw new Error(`制限中 ${waitTime}秒待機`);
        } else if (response.status === 401) {
          setAuthError(true);
          throw new Error("再ログインが必要");
        }
        throw new Error("生成失敗");
      }

      const data: CoachResponse = await response.json();
      setSuccess(true);
      setLastGeneratedInput(currentInputHash); // 最後に生成した入力を記録
      props.onAdviceGenerated?.(data);
      
      // 3秒後に成功状態をリセット（アドバイス表示は保持）
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      const errorType = err instanceof DOMException ? err.name : 
                       err instanceof Error ? err.constructor.name : 'UnknownError';
      console.error("Coach advice error type:", errorType);
      
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError("タイムアウト");
      } else {
        setError(err instanceof Error ? err.message : "エラー発生");
      }
      
      // エラーを3秒後に自動クリア
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  // ボタンの状態とスタイルを決定
  const getButtonState = () => {
    if (isLoading) {
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        text: "生成中...",
        className: "bg-blue-500 text-white border-blue-600",
        disabled: true
      };
    }
    
    if (success) {
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        text: "完了！",
        className: "bg-green-500 text-white border-green-600",
        disabled: false
      };
    }
    

    
    if (error) {
      return {
        icon: authError ? <LogIn className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />,
        text: error,
        className: "bg-red-500 text-white border-red-600",
        disabled: false
      };
    }
    
    if (!canGenerate) {
      const baseCondition = props.title.trim().length === 0 || 
                           props.categoryId.trim().length === 0 ||
                           props.overview.trim().length < 5 || 
                           !isValidContent(props.overview);
      
      if (baseCondition) {
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          text: "AIアドバイス",
          className: "bg-gray-200 text-gray-400 opacity-50 border-gray-300 cursor-not-allowed",
          disabled: true
        };
      } else {
        // 入力条件は満たすが変化がない場合
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          text: "変化なし",
          className: "bg-gray-400 text-white opacity-75 border-gray-500 cursor-not-allowed",
          disabled: true
        };
      }
    }
    
    return {
      icon: <MessageSquare className="h-5 w-5" />,
      text: "AIアドバイス",
      className: "bg-white text-black hover:bg-gray-50 border-gray-300",
      disabled: false
    };
  };

  const buttonState = getButtonState();

  const handleClick = () => {
    if (authError) {
      handleReLogin();
    } else {
      handleExecute();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={buttonState.disabled}
      className={`fixed bottom-6 right-6 px-4 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 z-50 border ${buttonState.className}`}
      title={
        !canGenerate ? (
          props.title.trim().length === 0 || props.categoryId.trim().length === 0 || props.overview.trim().length < 5 || !isValidContent(props.overview)
            ? "タイトル、カテゴリ、作品概要（5文字以上）を入力してください"
            : "入力内容に変化がないため無効"
        ) :
        authError ? "クリックして再ログイン" :
        "AIからアドバイスをもらう"
      }
    >
      {buttonState.icon}
      <span className="text-sm font-medium">{buttonState.text}</span>
    </button>
  );
}