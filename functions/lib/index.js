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
exports.getMigrationStats = exports.migrateProfileImages = exports.manualTmpCleanup = exports.dailyTmpCleanup = exports.cleanupOldLimits = exports.getUserUsageStats = exports.incrementIPHourlyCount = exports.incrementUserDailyCount = exports.checkIPHourlyLimit = exports.checkUserDailyLimit = exports.processUploadedImage = exports.toggleFavorite = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export existing functions
var toggleFavorite_1 = require("./toggleFavorite");
Object.defineProperty(exports, "toggleFavorite", { enumerable: true, get: function () { return toggleFavorite_1.toggleFavorite; } });
// Export new image processing function
var imageProcessor_1 = require("./imageProcessor");
Object.defineProperty(exports, "processUploadedImage", { enumerable: true, get: function () { return imageProcessor_1.processUploadedImage; } });
// Export rate limiting functions
var rateLimiter_1 = require("./rateLimiter");
Object.defineProperty(exports, "checkUserDailyLimit", { enumerable: true, get: function () { return rateLimiter_1.checkUserDailyLimit; } });
Object.defineProperty(exports, "checkIPHourlyLimit", { enumerable: true, get: function () { return rateLimiter_1.checkIPHourlyLimit; } });
Object.defineProperty(exports, "incrementUserDailyCount", { enumerable: true, get: function () { return rateLimiter_1.incrementUserDailyCount; } });
Object.defineProperty(exports, "incrementIPHourlyCount", { enumerable: true, get: function () { return rateLimiter_1.incrementIPHourlyCount; } });
Object.defineProperty(exports, "getUserUsageStats", { enumerable: true, get: function () { return rateLimiter_1.getUserUsageStats; } });
Object.defineProperty(exports, "cleanupOldLimits", { enumerable: true, get: function () { return rateLimiter_1.cleanupOldLimits; } });
// Export tmp cleanup functions
var tmpCleanup_1 = require("./tmpCleanup");
Object.defineProperty(exports, "dailyTmpCleanup", { enumerable: true, get: function () { return tmpCleanup_1.dailyTmpCleanup; } });
Object.defineProperty(exports, "manualTmpCleanup", { enumerable: true, get: function () { return tmpCleanup_1.manualTmpCleanup; } });
// Export profile migration functions
var profileMigration_1 = require("./profileMigration");
Object.defineProperty(exports, "migrateProfileImages", { enumerable: true, get: function () { return profileMigration_1.migrateProfileImages; } });
Object.defineProperty(exports, "getMigrationStats", { enumerable: true, get: function () { return profileMigration_1.getMigrationStats; } });
