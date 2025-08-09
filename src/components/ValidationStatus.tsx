import React from 'react';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { getValidationStyle, getValidationIcon, ValidationState } from '@/hooks/useUrlValidation';

interface ValidationStatusProps {
  status: ValidationState['status'];
  message: string;
  onRetry?: () => void;
  ogpData?: {
    title?: string;
    description?: string;
    image?: string;
  };
  showInputIcon?: boolean;
}

export function ValidationStatus({ 
  status, 
  message, 
  onRetry,
  ogpData,
  showInputIcon = false 
}: ValidationStatusProps) {
  const iconType = getValidationIcon(status);
  const styles = getValidationStyle(status);

  // Input field icon (for the input field itself)
  const renderInputIcon = () => {
    if (!showInputIcon || !iconType) return null;

    return (
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        {iconType === 'loading' && (
          <Loader2 className={`h-5 w-5 animate-spin ${styles.iconColor}`} />
        )}
        {iconType === 'check' && (
          <Check className={`h-5 w-5 ${styles.iconColor}`} />
        )}
        {iconType === 'x' && (
          <X className={`h-5 w-5 ${styles.iconColor}`} />
        )}
      </div>
    );
  };

  // Message display
  const renderMessage = () => {
    if (!message) return null;

    return (
      <div className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${styles.bgColor}`}>
        {status === 'valid' && <Check className="h-4 w-4 text-success flex-shrink-0" />}
        {(status === 'invalid_format' || status === 'not_found' || 
          status === 'not_accessible' || status === 'timeout' || 
          status === 'server_error' || status === 'rate_limited') && (
          <AlertCircle className="h-4 w-4 text-error flex-shrink-0" />
        )}
        {status === 'validating' && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
        <span className={
          status === 'valid' ? 'text-success' :
          status === 'validating' ? 'text-primary' :
          'text-error'
        }>
          {message}
        </span>
        {status === 'timeout' && onRetry && (
          <button 
            type="button"
            onClick={onRetry}
            className="text-primary hover:text-primary/80 text-xs underline ml-auto"
          >
            再試行
          </button>
        )}
      </div>
    );
  };

  // OGP data display (for valid URLs)
  const renderOgpData = () => {
    if (!ogpData?.title) return null;

    return (
      <div className="mt-2 p-3 bg-success/5 border border-success/20 rounded text-sm">
        <p className="font-medium text-success">✅ 有効なCanvasが見つかりました</p>
        {ogpData.title && (
          <p className="text-muted-foreground mt-1">
            <strong>タイトル:</strong> {ogpData.title}
          </p>
        )}
        {ogpData.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2">
            <strong>説明:</strong> {ogpData.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      {renderInputIcon()}
      {renderMessage()}
      {renderOgpData()}
    </>
  );
}