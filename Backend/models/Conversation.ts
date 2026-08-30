import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipantInfo {
  userId: string;
  nom: string;
  email: string;
  role: string;
}

export interface IConversation extends Document {
  id: string;
  participants: string[]; // List of user IDs
  participantDetails: IParticipantInfo[];
  lastMessageText?: string;
  lastMessageType?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call' | 'system';
  lastMessageAt?: Date;
  lastMessageSenderId?: string;
  unreadCounts?: Record<string, number>; // Map of userId -> count
  pinnedBy?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantInfoSchema = new Schema(
  {
    userId: { type: String, required: true },
    nom: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'Collaborateur' },
  },
  { _id: false }
);

const ConversationSchema: Schema = new Schema(
  {
    participants: [{ type: String, required: true }],
    participantDetails: [ParticipantInfoSchema],
    lastMessageText: { type: String, default: '' },
    lastMessageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'call', 'system'],
      default: 'text',
    },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageSenderId: { type: String, default: '' },
    unreadCounts: { type: Map, of: Number, default: {} },
    pinnedBy: [{ type: String }],
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

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
