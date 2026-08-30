import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupeMateriel extends Document {
  id: string;
  nom: string;
  codeSerieObligatoire?: boolean;
}

const GroupeMaterielSchema: Schema = new Schema(
  {
    nom: { type: String, required: true },
    codeSerieObligatoire: { type: Boolean, default: false },
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

export const GroupeMateriel = mongoose.model<IGroupeMateriel>(
  'GroupeMateriel',
  GroupeMaterielSchema
);
