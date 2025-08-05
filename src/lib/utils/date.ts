import { TimestampLike } from '@/types/Timestamp';

export function formatDate(
  timestamp: TimestampLike | Date | number | string,
  options?: {
    includeYear?: boolean;
    monthFormat?: 'short' | 'long';
    fallback?: string;
  }
): string {
  const { includeYear = true, monthFormat = 'short', fallback = '' } = options || {};
  
  if (!timestamp) return fallback;
  
  try {
    let date: Date;
    
    if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp as Date | number | string);
    }
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: monthFormat,
      day: 'numeric',
    };
    
    if (includeYear) {
      formatOptions.year = 'numeric';
    }
    
    return date.toLocaleDateString('ja-JP', formatOptions);
  } catch {
    return fallback;
  }
}