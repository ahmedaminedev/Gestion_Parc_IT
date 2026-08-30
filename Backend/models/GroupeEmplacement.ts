import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupeEmplacement extends Document {
  id: string;
  nom: string;
  couleur?: string;
  icon?: string;
}

const GroupeEmplacementSchema: Schema = new Schema(
  {
    nom: { type: String, required: true },
    couleur: { type: String, default: 'blue' },
    icon: { type: String, default: 'building' },
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

export const GroupeEmplacement = mongoose.model<IGroupeEmplacement>(
  'GroupeEmplacement',
  GroupeEmplacementSchema
);
