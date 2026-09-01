import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Session } from '../models/Session';
import { GroupeEmplacement } from '../models/GroupeEmplacement';
import { Emplacement } from '../models/Emplacement';
import { GroupeMateriel } from '../models/GroupeMateriel';
import { Fournisseur } from '../models/Fournisseur';
import { Facture } from '../models/Facture';
import { Materiel } from '../models/Materiel';
import { Reclamation } from '../models/Reclamation';
import { validateLoginData } from '../validators/businessValidators';
import { sendPasswordChangedEmail, sendOtpResetEmail } from '../services/mailService';
import { saveAvatarBase64, deleteAvatarFile } from '../services/uploadService';
import { 
  env, 
  ACCESS_EXPIRY_MS, 
  REFRESH_EXPIRY_MS, 
  REFRESH_BEFORE_EXPIRY_MS, 
  SESSION_WARNING_BEFORE_EXPIRY_MS, 
  MAX_SESSION_MS 
} from '../config/env';

// Helper: Cryptographic SHA-256 hash for Refresh Token storage in MongoDB
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper: Secure HttpOnly cookie options for Refresh Token (Optimized for Private Mode, Iframes & HTTPS)
export function getRefreshCookieOptions(maxAgeMs: number, req?: Request) {
  const isHttps = process.env.NODE_ENV === 'production' || !!(req && (req.secure || req.headers['x-forwarded-proto'] === 'https'));
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

export function generateTokens(user: { id: string; email: string; id_Role?: string; role: string; beneficiaire: string; accesApp?: string; isSuperAdmin?: boolean }) {
  const payload = {
    id: user.id,
    email: user.email,
    id_Role: user.id_Role,
    role: user.role,
    beneficiaire: user.beneficiaire,
    accesApp: user.accesApp || (user.role === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS'),
    isSuperAdmin: !!user.isSuperAdmin,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRY as any, algorithm: 'HS256' });
  const refreshToken = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRY as any, algorithm: 'HS256' });

  return { accessToken, refreshToken };
}

// Helper: normalize role name for insensitive comparison (case, accents, spaces, hyphens, underscores)
export function normalizeRoleName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Helper to resolve role name and Role ID from MongoDB
export async function resolveUserRole(id_Role?: string, fallbackRoleName?: string): Promise<{ id_Role: string; roleName: string }> {
  try {
    const allRoles = await Role.find();
    const itRole = allRoles.find(r => normalizeRoleName(r.nom) === normalizeRoleName('Responsable IT')) || allRoles[0];

    if (id_Role && String(id_Role).trim()) {
      const rawIdStr = String(id_Role).trim();
      // 1. Find by ID or MongoDB ObjectId string
      const roleById = allRoles.find(r => (
        r.id === rawIdStr ||
        r._id?.toString() === rawIdStr ||
        (r as any)._id?.equals?.(rawIdStr)
      ));
      if (roleById) {
        return { id_Role: roleById.id || roleById._id.toString(), roleName: roleById.nom };
      }

      // 2. Find by normalized name in case a role name was passed as id_Role
      const targetNorm = normalizeRoleName(rawIdStr);
      const roleByName = allRoles.find(r => normalizeRoleName(r.nom) === targetNorm);
      if (roleByName) {
        return { id_Role: roleByName.id || roleByName._id.toString(), roleName: roleByName.nom };
      }
    }

    if (fallbackRoleName && String(fallbackRoleName).trim()) {
      const rawFallback = String(fallbackRoleName).trim();
      const targetNorm = normalizeRoleName(rawFallback);
      const roleByName = allRoles.find(r => normalizeRoleName(r.nom) === targetNorm);
      if (roleByName) {
        return { id_Role: roleByName.id || roleByName._id.toString(), roleName: roleByName.nom };
      }
      // If not found in roles list, create it dynamically to preserve it
      const newRole = await new Role({
        nom: rawFallback,
        description: 'Rôle collaborateur',
        couleur: 'blue',
        isSystem: false,
      }).save();
      return { id_Role: newRole.id || newRole._id.toString(), roleName: newRole.nom };
    }

    return {
      id_Role: itRole?.id || itRole?._id?.toString() || 'role_it_default',
      roleName: itRole?.nom || 'Responsable IT',
    };
  } catch (err) {
    return {
      id_Role: id_Role || 'role_it_default',
      roleName: fallbackRoleName || 'Responsable IT',
    };
  }
}

// Secure Token Logger for Backend Terminal (Masked - No sensitive token exposure)
export function logTokenEvent(actionType: string, user: any, details?: { accessExpiresIn?: string; sessionExpiresIn?: string }) {
  try {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    console.log(`[AUTH ${timestamp}] ${actionType} - Utilisateur: ${user.email} (${user.id || user._id}) | Rôle: ${user.role} | Access Exp: ${details?.accessExpiresIn || env.ACCESS_TOKEN_EXPIRY} | Session Exp: ${details?.sessionExpiresIn || env.REFRESH_TOKEN_EXPIRY}`);
  } catch (err) {
    console.error('Erreur log auth:', err);
  }
}

// Built-in Default Users with Passwords for Resilient Offline & Seeded Operation
export const DEFAULT_USERS_LIST = [
  {
    id: 'user_admin_sys',
    beneficiaire: 'Administrateur Système',
    email: 'admin@omoda-jaecoo.tn',
    password: 'Admin123!',
    role: 'Responsable IT',
    isSuperAdmin: true,
    accesApp: 'GLOBAL_BACKOFFICE',
    statut: 'Actif',
    id_Role: 'role_it_default',
    id_Emplacement: 'emp_direction_101',
  },
  {
    id: 'user_resp_it',
    beneficiaire: 'Responsable IT',
    email: 'responsable.it@omoda-jaecoo.tn',
    password: 'Password123!',
    role: 'Responsable IT',
    isSuperAdmin: false,
    accesApp: 'GLOBAL_BACKOFFICE',
    statut: 'Actif',
    id_Role: 'role_it_default',
    id_Emplacement: 'emp_it_102',
  },
  {
    id: 'user_ahmed_nafti',
    beneficiaire: 'Ahmed Amin Nafti',
    email: 'ahmed.nafti@omoda-jaecoo.tn',
    password: 'Password123!',
    role: 'Responsable IT',
    isSuperAdmin: false,
    accesApp: 'GLOBAL_BACKOFFICE',
    statut: 'Actif',
    id_Role: 'role_it_default',
    id_Emplacement: 'emp_it_102',
  },
  {
    id: 'user_ahmed_am',
    beneficiaire: 'Ahmed Ammar',
    email: 'ahmed.am@omoda.tn',
    password: 'Password123!',
    role: 'Responsable IT',
    isSuperAdmin: false,
    accesApp: 'GLOBAL_BACKOFFICE',
    statut: 'Actif',
    id_Role: 'role_it_default',
    id_Emplacement: 'emp_tech_202',
  },
  {
    id: 'user_yassine_sk',
    beneficiaire: 'Yassine Skander',
    email: 'yassine.sk@omoda.tn',
    password: 'Password123!',
    role: 'Directeur Général',
    isSuperAdmin: false,
    accesApp: 'ESPACE_RECLAMATIONS',
    statut: 'Actif',
    id_Role: 'role_dg_default',
    id_Emplacement: 'emp_direction_101',
  },
];

