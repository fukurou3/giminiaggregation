// Firebase Timestamp型の定義
export interface FirebaseTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export type TimestampLike = FirebaseTimestamp | Date | null;