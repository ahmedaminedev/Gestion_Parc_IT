import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId | string;
  refreshTokenHash: string;
  sessionFamily: string; // Used to detect token reuse and potential compromise
  expiresAt: Date;
  absoluteExpiresAt: Date; // Absolute ceiling duration (e.g. 30 days max)
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date | null;
  userAgent?: string;
  ipAddress?: string;
}

const SessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refreshTokenHash: { type: String, required: true, unique: true },
  sessionFamily: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  absoluteExpiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
});

// TTL index to automatically clean up expired sessions from MongoDB
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