// Seed Default Users and Data on startup
export async function seedInitialDatabase() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('ℹ️ Connexion MongoDB en attente ou non établie. Initialisation du mode mémoire...');
      return;
    }

    // Seed Groupes Emplacement if empty
    if ((await GroupeEmplacement.countDocuments()) === 0) {
      const g1 = await new GroupeEmplacement({ nom: 'Bureau', couleur: 'blue', icon: 'building' }).save();
      const g2 = await new GroupeEmplacement({ nom: 'Atelier', couleur: 'amber', icon: 'wrench' }).save();
      const g3 = await new GroupeEmplacement({ nom: 'Accueil', couleur: 'emerald', icon: 'concierge' }).save();

      // Seed Emplacements
      if ((await Emplacement.countDocuments()) === 0) {
        await new Emplacement({ emplacement1: 'Bureau', emplacement2: 'Bureau Direction 101', id_GroupeEmplacement: g1.id }).save();
        await new Emplacement({ emplacement1: 'Bureau', emplacement2: 'Bureau IT & Admin 102', id_GroupeEmplacement: g1.id }).save();
        await new Emplacement({ emplacement1: 'Bureau', emplacement2: 'Bureau Technique 202', id_GroupeEmplacement: g1.id }).save();
        await new Emplacement({ emplacement1: 'Bureau', emplacement2: 'Bureau Commercial 103', id_GroupeEmplacement: g1.id }).save();
        await new Emplacement({ emplacement1: 'Atelier', emplacement2: 'Zone Maintenance Hardware', id_GroupeEmplacement: g2.id }).save();
        await new Emplacement({ emplacement1: 'Atelier', emplacement2: 'Zone Diagnostic SAV', id_GroupeEmplacement: g2.id }).save();
        await new Emplacement({ emplacement1: 'Accueil', emplacement2: 'Hall d\'Accueil principal', id_GroupeEmplacement: g3.id }).save();
        await new Emplacement({ emplacement1: 'Accueil', emplacement2: 'Comptoir Réception Client', id_GroupeEmplacement: g3.id }).save();
      }
    }

    const emplacementsList = await Emplacement.find();
    const defaultEmpId = emplacementsList[0]?.id || '';

    // 1. Seed Roles in MongoDB if empty or missing
    const defaultRoles = [
      { nom: 'Responsable IT', description: 'Accès complet de gestion du Parc IT', couleur: 'indigo', isSystem: true },
      { nom: 'Directeur Général', description: 'Direction générale & stratégique', couleur: 'purple', isSystem: false },
      { nom: 'Responsable RH', description: 'Ressources Humaines & Recrutement', couleur: 'rose', isSystem: false },
      { nom: 'Directeur Commercial', description: 'Direction des ventes et concessions', couleur: 'blue', isSystem: false },
      { nom: 'Comptable & Finance', description: 'Gestion financière et facturation', couleur: 'emerald', isSystem: false },
      { nom: 'Chef de Projet', description: 'Pilotage et coordination des projets', couleur: 'cyan', isSystem: false },
      { nom: 'Technicien SAV', description: 'Support et maintenance véhicules & IT', couleur: 'amber', isSystem: false },
      { nom: 'Développeur Full-Stack', description: 'Ingénierie logicielle & intégration', couleur: 'teal', isSystem: false },
      { nom: 'Magasinier & Logistique', description: 'Gestion des pièces et stocks', couleur: 'orange', isSystem: false },
    ];

    const currentRolesInDb = await Role.find();
    for (const rData of defaultRoles) {
      const existingRole = currentRolesInDb.find(r => normalizeRoleName(r.nom) === normalizeRoleName(rData.nom));
      if (!existingRole) {
        const created = await new Role(rData).save();
        currentRolesInDb.push(created);
      }
    }

    const allRoles = await Role.find();
    const itRole = allRoles.find(r => normalizeRoleName(r.nom) === normalizeRoleName('Responsable IT')) || allRoles[0];
    const getRoleIdByName = (name: string) => {
      const target = normalizeRoleName(name);
      const found = allRoles.find(r => normalizeRoleName(r.nom) === target);
      return found?.id || itRole.id;
    };

    // 2. Database Migration: update all existing users to link with Role collection via id_Role and unset legacy role field
    const existingUsersInDb = await User.find();
    for (const u of existingUsersInDb) {
      const rawUser: any = u.toObject();
      let targetRoleId = u.id_Role;
      if (!targetRoleId || targetRoleId === '') {
        const legacyName = rawUser.role || 'Responsable IT';
        targetRoleId = getRoleIdByName(legacyName);
      }
      await User.findByIdAndUpdate(u._id, {
        $set: { id_Role: targetRoleId },
        $unset: { role: 1 },
      });
    }

    // 3. Seed & Sync Default Users in MongoDB
    const salt = await bcrypt.genSalt(10);
    const adminPassHash = await bcrypt.hash('Admin123!', salt);
    const respITPassHash = await bcrypt.hash('Password123!', salt);

    const defaultUsersToSeed = [
      // --- COMPTES UTILISATEURS IT (Avec mot de passe pour accès applicatif) ---
      {
        beneficiaire: 'Administrateur Système',
        email: 'admin@omoda-jaecoo.tn',
        password: adminPassHash,
        id_Role: getRoleIdByName('Responsable IT'),
        isSuperAdmin: true,
        id_Emplacement: emplacementsList[0]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Responsable IT',
        email: 'responsable.it@omoda-jaecoo.tn',
        password: respITPassHash,
        id_Role: getRoleIdByName('Responsable IT'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[1]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Ahmed Amin Nafti',
        email: 'ahmed.nafti@omoda-jaecoo.tn',
        password: respITPassHash,
        id_Role: getRoleIdByName('Responsable IT'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[1]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Ahmed Ammar',
        email: 'ahmed.am@omoda.tn',
        password: respITPassHash,
        id_Role: getRoleIdByName('Responsable IT'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[2]?.id || defaultEmpId,
      },

      // --- EMPLOYÉS BÉNÉFICIAIRES (Sans mot de passe applicatif) ---
      {
        beneficiaire: 'Yassine Skander',
        email: 'yassine.sk@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Directeur Général'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[0]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Maroua Khelifi',
        email: 'maroua.kh@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Responsable RH'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[1]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Sarra Louati',
        email: 'sarra.l@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Comptable & Finance'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[3]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Youssef Messaoudi',
        email: 'youssef.me@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Directeur Commercial'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[4]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Aymen Belhadj',
        email: 'aymen.b@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Technicien SAV'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[5]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Ines Triki',
        email: 'ines.t@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Chef de Projet'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[6]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Rania Mezghani',
        email: 'rania.m@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Magasinier & Logistique'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[7]?.id || emplacementsList[6]?.id || defaultEmpId,
      },
      {
        beneficiaire: 'Khaled Ben Ali',
        email: 'khaled.ba@omoda.tn',
        password: '',
        id_Role: getRoleIdByName('Directeur Commercial'),
        isSuperAdmin: false,
        id_Emplacement: emplacementsList[2]?.id || defaultEmpId,
      },
    ];

    for (const uData of defaultUsersToSeed) {
      const existing = await User.findOne({ email: uData.email.toLowerCase().trim() });
      if (!existing) {
        await new User(uData).save();
      } else {
        if (uData.password && !existing.password) {
          existing.password = uData.password;
        }
        if (!existing.id_Role) {
          existing.id_Role = uData.id_Role;
        }
        if (uData.isSuperAdmin !== undefined) {
          existing.isSuperAdmin = uData.isSuperAdmin;
        }
        await existing.save();
      }
    }

    // 4. Ensure Exactly ONE user has isSuperAdmin: true (The Designated Master Admin)
    const allSuperAdmins = await User.find({ isSuperAdmin: true });
    if (allSuperAdmins.length === 0) {
      const designatedAdmin = await User.findOne({ email: 'admin@omoda-jaecoo.tn' })
        || (await User.findOne({ id_Role: getRoleIdByName('Responsable IT') }));
      if (designatedAdmin) {
        designatedAdmin.isSuperAdmin = true;
        await designatedAdmin.save();
        console.log(`[SEED 🛡️] Super Admin désigné avec succès : ${designatedAdmin.email}`);
      }
    } else if (allSuperAdmins.length > 1) {
      const primaryAdmin = allSuperAdmins.find(u => u.email === 'admin@omoda-jaecoo.tn') || allSuperAdmins[0];
      for (const u of allSuperAdmins) {
        if (u._id.toString() !== primaryAdmin._id.toString()) {
          u.isSuperAdmin = false;
          await u.save();
        }
      }
      console.log(`[SEED 🛡️] Unicité du Super Admin confirmée : seul ${primaryAdmin.email} est Super Admin.`);
    }

    // Ensure all existing users have a valid id_Emplacement mapped to an existing Emplacement
    const existingUsers = await User.find();
    const allEmps = await Emplacement.find();
    if (allEmps.length > 0) {
      for (let i = 0; i < existingUsers.length; i++) {
        const u = existingUsers[i];
        const empExists = allEmps.some(e => e.id === u.id_Emplacement || e._id.toString() === u.id_Emplacement);
        if (!u.id_Emplacement || !empExists) {
          const assignedEmp = allEmps[i % allEmps.length];
          await User.findByIdAndUpdate(u._id, { id_Emplacement: assignedEmp.id });
        }
      }
    }

    // Seed Groupes Materiel if empty
    if ((await GroupeMateriel.countDocuments()) === 0) {
      await new GroupeMateriel({ nom: 'Ordinateurs', codeSerieObligatoire: true }).save();
      await new GroupeMateriel({ nom: 'Écrans', codeSerieObligatoire: false }).save();
      await new GroupeMateriel({ nom: 'Imprimantes', codeSerieObligatoire: true }).save();
      await new GroupeMateriel({ nom: 'Téléphones', codeSerieObligatoire: true }).save();
      await new GroupeMateriel({ nom: 'Serveurs', codeSerieObligatoire: true }).save();
      await new GroupeMateriel({ nom: 'Accessoires', codeSerieObligatoire: false }).save();
      await new GroupeMateriel({ nom: 'Réseau', codeSerieObligatoire: true }).save();
      await new GroupeMateriel({ nom: 'Autres', codeSerieObligatoire: false }).save();
    }

    // Seed Fournisseurs if empty
    if ((await Fournisseur.countDocuments()) === 0) {
      await new Fournisseur({
        Fournisseur: 'Tech Solutions',
        email: 'contact@techsolutions.tn',
        telephone: '+216 71 100 200',
        adresse: 'Les Berges du Lac, Tunis',
        matriculeFiscale: '1234567/A/M/000',
      }).save();

      await new Fournisseur({
        Fournisseur: 'Office Equip',
        email: 'sales@officeequip.tn',
        telephone: '+216 71 300 400',
        adresse: 'Avenue Habib Bourguiba, Tunis',
        matriculeFiscale: '9876543/B/M/000',
      }).save();

      await new Fournisseur({
        Fournisseur: 'IT Partner',
        email: 'info@itpartner.tn',
        telephone: '+216 73 500 600',
        adresse: 'ZI Akouda, Sousse',
        matriculeFiscale: '5566778/C/M/000',
      }).save();

      await new Fournisseur({
        Fournisseur: 'Global Tech',
        email: 'contact@globaltech.tn',
        telephone: '+216 74 700 800',
        adresse: 'Route de Teniour, Sfax',
        matriculeFiscale: '8899001/D/M/000',
      }).save();

      await new Fournisseur({
        Fournisseur: 'Dell Tunisie',
        email: 'support@dell.tn',
        telephone: '+216 71 900 111',
        adresse: 'Centre Urbain Nord, Tunis',
        matriculeFiscale: '3344556/E/M/000',
      }).save();

      await new Fournisseur({
        Fournisseur: 'HP Direct',
        email: 'order@hp.com.tn',
        telephone: '+216 71 222 333',
        adresse: 'Charguia 2, Tunis',
        matriculeFiscale: '6677889/F/M/000',
      }).save();
    }

    // Seed Factures if empty
    if ((await Facture.countDocuments()) === 0) {
      const frsList = await Fournisseur.find();
      const frs1 = frsList[0]?.id || '';
      const frs2 = frsList[1]?.id || '';
      const frs3 = frsList[2]?.id || '';
      const frs4 = frsList[3]?.id || '';
      const frs5 = frsList[4]?.id || '';
      const frs6 = frsList[5]?.id || '';

      await new Facture({
        factureFrs: 'FACT-2025-078',
        dateAcquisition: '2025-05-18',
        id_Fournisseur: frs1,
        montantHT: 12450,
        statut: 'Payée',
        datePaiement: '2025-05-20',
      }).save();

      await new Facture({
        factureFrs: 'FACT-2025-077',
        dateAcquisition: '2025-05-17',
        id_Fournisseur: frs2,
        montantHT: 5320,
        statut: 'Payée',
        datePaiement: '2025-05-19',
      }).save();

      await new Facture({
        factureFrs: 'FACT-2025-076',
        dateAcquisition: '2025-05-17',
        id_Fournisseur: frs3,
        montantHT: 8750,
        statut: 'Payée',
        datePaiement: '2025-05-18',
      }).save();

      await new Facture({
        factureFrs: 'FACT-2025-075',
        dateAcquisition: '2025-05-16',
        id_Fournisseur: frs4,
        montantHT: 3200,
        statut: 'En retard',
      }).save();

      await new Facture({
        factureFrs: 'FACT-2025-074',
        dateAcquisition: '2025-05-10',
        id_Fournisseur: frs5,
        montantHT: 18900,
        statut: 'Payée',
      }).save();

      await new Facture({
        factureFrs: 'FACT-2025-073',
        dateAcquisition: '2025-05-02',
        id_Fournisseur: frs6,
        montantHT: 6400,
        statut: 'Payée',
      }).save();
    }

    // Seed Materiels if empty
    if ((await Materiel.countDocuments()) === 0) {
      const gmList = await GroupeMateriel.find();
      const frsList = await Fournisseur.find();
      const fctList = await Facture.find();
      const empList = await Emplacement.find();
      const userList = await User.find();

      const getGm = (name: string) => gmList.find(g => g.nom.toLowerCase().includes(name.toLowerCase()))?.id || gmList[0]?.id || '';
      const getFrs = (idx: number) => frsList[idx]?.id || frsList[0]?.id || '';
      const getFct = (idx: number) => fctList[idx]?.id || fctList[0]?.id || '';
      const getEmp = (idx: number) => empList[idx]?.id || empList[0]?.id || '';
      const getUser = (idx: number) => userList[idx]?.id || userList[0]?.id || '';

      await new Materiel({
        reference: 'MBP-16-2024',
        ref_immo: 'IMM-2025-0001',
        designation: 'MacBook Pro 16"',
        description: 'Apple M3 Max 36GB RAM 1TB SSD',
        codeSerie: 'SN-APPLE-88910',
        qte: 1,
        valeurPlafond: 8500,
        dateEntree: '2025-05-18',
        statut: 'En service',
        garantie: '24 mois',
        id_GroupeMateriel: getGm('ordinateur'),
        id_Fournisseur: getFrs(0),
        id_Facture: getFct(0),
        id_Emplacement: getEmp(0),
        id_Beneficiaire: getUser(0),
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80'
      }).save();

      await new Materiel({
        reference: 'DELL-U2723QE',
        ref_immo: 'IMM-2025-0002',
        designation: 'Dell Monitor U2723QE',
        description: 'Écran 27 pouces 4K IPS USB-C',
        codeSerie: 'SN-DELL-99201',
        qte: 1,
        valeurPlafond: 2100,
        dateEntree: '2025-05-17',
        statut: 'En service',
        garantie: '36 mois',
        id_GroupeMateriel: getGm('écran'),
        id_Fournisseur: getFrs(1),
        id_Facture: getFct(1),
        id_Emplacement: getEmp(0),
        id_Beneficiaire: getUser(0),
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80'
      }).save();

      await new Materiel({
        reference: 'HP-LJP-M404',
        ref_immo: 'IMM-2025-0003',
        designation: 'HP LaserJet Pro M404dn',
        description: 'Imprimante laser réseau recto-verso',
        codeSerie: 'SN-HP-33291',
        qte: 1,
        valeurPlafond: 1450,
        dateEntree: '2025-05-17',
        statut: 'En service',
        garantie: '24 mois',
        id_GroupeMateriel: getGm('imprimante'),
        id_Fournisseur: getFrs(2),
        id_Facture: getFct(2),
        id_Emplacement: getEmp(1),
        id_Beneficiaire: getUser(1),
        image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=300&q=80'
      }).save();

      await new Materiel({
        reference: 'IPH-15PRO-256',
        ref_immo: 'IMM-2025-0004',
        designation: 'iPhone 15 Pro 256GB',
        description: 'Smartphone professionnel Titane',
        codeSerie: 'SN-IPHONE-77821',
        qte: 1,
        valeurPlafond: 4200,
        dateEntree: '2025-05-16',
        statut: 'En service',
        garantie: '12 mois',
        id_GroupeMateriel: getGm('téléphone'),
        id_Fournisseur: getFrs(3),
        id_Facture: getFct(3),
        id_Emplacement: getEmp(0),
        id_Beneficiaire: getUser(3),
        image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=300&q=80'
      }).save();

      await new Materiel({
        reference: 'DELL-R750-SRV',
        ref_immo: 'IMM-2025-0005',
        designation: 'Dell PowerEdge R750',
        description: 'Serveur Rack 2U Intel Xeon Gold 64GB',
        codeSerie: 'SN-SRV-66512',
        qte: 1,
        valeurPlafond: 18900,
        dateEntree: '2025-05-10',
        statut: 'En service',
        garantie: '36 mois',
        id_GroupeMateriel: getGm('serveur'),
        id_Fournisseur: getFrs(4),
        id_Facture: getFct(4),
        id_Emplacement: getEmp(2),
        id_Beneficiaire: getUser(1),
      }).save();

      await new Materiel({
        reference: 'CSCO-CAT-24P',
        ref_immo: 'IMM-2025-0006',
        designation: 'Switch Cisco Catalyst 24p',
        description: 'Switch Gigabit PoE managé',
        codeSerie: 'SN-SW-44120',
        qte: 1,
        valeurPlafond: 3400,
        dateEntree: '2025-05-02',
        statut: 'En service',
        garantie: '60 mois',
        id_GroupeMateriel: getGm('réseau'),
        id_Fournisseur: getFrs(5),
        id_Facture: getFct(5),
        id_Emplacement: getEmp(2),
        id_Beneficiaire: getUser(2),
      }).save();

      await new Materiel({
        reference: 'LOGI-MX-KIT',
        designation: 'Kit Clavier & Souris Logitech MX',
        description: 'Accessoires ergonomiques sans-fil',
        codeSerie: 'SN-LOGI-11029',
        qte: 1,
        valeurPlafond: 450,
        dateEntree: '2025-05-18',
        statut: 'En service',
        garantie: '24 mois',
        id_GroupeMateriel: getGm('accessoire'),
        id_Fournisseur: getFrs(0),
        id_Facture: getFct(0),
        id_Emplacement: getEmp(1),
        id_Beneficiaire: getUser(4),
      }).save();

      await new Materiel({
        reference: 'LNVO-TP-T14',
        designation: 'Lenovo ThinkPad T14 Gen 4',
        description: 'PC portable atelier diagnostic',
        codeSerie: 'SN-LNVO-99011',
        qte: 1,
        valeurPlafond: 3800,
        dateEntree: '2025-04-10',
        statut: 'En panne',
        garantie: '24 mois',
        id_GroupeMateriel: getGm('ordinateur'),
        id_Fournisseur: getFrs(1),
        id_Facture: getFct(1),
        id_Emplacement: getEmp(4),
        id_Beneficiaire: getUser(5),
      }).save();
    }

    // Seed Sample Reclamations if none exist
    if ((await Reclamation.countDocuments()) === 0) {
      const sampleUsers = await User.find();
      const allGms = await GroupeMateriel.find();
      const gm1 = allGms[0]?.id || '';
      const gm2 = allGms[1]?.id || gm1;

      if (sampleUsers.length > 0) {
        const uYassine = sampleUsers.find(u => u.email.includes('yassine')) || sampleUsers[0];
        const uSarah = sampleUsers.find(u => u.email.includes('sarah')) || sampleUsers[1] || sampleUsers[0];
        const itAdmin = sampleUsers.find(u => u.email.includes('admin') || u.email.includes('ahmed')) || sampleUsers[0];

        await new Reclamation({
          code: 'REC-2026-0001',
          titre: 'Écran secondaire clignote et s\'éteint par intermittence',
          description: 'Depuis ce matin, le moniteur Dell branché en HDMI sur mon PC portable s\'éteint toutes les 2 minutes puis se rallume avec des artefacts visuels.',
          nature: 'autre',
          categoriesIds: gm1 ? [gm1] : [],
          id_GroupeMateriel: gm1,
          priorite: 'Haute',
          statut: 'En cours',
          delaiTraitementHeures: 8,
          id_Demandeur: uYassine.id,
          demandeurNom: uYassine.beneficiaire,
          demandeurEmail: uYassine.email,
          id_TechnicienAssigne: itAdmin.id,
          technicienNom: itAdmin.beneficiaire,
          historique: [
            {
              date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
              auteur: uYassine.beneficiaire,
              role: 'Collaborateur',
              message: 'Ticket de réclamation créé.',
              typeAction: 'creation',
            },
            {
              date: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
              auteur: itAdmin.beneficiaire,
              role: 'Responsable IT',
              message: 'Prise en charge par le support IT. Câble HDMI de rechange commandé pour test.',
              typeAction: 'statut',
            },
          ],
        }).save();

        await new Reclamation({
          code: 'REC-2026-0002',
          titre: 'Demande de configuration accès VPN pour télétravail',
          description: 'Besoin d\'installer le client VPN OMODA sur mon portable professionnel pour la permanence de fin de semaine.',
          nature: 'autre',
          categoriesIds: gm2 ? [gm2] : [],
          id_GroupeMateriel: gm2,
          priorite: 'Moyenne',
          statut: 'Résolue',
          delaiTraitementHeures: 4,
          id_Demandeur: uSarah.id,
          demandeurNom: uSarah.beneficiaire,
          demandeurEmail: uSarah.email,
          id_TechnicienAssigne: itAdmin.id,
          technicienNom: itAdmin.beneficiaire,
          solution: 'Configuration du profil VPN effectuée à distance et certificat installé avec succès.',
          dateResolution: new Date(),
          historique: [
            {
              date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
              auteur: uSarah.beneficiaire,
              role: 'Collaborateur',
              message: 'Ticket de réclamation créé.',
              typeAction: 'creation',
            },
            {
              date: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
              auteur: itAdmin.beneficiaire,
              role: 'Responsable IT',
              message: 'Résolu : Profil VPN configuré avec succès.',
              typeAction: 'resolution',
            },
          ],
        }).save();
      }
    }

    console.log('Database initialization check complete.');
  } catch (err) {
    console.error('Error seeding initial database:', err);
  }
}

// Controller Methods
export async function login(req: Request, res: Response) {
  try {
    const { email, password, role } = req.body;

    const validation = validateLoginData({ email, password });
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message || 'Données de connexion invalides.',
        field: validation.field,
      });
    }

    const normEmail = String(email).toLowerCase().trim();

    // 1. Find user from DB or Fallback Seed
    let user: any = null;
    try {
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ email: normEmail });
      }
    } catch (dbErr) {
      console.warn('[AUTH] Connexion DB non active pour User.findOne:', dbErr);
    }

    // Fallback user if DB is not populated or offline
    if (!user) {
      const fb = DEFAULT_USERS_LIST.find(u => u.email.toLowerCase() === normEmail);
      if (fb) {
        user = { ...fb };
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Check if user status is active
    if (user.statut === 'Inactif') {
      return res.status(403).json({ 
        code: 'ACCOUNT_DISABLED', 
        message: 'Ce compte utilisateur a été désactivé par la DSI. Veuillez contacter l\'administrateur.' 
      });
    }

    // Check if user has an active password and app access
    if (user.accesApp === 'NONE' || !user.password || user.password.trim() === '') {
      return res.status(401).json({
        message: "Ce collaborateur n'a pas de compte d'accès actif (aucun mot de passe configuré). Veuillez contacter le Responsable IT.",
      });
    }

    // Compare password (supports bcrypt hash or direct match in fallback/testing)
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Resolve user's real role from Role collection or user record
    const { id_Role, roleName } = await resolveUserRole(user.id_Role, (user as any).role);

    // If role was selected in the login form, verify that it matches user's assigned role in database
    if (role && String(role).trim() !== '') {
      const selectedNorm = normalizeRoleName(String(role).trim());
      const userRoleNorm = normalizeRoleName(roleName);
      if (selectedNorm !== userRoleNorm) {
        return res.status(403).json({
          message: `Le rôle sélectionné ("${role}") ne correspond pas au profil de cet utilisateur ("${roleName}").`,
          field: 'role',
        });
      }
    }

    const resolvedAccesApp = user.accesApp || (roleName === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS');

    // Generate tokens (Access: 15m, Refresh: 7d)
    const userId = user.id || user._id?.toString() || 'user_default';
    const { accessToken, refreshToken } = generateTokens({
      id: userId,
      email: user.email,
      id_Role,
      role: roleName,
      beneficiaire: user.beneficiaire,
      accesApp: resolvedAccesApp,
      isSuperAdmin: !!user.isSuperAdmin,
    });

    const now = Date.now();
    const expiresAt = new Date(now + REFRESH_EXPIRY_MS);
    const absoluteExpiresAt = new Date(now + MAX_SESSION_MS);
    const sessionFamily = crypto.randomUUID();
    const tokenHash = hashToken(refreshToken);

    // Create session in MongoDB with hashed Refresh Token if connected
    try {
      if (mongoose.connection.readyState === 1 && user._id) {
        await new Session({
          userId: user._id,
          refreshTokenHash: tokenHash,
          sessionFamily,
          expiresAt,
          absoluteExpiresAt,
          createdAt: new Date(now),
          lastUsedAt: new Date(now),
          userAgent: req.headers['user-agent'] || '',
          ipAddress: req.ip || req.socket.remoteAddress || '',
        }).save();
      }
    } catch (sErr) {
      console.warn('[AUTH] Session log non persistée en DB (mode mémoire):', sErr);
    }

    // Update last activity
    try {
      if (user.save && typeof user.save === 'function') {
        user.derniereActivite = "À l'instant";
        await user.save();
      }
    } catch (uErr) {}

    // Set Refresh Token in secure HttpOnly Cookie
    res.cookie('parcit_refresh_token', refreshToken, getRefreshCookieOptions(REFRESH_EXPIRY_MS, req));

    // Safe masked log (No full tokens)
    logTokenEvent('CONNEXION RÉUSSIE (LOGIN)', { email: user.email, id: userId, role: roleName }, {
      accessExpiresIn: env.ACCESS_TOKEN_EXPIRY,
      sessionExpiresIn: env.REFRESH_TOKEN_EXPIRY,
    });

    const decodedAccess: any = jwt.decode(accessToken);

    return res.json({
      message: 'Connexion réussie',
      user: {
        id: userId,
        beneficiaire: user.beneficiaire,
        email: user.email,
        photo: user.photo || '',
        id_Role,
        role: roleName,
        accesApp: resolvedAccesApp,
        isSuperAdmin: !!user.isSuperAdmin,
        statut: user.statut || 'Actif',
        id_Emplacement: user.id_Emplacement || '1',
        derniereActivite: user.derniereActivite || "À l'instant",
      },
      accessToken,
      refreshToken,
      expiresIn: Math.floor(ACCESS_EXPIRY_MS / 1000),
      accessTokenExpiresAt: decodedAccess?.exp ? decodedAccess.exp * 1000 : now + ACCESS_EXPIRY_MS,
      sessionExpiresAt: expiresAt.getTime(),
      maxSessionExpiresAt: absoluteExpiresAt.getTime(),
      refreshBeforeExpirySec: Math.floor(REFRESH_BEFORE_EXPIRY_MS / 1000),
      sessionWarningBeforeExpirySec: Math.floor(SESSION_WARNING_BEFORE_EXPIRY_MS / 1000),
    });
  } catch (error: any) {
    console.error('[AUTH] Erreur lors de la connexion:', error);
    return res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    // Read token from HttpOnly cookie (primary) or fallback to body/header (if passed)
    const token = req.cookies?.parcit_refresh_token || req.body?.refreshToken || (req.headers['x-refresh-token'] as string);

    if (!token) {
      return res.status(401).json({ code: 'NO_REFRESH_TOKEN', message: 'Token de rafraîchissement absent' });
    }

    // 1. Verify JWT signature & expiration
    let decoded: any;
    try {
      decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] });
    } catch (err: any) {
      res.clearCookie('parcit_refresh_token', getRefreshCookieOptions(0, req));
      return res.status(401).json({ 
        code: 'SESSION_EXPIRED', 
        message: 'Session expirée. Veuillez vous reconnecter.' 
      });
    }

    const now = Date.now();
    const currentHash = hashToken(token);

    // If MongoDB is offline, rotate tokens based on decoded JWT payload
    if (mongoose.connection.readyState !== 1) {
      const { id_Role, roleName } = await resolveUserRole(decoded.id_Role, decoded.role);
      const resolvedAccesApp = decoded.accesApp || (roleName === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS');
      const tokens = generateTokens({
        id: decoded.id,
        email: decoded.email,
        id_Role,
        role: roleName,
        beneficiaire: decoded.beneficiaire,
        accesApp: resolvedAccesApp,
        isSuperAdmin: !!decoded.isSuperAdmin,
      });

      res.cookie('parcit_refresh_token', tokens.refreshToken, getRefreshCookieOptions(REFRESH_EXPIRY_MS, req));
      const decodedNewAccess: any = jwt.decode(tokens.accessToken);

      return res.json({
        message: 'Session rafraîchie avec succès',
        user: {
          id: decoded.id,
          beneficiaire: decoded.beneficiaire,
          email: decoded.email,
          photo: decoded.photo || '',
          id_Role,
          role: roleName,
          accesApp: resolvedAccesApp,
          isSuperAdmin: !!decoded.isSuperAdmin,
          statut: 'Actif',
          id_Emplacement: '1',
          derniereActivite: "À l'instant",
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: Math.floor(ACCESS_EXPIRY_MS / 1000),
        accessTokenExpiresAt: decodedNewAccess?.exp ? decodedNewAccess.exp * 1000 : now + ACCESS_EXPIRY_MS,
        sessionExpiresAt: now + REFRESH_EXPIRY_MS,
        maxSessionExpiresAt: now + MAX_SESSION_MS,
        refreshBeforeExpirySec: Math.floor(REFRESH_BEFORE_EXPIRY_MS / 1000),
        sessionWarningBeforeExpirySec: Math.floor(SESSION_WARNING_BEFORE_EXPIRY_MS / 1000),
      });
    }

    // 2. Hash token to look up MongoDB session
    const session = await Session.findOne({ refreshTokenHash: currentHash });

    // 3. Reuse / Compromise Detection
    if (!session) {
      // Check if this was a previously revoked token (theft attempt)
      const compromisedSession = await Session.findOne({ 
        userId: decoded.id, 
        revokedAt: { $ne: null } 
      }).sort({ createdAt: -1 });

      if (compromisedSession) {
        console.warn(`[AUTH ALERTE SÉCURITÉ] Tentative de réutilisation d'un Refresh Token révoqué ! Révocation de toutes les sessions actives de la famille ${compromisedSession.sessionFamily}...`);
        await Session.updateMany(
          { sessionFamily: compromisedSession.sessionFamily },
          { $set: { revokedAt: new Date() } }
        );
      }

      res.clearCookie('parcit_refresh_token', getRefreshCookieOptions(0, req));
      return res.status(401).json({ 
        code: 'TOKEN_COMPROMISED_OR_INVALID', 
        message: 'Session invalide ou déjà révoquée. Veuillez vous reconnecter.' 
      });
    }

    if (session.revokedAt) {
      console.warn(`[AUTH ALERTE SÉCURITÉ] Token révoqué présenté pour la session ${session._id}. Révocation d'urgence de la famille ${session.sessionFamily}...`);
      await Session.updateMany(
        { sessionFamily: session.sessionFamily },
        { $set: { revokedAt: new Date() } }
      );
      res.clearCookie('parcit_refresh_token', getRefreshCookieOptions(0, req));
      return res.status(401).json({ 
        code: 'TOKEN_REUSED_COMPROMISED', 
        message: 'Alerte de sécurité: Session révoquée. Veuillez vous reconnecter.' 
      });
    }

    // 4. Verify Expiration & Max Absolute Expiration
    if (session.expiresAt.getTime() <= now || session.absoluteExpiresAt.getTime() <= now) {
      session.revokedAt = new Date(now);
      await session.save();
      res.clearCookie('parcit_refresh_token', getRefreshCookieOptions(0, req));
      return res.status(401).json({ 
        code: 'MAX_SESSION_REACHED', 
        message: 'Durée maximale de session atteinte (30 jours). Veuillez vous reconnecter.' 
      });
    }

    // 5. Verify User
    const user = await User.findById(session.userId);
    if (!user || user.statut === 'Inactif') {
      session.revokedAt = new Date(now);
      await session.save();
      res.clearCookie('parcit_refresh_token', getRefreshCookieOptions(0, req));
      return res.status(403).json({ 
        code: 'ACCOUNT_DISABLED', 
        message: 'Compte utilisateur inactif ou introuvable.' 
      });
    }

    // 6. Token Rotation: Invalidate current session
    session.revokedAt = new Date(now);
    session.lastUsedAt = new Date(now);
    await session.save();

    // 7. Calculate new sliding expiration (bounded by absolute limit)
    const proposedExpiry = now + REFRESH_EXPIRY_MS;
    const finalExpiryTime = Math.min(proposedExpiry, session.absoluteExpiresAt.getTime());
    const newExpiresAt = new Date(finalExpiryTime);

    // Resolve user's role from Role collection or user record
    const { id_Role, roleName } = await resolveUserRole(user.id_Role, (user as any).role);
    const resolvedAccesApp = user.accesApp || (roleName === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS');

    // 8. Generate new Tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      id_Role,
      role: roleName,
      beneficiaire: user.beneficiaire,
      accesApp: resolvedAccesApp,
      isSuperAdmin: !!user.isSuperAdmin,
    });

    const newHash = hashToken(tokens.refreshToken);

    // 9. Save new rotated session in MongoDB
    await new Session({
      userId: user._id,
      refreshTokenHash: newHash,
      sessionFamily: session.sessionFamily,
      expiresAt: newExpiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      createdAt: new Date(now),
      lastUsedAt: new Date(now),
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || req.socket.remoteAddress || '',
    }).save();

    // 10. Update HttpOnly cookie with new Refresh Token
    const remainingSessionMs = Math.max(0, finalExpiryTime - now);
    res.cookie('parcit_refresh_token', tokens.refreshToken, getRefreshCookieOptions(remainingSessionMs, req));

    // Format remaining time in a human-readable way (days, hours, or minutes)
    const formatRemainingDuration = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      if (totalSec >= 86400) {
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        return `${days}j ${hours > 0 ? hours + 'h ' : ''}restants`;
      }
      if (totalSec >= 3600) {
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        return `${hours}h ${minutes > 0 ? minutes + 'm ' : ''}restants`;
      }
      const minutes = Math.floor(totalSec / 60);
      return `${minutes}m restants`;
    };

    // Safe masked log
    logTokenEvent('ROTATION SESSION & REFRESH TOKEN', { ...user.toObject(), role: roleName }, {
      accessExpiresIn: env.ACCESS_TOKEN_EXPIRY,
      sessionExpiresIn: formatRemainingDuration(remainingSessionMs),
    });

    const decodedAccess: any = jwt.decode(tokens.accessToken);

    return res.json({
      message: 'Session prolongée avec succès',
      user: {
        id: user.id,
        beneficiaire: user.beneficiaire,
        email: user.email,
        photo: user.photo || '',
        id_Role,
        role: roleName,
        accesApp: resolvedAccesApp,
        isSuperAdmin: !!user.isSuperAdmin,
        statut: user.statut || 'Actif',
        id_Emplacement: user.id_Emplacement,
        derniereActivite: user.derniereActivite,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: Math.floor(ACCESS_EXPIRY_MS / 1000),
      accessTokenExpiresAt: decodedAccess?.exp ? decodedAccess.exp * 1000 : now + ACCESS_EXPIRY_MS,
      sessionExpiresAt: finalExpiryTime,
      maxSessionExpiresAt: session.absoluteExpiresAt.getTime(),
      refreshBeforeExpirySec: Math.floor(REFRESH_BEFORE_EXPIRY_MS / 1000),
      sessionWarningBeforeExpirySec: Math.floor(SESSION_WARNING_BEFORE_EXPIRY_MS / 1000),
    });
  } catch (error: any) {
    console.error('[AUTH] Erreur refresh session:', error);
    return res.status(500).json({ message: 'Erreur de rafraîchissement de session', error: error.message });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies?.parcit_refresh_token || req.body?.refreshToken || (req.headers['x-refresh-token'] as string);
    if (token) {
      const tokenHash = hashToken(token);
      const session = await Session.findOne({ refreshTokenHash: tokenHash });
      if (session) {
        session.revokedAt = new Date();
        await session.save();
        console.log(`[AUTH] Session révoquée en base MongoDB pour l'utilisateur ID: ${session.userId}`);
      }
    }

    res.clearCookie('parcit_refresh_token', getRefreshCookieOptions(0, req));
    return res.json({ message: 'Déconnexion réussie et session révoquée' });
  } catch (error: any) {
    console.error('[AUTH] Erreur logout:', error);
    res.clearCookie('parcit_refresh_token', getRefreshCookieOptions(0, req));
    return res.status(500).json({ message: 'Erreur lors de la déconnexion' });
  }
}

