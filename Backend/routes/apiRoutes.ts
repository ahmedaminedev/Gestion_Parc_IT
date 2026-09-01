import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Materiel } from '../models/Materiel';
import { Emplacement } from '../models/Emplacement';
import { GroupeEmplacement } from '../models/GroupeEmplacement';
import { GroupeMateriel } from '../models/GroupeMateriel';
import { Facture } from '../models/Facture';
import { Fournisseur } from '../models/Fournisseur';
import { Reclamation } from '../models/Reclamation';
import { EmailLog } from '../models/EmailLog';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { sendWelcomeEmail, getSmtpConfigSummary, testSmtpConnection } from '../services/mailService';
import { saveAvatarBase64, deleteAvatarFile } from '../services/uploadService';
import { verifyToken } from '../middleware/auth';
import { getDashboardStats } from '../controllers/dashboardController';
import {
  safeFindDoc,
  validateMaterielData,
  validateGroupeMaterielData,
  validateFactureData,
  validateFournisseurData,
  validateEmplacementData,
  validateGroupeEmplacementData,
  validateUserData,
  validateReclamationData,
  canDeleteGroupeMateriel,
  canDeleteFacture,
  canDeleteFournisseur,
  canDeleteEmplacement,
  canDeleteGroupeEmplacement,
  canDeleteUser,
  canDeleteRole,
} from '../validators/businessValidators';

const router = Router();

// Apply auth middleware to API routes if desired, or allow read / write
router.use(verifyToken);

// Helper: normalize role name for insensitive comparison (case, accents, spaces, hyphens, underscores)
export function normalizeRoleName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents (é -> e, etc.)
    .replace(/[^a-z0-9]/g, ''); // strip spaces, hyphens, underscores, dots, etc.
}

// ================= DASHBOARD ANALYTICS & STATS =================
router.get('/dashboard/stats', getDashboardStats);

