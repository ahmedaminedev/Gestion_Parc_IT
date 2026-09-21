import mongoose, { Schema, Document } from 'mongoose';

export type CapaciteType = 'grammage' | 'litrage';
export type CapaciteUnite = 'g' | 'kg' | 'l' | 'cl';
export type TauxUtilisation = '0%' | '25%' | '50%' | '75%' | '100%';

export interface ILiquideEcriture extends Document {
  id: string;
  REF_composant: string;
  nom: string;
  couleur?: string;
  refMateriel: string;
  id_Materiel?: string;
  capaciteType?: CapaciteType;
  capaciteUnite?: CapaciteUnite;
  capaciteValeur?: number;
  utilisation: TauxUtilisation;
  dateEntree: string;
  description?: string;
  enStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IComposant = ILiquideEcriture;

const LiquideEcritureSchema: Schema = new Schema(
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
    couleur: {
      type: String,
      enum: ['Noir', 'Cyan', 'Magenta', 'Jaune', null, ''],
      default: 'Noir',
      trim: true,
    },
    refMateriel: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // Toujours stocké en majuscules dans la base
    },
    id_Materiel: {
      type: String,
      default: '',
      trim: true,
    },
    capaciteType: {
      type: String,
      required: false,
      enum: ['grammage', 'litrage', null, ''],
      default: 'litrage',
    },
    capaciteUnite: {
      type: String,
      required: false,
      enum: ['g', 'kg', 'l', 'cl', null, ''],
      default: 'cl',
    },
    capaciteValeur: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
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
        // Si utilisation === '0%', le liquide d'écriture appartient au stockage, sinon stock - 1 (sorti du stock)
        ret.enStock = ret.utilisation === '0%';
        if (ret.refMateriel) {
          ret.refMateriel = ret.refMateriel.toUpperCase();
        } else if (ret.id_Materiel) {
          ret.refMateriel = ret.id_Materiel.toUpperCase();
        }
        if (!ret.id_Materiel && ret.refMateriel) {
          ret.id_Materiel = ret.refMateriel;
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Middleware pre-save pour s'assurer que refMateriel est en majuscules et id_Materiel renseigné
LiquideEcritureSchema.pre('save', function (this: any, next) {
  if (this.refMateriel && typeof this.refMateriel === 'string') {
    this.refMateriel = this.refMateriel.trim().toUpperCase();
    if (!this.id_Materiel) {
      this.id_Materiel = this.refMateriel;
    }
  } else if (this.id_Materiel && typeof this.id_Materiel === 'string') {
    this.refMateriel = this.id_Materiel.trim().toUpperCase();
  }
  next();
});

// Virtual property pour calculer si le liquide d'écriture est en stock (0% = en stock, sinon sorti du stock)
LiquideEcritureSchema.virtual('enStock').get(function (this: ILiquideEcriture) {
  return this.utilisation === '0%';
});

export const LiquideEcriture = mongoose.models.LiquideEcriture || mongoose.model<ILiquideEcriture>('LiquideEcriture', LiquideEcritureSchema);
export const Composant = LiquideEcriture;