export async function getAuthConfig(_req: Request, res: Response) {
  try {
    return res.json({
      accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY || '20m',
      refreshTokenExpiry: env.REFRESH_TOKEN_EXPIRY || '1d',
      refreshBeforeExpiry: env.REFRESH_BEFORE_EXPIRY || '1m',
      sessionWarningBeforeExpiry: env.SESSION_WARNING_BEFORE_EXPIRY || '1m',
      maxSessionDuration: env.MAX_SESSION_DURATION || '5d',
      accessTokenExpirySec: Math.floor((ACCESS_EXPIRY_MS || 1200000) / 1000),
      refreshTokenExpirySec: Math.floor((REFRESH_EXPIRY_MS || 86400000) / 1000),
      refreshBeforeExpirySec: Math.floor((REFRESH_BEFORE_EXPIRY_MS || 60000) / 1000),
      sessionWarningBeforeExpirySec: Math.floor((SESSION_WARNING_BEFORE_EXPIRY_MS || 60000) / 1000),
      maxSessionDurationSec: Math.floor((MAX_SESSION_MS || 432000000) / 1000),
    });
  } catch (err: any) {
    return res.json({
      accessTokenExpiry: '20m',
      refreshTokenExpiry: '1d',
      refreshBeforeExpiry: '1m',
      sessionWarningBeforeExpiry: '1m',
      maxSessionDuration: '5d',
      accessTokenExpirySec: 1200,
      refreshTokenExpirySec: 86400,
      refreshBeforeExpirySec: 60,
      sessionWarningBeforeExpirySec: 60,
      maxSessionDurationSec: 432000,
    });
  }
}

