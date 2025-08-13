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
exports.toggleFavorite = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
// Firebase Admin is initialized in index.ts
exports.toggleFavorite = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    const postId = data.postId;
    const isFavorited = data.isFavorited;
    if (typeof postId !== 'string' ||
        typeof isFavorited !== 'boolean') {
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
                }
                else {
                    txn.update(shardRef, { count: admin.firestore.FieldValue.increment(-1) });
                }
            }
        }
        else {
            if (!favDoc.exists) {
                txn.set(favRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
                if (!shardDoc.exists) {
                    console.warn(`Missing shard detected, creating new one: postId=${postId}, shardId=${shardId}`);
                    txn.set(shardRef, { count: 1 });
                }
                else {
                    txn.update(shardRef, { count: admin.firestore.FieldValue.increment(1) });
                }
            }
        }
    });
    return { success: true };
});