// ================= ROLES (CRUD RÔLES) =================
router.get('/roles', async (_req, res) => {
  try {
    const roles = await Role.find().sort({ nom: 1 });
    res.json(roles);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/roles', async (req, res) => {
  try {
    const { nom, description, couleur } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom du rôle est obligatoire' });
    }
    const cleanNom = nom.trim();
    const normalizedTarget = normalizeRoleName(cleanNom);

    // Strict normalized uniqueness check (ignoring case, spaces, hyphens, underscores)
    const allRoles = await Role.find();
    const existing = allRoles.find(r => normalizeRoleName(r.nom) === normalizedTarget);
    if (existing) {
      return res.status(409).json({
        message: `Le rôle "${cleanNom}" est un doublon du rôle existant "${existing.nom}". Les noms de rôles doivent être uniques (les majuscules/minuscules, espaces, tirets et underscores sont ignorés).`,
      });
    }

    const newRole = new Role({
      nom: cleanNom,
      description: description || '',
      couleur: couleur || 'blue',
      isSystem: normalizedTarget === normalizeRoleName('Responsable IT'),
    });
    await newRole.save();
    res.status(201).json(newRole);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/roles/:id', async (req, res) => {
  try {
    const { nom, description, couleur } = req.body;
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle introuvable' });
    }
    if (nom && nom.trim()) {
      const cleanNom = nom.trim();
      const normalizedTarget = normalizeRoleName(cleanNom);
      const allRoles = await Role.find({ _id: { $ne: req.params.id } });
      const existing = allRoles.find(r => normalizeRoleName(r.nom) === normalizedTarget);
      if (existing) {
        return res.status(409).json({
          message: `Le rôle "${cleanNom}" est un doublon du rôle existant "${existing.nom}". Les noms de rôles doivent être uniques (les majuscules/minuscules, espaces, tirets et underscores sont ignorés).`,
        });
      }
      role.nom = cleanNom;
    }
    if (description !== undefined) role.description = description;
    if (couleur !== undefined) role.couleur = couleur;
    await role.save();
    res.json(role);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/roles/:id', async (req, res) => {
  try {
    const role = await safeFindDoc(Role, req.params.id) || await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle introuvable' });
    }

    const check = await canDeleteRole(req.params.id);
    if (!check.isValid) {
      return res.status(400).json({ message: check.message });
    }

    await Role.findByIdAndDelete(role._id);
    res.json({ message: `Rôle "${role.nom}" supprimé avec succès` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: resolve Role document for user creation/update
async function resolveRoleForUser(id_Role?: string, roleName?: string) {
  const allRoles = await Role.find();
  const itRole = allRoles.find(r => normalizeRoleName(r.nom) === normalizeRoleName('Responsable IT')) || allRoles[0];

  if (id_Role) {
    const foundById = allRoles.find(r => r.id === id_Role || r._id.toString() === id_Role);
    if (foundById) return foundById;

    const targetNormId = normalizeRoleName(id_Role);
    const foundByNormId = allRoles.find(r => normalizeRoleName(r.nom) === targetNormId);
    if (foundByNormId) return foundByNormId;
  }

  if (roleName && roleName.trim()) {
    const normalized = normalizeRoleName(roleName);
    const foundByName = allRoles.find(r => normalizeRoleName(r.nom) === normalized);
    if (foundByName) return foundByName;

    // Create role if it doesn't exist yet so it's not converted to Responsable IT
    const newRole = await new Role({
      nom: roleName.trim(),
      description: 'Rôle collaborateur',
      couleur: 'blue',
      isSystem: false,
    }).save();
    return newRole;
  }

  return itRole;
}

// ================= USERS & EMPLOYÉS (BÉNÉFICIAIRES) =================
router.get('/users', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.id_Emplacement) {
      filter.id_Emplacement = req.query.id_Emplacement;
    }
    const rawUsers = await User.find(filter).sort({ createdAt: -1 });
    const allRoles = await Role.find();

    const formatted = rawUsers.map((u) => {
      const uObj: any = u.toJSON();
      const matchedRole = allRoles.find(r => r.id === u.id_Role || r._id.toString() === u.id_Role);
      const roleName = matchedRole ? matchedRole.nom : 'Responsable IT';
      uObj.id_Role = matchedRole ? matchedRole.id : u.id_Role;
      uObj.role = roleName;
      uObj.roleDoc = matchedRole || null;
      uObj.hasPassword = !!(u.password && u.password.length > 0);
      uObj.isITUser = roleName === 'Responsable IT' || uObj.hasPassword;
      uObj.isSuperAdmin = !!u.isSuperAdmin;
      uObj.accesApp = u.accesApp || (roleName === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : (uObj.hasPassword ? 'ESPACE_RECLAMATIONS' : 'NONE'));
      return uObj;
    });
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, password, id_Role, role, beneficiaire, id_Emplacement, statut, accesApp } = req.body;

    // Validation métier complète
    const validation = await validateUserData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Resolve Role
    const targetRole = await resolveRoleForUser(id_Role, role);
    const isTargetIT = targetRole.nom === 'Responsable IT';
    const isNoAccess = accesApp === 'NONE' || req.body.grantAccess === false;
    const resolvedAccesApp = isTargetIT
      ? 'GLOBAL_BACKOFFICE'
      : (isNoAccess ? 'NONE' : (accesApp || 'ESPACE_RECLAMATIONS'));

    let passHash = '';
    let plainPassword = password ? String(password).trim() : '';

    // If user account is requested but no password was typed, generate an official temporary password
    const wantsUserAccount = !isNoAccess && (req.body.isUserAccount === true || req.body.hasPassword === true || !!plainPassword || isTargetIT);
    if (wantsUserAccount && plainPassword.length === 0) {
      plainPassword = `Omoda${Math.floor(1000 + Math.random() * 9000)}!`;
    }

    if (wantsUserAccount && plainPassword.length > 0) {
      const salt = await bcrypt.genSalt(10);
      passHash = await bcrypt.hash(plainPassword, salt);
    }

    let savedPhotoUrl = '';
    if (req.body.photo) {
      if (typeof req.body.photo === 'string' && req.body.photo.startsWith('data:image/')) {
        savedPhotoUrl = saveAvatarBase64(req.body.photo, cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
      } else if (typeof req.body.photo === 'string') {
        savedPhotoUrl = req.body.photo.trim();
      }
    }

    const newItem = new User({
      beneficiaire: beneficiaire.trim(),
      email: cleanEmail,
      photo: savedPhotoUrl,
      id_Role: targetRole.id,
      statut: statut || 'Actif',
      id_Emplacement: id_Emplacement || '',
      password: passHash,
      accesApp: resolvedAccesApp,
      derniereActivite: "À l'instant",
    });

    await newItem.save();

    // Send personalized welcome email if user account was created with a password or access
    const shouldSendEmail = (
      resolvedAccesApp !== 'NONE' && (
        req.body.sendWelcomeEmail === true ||
        req.body.sendNotificationEmail === true ||
        (wantsUserAccount && req.body.sendWelcomeEmail !== false)
      )
    );

    if (shouldSendEmail && plainPassword.length > 0) {
      try {
        await sendWelcomeEmail({
          email: cleanEmail,
          beneficiaire: beneficiaire.trim(),
          tempPassword: plainPassword,
          role: targetRole.nom,
          accesApp: resolvedAccesApp,
        });
        console.log(`[USER CREATED 👤] Email de bienvenue envoyé avec succès à ${cleanEmail}`);
      } catch (err) {
        console.error('[MAIL ERROR] Failed to send welcome email:', err);
      }
    }

    const ret: any = newItem.toJSON();
    ret.id_Role = targetRole.id;
    ret.role = targetRole.nom;
    ret.roleDoc = targetRole;
    ret.hasPassword = !!passHash;
    ret.isITUser = isTargetIT || !!passHash;
    ret.isSuperAdmin = !!newItem.isSuperAdmin;
    ret.accesApp = resolvedAccesApp;
    res.status(201).json(ret);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { email, password, id_Role, role, beneficiaire, id_Emplacement, statut, accesApp } = req.body;
    const user = await safeFindDoc(User, req.params.id) || await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur/Employé introuvable' });
    }

    // Validation métier complète avec exclusion de l'ID courant
    const validation = await validateUserData(req.body, String(user._id));
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }

    if (email) {
      user.email = email.toLowerCase().trim();
    }

    if (beneficiaire) user.beneficiaire = beneficiaire.trim();
    if (req.body.photo !== undefined) {
      if (!req.body.photo || req.body.photo.trim() === '') {
        deleteAvatarFile(user.photo);
        user.photo = '';
      } else if (typeof req.body.photo === 'string' && req.body.photo.startsWith('data:image/')) {
        const savedUrl = saveAvatarBase64(req.body.photo, String(user._id || user.id));
        user.photo = savedUrl;
      } else if (typeof req.body.photo === 'string') {
        user.photo = req.body.photo.trim();
      }
    }
    let currentRoleNom = 'Collaborateur';
    if (id_Role || role) {
      const targetRole = await resolveRoleForUser(id_Role, role);
      user.id_Role = targetRole.id;
      currentRoleNom = targetRole.nom;
    } else {
      const allRoles = await Role.find();
      const matched = allRoles.find(r => r.id === user.id_Role || r._id.toString() === user.id_Role);
      if (matched) currentRoleNom = matched.nom;
    }

    if (statut) user.statut = statut;
    if (id_Emplacement !== undefined) user.id_Emplacement = id_Emplacement;

    const isTargetIT = currentRoleNom === 'Responsable IT';
    const isNoAccess = (!isTargetIT && (accesApp === 'NONE' || req.body.grantAccess === false || req.body.removePassword === true));

    if (isTargetIT) {
      user.accesApp = 'GLOBAL_BACKOFFICE';
    } else if (isNoAccess) {
      user.accesApp = 'NONE';
      user.password = '';
    } else if (accesApp) {
      user.accesApp = accesApp;
    }

    const hadPasswordBefore = !!(user.password && user.password.length > 0);
    let plainPassword = password ? String(password).trim() : '';

    const wantsUserAccount = !isNoAccess && (req.body.isUserAccount === true || req.body.hasPassword === true || isTargetIT);
    if (wantsUserAccount && plainPassword.length === 0 && !hadPasswordBefore) {
      plainPassword = `Omoda${Math.floor(1000 + Math.random() * 9000)}!`;
    }

    let passwordUpdated = false;
    if (isNoAccess || req.body.removePassword === true) {
      user.password = '';
      user.refreshTokens = [];
    } else if (plainPassword.length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(plainPassword, salt);
      user.refreshTokens = [];
      passwordUpdated = true;
    }

    user.derniereActivite = "À l'instant";
    await user.save();

    const allRoles = await Role.find();
    const matchedRole = allRoles.find(r => r.id === user.id_Role || r._id.toString() === user.id_Role);
    const roleName = matchedRole ? matchedRole.nom : currentRoleNom;
    const resolvedAccesApp = user.accesApp || (roleName === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : (user.password ? 'ESPACE_RECLAMATIONS' : 'NONE'));

    // If new password was assigned and email was requested, send official email with the exact saved password
    const shouldSendEmail = (
      resolvedAccesApp !== 'NONE' && (
        req.body.sendWelcomeEmail === true ||
        req.body.sendNotificationEmail === true
      ) && (
        passwordUpdated ||
        (wantsUserAccount && !hadPasswordBefore)
      )
    );

    if (shouldSendEmail && plainPassword.length > 0) {
      try {
        await sendWelcomeEmail({
          email: user.email,
          beneficiaire: user.beneficiaire,
          tempPassword: plainPassword,
          role: roleName,
          accesApp: resolvedAccesApp,
        });
        console.log(`[USER UPDATED 👤] Email d'identifiants envoyé avec succès à ${user.email} avec mot de passe enregistré.`);
      } catch (err) {
        console.error('[MAIL ERROR] Failed to send update welcome email:', err);
      }
    }

    const ret: any = user.toJSON();
    ret.id_Role = matchedRole ? matchedRole.id : user.id_Role;
    ret.role = roleName;
    ret.roleDoc = matchedRole || null;
    ret.hasPassword = !!(user.password && user.password.length > 0);
    ret.isITUser = roleName === 'Responsable IT' || ret.hasPassword;
    ret.isSuperAdmin = !!user.isSuperAdmin;
    ret.accesApp = resolvedAccesApp;
    res.json(ret);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id) || await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'Collaborateur non trouvé' });
    }

    const deleteCheck = await canDeleteUser(user._id.toString(), (req as any).user);
    if (!deleteCheck.isValid) {
      return res.status(400).json({ message: deleteCheck.message });
    }

    const userIdStr = user._id.toString();
    const customIdStr = user.id || '';
    const userEmail = (user.email || '').toLowerCase().trim();

    // 1. Supprimer les réclamations liées à cet utilisateur
    const queryDemandeur: any[] = [{ id_Demandeur: userIdStr }];
    if (customIdStr) queryDemandeur.push({ id_Demandeur: customIdStr });
    if (userEmail) queryDemandeur.push({ id_Demandeur: userEmail });
    await Reclamation.deleteMany({ $or: queryDemandeur });

    // 2. Supprimer les messages et conversations avec cet utilisateur
    const userIds = [userIdStr];
    if (customIdStr && customIdStr !== userIdStr) userIds.push(customIdStr);
    if (userEmail) userIds.push(userEmail);

    await Message.deleteMany({
      $or: [
        { senderId: { $in: userIds } },
        { recipientId: { $in: userIds } },
        { senderEmail: userEmail },
      ],
    });

    await Conversation.deleteMany({
      participants: { $in: userIds },
    });

    // 3. Désaffecter de son/ses matériel(s) :
    // - Si le matériel est 'En panne', il reste 'En panne' (ne revient pas en stock)
    // - Sinon, il est remis 'En stock' (le stock est incrémenté)
    const assignedMateriels = await Materiel.find({
      $or: [
        { id_Beneficiaire: userIdStr },
        ...(customIdStr ? [{ id_Beneficiaire: customIdStr }] : []),
      ],
    });

    let restesEnPanneCount = 0;
    let remisEnStockCount = 0;

    for (const mat of assignedMateriels) {
      mat.id_Beneficiaire = '';
      if (mat.statut === 'En panne') {
        // Reste en panne
        restesEnPanneCount++;
      } else {
        // Revient en stock
        mat.statut = 'En stock';
        remisEnStockCount++;
      }
      await mat.save();
    }

    // 4. Supprimer l'utilisateur de la base de données
    await User.findByIdAndDelete(user._id);

    res.json({
      message: `Collaborateur "${user.beneficiaire}" supprimé avec succès. Réclamations et messageries supprimées. ${remisEnStockCount} matériel(s) remis en stock${restesEnPanneCount > 0 ? `, et ${restesEnPanneCount} matériel(s) maintenu(s) en panne` : ''}.`,
      remisEnStockCount,
      restesEnPanneCount,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/users/:id/archive', async (req, res) => {
  try {
    const user = await User.findById(req.params.id) || await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'Collaborateur non trouvé' });
    }

    const deleteCheck = await canDeleteUser(user._id.toString(), (req as any).user);
    if (!deleteCheck.isValid) {
      return res.status(400).json({ message: deleteCheck.message });
    }

    // 1. Statut Inactif & désactivation des accès
    user.statut = 'Inactif';
    user.accesApp = 'NONE';
    user.password = '';
    user.refreshTokens = [];
    user.id_Emplacement = '';
    await user.save();

    // 2. Désassigner ses matériels :
    // - Si le matériel est 'En panne', il reste 'En panne' (ne revient pas en stock)
    // - Sinon, il est remis 'En stock' (le stock est incrémenté)
    const userIdStr = user._id.toString();
    const customIdStr = user.id || '';

    const assignedMateriels = await Materiel.find({
      $or: [
        { id_Beneficiaire: userIdStr },
        ...(customIdStr ? [{ id_Beneficiaire: customIdStr }] : []),
      ],
    });

    let restesEnPanneCount = 0;
    let remisEnStockCount = 0;

    for (const mat of assignedMateriels) {
      mat.id_Beneficiaire = '';
      if (mat.statut === 'En panne') {
        restesEnPanneCount++;
      } else {
        mat.statut = 'En stock';
        remisEnStockCount++;
      }
      await mat.save();
    }

    res.json({
      message: `Collaborateur "${user.beneficiaire}" archivé avec succès. Accès révoqué, emplacement retiré, ${remisEnStockCount} matériel(s) remis en stock${restesEnPanneCount > 0 ? ` et ${restesEnPanneCount} matériel(s) maintenu(s) en panne` : ''}.`,
      remisEnStockCount,
      restesEnPanneCount,
      user,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= MATERIELS =================
router.get('/materiels', async (_req, res) => {
  try {
    const items = await Materiel.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/materiels', async (req, res) => {
  try {
    const validation = await validateMaterielData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const newItem = new Materiel(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/materiels/:id', async (req, res) => {
  try {
    const validation = await validateMaterielData(req.body, req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const updated = await Materiel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/materiels/:id', async (req, res) => {
  try {
    const mat = await safeFindDoc(Materiel, req.params.id) || await Materiel.findById(req.params.id);
    if (!mat) {
      return res.status(404).json({ message: 'Matériel introuvable.' });
    }

    const matIdStr = String(mat._id);
    const matCustomId = mat.id ? String(mat.id) : null;
    const targetIds = [matIdStr, matCustomId, req.params.id].filter(Boolean);

    // 1. Nettoyer les réclamations liées à ce matériel
    await Reclamation.updateMany(
      { id_MaterielConcerne: { $in: targetIds } },
      { $unset: { id_MaterielConcerne: 1 } }
    );
    await Reclamation.updateMany(
      { materielsConcernesIds: { $in: targetIds } },
      { $pull: { materielsConcernesIds: { $in: targetIds } } }
    );

    // 2. Supprimer définitivement le document matériel
    await Materiel.findByIdAndDelete(mat._id);

    res.json({
      message: `Matériel "${mat.designation}" (Réf: ${mat.reference}) supprimé avec succès.`,
      id: req.params.id,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= EMPLACEMENTS =================
router.get('/emplacements', async (_req, res) => {
  try {
    const items = await Emplacement.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Récupérer les bénéficiaires/employés affectés à un emplacement spécifique
router.get('/emplacements/:id/users', async (req, res) => {
  try {
    const emplacementId = req.params.id;
    const users = await User.find({ id_Emplacement: emplacementId }).sort({ beneficiaire: 1 });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/emplacements', async (req, res) => {
  try {
    const validation = await validateEmplacementData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const newItem = new Emplacement(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/emplacements/:id', async (req, res) => {
  try {
    const validation = await validateEmplacementData(req.body, req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const updated = await Emplacement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/emplacements/:id', async (req, res) => {
  try {
    const deleteCheck = await canDeleteEmplacement(req.params.id);
    if (!deleteCheck.isValid) {
      return res.status(400).json({ message: deleteCheck.message });
    }
    await Emplacement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Emplacement supprimé avec succès' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GROUPES EMPLACEMENT =================
router.get('/groupes-emplacement', async (_req, res) => {
  try {
    const items = await GroupeEmplacement.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/groupes-emplacement', async (req, res) => {
  try {
    const validation = await validateGroupeEmplacementData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const newItem = new GroupeEmplacement(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/groupes-emplacement/:id', async (req, res) => {
  try {
    const validation = await validateGroupeEmplacementData(req.body, req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const updated = await GroupeEmplacement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/groupes-emplacement/:id', async (req, res) => {
  try {
    const deleteCheck = await canDeleteGroupeEmplacement(req.params.id);
    if (!deleteCheck.isValid) {
      return res.status(400).json({ message: deleteCheck.message });
    }
    await GroupeEmplacement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Groupe d\'emplacement supprimé avec succès' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GROUPES MATERIEL =================
router.get('/groupes-materiel', async (req, res) => {
  try {
    const items = await GroupeMateriel.find().sort({ createdAt: -1 }).lean();
    const materiels = await Materiel.find().lean();
    
    const enriched = items.map((g: any) => {
      const gId = g._id ? g._id.toString() : g.id;
      const count = materiels.filter(m => (m.id_GroupeMateriel?.toString() === gId) || m.id_GroupeMateriel === gId).length;
      return {
        ...g,
        id: gId,
        materielCount: count,
      };
    });

    if (req.query.withMaterielsOnly === 'true' || req.query.actifsOnly === 'true') {
      return res.json(enriched.filter(g => g.materielCount > 0));
    }

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/groupes-materiel/actifs', async (_req, res) => {
  try {
    const items = await GroupeMateriel.find().sort({ nom: 1 }).lean();
    const materiels = await Materiel.find().lean();
    const assignedGroupIds = new Set(materiels.map(m => m.id_GroupeMateriel?.toString()).filter(Boolean));

    const activeGroups = items
      .filter((g: any) => {
        const gId = g._id ? g._id.toString() : g.id;
        return assignedGroupIds.has(gId);
      })
      .map((g: any) => ({
        ...g,
        id: g._id ? g._id.toString() : g.id,
      }));

    res.json(activeGroups);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/groupes-materiel', async (req, res) => {
  try {
    const validation = await validateGroupeMaterielData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const newItem = new GroupeMateriel(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/groupes-materiel/:id', async (req, res) => {
  try {
    const validation = await validateGroupeMaterielData(req.body, req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const updated = await GroupeMateriel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/groupes-materiel/:id', async (req, res) => {
  try {
    const deleteCheck = await canDeleteGroupeMateriel(req.params.id);
    if (!deleteCheck.isValid) {
      return res.status(400).json({ message: deleteCheck.message });
    }
    await GroupeMateriel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Groupe de matériel supprimé avec succès' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= FACTURES =================
router.get('/factures', async (_req, res) => {
  try {
    const items = await Facture.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/factures', async (req, res) => {
  try {
    const validation = await validateFactureData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const newItem = new Facture(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/factures/:id', async (req, res) => {
  try {
    const validation = await validateFactureData(req.body, req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const updated = await Facture.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/factures/:id', async (req, res) => {
  try {
    const deleteCheck = await canDeleteFacture(req.params.id);
    if (!deleteCheck.isValid) {
      return res.status(400).json({ message: deleteCheck.message });
    }
    await Facture.findByIdAndDelete(req.params.id);
    res.json({ message: 'Facture supprimée avec succès' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= FOURNISSEURS =================
router.get('/fournisseurs', async (_req, res) => {
  try {
    const items = await Fournisseur.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/fournisseurs', async (req, res) => {
  try {
    const validation = await validateFournisseurData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const newItem = new Fournisseur(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/fournisseurs/:id', async (req, res) => {
  try {
    const validation = await validateFournisseurData(req.body, req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }
    const updated = await Fournisseur.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/fournisseurs/:id', async (req, res) => {
  try {
    const deleteCheck = await canDeleteFournisseur(req.params.id);
    if (!deleteCheck.isValid) {
      return res.status(400).json({ message: deleteCheck.message });
    }
    await Fournisseur.findByIdAndDelete(req.params.id);
    res.json({ message: 'Fournisseur supprimé avec succès' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GESTION DES RÉCLAMATIONS (TICKETS & SUPPORT IT) =================
router.get('/reclamations', async (req: any, res) => {
  try {
    const filter: any = {};
    if (req.query.id_Demandeur) {
      filter.id_Demandeur = req.query.id_Demandeur;
    }
    if (req.query.statut && req.query.statut !== 'Tous') {
      filter.statut = req.query.statut;
    }
    if (req.query.priorite && req.query.priorite !== 'Toutes') {
      filter.priorite = req.query.priorite;
    }
    if (req.query.nature && req.query.nature !== 'Tous') {
      filter.nature = req.query.nature;
    }
    const gFilter = req.query.id_GroupeMateriel || req.query.id_GroupeReclamation;
    if (gFilter && gFilter !== 'Tous') {
      filter.$or = [{ id_GroupeMateriel: gFilter }, { id_GroupeReclamation: gFilter }, { categoriesIds: gFilter }];
    }

    const items = await Reclamation.find(filter).sort({ createdAt: -1 }).lean();
    const [groupes, users, materiels] = await Promise.all([
      GroupeMateriel.find().lean(),
      User.find().lean(),
      Materiel.find().lean(),
    ]);

    const enriched = items.map((rec: any) => {
      const gId = rec.id_GroupeMateriel || rec.id_GroupeReclamation;
      const isAutreCat = gId === 'AUTRE' || gId === 'Autre' || gId === 'autre';
      const grp = !isAutreCat ? groupes.find((g: any) => g._id?.toString() === gId?.toString() || g.id === gId) : null;
      const dem = users.find((u: any) => u._id?.toString() === rec.id_Demandeur?.toString() || u.id === rec.id_Demandeur);
      const tech = users.find((u: any) => u._id?.toString() === rec.id_TechnicienAssigne?.toString() || u.id === rec.id_TechnicienAssigne);
      
      // Resolve single material if present
      const singleMat = rec.id_MaterielConcerne ? materiels.find((m: any) => m._id?.toString() === rec.id_MaterielConcerne?.toString() || m.id === rec.id_MaterielConcerne) : null;

      // Resolve multiple materials if present
      const matIds: string[] = Array.isArray(rec.materielsConcernesIds) && rec.materielsConcernesIds.length > 0
        ? rec.materielsConcernesIds
        : (rec.id_MaterielConcerne ? [rec.id_MaterielConcerne] : []);
      
      const resolvedMats = matIds.map(mId => {
        const found = materiels.find((m: any) => m._id?.toString() === mId?.toString() || m.id === mId);
        return found ? `${found.designation} (${found.reference})` : mId;
      });

      // Resolve multiple categories if present
      const catIds: string[] = Array.isArray(rec.categoriesIds) && rec.categoriesIds.length > 0
        ? rec.categoriesIds
        : (gId ? [gId] : []);
      
      const resolvedCats = catIds.map(cId => {
        if (cId === 'AUTRE' || cId === 'Autre' || cId === 'autre') return 'Autre';
        const found = groupes.find((g: any) => g._id?.toString() === cId?.toString() || g.id === cId);
        return found?.nom || (found as any)?.Groupe || cId;
      });

      return {
        ...rec,
        id: rec._id ? rec._id.toString() : rec.id,
        nature: rec.nature || (matIds.length > 0 ? 'materiel' : 'autre'),
        id_GroupeMateriel: gId,
        groupeNom: resolvedCats.length > 0 ? resolvedCats.join(', ') : (isAutreCat ? 'Autre' : (grp?.nom || (grp as any)?.Groupe || 'Général')),
        groupeCouleur: isAutreCat ? 'amber' : 'blue',
        materielsConcernesIds: matIds,
        materielsConcernesNoms: resolvedMats,
        categoriesIds: catIds,
        categoriesNoms: resolvedCats,
        demandeurNom: rec.demandeurNom || dem?.beneficiaire || 'Collaborateur',
        demandeurEmail: rec.demandeurEmail || dem?.email || '',
        technicienNom: rec.technicienNom || tech?.beneficiaire || 'Non assigné',
        materielNom: resolvedMats.length > 0 ? resolvedMats.join(', ') : (singleMat ? `${singleMat.designation} (${singleMat.reference})` : undefined),
      };
    });

    // Optional text search filter
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase().trim();
      const filtered = enriched.filter(r =>
        r.code?.toLowerCase().includes(q) ||
        r.titre?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.demandeurNom?.toLowerCase().includes(q) ||
        r.groupeNom?.toLowerCase().includes(q) ||
        r.materielNom?.toLowerCase().includes(q)
      );
      return res.json(filtered);
    }

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/reclamations/:id', async (req, res) => {
  try {
    const rec = await Reclamation.findById(req.params.id).lean();
    if (!rec) {
      return res.status(404).json({ message: 'Réclamation introuvable' });
    }
    const gId = (rec as any).id_GroupeMateriel || (rec as any).id_GroupeReclamation;
    const [groupes, dem, tech, materiels] = await Promise.all([
      GroupeMateriel.find().lean(),
      User.findById((rec as any).id_Demandeur).lean(),
      (rec as any).id_TechnicienAssigne ? User.findById((rec as any).id_TechnicienAssigne).lean() : null,
      Materiel.find().lean(),
    ]);

    const matIds: string[] = Array.isArray((rec as any).materielsConcernesIds) && (rec as any).materielsConcernesIds.length > 0
      ? (rec as any).materielsConcernesIds
      : ((rec as any).id_MaterielConcerne ? [(rec as any).id_MaterielConcerne] : []);
    
    const resolvedMats = matIds.map(mId => {
      const found = materiels.find((m: any) => m._id?.toString() === mId?.toString() || m.id === mId);
      return found ? `${found.designation} (${found.reference})` : mId;
    });

    const catIds: string[] = Array.isArray((rec as any).categoriesIds) && (rec as any).categoriesIds.length > 0
      ? (rec as any).categoriesIds
      : (gId ? [gId] : []);
    
    const resolvedCats = catIds.map(cId => {
      if (cId === 'AUTRE' || cId === 'Autre' || cId === 'autre') return 'Autre';
      const found = groupes.find((g: any) => g._id?.toString() === cId?.toString() || g.id === cId);
      return found?.nom || (found as any)?.Groupe || cId;
    });

    const enriched = {
      ...rec,
      id: rec._id ? (rec as any)._id.toString() : (rec as any).id,
      nature: (rec as any).nature || (matIds.length > 0 ? 'materiel' : 'autre'),
      id_GroupeMateriel: gId,
      groupeNom: resolvedCats.length > 0 ? resolvedCats.join(', ') : 'Général',
      groupeCouleur: 'blue',
      materielsConcernesIds: matIds,
      materielsConcernesNoms: resolvedMats,
      categoriesIds: catIds,
      categoriesNoms: resolvedCats,
      demandeurNom: (rec as any).demandeurNom || dem?.beneficiaire || 'Collaborateur',
      demandeurEmail: (rec as any).demandeurEmail || dem?.email || '',
      technicienNom: (rec as any).technicienNom || tech?.beneficiaire || 'Non assigné',
      materielNom: resolvedMats.length > 0 ? resolvedMats.join(', ') : undefined,
    };
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reclamations', async (req: any, res) => {
  try {
    const targetGroupId = req.body.id_GroupeMateriel || req.body.id_GroupeReclamation || '';
    req.body.id_GroupeMateriel = targetGroupId;
    req.body.id_GroupeReclamation = targetGroupId;

    // Demandeur is strictly the authenticated user (or fallback)
    const demandeurId = req.user?.id || req.body.id_Demandeur;
    req.body.id_Demandeur = demandeurId;

    const validation = await validateReclamationData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message, field: validation.field });
    }

    // Generate next unique ticket code (REC-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const countTotal = await Reclamation.countDocuments();
    const padded = String(countTotal + 1).padStart(4, '0');
    const code = `REC-${currentYear}-${padded}`;

    // Get Demandeur info
    const demandeur = await User.findById(demandeurId);
    const demandeurNom = demandeur ? demandeur.beneficiaire : (req.user?.beneficiaire || req.body.demandeurNom || 'Collaborateur');
    const demandeurEmail = demandeur ? demandeur.email : (req.user?.email || req.body.demandeurEmail || '');

    // SLA default in hours
    const slaHours = req.body.delaiTraitementHeures ? Number(req.body.delaiTraitementHeures) : 24;

    // Calculate SLA deadline
    const dateEcheanceSla = req.body.dateEcheanceSla ? new Date(req.body.dateEcheanceSla) : new Date(Date.now() + slaHours * 3600 * 1000);
    const dateMaxResolution = req.body.dateMaxResolution ? new Date(req.body.dateMaxResolution) : dateEcheanceSla;

    // Get Technicien info if assigned
    let technicienNom = '';
    if (req.body.id_TechnicienAssigne) {
      const tech = await User.findById(req.body.id_TechnicienAssigne);
      if (tech) technicienNom = tech.beneficiaire;
    }

    // Process materials and categories arrays
    const matIds = Array.isArray(req.body.materielsConcernesIds) ? req.body.materielsConcernesIds : (req.body.id_MaterielConcerne ? [req.body.id_MaterielConcerne] : []);
    const catIds = Array.isArray(req.body.categoriesIds) ? req.body.categoriesIds : (targetGroupId ? [targetGroupId] : []);

    const initialHistory: any[] = [
      {
        date: new Date().toISOString(),
        auteur: req.user?.beneficiaire || demandeurNom,
        role: req.user?.role || 'Collaborateur',
        message: 'Création de la demande de réclamation.',
        typeAction: 'creation',
      },
    ];

    const newItem = new Reclamation({
      code,
      titre: req.body.titre.trim(),
      description: req.body.description.trim(),
      nature: req.body.nature || (matIds.length > 0 ? 'materiel' : 'autre'),
      materielsConcernesIds: matIds,
      categoriesIds: catIds,
      id_GroupeMateriel: targetGroupId,
      id_GroupeReclamation: targetGroupId,
      priorite: req.body.priorite || 'Moyenne',
      statut: req.body.statut || 'Ouverte',
      delaiTraitementHeures: slaHours,
      dateEcheanceSla,
      dateMaxResolution,
      id_Demandeur: demandeurId,
      demandeurNom,
      demandeurEmail,
      id_TechnicienAssigne: req.body.id_TechnicienAssigne || undefined,
      technicienNom: technicienNom || undefined,
      id_MaterielConcerne: matIds.length > 0 ? matIds[0] : (req.body.id_MaterielConcerne || undefined),
      piecesJointes: Array.isArray(req.body.piecesJointes) ? req.body.piecesJointes : [],
      historique: initialHistory,
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/reclamations/:id', async (req: any, res) => {
  try {
    const rec = await Reclamation.findById(req.params.id);
    if (!rec) {
      return res.status(404).json({ message: 'Réclamation introuvable' });
    }

    const userAuthor = req.user?.beneficiaire || 'Support IT';
    const userRole = req.user?.role || 'Responsable IT';
    const isOwner = req.user?.id && rec.id_Demandeur?.toString() === req.user.id.toString();

    // Track changes for history
    const historyEntries: any[] = [];

    if (req.body.statut && req.body.statut !== rec.statut) {
      historyEntries.push({
        date: new Date().toISOString(),
        auteur: userAuthor,
        role: userRole,
        message: `Statut changé de "${rec.statut}" à "${req.body.statut}".`,
        typeAction: 'statut',
      });
      rec.statut = req.body.statut;
      if (req.body.statut === 'Résolue') {
        rec.dateResolution = new Date();
      }
    }

    if (req.body.priorite && req.body.priorite !== rec.priorite) {
      historyEntries.push({
        date: new Date().toISOString(),
        auteur: userAuthor,
        role: userRole,
        message: `Priorité / Urgence modifiée en "${req.body.priorite}".`,
        typeAction: 'priorite',
      });
      rec.priorite = req.body.priorite;
    }

    if (req.body.delaiTraitementHeures !== undefined && Number(req.body.delaiTraitementHeures) !== rec.delaiTraitementHeures) {
      const newHours = Number(req.body.delaiTraitementHeures);
      rec.delaiTraitementHeures = newHours;
      rec.dateEcheanceSla = new Date(Date.now() + newHours * 3600 * 1000);
      historyEntries.push({
        date: new Date().toISOString(),
        auteur: userAuthor,
        role: userRole,
        message: `Délai SLA révisé à ${newHours} heure(s).`,
        typeAction: 'assignation',
      });
    }

    if (req.body.dateMaxResolution !== undefined) {
      const parsedMaxDate = req.body.dateMaxResolution ? new Date(req.body.dateMaxResolution) : undefined;
      rec.dateMaxResolution = parsedMaxDate;
      if (parsedMaxDate) {
        historyEntries.push({
          date: new Date().toISOString(),
          auteur: userAuthor,
          role: userRole,
          message: `Date maximale de résolution fixée au ${parsedMaxDate.toLocaleDateString('fr-FR')} ${parsedMaxDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
          typeAction: 'assignation',
        });
      }
    }

    if (req.body.id_TechnicienAssigne !== undefined && req.body.id_TechnicienAssigne !== rec.id_TechnicienAssigne) {
      if (req.body.id_TechnicienAssigne) {
        const tech = await User.findById(req.body.id_TechnicienAssigne);
        rec.id_TechnicienAssigne = req.body.id_TechnicienAssigne;
        rec.technicienNom = tech ? tech.beneficiaire : 'Technicien';
        historyEntries.push({
          date: new Date().toISOString(),
          auteur: userAuthor,
          role: userRole,
          message: `Ticket assigné à ${rec.technicienNom}.`,
          typeAction: 'assignation',
        });
      } else {
        rec.id_TechnicienAssigne = undefined;
        rec.technicienNom = undefined;
        historyEntries.push({
          date: new Date().toISOString(),
          auteur: userAuthor,
          role: userRole,
          message: 'Ticket désassigné.',
          typeAction: 'assignation',
        });
      }
    }

    if (req.body.solution !== undefined && req.body.solution !== rec.solution) {
      rec.solution = req.body.solution;
      historyEntries.push({
        date: new Date().toISOString(),
        auteur: userAuthor,
        role: userRole,
        message: `Compte-rendu / Note de traitement : ${req.body.solution}`,
        typeAction: 'resolution',
      });
    }

    // Owner or IT can update content
    if (isOwner) {
      if (req.body.titre) rec.titre = req.body.titre.trim();
      if (req.body.description) rec.description = req.body.description.trim();
      if (req.body.nature) rec.nature = req.body.nature;
      if (Array.isArray(req.body.materielsConcernesIds)) rec.materielsConcernesIds = req.body.materielsConcernesIds;
      if (Array.isArray(req.body.categoriesIds)) rec.categoriesIds = req.body.categoriesIds;
      const targetGroupId = req.body.id_GroupeMateriel || req.body.id_GroupeReclamation;
      if (targetGroupId) {
        rec.id_GroupeMateriel = targetGroupId;
        rec.id_GroupeReclamation = targetGroupId;
      }
      if (req.body.id_MaterielConcerne !== undefined) rec.id_MaterielConcerne = req.body.id_MaterielConcerne;
    }

    if (historyEntries.length > 0) {
      rec.historique = [...rec.historique, ...historyEntries];
    }

    await rec.save();
    res.json(rec);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/reclamations/:id/comments', async (req: any, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Le message du commentaire ne peut pas être vide.' });
    }

    const rec = await Reclamation.findById(req.params.id);
    if (!rec) {
      return res.status(404).json({ message: 'Réclamation introuvable' });
    }

    const userAuthor = req.user?.beneficiaire || 'Utilisateur';
    const userRole = req.user?.role || 'Collaborateur';

    const newComment = {
      date: new Date().toISOString(),
      auteur: userAuthor,
      role: userRole,
      message: message.trim(),
      typeAction: 'commentaire' as const,
    };

    rec.historique.push(newComment);
    await rec.save();

    res.json(rec);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/reclamations/:id', async (req, res) => {
  try {
    await Reclamation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Réclamation supprimée avec succès' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ================= EMAIL & AUDIT LOGS =================
router.get('/emails/smtp-status', async (_req, res) => {
  try {
    const summary = getSmtpConfigSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/emails/test-smtp', async (req, res) => {
  try {
    const { recipient } = req.body;
    const result = await testSmtpConnection(recipient);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/emails/logs', async (_req, res) => {
  try {
    const logs = await EmailLog.find().sort({ dateEnvoi: -1 }).limit(100);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