export async function getActiveRoles(_req: Request, res: Response) {
  const fallbackRoles = [
    'Responsable IT',
    'Chef de Projet',
    'Comptable & Finance',
    'Directeur Commercial',
    'Directeur Général',
    'Développeur Full-Stack',
    'Magasinier & Logistique',
    'Responsable RH',
    'Technicien SAV',
  ];

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        roles: fallbackRoles,
        count: fallbackRoles.length,
      });
    }

    const allRoles = await Role.find();
    const roleNamesSet = new Set<string>();

    for (const r of allRoles) {
      if (r.nom && r.nom.trim()) {
        roleNamesSet.add(r.nom.trim());
      }
    }

    // Also include any active users' custom roles
    try {
      const activeUsers = await User.find({
        statut: 'Actif',
        password: { $exists: true, $ne: '' },
      });

      for (const u of activeUsers) {
        const matchedRole = allRoles.find(r => r.id === u.id_Role || r._id.toString() === u.id_Role);
        if (matchedRole && matchedRole.nom) {
          roleNamesSet.add(matchedRole.nom.trim());
        } else if ((u as any).role) {
          roleNamesSet.add(String((u as any).role).trim());
        }
      }
    } catch (uErr) {}

    // Always ensure Responsable IT is present
    roleNamesSet.add('Responsable IT');

    const sortedRoles = Array.from(roleNamesSet).sort((a, b) => {
      if (a === 'Responsable IT') return -1;
      if (b === 'Responsable IT') return 1;
      return a.localeCompare(b);
    });

    return res.json({
      roles: sortedRoles.length > 0 ? sortedRoles : fallbackRoles,
      count: sortedRoles.length > 0 ? sortedRoles.length : fallbackRoles.length,
    });
  } catch (err: any) {
    return res.json({ roles: fallbackRoles, count: fallbackRoles.length });
  }
}

