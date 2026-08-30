import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLog extends Document {
  id: string;
  destinataireEmail: string;
  destinataireNom: string;
  sujet: string;
  contenuHtml: string;
  type: 'BIENVENUE_USER' | 'NOTIFICATION_RECLAMATION' | 'RESOLUTION_RECLAMATION' | 'OTP_RESET_PASSWORD' | 'PASSWORD_CHANGED';
  statut: 'Envoyé' | 'Délivré' | 'Simulation (SMTP non configuré)' | "Échec d'envoi";
  errorMessage?: string;
  tempPasswordPreview?: string;
  dateEnvoi: Date;
  createdAt: Date;
}

const EmailLogSchema: Schema = new Schema(
  {
    destinataireEmail: { type: String, required: true, lowercase: true, trim: true },
    destinataireNom: { type: String, required: true },
    sujet: { type: String, required: true },
    contenuHtml: { type: String, required: true },
    type: {
      type: String,
      enum: ['BIENVENUE_USER', 'NOTIFICATION_RECLAMATION', 'RESOLUTION_RECLAMATION', 'OTP_RESET_PASSWORD', 'PASSWORD_CHANGED'],
      default: 'BIENVENUE_USER',
    },
    statut: {
      type: String,
      default: 'Envoyé',
    },
    errorMessage: { type: String, default: '' },
    tempPasswordPreview: { type: String, default: '' },
    dateEnvoi: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const EmailLog = mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
