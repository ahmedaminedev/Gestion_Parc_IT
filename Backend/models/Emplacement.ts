import mongoose, { Schema, Document } from 'mongoose';

export interface IEmplacement extends Document {
  id: string;
  emplacement1: string;
  emplacement2: string;
  id_GroupeEmplacement: string;
}

const EmplacementSchema: Schema = new Schema(
  {
    emplacement1: { type: String, required: true },
    emplacement2: { type: String, required: true },
    id_GroupeEmplacement: { type: String, required: true },
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

export const Emplacement = mongoose.model<IEmplacement>(
  'Emplacement',
  EmplacementSchema
);
