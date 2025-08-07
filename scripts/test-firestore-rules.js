const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

(async () => {
  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });

  const clientCtx = testEnv.unauthenticatedContext();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('posts').doc('public').set({ isPublic: true });
    await context.firestore().collection('posts').doc('private').set({ isPublic: false });
  });

  const db = clientCtx.firestore();

  await assertSucceeds(db.collection('posts').doc('public').get());
  await assertFails(db.collection('posts').doc('private').get());

  await testEnv.cleanup();
})();
