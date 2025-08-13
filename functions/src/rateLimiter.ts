import * as admin from 'firebase-admin';

interface RateLimitConfig {
  dailyImageLimitPerUser: number;
  hourlyRequestLimitPerIP: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  dailyImageLimitPerUser: 10,
  hourlyRequestLimitPerIP: 100
};

/**
 * Check if user has exceeded daily image upload limit
 */
export async function checkUserDailyLimit(uid: string): Promise<{ allowed: boolean; remaining: number }> {
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const userLimitDoc = db.collection('userLimits').doc(`${uid}_${today}`);
  const doc = await userLimitDoc.get();
  
  const currentCount = doc.exists ? (doc.data()?.imageCount || 0) : 0;
  const limit = DEFAULT_CONFIG.dailyImageLimitPerUser;
  
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: limit - currentCount };
}

/**
 * Increment user's daily image count
 */
export async function incrementUserDailyCount(uid: string): Promise<void> {
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0];
  
  const userLimitDoc = db.collection('userLimits').doc(`${uid}_${today}`);
  
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userLimitDoc);
    const currentCount = doc.exists ? (doc.data()?.imageCount || 0) : 0;
    
    transaction.set(userLimitDoc, {
      uid,
      date: today,
      imageCount: currentCount + 1,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

/**
 * Check if IP has exceeded hourly request limit
 */
export async function checkIPHourlyLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const db = admin.firestore();
  const currentHour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH format
  
  const ipLimitDoc = db.collection('ipLimits').doc(`${ip}_${currentHour}`);
  const doc = await ipLimitDoc.get();
  
  const currentCount = doc.exists ? (doc.data()?.requestCount || 0) : 0;
  const limit = DEFAULT_CONFIG.hourlyRequestLimitPerIP;
  
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: limit - currentCount };
}

/**
 * Increment IP's hourly request count
 */
export async function incrementIPHourlyCount(ip: string): Promise<void> {
  const db = admin.firestore();
  const currentHour = new Date().toISOString().substring(0, 13);
  
  const ipLimitDoc = db.collection('ipLimits').doc(`${ip}_${currentHour}`);
  
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ipLimitDoc);
    const currentCount = doc.exists ? (doc.data()?.requestCount || 0) : 0;
    
    transaction.set(ipLimitDoc, {
      ip,
      hour: currentHour,
      requestCount: currentCount + 1,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

/**
 * Get user's current usage statistics
 */
export async function getUserUsageStats(uid: string): Promise<{
  dailyUsage: number;
  dailyLimit: number;
  remainingToday: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const db = admin.firestore();
  
  const userLimitDoc = db.collection('userLimits').doc(`${uid}_${today}`);
  const doc = await userLimitDoc.get();
  
  const dailyUsage = doc.exists ? (doc.data()?.imageCount || 0) : 0;
  const dailyLimit = DEFAULT_CONFIG.dailyImageLimitPerUser;
  const remainingToday = Math.max(0, dailyLimit - dailyUsage);
  
  return {
    dailyUsage,
    dailyLimit,
    remainingToday
  };
}

/**
 * Clean up old rate limit documents (should be called periodically)
 */
export async function cleanupOldLimits(): Promise<void> {
  const db = admin.firestore();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep last 7 days
  
  // Clean up user limits
  const userLimitsQuery = db.collection('userLimits')
    .where('lastUpdated', '<', cutoffDate)
    .limit(100);
  
  const userSnapshot = await userLimitsQuery.get();
  const userBatch = db.batch();
  
  userSnapshot.docs.forEach(doc => {
    userBatch.delete(doc.ref);
  });
  
  if (!userSnapshot.empty) {
    await userBatch.commit();
  }
  
  // Clean up IP limits
  const ipLimitsQuery = db.collection('ipLimits')
    .where('lastUpdated', '<', cutoffDate)
    .limit(100);
  
  const ipSnapshot = await ipLimitsQuery.get();
  const ipBatch = db.batch();
  
  ipSnapshot.docs.forEach(doc => {
    ipBatch.delete(doc.ref);
  });
  
  if (!ipSnapshot.empty) {
    await ipBatch.commit();
  }
}