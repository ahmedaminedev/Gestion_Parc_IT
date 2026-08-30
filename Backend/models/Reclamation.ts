import mongoose, { Schema, Document } from 'mongoose';

export interface IHistoriqueReclamation {
  date: string;
  auteur: string;
  role: string;
  message: string;
  typeAction?: 'creation' | 'statut' | 'commentaire' | 'resolution' | 'assignation';
}

export interface IReclamation extends Document {
  id: string;
  code: string; // REC-2026-0001
  titre: string;
  description: string;
  nature?: 'materiel' | 'autre';
  materielsConcernesIds?: string[];
  categoriesIds?: string[];
  id_GroupeMateriel?: string;    // Compatibilité
  id_GroupeReclamation?: string; // Compatibilité
  id_TypeReclamation?: string;   // Compatibilité rétroactive
  priorite: 'Basse' | 'Moyenne' | 'Haute' | 'Urgente';
  statut: 'Ouverte' | 'En cours' | 'En attente' | 'Résolue' | 'Rejetée';
  id_Demandeur: string;
  demandeurNom: string;
  demandeurEmail: string;
  id_MaterielConcerne?: string;
  id_Emplacement?: string;
  delaiTraitementHeures?: number;
  dateEcheanceSla?: Date;
  dateMaxResolution?: Date;
  solution?: string;
  id_TechnicienAssigne?: string;
  technicienNom?: string;
  historique: IHistoriqueReclamation[];
  dateResolution?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HistoriqueSchema = new Schema(
  {
    date: { type: String, required: true },
    auteur: { type: String, required: true },
    role: { type: String, default: 'Collaborateur' },
    message: { type: String, required: true },
    typeAction: { type: String, default: 'commentaire' },
  },
  { _id: false }
);

const ReclamationSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    titre: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    nature: { type: String, enum: ['materiel', 'autre'], default: 'materiel' },
    materielsConcernesIds: { type: [String], default: [] },
    categoriesIds: { type: [String], default: [] },
    id_GroupeMateriel: { type: String, default: '', trim: true },
    id_GroupeReclamation: { type: String, default: '', trim: true },
    id_TypeReclamation: { type: String, default: '', trim: true },
    priorite: {
      type: String,
      enum: ['Basse', 'Moyenne', 'Haute', 'Urgente'],
      default: 'Moyenne',
    },
    statut: {
      type: String,
      enum: ['Ouverte', 'En cours', 'En attente', 'Résolue', 'Rejetée'],
      default: 'Ouverte',
    },
    id_Demandeur: { type: String, required: true },
    demandeurNom: { type: String, required: true },
    demandeurEmail: { type: String, required: true, lowercase: true, trim: true },
    id_MaterielConcerne: { type: String, default: '' },
    id_Emplacement: { type: String, default: '' },
    delaiTraitementHeures: { type: Number, default: 24 },
    dateEcheanceSla: { type: Date },
    dateMaxResolution: { type: Date },
    solution: { type: String, default: '' },
    id_TechnicienAssigne: { type: String, default: '' },
    technicienNom: { type: String, default: '' },
    historique: [HistoriqueSchema],
    dateResolution: { type: Date },
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

export const Reclamation = mongoose.model<IReclamation>('Reclamation', ReclamationSchema);
