import { doc, getDoc, getDocs, collection } from "firebase/firestore";
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
  const shardId = Math.floor(Math.random() * shardCount).toString();
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
