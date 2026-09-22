import mongoose, { Schema, Document } from 'mongoose';

export interface IFutureMateriel extends Document {
  id: string;
  imageMateriel?: string;
  imageFicheMateriel?: string;
  imageFacture?: string;
  imageBarcode?: string;
  barcode?: string;
  barcode1?: string;
  barcode2?: string;
  barcode3?: string;
  barcode4?: string;
  barcode5?: string;
  designation?: string;
  referenceProposee?: string;
  codeSeriePropose?: string;
  statut: 'En attente' | 'Validé en matériel' | 'Rejeté';
  id_MaterielCree?: string;
  dateCreation: string;
  notes?: string;
}

const FutureMaterielSchema: Schema = new Schema(
  {
    imageMateriel: { type: String, default: '' },
    imageFicheMateriel: { type: String, default: '' },
    imageFacture: { type: String, default: '' },
    imageBarcode: { type: String, default: '' },
    barcode: { type: String, default: '', trim: true },
    barcode1: { type: String, default: '', trim: true },
    barcode2: { type: String, default: '', trim: true },
    barcode3: { type: String, default: '', trim: true },
    barcode4: { type: String, default: '', trim: true },
    barcode5: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    referenceProposee: { type: String, default: '', trim: true, uppercase: true },
    codeSeriePropose: { type: String, default: '', trim: true },
    statut: {
      type: String,
      enum: ['En attente', 'Validé en matériel', 'Rejeté'],
      default: 'En attente',
    },
    id_MaterielCree: { type: String, default: '' },
    dateCreation: { type: String, default: () => new Date().toISOString().split('T')[0] },
    notes: { type: String, default: '' },
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

// Index pour accélérer la vérification par code série ou barcode
FutureMaterielSchema.index({ codeSeriePropose: 1 });
FutureMaterielSchema.index({ barcode1: 1 });

export const FutureMateriel = mongoose.model<IFutureMateriel>('FutureMateriel', FutureMaterielSchema);
