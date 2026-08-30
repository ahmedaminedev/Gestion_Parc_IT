import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  id: string;
  beneficiaire: string;
  email: string;
  password?: string;
  id_Role: string;
  statut?: 'Actif' | 'Inactif';
  accesApp?: 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS' | 'NONE';
  isSuperAdmin?: boolean;
  derniereActivite?: string;
  id_Emplacement?: string;
  refreshTokens: string[];
  resetPasswordOtp?: string;
  resetPasswordOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    beneficiaire: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false, default: '' },
    id_Role: { 
      type: String, 
      required: true,
      default: ''
    },
    statut: {
      type: String,
      enum: ['Actif', 'Inactif'],
      default: 'Actif',
    },
    accesApp: {
      type: String,
      enum: ['GLOBAL_BACKOFFICE', 'ESPACE_RECLAMATIONS', 'NONE'],
      default: 'ESPACE_RECLAMATIONS',
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    derniereActivite: {
      type: String,
      default: () => "À l'instant",
    },
    id_Emplacement: { type: String, default: '' },
    refreshTokens: [{ type: String }],
    resetPasswordOtp: { type: String, default: null },
    resetPasswordOtpExpires: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
