import { doc, getDoc, getDocs, collection, runTransaction, serverTimestamp, increment } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "./firebase";

/**
 * シャードの合計値からお気に入り数を取得
 */
export async function getFavoriteCount(postId: string): Promise<number> {
  const shardsRef = collection(db, `posts/${postId}/favoriteShards`);
  const snap = await getDocs(shardsRef);
  return snap.docs.reduce((sum, d) => sum + (d.data().count || 0), 0);
}

/**
 * 投稿のお気に入り状態をトグルする
 * 1ユーザー1票を保証するためトランザクションで処理
 */
export async function toggleFavorite(
  postId: string,
  isFavorited: boolean,
  userId: string
) {
  const db = (await import('./firebase')).db;
  const { doc, setDoc, deleteDoc, runTransaction, serverTimestamp, increment } = await import('firebase/firestore');
  
  const favRef = doc(db, `posts/${postId}/favorites/${userId}`);
  const shardCount = 10;
  // ユーザーIDベースで決定的にシャードを選択（同じユーザーは常に同じシャード）
  const shardId = (userId.split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) & 0x7fffffff;
  }, 0) % shardCount).toString();
  const shardRef = doc(db, `posts/${postId}/favoriteShards/${shardId}`);

  await runTransaction(db, async (txn) => {
    const favDoc = await txn.get(favRef);
    const shardDoc = await txn.get(shardRef);

    if (isFavorited) {
      // お気に入り解除
      if (favDoc.exists()) {
        txn.delete(favRef);
        if (!shardDoc.exists()) {
          console.warn(`Missing shard detected during unfavorite, creating new one: postId=${postId}, shardId=${shardId}`);
          txn.set(shardRef, { count: 0 });
        } else {
          txn.update(shardRef, { count: increment(-1) });
        }
      }
    } else {
      // お気に入り追加
      if (!favDoc.exists()) {
        txn.set(favRef, { createdAt: serverTimestamp() });
        if (!shardDoc.exists()) {
          console.warn(`Missing shard detected, creating new one: postId=${postId}, shardId=${shardId}`);
          txn.set(shardRef, { count: 1 });
        } else {
          txn.update(shardRef, { count: increment(1) });
        }
      }
    }
  });
}

/**
 * ユーザーがお気に入り済みかを確認する
 */
export async function isFavorited(postId: string, uid: string): Promise<boolean> {
  const favRef = doc(db, `posts/${postId}/favorites/${uid}`);
  const favSnap = await getDoc(favRef);
  return favSnap.exists();
}

/**
 * 冪等性を保証するお気に入り設定API
 * 二度押し・多端末同時押しでも安全
 * シャード方式を使用してスケーラビリティを確保
 */
export async function apiSetFavorite(postId: string, uid: string, desired: boolean): Promise<void> {
  const favRef = doc(db, 'posts', postId, 'favorites', uid);
  const shardCount = 10;
  // ユーザーIDベースで決定的にシャードを選択（同じユーザーは常に同じシャード）
  const shardId = (uid.split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) & 0x7fffffff;
  }, 0) % shardCount).toString();
  const shardRef = doc(db, 'posts', postId, 'favoriteShards', shardId);

  await runTransaction(db, async (tx) => {
    const favDoc = await tx.get(favRef);
    const shardDoc = await tx.get(shardRef);
    const exists = favDoc.exists();

    if (desired && !exists) {
      // お気に入り追加
      tx.set(favRef, { uid, createdAt: serverTimestamp() });
      if (!shardDoc.exists()) {
        tx.set(shardRef, { count: 1 });
      } else {
        tx.update(shardRef, { count: increment(1) });
      }
    } else if (!desired && exists) {
      // お気に入り削除
      tx.delete(favRef);
      if (!shardDoc.exists()) {
        console.warn(`Missing shard detected during unfavorite, creating new one: postId=${postId}, shardId=${shardId}`);
        tx.set(shardRef, { count: 0 });
      } else {
        tx.update(shardRef, { count: increment(-1) });
      }
    }
    // desired == exists のときは何もしない → 冪等！
  });
}