export async function getMe(req: any, res: Response) {
  try {
    let user: any = null;
    try {
      if (mongoose.connection.readyState === 1) {
        user = await User.findById(req.user.id);
      }
    } catch (e) {}

    if (!user) {
      const normEmail = String(req.user?.email || '').toLowerCase().trim();
      const fb = DEFAULT_USERS_LIST.find(u => u.email.toLowerCase() === normEmail || u.id === req.user?.id);
      user = fb || req.user;
    }

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const { id_Role, roleName } = await resolveUserRole(user.id_Role || req.user?.id_Role, (user as any).role || req.user?.role);
    const resolvedAccesApp = user.accesApp || req.user?.accesApp || (roleName === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS');
    return res.json({
      id: user.id || user._id?.toString() || req.user?.id,
      beneficiaire: user.beneficiaire || req.user?.beneficiaire || 'Utilisateur',
      email: user.email || req.user?.email,
      photo: user.photo || req.user?.photo || '',
      id_Role,
      role: roleName,
      accesApp: resolvedAccesApp,
      isSuperAdmin: !!(user.isSuperAdmin ?? req.user?.isSuperAdmin),
      statut: user.statut || req.user?.statut || 'Actif',
      id_Emplacement: user.id_Emplacement || req.user?.id_Emplacement || '1',
      derniereActivite: user.derniereActivite || "À l'instant",
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}

// ================= MODIFIER LE MOT DE PASSE (AVEC ANCIEN MOT DE PASSE) =================
export async function changePassword(req: any, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit être différent de l\'ancien mot de passe.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    // Check old password
    if (user.password && user.password.length > 0) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ 
          field: 'currentPassword',
          message: 'L\'ancien mot de passe saisi est incorrect.' 
        });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.derniereActivite = "À l'instant";
    await user.save();

    // Send professional notification email
    try {
      await sendPasswordChangedEmail({
        email: user.email,
        beneficiaire: user.beneficiaire,
        methode: 'ANCIEN_MOT_DE_PASSE',
      });
      console.log(`[PROFILE 🔐] Mot de passe modifié pour ${user.email} et email de confirmation envoyé.`);
    } catch (mailErr) {
      console.error('[PROFILE ⚠️] Erreur envoi email confirmation mot de passe:', mailErr);
    }

    return res.json({
      success: true,
      message: 'Votre mot de passe a été modifié avec succès. Un email de confirmation vous a été envoyé.',
    });
  } catch (err: any) {
    console.error('[PROFILE] Erreur changePassword:', err);
    return res.status(500).json({ message: err.message || 'Erreur lors du changement de mot de passe' });
  }
}

// ================= DEMANDE DE CODE OTP POUR MOT DE PASSE OUBLIÉ =================
export async function requestPasswordResetOtp(req: any, res: Response) {
  try {
    const targetEmail = (req.body.email || req.user?.email || '').toLowerCase().trim();
    if (!targetEmail) {
      return res.status(400).json({ message: 'Adresse email obligatoire pour la demande de code OTP.' });
    }

    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      return res.status(404).json({ message: `Aucun compte associé à l'adresse email "${targetEmail}".` });
    }

    if (user.statut === 'Inactif') {
      return res.status(403).json({ message: 'Ce compte utilisateur est désactivé. Veuillez contacter le Responsable IT.' });
    }

    // Generate a 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    user.resetPasswordOtp = otpCode;
    user.resetPasswordOtpExpires = expiresAt;
    await user.save();

    // Send professional OTP email
    const mailResult = await sendOtpResetEmail({
      email: user.email,
      beneficiaire: user.beneficiaire,
      otpCode,
      expiresMinutes: 15,
    });

    console.log(`[PROFILE 🛡️ OTP] Code OTP généré pour ${user.email} : ${otpCode} (Expire à ${expiresAt.toLocaleTimeString()})`);

    return res.json({
      success: true,
      isSimulation: mailResult.isSimulation,
      message: `Un code de sécurité (OTP) à 6 chiffres a été envoyé à ${user.email}. Il est valable pendant 15 minutes.`,
      email: user.email,
    });
  } catch (err: any) {
    console.error('[PROFILE] Erreur requestPasswordResetOtp:', err);
    return res.status(500).json({ message: err.message || 'Erreur lors de l\'envoi du code OTP' });
  }
}

