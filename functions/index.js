const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.toggleFavorite = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const postId = data.postId;
  const isFavorited = data.isFavorited;
  const token = data.token;
  if (
    typeof postId !== 'string' ||
    typeof isFavorited !== 'boolean' ||
    typeof token !== 'string'
  ) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid arguments');
  }

  // reCAPTCHA トークン検証
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    throw new functions.https.HttpsError('internal', 'reCAPTCHA secret not configured');
  }

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);

  const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    throw new functions.https.HttpsError('failed-precondition', 'reCAPTCHA verification failed');
  }

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
        if (shardDoc.exists) {
          txn.update(shardRef, { count: admin.firestore.FieldValue.increment(-1) });
        }
      }
    } else {
      if (!favDoc.exists) {
        txn.set(favRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
        if (shardDoc.exists) {
          txn.update(shardRef, { count: admin.firestore.FieldValue.increment(1) });
        }
      }
    }
  });

  return { success: true };
});
