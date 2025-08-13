import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export existing functions
export { toggleFavorite } from './toggleFavorite';

// Export new image processing function
export { processUploadedImage } from './imageProcessor';

// Export rate limiting functions
export { 
  checkUserDailyLimit, 
  checkIPHourlyLimit,
  incrementUserDailyCount,
  incrementIPHourlyCount,
  getUserUsageStats,
  cleanupOldLimits 
} from './rateLimiter';

// Export tmp cleanup functions
export { 
  dailyTmpCleanup,
  manualTmpCleanup 
} from './tmpCleanup';

// Export profile migration functions
export { 
  migrateProfileImages,
  getMigrationStats 
} from './profileMigration';