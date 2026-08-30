import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  id: string;
  nom: string;
  description?: string;
  couleur?: string;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    nom: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    couleur: { type: String, default: 'blue' }, // blue, emerald, purple, amber, indigo, rose, cyan, gray
    isSystem: { type: Boolean, default: false },
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

export const Role = mongoose.model<IRole>('Role', RoleSchema);
