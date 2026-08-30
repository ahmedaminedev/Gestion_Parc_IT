import mongoose, { Schema, Document } from 'mongoose';

export interface IMateriel extends Document {
  id: string;
  reference: string;
  ref_immo?: string;
  designation: string;
  description?: string;
  codeSerie?: string;
  qte: number;
  valeurPlafond: number;
  dateEntree: string;
  statut: 'En service' | 'En panne' | 'En révision' | 'Hors service' | 'Réformé' | 'En stock' | 'En maintenance';
  garantie: string;
  id_GroupeMateriel: string;
  id_Fournisseur: string;
  id_Facture: string;
  id_Emplacement?: string;
  id_Beneficiaire?: string;
  image?: string;
}

const MaterielSchema: Schema = new Schema(
  {
    reference: { type: String, required: true },
    ref_immo: { type: String, default: '' },
    designation: { type: String, required: true },
    description: { type: String, default: '' },
    codeSerie: { type: String, default: '' },
    qte: { type: Number, default: 1 },
    valeurPlafond: { type: Number, default: 0 },
    dateEntree: { type: String, default: () => new Date().toISOString().split('T')[0] },
    statut: {
      type: String,
      required: true,
      default: 'En service',
    },
    garantie: { type: String, default: '24 mois' },
    id_GroupeMateriel: { type: String, required: true },
    id_Fournisseur: { type: String, required: true },
    id_Facture: { type: String, required: true },
    id_Emplacement: { type: String, default: '' },
    id_Beneficiaire: { type: String, default: '' },
    image: { type: String, default: '' },
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

export const Materiel = mongoose.model<IMateriel>('Materiel', MaterielSchema);
