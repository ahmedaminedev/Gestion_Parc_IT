import mongoose, { Schema, Document } from 'mongoose';

export interface IFournisseur extends Document {
  id: string;
  Fournisseur: string;
  contact: string;
  telephone: string;
  email: string;
  adresse: string;
  matriculeFiscale: string;
}

const FournisseurSchema: Schema = new Schema(
  {
    Fournisseur: { type: String, required: true },
    contact: { type: String, default: '' },
    telephone: { type: String, default: '' },
    email: { type: String, default: '' },
    adresse: { type: String, default: '' },
    matriculeFiscale: { type: String, default: '' },
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

export const Fournisseur = mongoose.model<IFournisseur>(
  'Fournisseur',
  FournisseurSchema
);
