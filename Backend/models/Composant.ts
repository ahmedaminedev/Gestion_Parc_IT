import mongoose, { Schema, Document } from 'mongoose';

export type CapaciteType = 'grammage' | 'litrage';
export type CapaciteUnite = 'g' | 'kg' | 'l' | 'cl';
export type TauxUtilisation = '0%' | '25%' | '50%' | '75%' | '100%';

export interface IComposant extends Document {
  id: string;
  REF_composant: string;
  nom: string;
  id_Materiel: string;
  capaciteType: CapaciteType;
  capaciteUnite: CapaciteUnite;
  capaciteValeur: number;
  utilisation: TauxUtilisation;
  dateEntree: string;
  description?: string;
  enStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComposantSchema: Schema = new Schema(
  {
    REF_composant: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    id_Materiel: {
      type: String,
      required: true,
      trim: true,
    },
    capaciteType: {
      type: String,
      required: true,
      enum: ['grammage', 'litrage'],
    },
    capaciteUnite: {
      type: String,
      required: true,
      enum: ['g', 'kg', 'l', 'cl'],
    },
    capaciteValeur: {
      type: Number,
      required: true,
      min: 0,
    },
    utilisation: {
      type: String,
      required: true,
      enum: ['0%', '25%', '50%', '75%', '100%'],
      default: '0%',
    },
    dateEntree: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        // Si utilisation === '0%', le composant appartient au stockage, sinon stock - 1 (sorti du stock)
        ret.enStock = ret.utilisation === '0%';
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual property pour calculer si le composant est en stock (0% = en stock, sinon sorti du stock)
ComposantSchema.virtual('enStock').get(function (this: IComposant) {
  return this.utilisation === '0%';
});

export const Composant = mongoose.model<IComposant>('Composant', ComposantSchema);
