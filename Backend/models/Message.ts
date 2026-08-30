import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  id: string;
  conversationId: string;
  senderId: string;
  senderNom: string;
  senderEmail: string;
  senderRole: string;
  recipientId?: string;
  text: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call' | 'system';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  mediaMimeType?: string;
  mediaDuration?: number; // duration in seconds for audio/video
  readBy: string[];
  isRead: boolean;
  callData?: {
    type: 'audio' | 'video';
    status: 'completed' | 'missed' | 'rejected' | 'in_progress';
    durationSec?: number;
  };
  clientTempId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderNom: { type: String, required: true },
    senderEmail: { type: String, required: true },
    senderRole: { type: String, default: 'Collaborateur' },
    recipientId: { type: String, index: true },
    clientTempId: { type: String },
    text: { type: String, default: '' },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'call', 'system'],
      default: 'text',
    },
    mediaUrl: { type: String, default: '' },
    mediaName: { type: String, default: '' },
    mediaSize: { type: Number, default: 0 },
    mediaMimeType: { type: String, default: '' },
    mediaDuration: { type: Number, default: 0 },
    readBy: [{ type: String }],
    isRead: { type: Boolean, default: false },
    callData: {
      type: { type: String, enum: ['audio', 'video'] },
      status: { type: String, enum: ['completed', 'missed', 'rejected', 'in_progress'] },
      durationSec: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
