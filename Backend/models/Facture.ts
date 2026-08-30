import mongoose, { Schema, Document } from 'mongoose';

export interface IFacture extends Document {
  id: string;
  factureFrs: string;
  dateAcquisition: string;
  id_Fournisseur: string;
  montantHT: number;
  statut: 'Payée' | 'En attente' | 'En retard';
  datePaiement?: string;
}

const FactureSchema: Schema = new Schema(
  {
    factureFrs: { type: String, required: true },
    dateAcquisition: { type: String, required: true },
    id_Fournisseur: { type: String, required: true },
    montantHT: { type: Number, required: true, default: 0 },
    statut: {
      type: String,
      required: true,
      enum: ['Payée', 'En attente', 'En retard'],
      default: 'En attente',
    },
    datePaiement: { type: String, default: '' },
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

export const Facture = mongoose.model<IFacture>('Facture', FactureSchema);
