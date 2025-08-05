import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  runTransaction,
  setDoc,
  increment
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword
} from 'firebase/auth';

async function main() {
  const app = initializeApp({ projectId: 'demo-project' });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, 'localhost', 8080);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://localhost:9099');

  const userCred = await signInWithEmailAndPassword(auth, 'test@example.com', 'password');
  const uid = userCred.user.uid;

  const shardRef = doc(db, 'posts/post1/favoriteShards/0');
  await setDoc(shardRef, { count: 0 });
  const favRef = doc(db, `posts/post1/favorites/${uid}`);

  await runTransaction(db, async (txn) => {
    const favDoc = await txn.get(favRef);
    const shardDoc = await txn.get(shardRef);
    if (!favDoc.exists()) {
      txn.set(favRef, { createdAt: new Date() });
      txn.update(shardRef, { count: increment(1) });
    }
  });
  console.log('increment succeeded');

  await runTransaction(db, async (txn) => {
    const favDoc = await txn.get(favRef);
    const shardDoc = await txn.get(shardRef);
    if (favDoc.exists()) {
      txn.delete(favRef);
      txn.update(shardRef, { count: increment(-1) });
    }
  });
  console.log('decrement succeeded');
}

main().catch((e) => {
  console.error('Test failed', e);
  process.exit(1);
});
