"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUserDailyLimit = checkUserDailyLimit;
exports.incrementUserDailyCount = incrementUserDailyCount;
exports.checkIPHourlyLimit = checkIPHourlyLimit;
exports.incrementIPHourlyCount = incrementIPHourlyCount;
exports.getUserUsageStats = getUserUsageStats;
exports.cleanupOldLimits = cleanupOldLimits;
const admin = __importStar(require("firebase-admin"));
const DEFAULT_CONFIG = {
    dailyImageLimitPerUser: 10,
    hourlyRequestLimitPerIP: 100
};
/**
 * Check if user has exceeded daily image upload limit
 */
async function checkUserDailyLimit(uid) {
    var _a;
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const userLimitDoc = db.collection('userLimits').doc(`${uid}_${today}`);
    const doc = await userLimitDoc.get();
    const currentCount = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.imageCount) || 0) : 0;
    const limit = DEFAULT_CONFIG.dailyImageLimitPerUser;
    if (currentCount >= limit) {
        return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: limit - currentCount };
}
/**
 * Increment user's daily image count
 */
async function incrementUserDailyCount(uid) {
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    const userLimitDoc = db.collection('userLimits').doc(`${uid}_${today}`);
    await db.runTransaction(async (transaction) => {
        var _a;
        const doc = await transaction.get(userLimitDoc);
        const currentCount = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.imageCount) || 0) : 0;
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
async function checkIPHourlyLimit(ip) {
    var _a;
    const db = admin.firestore();
    const currentHour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH format
    const ipLimitDoc = db.collection('ipLimits').doc(`${ip}_${currentHour}`);
    const doc = await ipLimitDoc.get();
    const currentCount = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.requestCount) || 0) : 0;
    const limit = DEFAULT_CONFIG.hourlyRequestLimitPerIP;
    if (currentCount >= limit) {
        return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: limit - currentCount };
}
/**
 * Increment IP's hourly request count
 */
async function incrementIPHourlyCount(ip) {
    const db = admin.firestore();
    const currentHour = new Date().toISOString().substring(0, 13);
    const ipLimitDoc = db.collection('ipLimits').doc(`${ip}_${currentHour}`);
    await db.runTransaction(async (transaction) => {
        var _a;
        const doc = await transaction.get(ipLimitDoc);
        const currentCount = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.requestCount) || 0) : 0;
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
async function getUserUsageStats(uid) {
    var _a;
    const today = new Date().toISOString().split('T')[0];
    const db = admin.firestore();
    const userLimitDoc = db.collection('userLimits').doc(`${uid}_${today}`);
    const doc = await userLimitDoc.get();
    const dailyUsage = doc.exists ? (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.imageCount) || 0) : 0;
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
async function cleanupOldLimits() {
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
