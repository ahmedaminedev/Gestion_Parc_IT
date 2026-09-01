import mongoose from 'mongoose';
import { Materiel } from '../models/Materiel';
import { GroupeMateriel } from '../models/GroupeMateriel';
import { Facture } from '../models/Facture';
import { Fournisseur } from '../models/Fournisseur';
import { Emplacement } from '../models/Emplacement';
import { GroupeEmplacement } from '../models/GroupeEmplacement';
import { User } from '../models/User';
import { Role } from '../models/Role';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  field?: string;
  warning?: string;
}

// Normalise les chaînes pour comparaison insensible à la casse, espaces et accents
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Échappe les caractères réservés des expressions régulières pour éviter les erreurs de syntaxe
export function escapeRegex(str: string): string {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper sécurisé pour rechercher un document par son _id (ObjectId) ou par son champ id personnalisé sans générer de CastError
export async function safeFindDoc(Model: any, id: any) {
  if (!id) return null;
  const strId = String(id).trim();
  if (!strId) return null;
  try {
    if (mongoose.isValidObjectId(strId)) {
      const doc = await Model.findById(strId);
      if (doc) return doc;
    }
    return await Model.findOne({ $or: [{ id: strId }, { _id: strId }] }).catch(() => null);
  } catch (err) {
    return null;
  }
}

// Helper pour filtrer l'élément en cours de modification sans provoquer de CastError
export function getExclusionFilter(existingId?: string) {
  if (!existingId) return {};
  const str = String(existingId).trim();
  if (!str) return {};
  if (mongoose.isValidObjectId(str)) {
    return { _id: { $ne: new mongoose.Types.ObjectId(str) } };
  }
  return { id: { $ne: str } };
}

// Validation d'adresse email standard
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

// Validation de numéro de téléphone (au moins 6 chiffres/caractères usuels)
export function isValidPhone(phone: string): boolean {
  if (!phone || !phone.trim()) return true; // optionnel
  const cleaned = phone.replace(/[\s\-\.\(\)\+]/g, '');
  return /^[0-9]{6,15}$/.test(cleaned);
}

// =========================================================================
// 1. CONTRÔLE DE SAISIE : MODÈLE MATERIEL
// =========================================================================
export async function validateMaterielData(
  data: any,
  existingId?: string
): Promise<ValidationResult> {
  const {
    reference,
    ref_immo,
    designation,
    id_GroupeMateriel,
    codeSerie,
    qte,
    montantHT,
    valeurPlafond,
    dateEntree,
    statut,
    id_Fournisseur,
    id_Facture,
    id_Beneficiaire,
  } = data;

  // 1. Référence interne (Obligatoire & Unique)
  if (!reference || !reference.trim()) {
    return {
      isValid: false,
      field: 'reference',
      message: "La référence interne de l'équipement est obligatoire (ex: MAT-2025-001).",
    };
  }
  const cleanRef = reference.trim();
  const duplicateRef = await Materiel.findOne({
    reference: { $regex: new RegExp(`^${escapeRegex(cleanRef)}$`, 'i') },
    ...getExclusionFilter(existingId),
  });
  if (duplicateRef) {
    return {
      isValid: false,
      field: 'reference',
      message: `La référence interne "${cleanRef}" est déjà utilisée par un autre équipement dans votre parc.`,
    };
  }

  // 2. Référence d'immobilisation ERP (Optionnelle mais Unique si renseignée)
  if (ref_immo && ref_immo.trim()) {
    const cleanRefImmo = ref_immo.trim();
    const duplicateRefImmo = await Materiel.findOne({
      ref_immo: { $regex: new RegExp(`^${escapeRegex(cleanRefImmo)}$`, 'i') },
      ...getExclusionFilter(existingId),
    });
    if (duplicateRefImmo) {
      return {
        isValid: false,
        field: 'ref_immo',
        message: `La référence d'immobilisation ERP "${cleanRefImmo}" est déjà attribuée à l'équipement "${duplicateRefImmo.designation}".`,
      };
    }
  }

  // 3. Désignation (Obligatoire, min 3 caractères)
  if (!designation || designation.trim().length < 3) {
    return {
      isValid: false,
      field: 'designation',
      message: "La désignation du matériel doit comporter au moins 3 caractères explicites (ex: PC Portable Dell XPS 15).",
    };
  }

  // 4. Groupe de matériel (Obligatoire & Existant)
  if (!id_GroupeMateriel) {
    return {
      isValid: false,
      field: 'id_GroupeMateriel',
      message: "Veuillez sélectionner un groupe / catégorie de matériel.",
    };
  }
  const group = await safeFindDoc(GroupeMateriel, id_GroupeMateriel);
  if (!group) {
    return {
      isValid: false,
      field: 'id_GroupeMateriel',
      message: "La catégorie de matériel sélectionnée n'existe pas dans le système.",
    };
  }

  // 5. Code Série (Conditionnel : Obligatoire si GroupeMateriel a codeSerieObligatoire = true)
  const isCodeSerieRequired = !!group.codeSerieObligatoire;
  const cleanCodeSerie = (codeSerie || '').trim();

  if (isCodeSerieRequired && !cleanCodeSerie) {
    return {
      isValid: false,
      field: 'codeSerie',
      message: `Pour les ${group.nom || group.Groupe || 'équipements de cette catégorie'}, vous devez obligatoirement remplir le code série (numéro de série constructeur).`,
    };
  }

  // Unicité du Code Série s'il est renseigné
  if (cleanCodeSerie) {
    const duplicateCodeSerie = await Materiel.findOne({
      codeSerie: { $regex: new RegExp(`^${escapeRegex(cleanCodeSerie)}$`, 'i') },
      ...getExclusionFilter(existingId),
    });
    if (duplicateCodeSerie) {
      return {
        isValid: false,
        field: 'codeSerie',
        message: `Le numéro de série "${cleanCodeSerie}" est déjà enregistré sur l'équipement "${duplicateCodeSerie.designation}" (${duplicateCodeSerie.reference}).`,
      };
    }
  }

  // 6. Quantité (Obligatoire >= 1, et doit être 1 si code série renseigné)
  const numericQte = Number(qte !== undefined ? qte : 1);
  if (isNaN(numericQte) || numericQte < 1) {
    return {
      isValid: false,
      field: 'qte',
      message: "La quantité de matériel doit être un nombre entier supérieur ou égal à 1.",
    };
  }
  if ((cleanCodeSerie || isCodeSerieRequired) && numericQte > 1) {
    return {
      isValid: false,
      field: 'qte',
      message: "Pour un équipement identifié par un numéro de série unique, la quantité doit être exactement de 1.",
    };
  }

  // 7. Montants financiers (Nombre positif ou nul)
  const amount = Number(montantHT !== undefined ? montantHT : (valeurPlafond !== undefined ? valeurPlafond : 0));
  if (isNaN(amount) || amount < 0) {
    return {
      isValid: false,
      field: 'montantHT',
      message: "Le montant d'achat de l'équipement doit être un nombre positif ou nul.",
    };
  }

  // 8. Fournisseur & Facture (Cohérence de la relation)
  if (!id_Fournisseur) {
    return {
      isValid: false,
      field: 'id_Fournisseur',
      message: "Veuillez sélectionner un fournisseur partenaire.",
    };
  }
  const fournisseur = await safeFindDoc(Fournisseur, id_Fournisseur);
  if (!fournisseur) {
    return {
      isValid: false,
      field: 'id_Fournisseur',
      message: "Le fournisseur sélectionné est introuvable.",
    };
  }

  if (!id_Facture) {
    return {
      isValid: false,
      field: 'id_Facture',
      message: "Veuillez sélectionner la facture d'achat correspondante.",
    };
  }
  const facture = await safeFindDoc(Facture, id_Facture);
  if (!facture) {
    return {
      isValid: false,
      field: 'id_Facture',
      message: "La facture sélectionnée est introuvable.",
    };
  }

  // La facture doit appartenir au fournisseur choisi si reliée
  const fFrsId = facture.id_Fournisseur ? String(facture.id_Fournisseur) : '';
  const chosenFrsId = String(id_Fournisseur);
  const frsDocId = fournisseur.id || (fournisseur._id ? fournisseur._id.toString() : '');
  if (fFrsId && chosenFrsId && fFrsId !== chosenFrsId && fFrsId !== frsDocId) {
    return {
      isValid: false,
      field: 'id_Facture',
      message: `La facture "${facture.factureFrs}" n'appartient pas au fournisseur "${fournisseur.Fournisseur}".`,
    };
  }

  // 9. Cohérence temporelle (Date mise en service / entrée vs date facture)
  if (dateEntree && facture.dateAcquisition) {
    const dEntree = new Date(dateEntree);
    const dFacture = new Date(facture.dateAcquisition);
    if (!isNaN(dEntree.getTime()) && !isNaN(dFacture.getTime())) {
      if (dEntree < dFacture) {
        return {
          isValid: false,
          field: 'dateEntree',
          message: `La date de mise en service (${dateEntree}) ne peut pas être antérieure à la date de la facture d'achat (${facture.dateAcquisition}).`,
        };
      }
    }
  }

  // 10. Cohérence Statut & Affectation Collaborateur
  const currentStatut = statut || 'En service';
  const hasBeneficiaire = id_Beneficiaire && String(id_Beneficiaire).trim().length > 0;

  if (['En stock', 'Réformé', 'Hors service'].includes(currentStatut) && hasBeneficiaire) {
    return {
      isValid: false,
      field: 'statut',
      message: `Un équipement avec le statut "${currentStatut}" ne peut pas être affecté à un collaborateur. Veuillez retirer le bénéficiaire ou changer le statut en "En service" / "Prêté".`,
    };
  }

  return { isValid: true };
}

// =========================================================================
// 2. CONTRÔLE DE SAISIE : MODÈLE GROUPE MATERIEL
// =========================================================================
export async function validateGroupeMaterielData(
  data: any,
  existingId?: string
): Promise<ValidationResult> {
  const nom = data.nom || data.Groupe;
  if (!nom || !nom.trim()) {
    return {
      isValid: false,
      field: 'nom',
      message: "Le nom du groupe de matériel est obligatoire (ex: Ordinateurs portables, Écrans).",
    };
  }
  const cleanNom = nom.trim();
  if (cleanNom.length < 2 || cleanNom.length > 60) {
    return {
      isValid: false,
      field: 'nom',
      message: "Le nom du groupe doit comporter entre 2 et 60 caractères.",
    };
  }

  const normalized = normalizeString(cleanNom);
  const allGroups = await GroupeMateriel.find(getExclusionFilter(existingId));
  const duplicate = allGroups.find(g => normalizeString(g.nom) === normalized);
  if (duplicate) {
    return {
      isValid: false,
      field: 'nom',
      message: `Un groupe de matériel nommé "${duplicate.nom}" existe déjà.`,
    };
  }

  return { isValid: true };
}

// =========================================================================
// 3. CONTRÔLE DE SAISIE : MODÈLE FACTURE
// =========================================================================
export async function validateFactureData(
  data: any,
  existingId?: string
): Promise<ValidationResult> {
  const { factureFrs, numeroFacture, id_Fournisseur, dateAcquisition, montantHT, statut } = data;
  const numFacture = (factureFrs || numeroFacture || '').trim();

  // 1. Numéro de facture
  if (!numFacture) {
    return {
      isValid: false,
      field: 'factureFrs',
      message: "Le numéro de facture fournisseur est obligatoire (ex: FACT-2025-0042).",
    };
  }

  // 2. Fournisseur obligatoire
  if (!id_Fournisseur) {
    return {
      isValid: false,
      field: 'id_Fournisseur',
      message: "Veuillez sélectionner le fournisseur émetteur de la facture.",
    };
  }
  const fournisseur = await safeFindDoc(Fournisseur, id_Fournisseur);
  if (!fournisseur) {
    return {
      isValid: false,
      field: 'id_Fournisseur',
      message: "Le fournisseur sélectionné est introuvable.",
    };
  }

  // 3. Unicité du numéro de facture pour ce même fournisseur
  const duplicateFacture = await Facture.findOne({
    id_Fournisseur: id_Fournisseur.toString(),
    factureFrs: { $regex: new RegExp(`^${escapeRegex(numFacture)}$`, 'i') },
    ...getExclusionFilter(existingId),
  });
  if (duplicateFacture) {
    return {
      isValid: false,
      field: 'factureFrs',
      message: `La facture "${numFacture}" existe déjà pour le fournisseur "${fournisseur.Fournisseur}".`,
    };
  }

  // 4. Date d'acquisition (Ne peut pas être dans le futur)
  if (!dateAcquisition) {
    return {
      isValid: false,
      field: 'dateAcquisition',
      message: "La date d'acquisition de la facture est obligatoire.",
    };
  }
  const dFacture = new Date(dateAcquisition);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (isNaN(dFacture.getTime())) {
    return {
      isValid: false,
      field: 'dateAcquisition',
      message: "La date d'acquisition n'est pas une date valide.",
    };
  }
  if (dFacture > today) {
    return {
      isValid: false,
      field: 'dateAcquisition',
      message: "La date de la facture ne peut pas être postérieure à la date d'aujourd'hui.",
    };
  }

  // 5. Montant HT (Strictement positif)
  const numericHT = Number(montantHT);
  if (isNaN(numericHT) || numericHT <= 0) {
    return {
      isValid: false,
      field: 'montantHT',
      message: "Le montant HT de la facture doit être un nombre strictement supérieur à 0 TND.",
    };
  }

  // 6. Statut valide
  if (statut && !['Payée', 'En attente', 'En retard'].includes(statut)) {
    return {
      isValid: false,
      field: 'statut',
      message: "Le statut de la facture doit être 'Payée', 'En attente' ou 'En retard'.",
    };
  }

  return { isValid: true };
}

// =========================================================================
// 4. CONTRÔLE DE SAISIE : MODÈLE FOURNISSEUR
// =========================================================================
export async function validateFournisseurData(
  data: any,
  existingId?: string
): Promise<ValidationResult> {
  const nom = data.Fournisseur || data.nom;
  const { email, telephone } = data;

  // 1. Nom / Raison sociale
  if (!nom || !nom.trim()) {
    return {
      isValid: false,
      field: 'Fournisseur',
      message: "Le nom ou la raison sociale du fournisseur est obligatoire (ex: Dell Technologies).",
    };
  }
  const cleanNom = nom.trim();
  if (cleanNom.length < 2 || cleanNom.length > 100) {
    return {
      isValid: false,
      field: 'Fournisseur',
      message: "Le nom du fournisseur doit comporter entre 2 et 100 caractères.",
    };
  }

  // Unicité du nom du fournisseur
  const normalized = normalizeString(cleanNom);
  const allFrs = await Fournisseur.find(getExclusionFilter(existingId));
  const duplicate = allFrs.find(f => normalizeString(f.Fournisseur) === normalized);
  if (duplicate) {
    return {
      isValid: false,
      field: 'Fournisseur',
      message: `Un fournisseur nommé "${duplicate.Fournisseur}" existe déjà dans votre base de données.`,
    };
  }

  // 2. Email (si renseigné)
  if (email && email.trim() && !isValidEmail(email)) {
    return {
      isValid: false,
      field: 'email',
      message: "L'adresse email du fournisseur est invalide (ex: contact@fournisseur.tn).",
    };
  }

  // 3. Téléphone (si renseigné)
  if (telephone && telephone.trim() && !isValidPhone(telephone)) {
    return {
      isValid: false,
      field: 'telephone',
      message: "Le numéro de téléphone du fournisseur est invalide (ex: +216 71 234 567).",
    };
  }

  return { isValid: true };
}

// =========================================================================
// 5. CONTRÔLE DE SAISIE : MODÈLE EMPLACEMENT
// =========================================================================
export async function validateEmplacementData(
  data: any,
  existingId?: string
): Promise<ValidationResult> {
  const { emplacement1, emplacement2, id_GroupeEmplacement } = data;

  // 1. Bureau / Nom
  if (!emplacement1 || !emplacement1.trim()) {
    return {
      isValid: false,
      field: 'emplacement1',
      message: "Le nom du bureau ou de la salle est obligatoire (ex: Bureau 204, Salle Serveur A).",
    };
  }

  // 2. Nom de l'emplacement (Bureau / Local / Zone)
  if (!emplacement2 || !emplacement2.trim()) {
    return {
      isValid: false,
      field: 'emplacement2',
      message: "Le nom de l'emplacement est obligatoire.",
    };
  }

  const cleanEmp2 = emplacement2.trim();
  const normalizedEmp2 = normalizeString(cleanEmp2);

  // 3. Groupe / Catégorie d'emplacement
  if (!id_GroupeEmplacement) {
    return {
      isValid: false,
      field: 'id_GroupeEmplacement',
      message: "Veuillez sélectionner le groupe d'emplacement.",
    };
  }
  const group = await safeFindDoc(GroupeEmplacement, id_GroupeEmplacement);
  if (!group) {
    return {
      isValid: false,
      field: 'id_GroupeEmplacement',
      message: "Le groupe d'emplacement sélectionné est introuvable.",
    };
  }

  // 4. Contrôle d'unicité : Le nom de l'emplacement doit être unique
  const allEmplacements = await Emplacement.find(getExclusionFilter(existingId));
  const duplicate = allEmplacements.find(
    e => normalizeString(e.emplacement2) === normalizedEmp2
  );
  if (duplicate) {
    return {
      isValid: false,
      field: 'emplacement2',
      message: `Cet emplacement existe déjà.`,
    };
  }

  return { isValid: true };
}

// =========================================================================
// 6. CONTRÔLE DE SAISIE : MODÈLE GROUPE EMPLACEMENT (Sites / Bâtiments)
// =========================================================================
export async function validateGroupeEmplacementData(
  data: any,
  existingId?: string
): Promise<ValidationResult> {
  const nom = data.nom;
  if (!nom || !nom.trim()) {
    return {
      isValid: false,
      field: 'nom',
      message: "Le nom du site ou bâtiment est obligatoire (ex: Siège Tunis, Usine Bizerte).",
    };
  }
  const cleanNom = nom.trim();
  if (cleanNom.length < 2 || cleanNom.length > 80) {
    return {
      isValid: false,
      field: 'nom',
      message: "Le nom du site doit comporter entre 2 et 80 caractères.",
    };
  }

  const normalized = normalizeString(cleanNom);
  const allGroups = await GroupeEmplacement.find(getExclusionFilter(existingId));
  const duplicate = allGroups.find(g => normalizeString(g.nom) === normalized);
  if (duplicate) {
    return {
      isValid: false,
      field: 'nom',
      message: `Un site ou bâtiment nommé "${duplicate.nom}" existe déjà.`,
    };
  }

  return { isValid: true };
}

// =========================================================================
// 7. CONTRÔLE DE SAISIE : MODÈLE USER / COLLABORATEUR
// =========================================================================
export async function validateUserData(
  data: any,
  existingId?: string
): Promise<ValidationResult> {
  const { beneficiaire, email, password, statut, removePassword } = data;

  // 1. Nom & Prénom
  if (!beneficiaire || !beneficiaire.trim()) {
    return {
      isValid: false,
      field: 'beneficiaire',
      message: "Le nom et prénom du collaborateur sont obligatoires (ex: Ahmed Ben Ali).",
    };
  }
  if (beneficiaire.trim().length < 2) {
    return {
      isValid: false,
      field: 'beneficiaire',
      message: "Le nom du collaborateur doit comporter au moins 2 caractères.",
    };
  }

  // 2. Email obligatoire, valide et unique
  if (!email || !email.trim()) {
    return {
      isValid: false,
      field: 'email',
      message: "L'adresse email professionnelle est obligatoire.",
    };
  }
  const cleanEmail = email.toLowerCase().trim();
  if (!isValidEmail(cleanEmail)) {
    return {
      isValid: false,
      field: 'email',
      message: "Veuillez saisir une adresse email valide (ex: ahmed.benali@entreprise.tn).",
    };
  }

  const duplicateEmail = await User.findOne({
    email: cleanEmail,
    ...getExclusionFilter(existingId),
  });
  if (duplicateEmail) {
    return {
      isValid: false,
      field: 'email',
      message: `L'adresse email "${cleanEmail}" est déjà utilisée par un autre collaborateur.`,
    };
  }

  // 3. Sécurité du Mot de Passe (si mot de passe fourni ou modifié)
  if (password && password.trim().length > 0 && removePassword !== true) {
    const pwd = password.trim();
    if (pwd.length < 8) {
      return {
        isValid: false,
        field: 'password',
        message: "Le mot de passe doit comporter au moins 8 caractères pour garantir la sécurité du compte.",
      };
    }
    const hasNumber = /[0-9]/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    if (!hasNumber || !hasLetter) {
      return {
        isValid: false,
        field: 'password',
        message: "Le mot de passe doit contenir au moins une lettre et un chiffre.",
      };
    }
  }

  // 4. Règle de départ RH / Désactivation (Statut Inactif)
  if (existingId && statut === 'Inactif') {
    const assignedMaterials = await Materiel.find({
      $or: [{ id_Beneficiaire: existingId }, { id_Beneficiaire: String(existingId) }],
    });
    if (assignedMaterials.length > 0) {
      const matNames = assignedMaterials
        .slice(0, 3)
        .map(m => `« ${m.designation} » (${m.reference})`)
        .join(', ');
      const extra = assignedMaterials.length > 3 ? ` et ${assignedMaterials.length - 3} autre(s)` : '';
      return {
        isValid: false,
        field: 'statut',
        message: `Ce collaborateur possède encore ${assignedMaterials.length} matériel(s) affecté(s) (${matNames}${extra}). Veuillez réaffecter ses matériels au stock avant de désactiver ce compte.`,
      };
    }
  }

  return { isValid: true };
}

// =========================================================================
// 8. CONTRÔLE DE SAISIE : CONNEXION / LOGIN
// =========================================================================
export function validateLoginData(data: any): ValidationResult {
  const { email, password } = data;

  if (!email || !String(email).trim()) {
    return {
      isValid: false,
      field: 'email',
      message: "Veuillez saisir votre adresse email.",
    };
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return {
      isValid: false,
      field: 'email',
      message: "L'adresse email saisie n'a pas un format valide (ex: utilisateur@omoda.tn).",
    };
  }

  if (!password || !String(password).trim()) {
    return {
      isValid: false,
      field: 'password',
      message: "Veuillez saisir votre mot de passe de connexion.",
    };
  }

  return { isValid: true };
}

// =========================================================================
// 9. CONTRÔLE DE SAISIE : RÉCLAMATION (TICKET D'INCIDENT)
// =========================================================================
export async function validateReclamationData(
  data: any,
  _existingId?: string
): Promise<ValidationResult> {
  const {
    titre,
    description,
    priorite,
    id_Demandeur,
    nature,
    materielsConcernesIds,
    categoriesIds,
    id_MaterielConcerne,
    id_GroupeMateriel,
    id_GroupeReclamation,
  } = data;

  // 1. Titre / Sujet
  if (!titre || !titre.trim()) {
    return {
      isValid: false,
      field: 'titre',
      message: "Le sujet / titre de votre réclamation est obligatoire (ex: Écran ne s'allume plus après mise en veille...).",
    };
  }
  if (titre.trim().length < 3) {
    return {
      isValid: false,
      field: 'titre',
      message: "Le titre de la réclamation doit comporter au moins 3 caractères explicites.",
    };
  }

  // 2. Description détaillée
  if (!description || !description.trim()) {
    return {
      isValid: false,
      field: 'description',
      message: "La description détaillée du problème ou de votre besoin est obligatoire.",
    };
  }
  if (description.trim().length < 5) {
    return {
      isValid: false,
      field: 'description',
      message: "Veuillez fournir une description un peu plus précise (au moins 5 caractères).",
    };
  }

  // 3. Validation de la deuxième partie (Choix Matériel ou Catégorie)
  const isMaterielMode = nature === 'materiel';
  const hasSelectedMaterials = (Array.isArray(materielsConcernesIds) && materielsConcernesIds.length > 0) || !!id_MaterielConcerne;
  const hasSelectedCategories = (Array.isArray(categoriesIds) && categoriesIds.length > 0) || !!id_GroupeMateriel || !!id_GroupeReclamation;

  if (isMaterielMode && !hasSelectedMaterials && !hasSelectedCategories) {
    // Si en mode matériel sans matériel sélectionné, on peut accepter ou demander la sélection
  }

  // 4. Priorité
  if (priorite && !['Basse', 'Moyenne', 'Haute', 'Urgente'].includes(priorite)) {
    return {
      isValid: false,
      field: 'priorite',
      message: "Le niveau de priorité sélectionné est invalide.",
    };
  }

  // 5. Demandeur
  if (!id_Demandeur || !String(id_Demandeur).trim()) {
    return {
      isValid: false,
      field: 'id_Demandeur',
      message: "Le demandeur de la réclamation est requis.",
    };
  }

  return { isValid: true };
}

// =========================================================================
// 11. RÈGLES D'INTÉGRITÉ LORS DE LA SUPPRESSION (DELETE GUARDS)
// =========================================================================

export async function canDeleteGroupeMateriel(id: string): Promise<ValidationResult> {
  const count = await Materiel.countDocuments({
    $or: [{ id_GroupeMateriel: id }, { id_GroupeMateriel: String(id) }],
  });
  if (count > 0) {
    return {
      isValid: false,
      message: `Vous ne pouvez pas supprimer ce groupe de matériel car il contient encore ${count} matériel(s). Vous devez d'abord réassigner ces matériels à un autre groupe ou les supprimer.`,
    };
  }
  return { isValid: true };
}

export async function canDeleteFacture(id: string): Promise<ValidationResult> {
  const count = await Materiel.countDocuments({
    $or: [{ id_Facture: id }, { id_Facture: String(id) }],
  });
  if (count > 0) {
    return {
      isValid: false,
      message: `Cette facture est liée à ${count} matériel(s) du parc. Vous ne pouvez pas la supprimer : vous devez d'abord détacher ces matériels ou les supprimer.`,
    };
  }
  return { isValid: true };
}

export async function canDeleteFournisseur(id: string): Promise<ValidationResult> {
  const countFactures = await Facture.countDocuments({
    $or: [{ id_Fournisseur: id }, { id_Fournisseur: String(id) }],
  });
  const countMateriels = await Materiel.countDocuments({
    $or: [{ id_Fournisseur: id }, { id_Fournisseur: String(id) }],
  });
  if (countFactures > 0 || countMateriels > 0) {
    return {
      isValid: false,
      message: `Vous ne pouvez pas supprimer ce fournisseur car il a des matériels existants ou factures associés (${countMateriels} matériel(s), ${countFactures} facture(s)). Vous devez d'abord les réaffecter ou les supprimer.`,
    };
  }
  return { isValid: true };
}

export async function canDeleteEmplacement(id: string): Promise<ValidationResult> {
  const countMateriels = await Materiel.countDocuments({
    $or: [{ id_Emplacement: id }, { id_Emplacement: String(id) }],
  });
  const countUsers = await User.countDocuments({
    $or: [{ id_Emplacement: id }, { id_Emplacement: String(id) }],
  });
  if (countMateriels > 0 || countUsers > 0) {
    return {
      isValid: false,
      message: `Vous ne pouvez pas supprimer cet emplacement car il contient des employés et/ou des matériels (${countUsers} employé(s), ${countMateriels} matériel(s)). Vous devez d'abord les détacher ou les supprimer.`,
    };
  }
  return { isValid: true };
}

export async function canDeleteGroupeEmplacement(id: string): Promise<ValidationResult> {
  const countEmplacements = await Emplacement.countDocuments({
    $or: [{ id_GroupeEmplacement: id }, { id_GroupeEmplacement: String(id) }],
  });
  if (countEmplacements > 0) {
    return {
      isValid: false,
      message: `Impossible de supprimer ce site / bâtiment car ${countEmplacements} emplacement(s) y sont rattachés. Vous devez d'abord les réaffecter ou les supprimer.`,
    };
  }
  return { isValid: true };
}

export async function canDeleteUser(
  id: string,
  requester?: { id?: string; email?: string; isSuperAdmin?: boolean; role?: string }
): Promise<ValidationResult> {
  const user = await safeFindDoc(User, id);
  if (!user) {
    return { isValid: false, message: 'Utilisateur introuvable.' };
  }
  let roleName = user.role || '';
  if (user.id_Role) {
    const roleDoc = await safeFindDoc(Role, user.id_Role);
    if (roleDoc?.nom) {
      roleName = roleDoc.nom;
    }
  }

  const isTargetSuperAdmin = !!user.isSuperAdmin;
  const isTargetIT = normalizeString(roleName) === normalizeString('Responsable IT');

  // 1. Le compte Super Admin ne peut JAMAIS être supprimé ni archivé
  if (isTargetSuperAdmin) {
    return {
      isValid: false,
      message: 'Le compte du Super Admin est le compte principal protégé du système et ne peut être ni supprimé ni archivé.',
    };
  }

  // 2. Si la cible est un Responsable IT (non Super Admin)
  if (isTargetIT) {
    // Seul un Responsable IT avec le double rôle Super Admin peut le supprimer ou l'archiver
    if (!requester?.isSuperAdmin) {
      return {
        isValid: false,
        message: 'Seul le Responsable IT ayant le double rôle Super Admin a le privilège de supprimer ou d\'archiver un autre Responsable IT.',
      };
    }

    // Le Super Admin ne peut pas supprimer son propre compte
    const targetDocId = user.id || (user._id ? user._id.toString() : '');
    if (requester?.id && targetDocId && requester.id === targetDocId) {
      return {
        isValid: false,
        message: 'Vous ne pouvez pas supprimer ou archiver votre propre compte.',
      };
    }
  }

  return { isValid: true };
}

export async function canDeleteRole(id: string): Promise<ValidationResult> {
  const role = await safeFindDoc(Role, id) || await Role.findById(id);
  if (!role) {
    return { isValid: false, message: 'Rôle introuvable.' };
  }

  if (role.isSystem || normalizeString(role.nom) === normalizeString('Responsable IT')) {
    return {
      isValid: false,
      message: 'Le rôle système "Responsable IT" est protégé et ne peut pas être supprimé.',
    };
  }

  const roleIdStr = role._id ? role._id.toString() : '';
  const customIdStr = role.id || '';
  const roleNormName = normalizeString(role.nom);

  const allUsers = await User.find();
  const usersWithThisRole = allUsers.filter(u => {
    if (u.id_Role && (u.id_Role === roleIdStr || (customIdStr && u.id_Role === customIdStr))) {
      return true;
    }
    const uRole = (u as any).role;
    if (uRole && normalizeString(uRole) === roleNormName) {
      return true;
    }
    return false;
  });

  if (usersWithThisRole.length > 0) {
    const userNames = usersWithThisRole.slice(0, 3).map(u => u.beneficiaire).join(', ');
    const moreText = usersWithThisRole.length > 3 ? ` et ${usersWithThisRole.length - 3} autre(s)` : '';
    return {
      isValid: false,
      message: `Ce rôle est assigné à ${usersWithThisRole.length} utilisateur(s) (${userNames}${moreText}), vous ne pouvez pas le supprimer. Vous devez d'abord réassigner ou modifier leur rôle.`,
    };
  }

  return { isValid: true };
}



