import { Timestamp } from 'firebase/firestore';

export type FirebaseDate = Date | Timestamp | string;

/**
 * Firebaseの日付データを安全にDate型に変換
 */
export const toSafeDate = (date: FirebaseDate | null | undefined): Date | null => {
  if (!date) return null;
  
  try {
    if (date instanceof Date) {
      return date;
    }
    
    if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to convert date:', date, error);
    return null;
  }
};

/**
 * 日付の差を日数で計算
 */
export const getDaysDifference = (date: FirebaseDate | null | undefined): number => {
  const safeDate = toSafeDate(date);
  if (!safeDate) return Infinity;
  
  return (Date.now() - safeDate.getTime()) / (1000 * 60 * 60 * 24);
};