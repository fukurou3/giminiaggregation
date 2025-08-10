// 画像アップロード専用のロガー

interface LogContext {
  userId?: string;
  fileName?: string;
  fileSize?: number;
  uploadId?: string;
  sessionId?: string;
  timestamp?: string;
}

interface UploadMetrics {
  uploadStartTime: number;
  processingStartTime?: number;
  processingEndTime?: number;
  uploadEndTime?: number;
  retryCount: number;
  fileSize: number;
  processingTime?: number;
  uploadTime?: number;
  totalTime?: number;
}

export class UploadLogger {
  private static instance: UploadLogger;
  private metrics: Map<string, UploadMetrics> = new Map();
  private sessionId: string;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  static getInstance(): UploadLogger {
    if (!UploadLogger.instance) {
      UploadLogger.instance = new UploadLogger();
    }
    return UploadLogger.instance;
  }

  /**
   * 構造化ログの出力
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context: LogContext = {}): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
      component: 'ImageUploader',
      ...context
    };

    if (process.env.NODE_ENV === 'development') {
      const colors = {
        info: '\x1b[36m', // Cyan
        warn: '\x1b[33m', // Yellow  
        error: '\x1b[31m', // Red
        debug: '\x1b[90m', // Gray
      };
      const reset = '\x1b[0m';
      
      console.log(`${colors[level]}[${level.toUpperCase()}] ${message}${reset}`, context);
    } else {
      // 本番環境では構造化ログとして出力
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * アップロード開始をログ
   */
  logUploadStart(uploadId: string, fileName: string, fileSize: number, userId: string): void {
    this.log('info', 'Upload started', {
      uploadId,
      fileName,
      fileSize,
      userId,
    });

    this.metrics.set(uploadId, {
      uploadStartTime: Date.now(),
      retryCount: 0,
      fileSize,
    });
  }

  /**
   * 画像処理開始をログ
   */
  logProcessingStart(uploadId: string): void {
    const metrics = this.metrics.get(uploadId);
    if (metrics) {
      metrics.processingStartTime = Date.now();
      this.log('debug', 'Image processing started', { uploadId });
    }
  }

  /**
   * 画像処理完了をログ
   */
  logProcessingEnd(uploadId: string): void {
    const metrics = this.metrics.get(uploadId);
    if (metrics && metrics.processingStartTime) {
      metrics.processingEndTime = Date.now();
      metrics.processingTime = metrics.processingEndTime - metrics.processingStartTime;
      
      this.log('debug', 'Image processing completed', {
        uploadId,
        processingTime: metrics.processingTime,
      });
    }
  }

  /**
   * リトライをログ
   */
  logRetry(uploadId: string, attempt: number, error: Error): void {
    const metrics = this.metrics.get(uploadId);
    if (metrics) {
      metrics.retryCount = attempt;
    }

    this.log('warn', 'Upload retry attempted', {
      uploadId,
      attempt,
      error: error.message,
      retryCount: attempt,
    });
  }

  /**
   * アップロード成功をログ
   */
  logUploadSuccess(uploadId: string, downloadUrl: string): void {
    const metrics = this.metrics.get(uploadId);
    if (metrics) {
      metrics.uploadEndTime = Date.now();
      metrics.uploadTime = metrics.uploadEndTime - (metrics.processingEndTime || metrics.uploadStartTime);
      metrics.totalTime = metrics.uploadEndTime - metrics.uploadStartTime;

      this.log('info', 'Upload completed successfully', {
        uploadId,
        downloadUrl,
        totalTime: metrics.totalTime,
        uploadTime: metrics.uploadTime,
        processingTime: metrics.processingTime,
        retryCount: metrics.retryCount,
        fileSize: metrics.fileSize,
      });

      // メトリクス送信（本番環境では監視システムに送信）
      this.sendMetrics(uploadId, metrics, true);
    }
  }

  /**
   * アップロード失敗をログ
   */
  logUploadFailure(uploadId: string, error: Error, context: LogContext = {}): void {
    const metrics = this.metrics.get(uploadId);
    const totalTime = metrics ? Date.now() - metrics.uploadStartTime : 0;

    this.log('error', 'Upload failed', {
      uploadId,
      error: error.message,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      totalTime,
      retryCount: metrics?.retryCount || 0,
      ...context,
    });

    if (metrics) {
      this.sendMetrics(uploadId, metrics, false);
    }
  }

  /**
   * バリデーション失敗をログ
   */
  logValidationFailure(fileName: string, errors: readonly string[], userId?: string): void {
    this.log('warn', 'File validation failed', {
      fileName,
      userId,
      validationErrors: errors,
    });
  }

  /**
   * セキュリティ違反をログ
   */
  logSecurityViolation(fileName: string, issues: readonly string[], userId?: string): void {
    this.log('error', 'Security violation detected', {
      fileName,
      userId,
      securityIssues: issues,
      severity: 'HIGH',
    });
  }

  /**
   * パフォーマンスメトリクスをログ
   */
  logPerformanceMetrics(uploadId: string, webWorkerUsed: boolean, concurrentUploads: number): void {
    this.log('debug', 'Performance metrics', {
      uploadId,
      webWorkerUsed,
      concurrentUploads,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType,
    });
  }

  /**
   * ユーザーアクションをログ
   */
  logUserAction(action: string, context: LogContext = {}): void {
    this.log('info', `User action: ${action}`, context);
  }

  /**
   * メトリクス送信（本番環境では監視システムに送信）
   */
  private sendMetrics(uploadId: string, metrics: UploadMetrics, success: boolean): void {
    if (process.env.NODE_ENV === 'production') {
      // 実際の監視システム（例：DataDog, New Relic, CloudWatch）に送信
      const metricsData = {
        uploadId,
        success,
        totalTime: metrics.totalTime,
        processingTime: metrics.processingTime,
        uploadTime: metrics.uploadTime,
        fileSize: metrics.fileSize,
        retryCount: metrics.retryCount,
        timestamp: Date.now(),
      };

      // 実装例：
      // analytics.track('upload_completed', metricsData);
      console.log('Metrics sent:', metricsData);
    }

    // メトリクスをクリーンアップ
    this.metrics.delete(uploadId);
  }

  /**
   * エラーレポートの生成
   */
  generateErrorReport(uploadId: string, error: Error): object {
    const metrics = this.metrics.get(uploadId);
    
    return {
      uploadId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      metrics: metrics ? {
        totalTime: metrics.uploadEndTime ? metrics.uploadEndTime - metrics.uploadStartTime : Date.now() - metrics.uploadStartTime,
        retryCount: metrics.retryCount,
        fileSize: metrics.fileSize,
      } : null,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * セッション統計の取得
   */
  getSessionStats(): object {
    return {
      sessionId: this.sessionId,
      activeUploads: this.metrics.size,
      sessionStartTime: this.sessionId.split('_')[1],
    };
  }
}