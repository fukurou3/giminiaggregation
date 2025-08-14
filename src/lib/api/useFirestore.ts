'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  QueryConstraint,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirestoreState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseFirestoreQueryOptions {
  enabled?: boolean;
}

export function useFirestoreDocument<T>(
  collectionName: string,
  documentId: string | null,
  options: UseFirestoreQueryOptions = {}
): FirestoreState<T> {
  const { enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!documentId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const rawData = docSnap.data();
        
        // Convert Firestore timestamps to ISO strings for client components
        const convertTimestamps = (obj: any): any => {
          if (obj && typeof obj === 'object') {
            if (obj.toDate && typeof obj.toDate === 'function') {
              return obj.toDate().toISOString();
            }
            if (Array.isArray(obj)) {
              return obj.map(convertTimestamps);
            }
            const converted: any = {};
            for (const [key, value] of Object.entries(obj)) {
              converted[key] = convertTimestamps(value);
            }
            return converted;
          }
          return obj;
        };

        const convertedData = convertTimestamps(rawData);
        const docData = { id: docSnap.id, ...convertedData } as T;
        setData(docData);
      } else {
        setData(null);
        setError('ドキュメントが見つかりません');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
      setError(errorMessage);
      console.error('Firestore document fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId, enabled]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  return {
    data,
    loading,
    error,
    refetch: fetchDocument
  };
}

export function useFirestoreCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: UseFirestoreQueryOptions = {}
): FirestoreState<T[]> {
  const { enabled = true } = options;
  
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const collectionRef = collection(db, collectionName);
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      const querySnapshot = await getDocs(q);
      
      const results: T[] = [];
      
      // Convert Firestore timestamps to ISO strings for client components
      const convertTimestamps = (obj: any): any => {
        if (obj && typeof obj === 'object') {
          if (obj.toDate && typeof obj.toDate === 'function') {
            return obj.toDate().toISOString();
          }
          if (Array.isArray(obj)) {
            return obj.map(convertTimestamps);
          }
          const converted: any = {};
          for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertTimestamps(value);
          }
          return converted;
        }
        return obj;
      };
      
      querySnapshot.forEach((doc: DocumentSnapshot) => {
        const rawData = doc.data();
        const convertedData = convertTimestamps(rawData);
        results.push({ id: doc.id, ...convertedData } as T);
      });
      
      setData(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
      setError(errorMessage);
      console.error('Firestore collection fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, constraints, enabled]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  return {
    data,
    loading,
    error,
    refetch: fetchCollection
  };
}

// 便利なエクスポート
export const useFirestoreQuery = useFirestoreCollection;