// ================= RÉINITIALISATION AVEC CODE OTP =================
export async function resetPasswordWithOtp(req: any, res: Response) {
  try {
    const { otpCode, newPassword, confirmPassword } = req.body;
    const targetEmail = (req.body.email || req.user?.email || '').toLowerCase().trim();

    if (!otpCode || !otpCode.trim()) {
      return res.status(400).json({ message: 'Veuillez saisir le code OTP reçu par email.' });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Veuillez saisir et confirmer votre nouveau mot de passe.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }

    let user: any = null;
    if (targetEmail) {
      user = await User.findOne({ email: targetEmail });
    } else if (req.user?.id) {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    // Verify OTP code
    const cleanOtp = String(otpCode).replace(/\s+/g, '').trim();
    if (!user.resetPasswordOtp || user.resetPasswordOtp !== cleanOtp) {
      return res.status(400).json({ 
        field: 'otpCode',
        message: 'Le code OTP saisi est incorrect ou a déjà été utilisé.' 
      });
    }

    // Check expiration
    if (!user.resetPasswordOtpExpires || new Date() > new Date(user.resetPasswordOtpExpires)) {
      return res.status(400).json({ 
        field: 'otpCode',
        message: 'Le code OTP a expiré. Veuillez en demander un nouveau.' 
      });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.derniereActivite = "À l'instant";
    await user.save();

    // Send confirmation email
    try {
      await sendPasswordChangedEmail({
        email: user.email,
        beneficiaire: user.beneficiaire,
        methode: 'CODE_OTP',
      });
      console.log(`[PROFILE 🔐] Mot de passe réinitialisé via OTP pour ${user.email} et email de confirmation délivré.`);
    } catch (mailErr) {
      console.error('[PROFILE ⚠️] Erreur envoi confirmation mot de passe OTP:', mailErr);
    }

    return res.json({
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès ! Un email de confirmation vous a été envoyé.',
    });
  } catch (err: any) {
    console.error('[PROFILE] Erreur resetPasswordWithOtp:', err);
    return res.status(500).json({ message: err.message || 'Erreur lors de la réinitialisation du mot de passe' });
  }
}

// ================= METTRE À JOUR LE PROFIL (PHOTO, NOM, ETC.) =================
export async function updateProfile(req: any, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }

    const { photo, beneficiaire } = req.body;
    let user: any = null;
    try {
      if (mongoose.connection.readyState === 1) {
        user = await User.findById(userId) || await User.findOne({ email: req.user?.email });
      }
    } catch (e) {}

    if (!user) {
      const fbIndex = DEFAULT_USERS_LIST.findIndex(u => u.id === userId || u.email === req.user?.email);
      if (fbIndex >= 0) {
        user = DEFAULT_USERS_LIST[fbIndex];
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const targetUserId = user._id?.toString() || user.id || userId;

    if (photo !== undefined) {
      if (!photo || photo.trim() === '') {
        // Remove avatar
        deleteAvatarFile(user.photo);
        user.photo = '';
      } else if (typeof photo === 'string' && photo.startsWith('data:image/')) {
        // Save base64 image to backend disk folder and get URL
        const savedUrl = saveAvatarBase64(photo, targetUserId);
        user.photo = savedUrl;
      } else if (typeof photo === 'string') {
        user.photo = photo.trim();
      }
    }

    if (beneficiaire && beneficiaire.trim()) {
      user.beneficiaire = beneficiaire.trim();
    }
    user.derniereActivite = "À l'instant";

    if (typeof user.save === 'function') {
      await user.save();
    }

    // Keep fallback list synchronized
    const fbIdx = DEFAULT_USERS_LIST.findIndex(u => u.id === targetUserId || u.email === user.email);
    if (fbIdx >= 0) {
      if (user.photo !== undefined) (DEFAULT_USERS_LIST[fbIdx] as any).photo = user.photo;
      if (user.beneficiaire) DEFAULT_USERS_LIST[fbIdx].beneficiaire = user.beneficiaire;
    }

    const { id_Role, roleName } = await resolveUserRole(user.id_Role, (user as any).role);
    const resolvedAccesApp = user.accesApp || (roleName === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS');

    console.log(`[PROFILE 💾] Profil mis à jour pour ${user.email} (Photo URL: "${user.photo || 'aucune'}")`);

    return res.json({
      success: true,
      message: 'Photo et profil mis à jour avec succès.',
      user: {
        id: user.id || user._id?.toString(),
        beneficiaire: user.beneficiaire,
        email: user.email,
        photo: user.photo || '',
        id_Role,
        role: roleName,
        accesApp: resolvedAccesApp,
        isSuperAdmin: !!user.isSuperAdmin,
        statut: user.statut || 'Actif',
        id_Emplacement: user.id_Emplacement || '1',
        derniereActivite: user.derniereActivite || "À l'instant",
      }
    });
  } catch (err: any) {
    console.error('[PROFILE] Erreur updateProfile:', err);
    return res.status(500).json({ message: err.message || 'Erreur lors de la mise à jour du profil' });
  }
}

