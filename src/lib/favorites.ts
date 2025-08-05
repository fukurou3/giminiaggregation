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
  token: string
) {
  const functions = getFunctions();
  const toggle = httpsCallable(functions, "toggleFavorite");
  await toggle({ postId, isFavorited, token });
}

/**
 * ユーザーがお気に入り済みかを確認する
 */
export async function isFavorited(postId: string, uid: string): Promise<boolean> {
  const favRef = doc(db, `posts/${postId}/favorites/${uid}`);
  const favSnap = await getDoc(favRef);
  return favSnap.exists();
}
