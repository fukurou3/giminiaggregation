import { useState, useEffect, useCallback } from 'react';
import { isValidShareURL } from '@/lib/validators/urlValidator';

export interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  status: 'idle' | 'validating' | 'valid' | 'invalid_format' | 'not_found' | 'not_accessible' | 'timeout' | 'server_error' | 'rate_limited';
  message: string;
  ogpData?: {
    title?: string;
    description?: string;
    image?: string;
  };
}

export function useUrlValidation(url: string, debounceMs: number = 500) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    status: 'idle',
    message: ''
  });

  const validateUrl = useCallback(async (urlToValidate: string) => {
    // 空の URL の場合はリセット
    if (!urlToValidate.trim()) {
      setValidationState({
        isValidating: false,
        isValid: null,
        status: 'idle',
        message: ''
      });
      return;
    }

    // フロント側での形式チェック
    if (!isValidShareURL(urlToValidate)) {
      setValidationState({
        isValidating: false,
        isValid: false,
        status: 'invalid_format',
        message: 'Gemini共有リンクまたはChatGPT Canvas共有リンク形式ではありません'
      });
      return;
    }

    // サーバー側チェック開始
    setValidationState(prev => ({
      ...prev,
      isValidating: true,
      status: 'validating',
      message: '有効なリンクを確認中...'
    }));

    try {
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToValidate }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      setValidationState({
        isValidating: false,
        isValid: result.isValid,
        status: result.status,
        message: result.message,
        ogpData: result.ogpData
      });

    } catch (error) {
      console.error('URL validation error:', error);
      setValidationState({
        isValidating: false,
        isValid: false,
        status: 'server_error',
        message: '接続に失敗しました。ネットワークを確認してください'
      });
    }
  }, []);

  // デバウンス処理
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateUrl(url);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [url, debounceMs, validateUrl]);

  return {
    ...validationState,
    retry: () => validateUrl(url)
  };
}

// バリデーション状態に応じたUI表示用のヘルパー関数
export function getValidationStyle(status: ValidationState['status']) {
  switch (status) {
    case 'validating':
      return {
        borderColor: 'border-primary/50',
        iconColor: 'text-primary',
        bgColor: 'bg-primary/5'
      };
    case 'valid':
      return {
        borderColor: 'border-success',
        iconColor: 'text-success',
        bgColor: 'bg-success/5'
      };
    case 'invalid_format':
    case 'not_found':
    case 'not_accessible':
    case 'timeout':
    case 'server_error':
    case 'rate_limited':
      return {
        borderColor: 'border-error',
        iconColor: 'text-error',
        bgColor: 'bg-error/5'
      };
    default:
      return {
        borderColor: 'border-black',
        iconColor: 'text-muted-foreground',
        bgColor: 'bg-input'
      };
  }
}

export function getValidationIcon(status: ValidationState['status']) {
  switch (status) {
    case 'validating':
      return 'loading';
    case 'valid':
      return 'check';
    case 'invalid_format':
    case 'not_found':
    case 'not_accessible':
    case 'timeout':
    case 'server_error':
    case 'rate_limited':
      return 'x';
    default:
      return null;
  }
}