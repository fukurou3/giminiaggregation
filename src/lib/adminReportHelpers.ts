import { ProcessingReason, ProcessingReasonMaster, AdminAction } from '@/types/AdminReport';

// 処理理由マスターデータ
export const processingReasonMasters: ProcessingReasonMaster[] = [
  {
    id: ProcessingReason.COMMUNITY_GUIDELINES_VIOLATION,
    label: 'コミュニティガイドライン違反',
    description: '利用規約やコミュニティガイドラインに違反するコンテンツ',
    defaultAction: AdminAction.CONTENT_HIDE,
    requiresCustomReason: false,
    policyReferences: ['第4条', '第5条']
  },
  {
    id: ProcessingReason.SPAM_CONTENT,
    label: 'スパムコンテンツ',
    description: '迷惑行為やスパム投稿',
    defaultAction: AdminAction.CONTENT_DELETE,
    requiresCustomReason: false,
    policyReferences: ['第3条2項']
  },
  {
    id: ProcessingReason.HARASSMENT_CONFIRMED,
    label: '嫌がらせ行為確認',
    description: '他ユーザーへの嫌がらせや攻撃的行為',
    defaultAction: AdminAction.USER_WARNING,
    requiresCustomReason: false,
    policyReferences: ['第4条1項', '第6条']
  },
  {
    id: ProcessingReason.INAPPROPRIATE_CONTENT_CONFIRMED,
    label: '不適切コンテンツ確認',
    description: '年齢制限やモラルに反するコンテンツ',
    defaultAction: AdminAction.CONTENT_HIDE,
    requiresCustomReason: false,
    policyReferences: ['第5条3項']
  },
  {
    id: ProcessingReason.FALSE_REPORT,
    label: '虚偽通報',
    description: '根拠のない悪意のある通報',
    defaultAction: AdminAction.NO_ACTION,
    requiresCustomReason: false,
    policyReferences: ['第8条']
  },
  {
    id: ProcessingReason.INSUFFICIENT_EVIDENCE,
    label: '証拠不十分',
    description: '通報内容を立証する証拠が不十分',
    defaultAction: AdminAction.NO_ACTION,
    requiresCustomReason: false,
    policyReferences: []
  },
  {
    id: ProcessingReason.DUPLICATE_REPORT,
    label: '重複通報',
    description: '同一案件の重複報告',
    defaultAction: AdminAction.NO_ACTION,
    requiresCustomReason: false,
    policyReferences: []
  },
  {
    id: ProcessingReason.RESOLVED_BY_USER,
    label: 'ユーザー間解決',
    description: '当事者間で問題が解決済み',
    defaultAction: AdminAction.NO_ACTION,
    requiresCustomReason: false,
    policyReferences: []
  },
  {
    id: ProcessingReason.CUSTOM,
    label: 'その他・カスタム',
    description: 'その他の理由（詳細説明が必要）',
    defaultAction: AdminAction.NO_ACTION,
    requiresCustomReason: true,
    policyReferences: []
  }
];

// 処理理由の日本語ラベル取得
export const getProcessingReasonLabel = (reason: ProcessingReason): string => {
  const master = processingReasonMasters.find(m => m.id === reason);
  return master?.label || reason;
};

// アクションの日本語ラベル取得
export const getAdminActionLabel = (action: AdminAction): string => {
  const labels: Record<AdminAction, string> = {
    [AdminAction.NO_ACTION]: '対応なし',
    [AdminAction.CONTENT_HIDE]: 'コンテンツ非表示',
    [AdminAction.CONTENT_DELETE]: 'コンテンツ削除',
    [AdminAction.USER_WARNING]: 'ユーザー警告',
    [AdminAction.USER_SUSPEND_1DAY]: '1日間停止',
    [AdminAction.USER_SUSPEND_3DAYS]: '3日間停止',
    [AdminAction.USER_SUSPEND_7DAYS]: '7日間停止',
    [AdminAction.USER_SUSPEND_30DAYS]: '30日間停止',
    [AdminAction.USER_BAN_PERMANENT]: '永久停止'
  };
  return labels[action] || action;
};

// 優先度の日本語ラベル取得
export const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    'critical': '緊急',
    'high': '高',
    'medium': '中',
    'low': '低'
  };
  return labels[priority] || priority;
};

// 通報タイプの日本語ラベル取得
export const getReportTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'post': '投稿',
    'comment': 'コメント',
    'profile': 'プロフィール',
    'user_behavior': 'ユーザー行動'
  };
  return labels[type] || type;
};

// ステータスの日本語ラベル取得
export const getReportStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending': '未処理',
    'in_review': '確認中',
    'resolved': '解決済み',
    'rejected': '却下',
    'escalated': 'エスカレート'
  };
  return labels[status] || status;
};

// 通報理由の日本語ラベル取得
export const getReportReasonLabel = (reason: string): string => {
  const labels: Record<string, string> = {
    'harassment': 'ハラスメント',
    'spam': 'スパム',
    'inappropriate_content': '不適切なコンテンツ',
    'violence_threats': '暴力・脅迫',
    'hate_speech': 'ヘイトスピーチ',
    'impersonation': 'なりすまし',
    'privacy_violation': 'プライバシー侵害',
    'copyright': '著作権侵害',
    'scam_fraud': '詐欺・悪質商法',
    'other': 'その他'
  };
  return labels[reason] || reason;
};

// アクションの重要度スコア（重い処理ほど高いスコア）
export const getActionSeverityScore = (action: AdminAction): number => {
  const scores: Record<AdminAction, number> = {
    [AdminAction.NO_ACTION]: 0,
    [AdminAction.USER_WARNING]: 1,
    [AdminAction.CONTENT_HIDE]: 2,
    [AdminAction.CONTENT_DELETE]: 3,
    [AdminAction.USER_SUSPEND_1DAY]: 4,
    [AdminAction.USER_SUSPEND_3DAYS]: 5,
    [AdminAction.USER_SUSPEND_7DAYS]: 6,
    [AdminAction.USER_SUSPEND_30DAYS]: 7,
    [AdminAction.USER_BAN_PERMANENT]: 10
  };
  return scores[action] || 0;
};

// 推奨アクション提案
export const getRecommendedAction = (
  reportType: string,
  reason: string,
  targetUserViolationCount: number = 0
): AdminAction => {
  // 初回違反の場合
  if (targetUserViolationCount === 0) {
    switch (reason) {
      case 'harassment':
      case 'hate_speech':
        return AdminAction.USER_WARNING;
      case 'spam':
        return AdminAction.CONTENT_DELETE;
      case 'inappropriate_content':
        return AdminAction.CONTENT_HIDE;
      default:
        return AdminAction.USER_WARNING;
    }
  }

  // 複数回違反の場合
  if (targetUserViolationCount >= 3) {
    return AdminAction.USER_SUSPEND_7DAYS;
  } else if (targetUserViolationCount >= 2) {
    return AdminAction.USER_SUSPEND_3DAYS;
  } else {
    return AdminAction.USER_SUSPEND_1DAY;
  }
};

// 処理履歴のサマリー生成
export const generateProcessingSummary = (
  action: AdminAction,
  reason: ProcessingReason,
  customReason?: string
): string => {
  const actionLabel = getAdminActionLabel(action);
  const reasonLabel = getProcessingReasonLabel(reason);
  
  if (reason === ProcessingReason.CUSTOM && customReason) {
    return `${actionLabel} - ${customReason}`;
  }
  
  return `${actionLabel} - ${reasonLabel}`;
};