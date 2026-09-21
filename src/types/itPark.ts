export interface GroupeMateriel {
  id: string;
  Groupe: string; // e.g., "Ordinateurs", "Écrans", "Imprimantes", "Téléphones", "Serveurs", "Accessoires"
  nom?: string;   // Alias pour cohérence avec le backend
  description?: string;
  codeSerieObligatoire?: boolean; // Indique si le code série est obligatoire pour les matériels de ce groupe
  materielCount?: number;
}

export interface Fournisseur {
  id: string;
  Fournisseur: string; // e.g., "Tech Solutions", "Office Equip", "IT Partner"
  email?: string;
  telephone?: string;
  adresse?: string;
}

export interface Facture {
  id: string;
  factureFrs: string; // e.g., "FACT-2025-078"
  dateAcquisition: string; // e.g., "2025-05-18"
  id_Fournisseur: string;
  montantHT: number;
  statut: 'Payée' | 'En attente' | 'En retard';
}

export type GroupeEmplacementNom = string;

export interface GroupeEmplacement {
  id: string;
  nom: string;
  couleur?: string; // e.g. 'blue' | 'amber' | 'emerald' | 'purple' | 'indigo' | 'rose' | 'cyan' | 'teal'
  icon?: string;   // e.g. 'building' | 'wrench' | 'concierge' | 'server' | 'warehouse' | 'flask' | 'mappin' | 'users'
}

export interface Emplacement {
  id: string;
  id_GroupeEmplacement: string;
  emplacement1: string; // e.g., "Siège Tunis - Bureau 101" or "Agence Sousse"
  emplacement2: string; // e.g., "1er Étage - Aile Ouest" or "Zone Accueil"
}

export interface Role {
  id: string;
  nom: string;
  description?: string;
  couleur?: string;
  isSystem?: boolean;
}

export function normalizeRoleName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export type UserRole = string;
export type AccesApp = 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS' | 'NONE';

export interface Beneficiaire {
  id: string;
  beneficiaire: string; // Nom & Prénom, e.g. "Yassine Skander"
  email: string;
  photo?: string;
  id_Role: string;
  role: string;
  statut: 'Actif' | 'Inactif';
  id_Emplacement: string;
  isSuperAdmin?: boolean;
  derniereActivite?: string;
  hasPassword?: boolean;
  isITUser?: boolean;
  isUserAccount?: boolean;
  password?: string;
  removePassword?: boolean;
  accesApp?: AccesApp;
  sendNotificationEmail?: boolean;
}

export interface IHistoriqueReclamation {
  date: string;
  auteur: string;
  role?: string;
  message: string;
  typeAction?: 'creation' | 'statut' | 'commentaire' | 'resolution' | 'assignation' | 'priorite';
}

