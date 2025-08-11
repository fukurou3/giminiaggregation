import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const toggleFavorite = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const postId: string = data.postId;
  const isFavorited: boolean = data.isFavorited;
  if (
    typeof postId !== 'string' ||
    typeof isFavorited !== 'boolean'
  ) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid arguments');
  }

  // 基本的なスパム対策: ユーザー認証は既に上で確認済み

  const db = admin.firestore();
  const favRef = db.doc(`posts/${postId}/favorites/${uid}`);
  const shardCount = Number(process.env.FAVORITE_SHARD_COUNT || 10);
  const shardId = Math.floor(Math.random() * shardCount).toString();
  const shardRef = db.doc(`posts/${postId}/favoriteShards/${shardId}`);

  await db.runTransaction(async (txn) => {
    const favDoc = await txn.get(favRef);
    const shardDoc = await txn.get(shardRef);

    if (isFavorited) {
      if (favDoc.exists) {
        txn.delete(favRef);
        if (!shardDoc.exists) {
          console.warn(`Missing shard detected during unfavorite, creating new one: postId=${postId}, shardId=${shardId}`);
          txn.set(shardRef, { count: 0 });
        } else {
          txn.update(shardRef, { count: admin.firestore.FieldValue.increment(-1) });
        }
      }
    } else {
      if (!favDoc.exists) {
        txn.set(favRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
        if (!shardDoc.exists) {
          console.warn(`Missing shard detected, creating new one: postId=${postId}, shardId=${shardId}`);
          txn.set(shardRef, { count: 1 });
        } else {
          txn.update(shardRef, { count: admin.firestore.FieldValue.increment(1) });
        }
      }
    }
  });

  return { success: true };
});