export interface Reclamation {
  id: string;
  code: string;
  titre: string;
  description: string;
  nature?: 'materiel' | 'autre';
  // Sélection de matériels (un ou plusieurs)
  materielsConcernesIds?: string[];
  materielsConcernesNoms?: string[];
  id_MaterielConcerne?: string;
  materielNom?: string;
  // Sélection de catégories (une ou plusieurs)
  categoriesIds?: string[];
  categoriesNoms?: string[];
  id_GroupeMateriel?: string;
  id_GroupeReclamation?: string;
  groupeNom?: string;
  groupeCouleur?: string;
  // Priorité et statut
  priorite: 'Basse' | 'Moyenne' | 'Haute' | 'Urgente';
  statut: 'Ouverte' | 'En cours' | 'En attente' | 'Résolue' | 'Rejetée';
  id_Demandeur: string;
  demandeurNom?: string;
  demandeurEmail?: string;
  id_TechnicienAssigne?: string;
  technicienNom?: string;
  delaiTraitementHeures?: number;
  dateEcheanceSla?: string;
  dateMaxResolution?: string; // Date maximale d'intervention / résolution
  solution?: string;
  dateResolution?: string;
  piecesJointes?: string[];
  historique: IHistoriqueReclamation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailLog {
  id: string;
  destinataireEmail: string;
  destinataireNom: string;
  sujet: string;
  contenuHtml: string;
  type: string;
  statut: string;
  errorMessage?: string;
  tempPasswordPreview?: string;
  dateEnvoi: string;
}

export type StatutMateriel = 'En service' | 'En panne' | 'Hors service' | 'En stock';

export interface Materiel {
  id: string;
  reference: string;
  ref_immo?: string; // Référence d'immobilisation dans l'ERP externe
  designation: string;
  codeSerie: string;
  codeBarre?: string;
  qte: number;
  montantHT?: number;
  valeurPlafond?: number;
  dateEntree?: string;
  dateMiseEnService: string;
  statut: StatutMateriel;
  garantie: string; // e.g. "24 mois" or expiration date
  id_GroupeMateriel: string;
  id_Fournisseur: string;
  id_Facture: string;
  id_Emplacement: string;
  id_Beneficiaire?: string;
  image?: string;
  isImprimante?: boolean;
}

// =========================================================================
// MODÈLE COMPOSANT & CONSOMMABLES (Lié à un Matériel)
// =========================================================================

export type CapaciteType = 'grammage' | 'litrage';
export type CapaciteUniteGrammage = 'g' | 'kg';
export type CapaciteUniteLitrage = 'l' | 'cl';
export type CapaciteUnite = CapaciteUniteGrammage | CapaciteUniteLitrage;
export type TauxUtilisationLiquide = '0%' | '25%' | '50%' | '75%' | '100%';
export type TauxUtilisationComposant = TauxUtilisationLiquide;

export type CouleurImprimante = 'Noir' | 'Cyan' | 'Magenta' | 'Jaune';

export interface DetailCouleurImprimante {
  id: CouleurImprimante;
  nom: string;
  label: string;
  codeHex: string;
  colorHex: string;
  prefix: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
}

export const COULEURS_IMPRIMANTE: DetailCouleurImprimante[] = [
  { id: 'Noir', nom: 'Noir (Black)', label: 'Noir', prefix: 'BK', codeHex: '#111827', colorHex: '#111827', badgeBg: 'bg-gray-900', badgeText: 'text-white', borderClass: 'border-gray-900' },
  { id: 'Cyan', nom: 'Cyan (Bleu)', label: 'Cyan', prefix: 'CY', codeHex: '#06b6d4', colorHex: '#06b6d4', badgeBg: 'bg-cyan-500', badgeText: 'text-white', borderClass: 'border-cyan-500' },
  { id: 'Magenta', nom: 'Magenta (Rouge/Rose)', label: 'Magenta', prefix: 'MG', codeHex: '#ec4899', colorHex: '#ec4899', badgeBg: 'bg-pink-600', badgeText: 'text-white', borderClass: 'border-pink-600' },
  { id: 'Jaune', nom: 'Jaune (Yellow)', label: 'Jaune', prefix: 'YL', codeHex: '#eab308', colorHex: '#eab308', badgeBg: 'bg-amber-400', badgeText: 'text-gray-950', borderClass: 'border-amber-400' },
];

export interface LiquideEcriture {
  id: string;
  REF_composant: string; // Référence unique saisie par le responsable IT
  nom: string;
  couleur?: CouleurImprimante | string; // Couleur principale de l'imprimante : Noir, Cyan, Magenta, Jaune
  refMateriel?: string; // Référence interne du modèle de matériel lié (en MAJUSCULES, ex: "HP-M404")
  id_Materiel?: string; // rétrocompatibilité
  materielDesignation?: string;
  materielReference?: string;
  materielsAssociesCount?: number; // Nombre de machines physiques (imprimantes...) partageant cette référence
  materielsAssocies?: Array<{
    id: string;
    designation: string;
    reference: string;
    codeSerie?: string;
    statut?: string;
  }>;
  capaciteType?: CapaciteType; // 'grammage' ou 'litrage' (optionnel)
  capaciteUnite?: CapaciteUnite; // si grammage -> 'g' | 'kg', si litrage -> 'l' | 'cl' (optionnel)
  capaciteValeur?: number; // (optionnel)
  utilisation: TauxUtilisationLiquide; // "0%", "25%", "50%", "75%", "100%"
  enStock?: boolean; // Règle métier : true uniquement si utilisation === '0%', sinon stock - 1
  remarques?: string;
  dateEntree?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type Composant = LiquideEcriture;

// Synthèse dynamique des stocks (non stocké en base, calculé pour affichage et stats)
export interface StockGroupeItem {
  idGroupe: string;
  nomGroupe: string;
  totalMateriels: number;
  enStock: number; // Matériels disponibles en stock (statut === 'En stock' ou pas d'affectation)
  enService: number; // Matériels en service
  enPanne: number; // Matériels en panne ou maintenance
  composantsAssociesCount: number;
  composantsEnStock: number; // Composants avec utilisation 0%
  composantsEnService: number; // Composants avec utilisation 25%, 50%, 75%
  composantsEpuises: number; // Composants avec utilisation 100%
  liquidesAssociesCount?: number;
  liquidesEnStock?: number;
  liquidesEnService?: number;
  liquidesEpuises?: number;
}

export interface StockComposantsSummary {
  totalComposants: number;
  enStock: number; // 0%
  enCours: number; // 25%, 50%, 75% (sortis du stock)
  epuises: number; // 100% (consommés)
  parType: {
    grammage: { total: number; enStock: number; enCours: number };
    litrage: { total: number; enStock: number; enCours: number };
  };
  parUtilisation: Record<'0%' | '25%' | '50%' | '75%' | '100%', number>;
}

export type StockLiquidesSummary = StockComposantsSummary;

export interface StockGlobalSummary {
  totalMateriels: number;
  materielsEnStock: number;
  materielsEnService: number;
  materielsEnPanne: number;
  totalComposants: number;
  composantsEnStock: number; // 0%
  composantsSortisDuStock: number; // 25%, 50%, 75%, 100%
  totalLiquides?: number;
  liquidesEnStock?: number;
  liquidesSortisDuStock?: number;
  stockGlobalCalcule: number; // Total articles physiques disponibles en stock (materielsEnStock + composantsEnStock)
  tauxDisponibiliteGlobal: number; // En pourcentage
  groupesStock: StockGroupeItem[];
  composantsSummary: StockComposantsSummary;
  liquidesSummary?: StockLiquidesSummary;
}

export interface PersonnelActifItem {
  id: string;
  beneficiaire: string;
  email: string;
  roleNom: string;
  id_Emplacement?: string;
  emplacementNom: string;
  statut: string;
  materielsPersonnelCount: number;
  materielsEmplacementCount: number;
  materielsCount: number;
  materielsPersonnel: Array<{
    id: string;
    designation: string;
    reference: string;
    categorie: string;
    statut: string;
    valeurPlafond: number;
    codeSerie?: string;
    codeBarre?: string;
    garantie?: string;
  }>;
  materielsEmplacement: Array<{
    id: string;
    designation: string;
    reference: string;
    categorie: string;
    statut: string;
    valeurPlafond: number;
    codeSerie?: string;
    codeBarre?: string;
    garantie?: string;
  }>;
  materielsList: Array<{
    id: string;
    designation: string;
    reference: string;
    categorie: string;
    statut: string;
    valeurPlafond: number;
    codeSerie?: string;
    codeBarre?: string;
    garantie?: string;
  }>;
}

export interface EmplacementStatItem {
  id: string;
  nom: string;
  total: number;
  enService: number;
  enPanne: number;
  personnelCount: number;
}

export interface FactureStatutItem {
  statut: 'Payée' | 'En attente' | 'En retard';
  count: number;
  montantHT: number;
  montantFormatte: string;
  pourcentage: string;
  color: string;
}

export interface FournisseurPanneStatItem {
  id: string;
  nom: string;
  totalFournis: number;
  enPanne: number;
  enService: number;
  tauxPanne: number; // en %
  scoreFiabilite: number; // en %
}

export interface PrioriteReclamationItem {
  priorite: 'Urgente' | 'Haute' | 'Moyenne' | 'Basse';
  ouvertes: number;
  resolues: number;
  total: number;
  color: string;
}

export interface DashboardStats {
  metrics: {
    totalMateriels: number;
    totalUsers: number;
    totalFacturesCount: number;
    totalEmplacementsCount: number;
    totalFournisseursCount: number;
    totalGarantiesActives: number;
    // KPI Cards Spécifiques & Clés Financières DSI
    valeurTotaleParcHT: number;
    valeurTotaleParcFormatte: string;
    tauxDisponibilite: number;
    tauxDisponibiliteFormatte: string;
    materielsEnStock: number;
    materielsEnPanneTotal: number;
    ticketsUrgentsOuverts: number;
    garantiesExpirantes60Jours: number;
    mttrMoyenHeures: number;
    mttrFormatte: string;
    // Consolidated stock metrics (matériels + composants à 0%)
    stockGlobalCalcule?: number;
    composantsEnStock?: number;
    totalComposants?: number;
    // Global support metrics
    totalReclamations?: number;
    reclamationsOuvertes?: number;
    reclamationsEnCours?: number;
    reclamationsResolues?: number;
    reclamationsUrgentes?: number;
    tauxResolution?: string;
    materielsTrend: string;
    usersTrend: string;
    facturesTrend: string;
    emplacementsTrend: string;
    fournisseursTrend: string;
    garantiesTrend: string;
    reclamationsTrend?: string;
  };
  pieData: Array<{
    name: string;
    value: number;
    percent: string;
    color: string;
  }>;
  lineData: Array<{
    date: string;
    enService: number;
    enPanne: number;
    horsService: number;
  }>;
  // Nouvelles ventilations DSI réelles
  emplacementsStats: EmplacementStatItem[];
  personnelActif: PersonnelActifItem[];
  facturesStats: {
    parStatut: FactureStatutItem[];
    totalMontantHT: number;
    totalMontantFormatte: string;
  };
  fournisseursPannes: FournisseurPanneStatItem[];
  prioritesReclamations: PrioriteReclamationItem[];
  activeReclamations: Array<{
    id: string;
    code: string;
    titre: string;
    categorie: string;
    demandeurNom: string;
    demandeurEmail?: string;
    priorite: string;
    statut: string;
    technicienNom?: string;
    delaiTraitementHeures?: number;
    createdAt: string;
  }>;
  recentMateriels: Array<{
    id: string;
    designation: string;
    reference: string;
    ref_immo?: string;
    categorie: string;
    dateEntree: string;
    statut: string;
  }>;
  recentFactures: Array<{
    id: string;
    factureFrs: string;
    fournisseurNom: string;
    montantHT: number;
    montantFormatte: string;
    statut: string;
  }>;
  recentReclamations?: Array<{
    id: string;
    code: string;
    titre: string;
    categorie: string;
    demandeurNom: string;
    priorite: string;
    statut: string;
    createdAt: string;
  }>;
  userStats?: {
    totalUserReclamations: number;
    userOuvertes: number;
    userEnCours: number;
    userResolues: number;
    userAssignedMaterielsCount: number;
    recentUserReclamations: any[];
    userMateriels: any[];
  };
  alerts: Array<{
    id: string;
    type: string;
    titre: string;
    description: string;
    time: string;
  }>;
  totalCategoryCount: number;
}

export type BackofficeTab = 
  | 'dashboard'
  | 'reclamations'
  | 'messagerie'
  | 'utilisateurs'
  | 'materiels'
  | 'composants'
  | 'stocks'
  | 'factures'
  | 'emplacements'
  | 'fournisseurs'
  | 'profile';

export type ChatMessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'call' | 'system';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderNom: string;
  senderEmail: string;
  senderRole: string;
  recipientId?: string;
  text: string;
  messageType: ChatMessageType;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  mediaMimeType?: string;
  mediaDuration?: number;
  readBy: string[];
  isRead: boolean;
  callData?: {
    type: 'audio' | 'video';
    status: 'completed' | 'missed' | 'rejected' | 'in_progress';
    durationSec?: number;
  };
  clientTempId?: string;
  status?: 'sending' | 'sent' | 'error';
  createdAt: string;
}

export interface ChatParticipantInfo {
  userId: string;
  nom: string;
  email: string;
  role: string;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  participantDetails: ChatParticipantInfo[];
  lastMessageText?: string;
  lastMessageType?: ChatMessageType;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCount?: number;
  unreadCounts?: Record<string, number>;
  otherParticipant?: ChatParticipantInfo;
  createdAt: string;
  updatedAt: string;
}

export interface ChatContact {
  id: string;
  beneficiaire: string;
  email: string;
  role: string;
  isIT: boolean;
  derniereActivite?: string;
  statut: string;
  accesApp?: string;
}


