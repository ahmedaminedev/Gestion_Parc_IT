import React, { useState, useEffect, useMemo } from 'react';
import {
  Laptop,
  FileText,
  MapPin,
  Briefcase,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Package,
  Monitor,
  Smartphone,
  Printer,
  Server,
  Cpu,
  Clock,
  CheckCircle2,
  LifeBuoy,
  Plus,
  Wrench,
  Activity,
  CheckCircle,
  Users,
  Search,
  X,
  DollarSign,
  PieChart as PieChartIcon,
  HardDrive,
  Info,
  HelpCircle,
  Building2,
  UserCheck,
  MessageSquare,
  ArrowUpRight
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { itParkService } from '../../services/itParkService';
import { authService, AuthUser } from '../../services/authService';
import {
  BackofficeTab,
  DashboardStats,
  Materiel,
  Reclamation,
  Emplacement,
  PersonnelActifItem
} from '../../types/itPark';

interface DashboardPageProps {
  onNavigateTab: (tab: BackofficeTab) => void;
}

// Definition of explanations for all indicators and charts
interface ElementExplanation {
  id: string;
  titre: string;
  categorie: string;
  role: string;
  calcul: string;
  utiliteDSI: string;
}

const EXPLANATIONS: Record<string, ElementExplanation> = {
  kpi_valeur_parc: {
    id: 'kpi_valeur_parc',
    titre: 'Valeur Totale du Parc IT Actif',
    categorie: 'Indicateur Financier',
    role: 'Représente le montant financier global immobilisé par l’entreprise dans son infrastructure informatique en service.',
    calcul: 'Somme de (Valeur Plafond × Quantité) pour tous les équipements dont le statut est "En service".',
    utiliteDSI: 'Permet au DSI de suivre la valeur de l’actif technologique, d’anticiper les amortissements comptables et d’évaluer la couverture d’assurance du parc.',
  },
  kpi_disponibilite: {
    id: 'kpi_disponibilite',
    titre: 'Taux de Disponibilité Opérationnelle',
    categorie: 'Indicateur de Performance',
    role: 'Mesure le pourcentage d’équipements actuellement prêts et fonctionnels pour les collaborateurs de l’entreprise.',
    calcul: '(Nombre de matériels "En service" / Total des matériels du parc) × 100.',
    utiliteDSI: 'Indicateur de santé générale : un taux inférieur à 90% signale un volume critique d’équipements en panne ou en maintenance.',
  },
  kpi_stock: {
    id: 'kpi_stock',
    titre: 'Stock & Réserve IT Disponible',
    categorie: 'Indicateur Logistique',
    role: 'Indique le volume d’équipements informatiques prêts à être immédiatement affectés à un collaborateur ou déployés sur un site.',
    calcul: 'Nombre de matériels avec le statut "En stock" ou sans bénéficiaire attribué dans la base.',
    utiliteDSI: 'Garantit la continuité de service lors des nouveaux recrutements et permet de répondre instantanément aux demandes de remplacement d’urgence.',
  },
  kpi_incidents: {
    id: 'kpi_incidents',
    titre: 'Incidents IT & Support Utilisateurs',
    categorie: 'Indicateur de Support & SLA',
    role: 'Dénombre l’ensemble des réclamations informatiques actuellement en cours de traitement ainsi que le temps moyen de résolution (MTTR).',
    calcul: 'Total des réclamations avec statut différent de "Résolue" + Décompte des incidents classés "Urgente". MTTR = moyenne des durées de traitement.',
    utiliteDSI: 'Aide à piloter la réactivité de l’équipe de support technique, respecter les engagements SLA et identifier les engorgements.',
  },
  chart_emplacements: {
    id: 'chart_emplacements',
    titre: 'Histogramme Matériels par Emplacement & Effectif',
    categorie: 'Analyse Géographique & Logistique',
    role: 'Compare la répartition du matériel opérationnel et défaillant avec le nombre d’employés présents sur chaque site ou agence.',
    calcul: 'Agrégation croisée de Materiel.id_Emplacement avec User.id_Emplacement et décompte des statuts "En service" vs "En panne".',
    utiliteDSI: 'Permet de détecter les déséquilibres (ex: un site sur-équipé vs sous-équipé) et d’optimiser la distribution logistique entre agences.',
  },
  chart_factures: {
    id: 'chart_factures',
    titre: 'Engagements Factures & Trésorerie IT',
    categorie: 'Pilotage Budgétaire & Achats',
    role: 'Offre une vue globale de la trésorerie informatique engagée, répartie entre factures réglées, en cours et en retard.',
    calcul: 'Montants HT cumulés par statut de facture ("Payée", "En attente", "En retard") et pourcentages correspondants.',
    utiliteDSI: 'Alerte sur les factures échues non réglées afin d’éviter les interruptions de service ou les litiges avec les fournisseurs de matériel.',
  },
  chart_fournisseurs: {
    id: 'chart_fournisseurs',
    titre: 'Fiabilité Fournisseurs vs Matériels en Panne',
    categorie: 'Qualité & Analyse Fournisseurs',
    role: 'Évalue la qualité et le taux de sinistralité/panne constaté par fournisseur ou constructeur d’équipements.',
    calcul: 'Nombre total de matériels achetés chez le fournisseur comparé au nombre de matériels tombés en panne ou en révision (Taux de panne en %).',
    utiliteDSI: 'Aide stratégique indispensable lors des prochains appels d’offres et renouvellements de contrats matériels.',
  },
  chart_priorites: {
    id: 'chart_priorites',
    titre: 'Réclamations & Incidents par Niveau de Priorité',
    categorie: 'Charge de Travail & Criticité',
    role: 'Visualise la sévérité des demandes d’assistance (Urgente, Haute, Moyenne, Basse) en confrontant incidents ouverts et résolus.',
    calcul: 'Répartition des tickets selon le champ "priorite" avec comparaison des statuts "En cours" vs "Résolue".',
    utiliteDSI: 'Permet de prioriser les interventions critiques pour les postes clés (direction, serveurs, caisses) et d’équilibrer la charge des techniciens.',
  },
  chart_groupes: {
    id: 'chart_groupes',
    titre: 'Distribution par Groupe de Matériel',
    categorie: 'Structure du Parc Informatique',
    role: 'Illustre la proportion de chaque catégorie d’équipement : ordinateurs, écrans, serveurs, périphériques réseau, imprimantes, smartphones.',
    calcul: 'Somme des quantités de matériel regroupées par "id_GroupeMateriel" de la base de données.',
    utiliteDSI: 'Aide à la planification des budgets de renouvellement périodique selon les cycles de vie des différentes typologies d’appareils.',
  },
  list_reclamations: {
    id: 'list_reclamations',
    titre: 'Dernières Réclamations Actives (En cours & SLA)',
    categorie: 'File d’Attente Support',
    role: 'Présente en temps réel la liste des demandes de dépannage prioritaires nécessitant une intervention immédiate.',
    calcul: 'Sélection des derniers enregistrements de réclamations avec statut !== "Résolue", triés par date et niveau de priorité.',
    utiliteDSI: 'Permet une prise en charge rapide des incidents sans avoir à naviguer dans le module complet des réclamations.',
  },
  list_materiels_recents: {
    id: 'list_materiels_recents',
    titre: 'Matériels Récents Entrés au Parc',
    categorie: 'Traçabilité Inventaire',
    role: 'Affiche les derniers équipements informatiques réceptionnés ou mis en service dans l’entreprise.',
    calcul: 'Derniers enregistrements de la collection "Materiels" triés par date de création / entrée.',
    utiliteDSI: 'Garantit la traçabilité des nouvelles acquisitions et vérifie leur bonne intégration dans le catalogue actif.',
  },
  list_factures_recentes: {
    id: 'list_factures_recentes',
    titre: 'Dernières Factures IT Enregistrées',
    categorie: 'Suivi Financier Récent',
    role: 'Historique des derniers engagements financiers et commandes de matériel auprès des partenaires.',
    calcul: 'Dernières factures enregistrées avec montants HT et statut de règlement associé.',
    utiliteDSI: 'Permet un contrôle rapide des flux de facturation entrants et une coordination efficace avec la comptabilité.',
  },
  list_alertes: {
    id: 'list_alertes',
    titre: 'Alertes & Surveillance DSI en Temps Réel',
    categorie: 'Supervision & Prévention',
    role: 'Système d’alerte automatisé signalant les pannes bloquantes, les garanties expirant à 60 jours et les échéances critiques.',
    calcul: 'Règles automatiques : matériels en panne, calcul de date d’expiration de garantie et factures en retard de paiement.',
    utiliteDSI: 'Anticipation proactive des risques pour prévenir les pannes matérielles hors garantie et les interruptions de licences.',
  },
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getUser());
  const [stats, setStats] = useState<DashboardStats>(itParkService.getDashboardStats());
  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());
  const [reclamations, setReclamations] = useState<Reclamation[]>(itParkService.getReclamations());
  const [emplacements, setEmplacements] = useState<Emplacement[]>(itParkService.getEmplacements());

  // Modal Personnel Actif State
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [searchPersonnel, setSearchPersonnel] = useState('');
  const [filterPersonnelWithMatOnly, setFilterPersonnelWithMatOnly] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelActifItem | null>(null);
  const [activePersonnelTab, setActivePersonnelTab] = useState<'personnel' | 'emplacement'>('personnel');

  // Modal / Popover Explication Rôle Indicateur State
  const [activeExplanation, setActiveExplanation] = useState<ElementExplanation | null>(null);

  const fetchAllData = async () => {
    try {
      await itParkService.syncFromBackend();
      setStats(itParkService.getDashboardStats());
      setMateriels(itParkService.getMateriels());
      setReclamations(itParkService.getReclamations());
      setEmplacements(itParkService.getEmplacements());
    } catch (e) {
      console.warn('Erreur chargement dashboard:', e);
    }
  };

  useEffect(() => {
    fetchAllData();

    const unsub = itParkService.subscribe(() => {
      setStats(itParkService.getDashboardStats());
      setMateriels(itParkService.getMateriels());
      setReclamations(itParkService.getReclamations());
      setEmplacements(itParkService.getEmplacements());
    });

    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getUser());
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  const isDSIAdmin = currentUser?.role === 'Responsable IT' || currentUser?.accesApp === 'GLOBAL_BACKOFFICE';

  const {
    metrics,
    pieData = [],
    emplacementsStats = [],
    personnelActif = [],
    facturesStats = { parStatut: [], totalMontantHT: 0, totalMontantFormatte: '0 TND' },
    fournisseursPannes = [],
    prioritesReclamations = [],
    activeReclamations = [],
    recentMateriels = [],
    recentFactures = [],
    alerts = [],
    totalCategoryCount = 0,
  } = stats;

  // Helper for dynamic material category icons
  const getCategoryIcon = (cat: string) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('ordinateur') || lower.includes('laptop') || lower.includes('pc') || lower.includes('macbook')) return Laptop;
    if (lower.includes('écran') || lower.includes('moniteur') || lower.includes('display')) return Monitor;
    if (lower.includes('téléphone') || lower.includes('mobile') || lower.includes('smartphone') || lower.includes('iphone')) return Smartphone;
    if (lower.includes('imprimante') || lower.includes('scanner')) return Printer;
    if (lower.includes('serveur')) return Server;
    if (lower.includes('réseau') || lower.includes('switch') || lower.includes('routeur')) return Cpu;
    return Package;
  };

  // Filtered personnel for modal
  const filteredPersonnel = useMemo(() => {
    return personnelActif.filter(p => {
      const matchSearch = p.beneficiaire.toLowerCase().includes(searchPersonnel.toLowerCase()) ||
        p.email.toLowerCase().includes(searchPersonnel.toLowerCase()) ||
        p.emplacementNom.toLowerCase().includes(searchPersonnel.toLowerCase()) ||
        p.roleNom.toLowerCase().includes(searchPersonnel.toLowerCase());
      const matchFilter = !filterPersonnelWithMatOnly || p.materielsCount > 0;
      return matchSearch && matchFilter;
    });
  }, [personnelActif, searchPersonnel, filterPersonnelWithMatOnly]);

  // =========================================================================
  // VIEW: COLLABORATOR / EMPLOYEE VIEW (SELF DASHBOARD)
  // =========================================================================
  if (!isDSIAdmin) {
    const getUserNameById = (id?: string) => {
      const ben = itParkService.getBeneficiaires().find(b => b.id === id);
      return ben ? ben.beneficiaire : id || 'N/A';
    };

    const userMateriels = materiels.filter(m => {
      if (!currentUser) return false;
      const isDirectMatch = m.id_Beneficiaire === currentUser.id ||
        (currentUser.beneficiaire && m.id_Beneficiaire === currentUser.beneficiaire) ||
        (currentUser.beneficiaire && getUserNameById(m.id_Beneficiaire).toLowerCase().includes(currentUser.beneficiaire.toLowerCase()));
      const isLocationMatch = currentUser.id_Emplacement && m.id_Emplacement === currentUser.id_Emplacement;
      return isDirectMatch || isLocationMatch;
    });

    const userReclamations = reclamations.filter(r => {
      if (!currentUser) return false;
      const matchId = r.id_Demandeur === currentUser.id || (currentUser as any)?._id === r.id_Demandeur;
      const matchName = currentUser.beneficiaire && (r.id_Demandeur === currentUser.beneficiaire || (r.demandeurNom && r.demandeurNom.toLowerCase().trim() === currentUser.beneficiaire.toLowerCase().trim()));
      const matchEmail = currentUser.email && r.demandeurEmail && r.demandeurEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
      return matchId || matchName || matchEmail;
    });

    const userEnServiceCount = userMateriels.filter(m => m.statut === 'En service' || !m.statut).length;
    const userEnPanneCount = userMateriels.filter(m => m.statut === 'En panne').length;

    const healthScore = userMateriels.length > 0
      ? Math.round((userEnServiceCount / userMateriels.length) * 100)
      : 100;

    const userReclamationsEnCours = userReclamations.filter(r => r.statut === 'En cours' || r.statut === 'Ouverte').length;
    const userReclamationsResolues = userReclamations.filter(r => r.statut === 'Résolue').length;
    const slaResolutionRate = userReclamations.length > 0
      ? Math.round((userReclamationsResolues / userReclamations.length) * 100)
      : 100;

    const userLocation = emplacements.find(e => e.id === currentUser?.id_Emplacement);
    const warrantiesActive = userMateriels.filter(m => !m.garantie || !m.garantie.toLowerCase().includes('expir')).length;

    // Messages & retours du responsable IT sur les réclamations de ce collaborateur
    const itFeedbackMessages = userReclamations.flatMap(rec => {
      const msgs: {
        id: string;
        ticketId: string;
        ticketCode: string;
        ticketTitre: string;
        date: string;
        auteur: string;
        message: string;
        type: 'resolution' | 'commentaire' | 'statut';
      }[] = [];

      if (Array.isArray(rec.historique)) {
        rec.historique.forEach((h, i) => {
          const isFromIT =
            h.role === 'Responsable IT' ||
            (h.auteur && h.auteur.toLowerCase() !== (currentUser?.beneficiaire || '').toLowerCase()) ||
            h.typeAction === 'commentaire' ||
            h.typeAction === 'statut' ||
            h.typeAction === 'assignation' ||
            h.typeAction === 'resolution';

          if (isFromIT && h.typeAction !== 'creation') {
            msgs.push({
              id: `${rec.id}-${i}`,
              ticketId: rec.id,
              ticketCode: rec.code,
              ticketTitre: rec.titre,
              date: h.date,
              auteur: h.auteur || 'Responsable IT',
              message: h.message,
              type: h.typeAction === 'resolution' ? 'resolution' : h.typeAction === 'statut' ? 'statut' : 'commentaire'
            });
          }
        });
      }

      if (rec.statut === 'Résolue' && rec.solution) {
        const hasSol = msgs.some(m => m.ticketId === rec.id && m.type === 'resolution');
        if (!hasSol) {
          msgs.push({
            id: `sol-${rec.id}`,
            ticketId: rec.id,
            ticketCode: rec.code,
            ticketTitre: rec.titre,
            date: rec.dateResolution || rec.updatedAt || new Date().toISOString(),
            auteur: rec.technicienNom || 'Support IT',
            message: `Solution validée : ${rec.solution}`,
            type: 'resolution'
          });
        }
      }
      return msgs;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="w-full bg-[#f8fafc] min-h-screen text-gray-900">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 sm:py-7 space-y-6 sm:space-y-8">
        {/* Header Collaborateur */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Espace Personnel
              </span>
              <span className="text-xs text-gray-400 font-mono">ID: {currentUser?.id?.slice(0, 8) || 'COLLAB'}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
              Bonjour, {currentUser?.beneficiaire || 'Collaborateur'} 👋
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Consultez les équipements qui vous sont affectés et suivez l'avancement de vos demandes d'assistance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('reclamations')}
              className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-red-400" />
              <span>Nouveau ticket support</span>
            </button>
          </div>
        </div>

        {/* 4 Cards Collaborateur */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs min-w-0">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                {userEnServiceCount} actifs
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">Mes Équipements IT</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-gray-900">{userMateriels.length}</span>
              <span className="text-xs text-gray-500 font-medium">appareil(s)</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-500">État du parc</span>
              {userEnPanneCount > 0 ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {userEnPanneCount} en panne
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> 100% Opérationnel
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Santé globale
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">Disponibilité Matériel</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">{healthScore}%</span>
              <span className="text-xs text-gray-500 font-medium">conformité</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${healthScore}%` }} />
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('reclamations')}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                {userReclamationsEnCours} en cours
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">Tickets & Support</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-gray-900">{userReclamations.length}</span>
              <span className="text-xs text-gray-500 font-medium">demandes totales</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Taux de résolution</span>
              <span className="text-blue-600 font-bold">{slaResolutionRate}% résolus</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                Affectation
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">Mon Emplacement & Poste</p>
            <p className="text-sm font-black text-gray-900 mt-1 truncate">
              {userLocation ? userLocation.emplacement1 : 'Siège Principal OMODA'}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span className="truncate">{userLocation?.emplacement2 || 'Bureau Collaborateur'}</span>
              <span className="text-purple-600 font-semibold shrink-0">{warrantiesActive}/{userMateriels.length || 1} garantis</span>
            </div>
          </div>
        </div>

        {/* Assigned Materials List */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Mes Équipements de Travail Affectés</h3>
                <p className="text-xs text-gray-400">Liste des matériels enregistrés à votre nom dans le système</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {userMateriels.length > 0 ? (
              userMateriels.map((mat) => {
                const Icon = getCategoryIcon(mat.designation);
                const isHealthy = mat.statut === 'En service' || !mat.statut;
                return (
                  <div
                    key={mat.id}
                    className="p-4 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 border border-gray-100 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isHealthy ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-gray-900">{mat.designation}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isHealthy
                              ? 'text-emerald-700 bg-emerald-100/80 border border-emerald-200'
                              : 'text-red-700 bg-red-100/80 border border-red-200'
                          }`}>
                            {mat.statut || 'En service'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 mt-1">
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            Réf: {mat.reference}
                          </span>
                          {mat.codeSerie && (
                            <span className="font-mono text-gray-400">S/N: {mat.codeSerie}</span>
                          )}
                          {mat.garantie && (
                            <span className="text-[10px] text-purple-600 font-medium">Garantie: {mat.garantie}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateTab('reclamations')}
                      className="text-[11px] font-semibold text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg border border-gray-200 transition cursor-pointer flex items-center gap-1.5 self-end sm:self-center"
                    >
                      <Wrench className="w-3 h-3 text-red-500" />
                      <span>Signaler un incident</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-gray-400">
                <Laptop className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <h4 className="text-xs font-bold text-gray-800">Aucun matériel assigné</h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  Si vous utilisez du matériel informatique OMODA, demandez son affectation au Responsable IT.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Derniers Messages & Retours du Responsable IT */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Derniers Messages & Retours du Responsable IT
                </h3>
                <p className="text-xs text-gray-500">
                  Suivi personnalisé, prises en charge SLA et notes de résolution sur vos réclamations
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('reclamations')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ouvrir mes réclamations</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {itFeedbackMessages.length > 0 ? (
              itFeedbackMessages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => onNavigateTab('reclamations')}
                  className="p-4 rounded-xl bg-gray-50/80 hover:bg-blue-50/50 border border-gray-100 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.type === 'resolution' ? 'bg-emerald-100 text-emerald-700' :
                      msg.type === 'statut' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {msg.type === 'resolution' ? <CheckCircle2 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {msg.ticketCode}
                        </span>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-xs">
                          {msg.ticketTitre}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-normal">
                        <span className="font-semibold text-gray-800">{msg.auteur} : </span>
                        {msg.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(msg.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-0.5">
                      Détails →
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300 opacity-80" />
                <h4 className="text-xs font-bold text-gray-800">Aucun message pour l'instant</h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  Les réponses et mises à jour du Responsable IT sur vos demandes s'afficheront ici en direct.
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: RESPONSABLE IT / DSI GLOBAL COMPLETE DASHBOARD
  // =========================================================================
  return (
    <div id="dsi-dashboard-root" className="w-full bg-[#f8fafc] min-h-screen text-gray-900">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 sm:py-7 space-y-6 sm:space-y-8">
      {/* Title & Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Direction des Systèmes d'Information
            </span>
            <span className="text-xs text-gray-500 font-mono">OMODA & JAECOO TUNISIE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Tableau de Bord DSI • Supervision & Pilotage
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Supervision 100% en temps réel : inventaire, disponibilité des équipements, trésorerie et SLA support.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: LES 4 NOMBRES CLÉS FINANCIERS & OPÉRATIONNELS (KPI CARDS TOP) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Valeur Totale du Parc IT Actif */}
        <div
          id="kpi-valeur-parc"
          onClick={() => onNavigateTab('materiels')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-md transition cursor-pointer group relative min-w-0 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-emerald-100 whitespace-nowrap">
                  Actif en service
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveExplanation(EXPLANATIONS.kpi_valeur_parc);
                  }}
                  className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 flex items-center justify-center transition border border-transparent hover:border-blue-200"
                  title="Cliquer pour voir le rôle et le calcul de cet indicateur"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 truncate">Valeur Totale du Parc IT</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5 tracking-tight truncate">
              {metrics.valeurTotaleParcFormatte || '0 TND'}
            </p>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Équipements valorisés</span>
            <span className="text-gray-900 font-bold">{metrics.totalMateriels - metrics.materielsEnPanneTotal} unités</span>
          </div>
        </div>

        {/* KPI 2: Taux de Disponibilité Opérationnelle */}
        <div
          id="kpi-disponibilite"
          onClick={() => onNavigateTab('materiels')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-md transition cursor-pointer group relative min-w-0 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg whitespace-nowrap ${
                  metrics.tauxDisponibilite >= 90 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                }`}>
                  Disponibilité
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveExplanation(EXPLANATIONS.kpi_disponibilite);
                  }}
                  className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 flex items-center justify-center transition border border-transparent hover:border-blue-200"
                  title="Cliquer pour voir le rôle et le calcul de cet indicateur"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 truncate">Taux de Disponibilité</p>
            <div className="flex items-baseline gap-2 mt-0.5 min-w-0">
              <span className="text-2xl font-black text-emerald-600">{metrics.tauxDisponibiliteFormatte || '100%'}</span>
              <span className="text-xs text-gray-500 font-medium truncate">opérationnel</span>
            </div>
          </div>
          <div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  metrics.tauxDisponibilite >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, metrics.tauxDisponibilite || 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Matériels Disponibles en Stock */}
        <div
          id="kpi-stock-disponible"
          onClick={() => onNavigateTab('materiels')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-md transition cursor-pointer group relative min-w-0 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-blue-100 whitespace-nowrap">
                  Prêt affectation
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveExplanation(EXPLANATIONS.kpi_stock);
                  }}
                  className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 flex items-center justify-center transition border border-transparent hover:border-blue-200"
                  title="Cliquer pour voir le rôle et le calcul de cet indicateur"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 truncate">Stock & Réserve IT</p>
            <div className="flex items-baseline gap-2 mt-0.5 min-w-0">
              <span className="text-2xl font-black text-gray-900">{metrics.materielsEnStock}</span>
              <span className="text-xs text-gray-500 font-medium truncate">équipements dispo</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Garanties actives</span>
            <span className="text-purple-600 font-bold">{metrics.totalGarantiesActives} sous garantie</span>
          </div>
        </div>

        {/* KPI 4: Incidents IT & Support Utilisateurs */}
        <div
          id="kpi-incidents-support"
          onClick={() => onNavigateTab('reclamations')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-md transition cursor-pointer group relative min-w-0 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${
                metrics.ticketsUrgentsOuverts > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg whitespace-nowrap ${
                  metrics.ticketsUrgentsOuverts > 0 ? 'text-red-700 bg-red-50 border border-red-100' : 'text-emerald-700 bg-emerald-50'
                }`}>
                  Délai SLA: {metrics.mttrFormatte || '4.2h'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveExplanation(EXPLANATIONS.kpi_incidents);
                  }}
                  className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 flex items-center justify-center transition border border-transparent hover:border-blue-200"
                  title="Cliquer pour voir le rôle et le calcul de cet indicateur"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 truncate">Incidents & Support IT</p>
            <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5 min-w-0">
              <span className={`text-2xl font-black ${metrics.ticketsUrgentsOuverts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {metrics.reclamationsOuvertes || 0}
              </span>
              <span className="text-xs text-gray-500 font-medium truncate">
                tickets ({metrics.ticketsUrgentsOuverts} urgents)
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Taux de résolution</span>
            <span className="text-emerald-600 font-bold">{metrics.tauxResolution || '100%'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: 2 GRAPHIQUES CLÉS (EMPLACEMENTS vs FACTURES CIRCULAIRES) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Graphique 1: Histogramme Matériels par Emplacement & Personnel */}
        <div className="xl:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Matériels par Emplacement & Effectif du Personnel
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveExplanation(EXPLANATIONS.chart_emplacements)}
                  className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                  title="Rôle et explication de cette courbe"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Distribution des équipements (En service vs En panne) par site d'affectation
              </p>
            </div>

            <button
              onClick={() => setIsPersonnelModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Détail Personnel & Sites</span>
            </button>
          </div>

          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emplacementsStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [
                    `${value} unité(s)`,
                    name === 'enService' ? 'Matériels en service' : name === 'enPanne' ? 'Matériels en panne' : 'Total'
                  ]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={(value) => (value === 'enService' ? 'En service' : value === 'enPanne' ? 'En panne / révision' : value)}
                />
                <Bar dataKey="enService" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="enPanne" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 2: Circulaire Factures avec infobulles & Trésorerie */}
        <div className="xl:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  Engagements Factures & Trésorerie IT
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveExplanation(EXPLANATIONS.chart_factures)}
                  className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                  title="Rôle et explication de cette courbe"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Ventilation par statut : Payée, En attente et En retard
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
              {facturesStats.totalMontantFormatte}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 min-w-0">
            {/* Donut Chart */}
            <div className="h-52 relative flex items-center justify-center min-w-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any, _name: any, item: any) => [
                      `${item.payload.montantFormatte} (${value} factures)`,
                      item.payload.statut
                    ]}
                  />
                  <Pie
                    data={facturesStats.parStatut}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="count"
                    stroke="none"
                  >
                    {facturesStats.parStatut.map((entry, index) => (
                      <Cell key={`cell-fac-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <p className="text-xl font-black text-gray-900 leading-none">{metrics.totalFacturesCount}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Factures</p>
              </div>
            </div>

            {/* Legend & Amounts */}
            <div className="space-y-2 text-xs min-w-0 w-full">
              {facturesStats.parStatut.map((item) => (
                <div key={item.statut} className="p-2 rounded-xl bg-gray-50 border border-gray-100 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-800 font-bold truncate">{item.statut}</span>
                    </div>
                    <span className="font-mono text-gray-500 font-semibold text-[11px] shrink-0">{item.pourcentage}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500 gap-1">
                    <span className="truncate">{item.count} fac.</span>
                    <span className="font-bold text-gray-900 font-mono shrink-0">{item.montantFormatte}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: FOURNISSEURS vs PANNES & RÉPARTITIONS GROUPES / PRIORITÉS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Graphique 3: Fournisseurs vs Matériels en Panne (Taux de Sinistralité) */}
        <div className="xl:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-orange-500" />
                  Fiabilité Fournisseurs vs Matériels en Panne
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveExplanation(EXPLANATIONS.chart_fournisseurs)}
                  className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                  title="Rôle et explication de cette courbe"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Comparatif total fourni vs taux de sinistralité/pannes constatées
              </p>
            </div>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold">
              Qualité Matériel
            </span>
          </div>

          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fournisseursPannes.slice(0, 6)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any, name: any, item: any) => [
                    name === 'totalFournis'
                      ? `${value} matériels fournis (Fiabilité: ${item.payload.scoreFiabilite}%)`
                      : `${value} en panne (${item.payload.tauxPanne}%)`,
                    name === 'totalFournis' ? 'Total Fourni' : 'Matériels en Panne'
                  ]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                  formatter={(value) => (value === 'totalFournis' ? 'Total Fourni' : 'En Panne')}
                />
                <Bar dataKey="totalFournis" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="enPanne" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 4: Réclamations par Niveau de Priorité (Charge DSI) */}
        <div className="xl:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Réclamations & Incidents par Niveau de Priorité
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveExplanation(EXPLANATIONS.chart_priorites)}
                  className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                  title="Rôle et explication de cette courbe"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Suivi de la charge d'intervention critique : Ouvertes vs Résolues
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('reclamations')}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-2.5 py-1 rounded-lg transition"
            >
              Gérer Tickets
            </button>
          </div>

          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prioritesReclamations} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="priorite" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [
                    `${value} ticket(s)`,
                    name === 'ouvertes' ? 'Incidents Ouverts / En cours' : 'Tickets Résolus'
                  ]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                  formatter={(value) => (value === 'ouvertes' ? 'En cours / En attente' : 'Résolues')}
                />
                <Bar dataKey="ouvertes" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="resolues" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION D: GROUPES DE MATÉRIEL (DONUT) & ALERTES EN DIRECT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Donut Chart Catégories Matériel */}
        <div className="xl:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  Distribution par Groupe de Matériel
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveExplanation(EXPLANATIONS.chart_groupes)}
                  className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                  title="Rôle et explication de cette courbe"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Typologie et répartition de l'inventaire matériel
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('materiels')}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-50 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Inventaire complet
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 min-w-0">
            <div className="h-52 relative flex items-center justify-center min-w-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => [`${value} unités`, 'Total']}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-grp-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <p className="text-xl font-black text-gray-900 leading-none">{totalCategoryCount.toLocaleString('fr-FR')}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Unités</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs max-h-52 overflow-y-auto pr-1 min-w-0 w-full">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-gray-900">{item.value}</span>
                    <span className="text-gray-400 text-[11px] font-mono w-10 text-right">{item.percent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dernières Réclamations Actives (filtrées statut !== 'Résolue') */}
        <div className="xl:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Dernières Réclamations Actives (En cours & SLA)
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveExplanation(EXPLANATIONS.list_reclamations)}
                  className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                  title="Rôle et explication de cette liste"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Incidents non résolus nécessitant le traitement DSI
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('reclamations')}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition"
            >
              Voir tout
            </button>
          </div>

          <div className="space-y-2.5">
            {activeReclamations.length > 0 ? (
              activeReclamations.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onNavigateTab('reclamations')}
                  className="p-3 rounded-xl bg-gray-50 hover:bg-red-50/50 border border-gray-100 hover:border-red-100 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200">
                        {rec.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.priorite === 'Urgente'
                          ? 'bg-red-100 text-red-800'
                          : rec.priorite === 'Haute'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {rec.priorite}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium truncate">{rec.categorie}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 mt-1 truncate">{rec.titre}</p>
                    <p className="text-[11px] text-gray-500">
                      Demandeur: <strong>{rec.demandeurNom}</strong> • Technicien: <span className="text-purple-600 font-medium">{rec.technicienNom || 'Non assigné'}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg inline-block border border-amber-200">
                      {rec.statut}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-bold text-gray-800">Aucun incident ouvert</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Toutes les réclamations informatiques sont résolues.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION E: 3 COLONNES RÉCENTES (MATÉRIELS, FACTURES & ALERTES DSI) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Matériels Récents */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-700" />
                Matériels Récents
              </h3>
              <button
                type="button"
                onClick={() => setActiveExplanation(EXPLANATIONS.list_materiels_recents)}
                className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                title="Rôle et explication"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => onNavigateTab('materiels')}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-50 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Voir tout
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {recentMateriels.map((mat) => {
              const Icon = getCategoryIcon(mat.categorie || mat.designation);
              return (
                <div key={mat.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{mat.designation}</p>
                      <p className="text-[11px] text-gray-400 font-mono truncate">{mat.reference}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-gray-900 block">{mat.categorie}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">{mat.statut}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dernières Factures */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Dernières Factures
              </h3>
              <button
                type="button"
                onClick={() => setActiveExplanation(EXPLANATIONS.list_factures_recentes)}
                className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                title="Rôle et explication"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => onNavigateTab('factures')}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-50 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Voir tout
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {recentFactures.map((fac) => (
              <div key={fac.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{fac.fournisseurNom}</p>
                    <p className="text-[11px] text-gray-400 font-mono truncate">{fac.factureFrs}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-gray-900 block font-mono">{fac.montantFormatte}</span>
                  <span className={`text-[10px] font-bold ${
                    fac.statut === 'Payée' ? 'text-emerald-600' : fac.statut === 'En retard' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {fac.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes & Surveillance */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Alertes & Surveillance DSI
              </h3>
              <button
                type="button"
                onClick={() => setActiveExplanation(EXPLANATIONS.list_alertes)}
                className="w-5 h-5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition"
                title="Rôle et explication"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>

          <div className="space-y-2.5">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5"
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${al.type === 'error' ? 'bg-red-100 text-red-600' : al.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                  {al.type === 'error' ? <ShieldAlert className="w-3.5 h-3.5" /> : al.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-900">{al.titre}</p>
                    <span className="text-[10px] text-gray-400 font-mono">{al.time}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{al.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL / POPUP: PERSONNEL ACTIF & SÉPARATION MATÉRIELS (PERSONNEL vs EMPLACEMENT) */}
      {/* ========================================================================= */}
      {isPersonnelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Personnel Actif & Inventaire des Affectations
                  </h3>
                  <p className="text-xs text-gray-500">
                    Distinction nette entre la <strong>dotation personnelle individuelle</strong> et les <strong>équipements présents sur le site/emplacement</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPersonnelModalOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-gray-200/80 text-gray-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search & Filter Bar */}
            <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, département ou emplacement..."
                  value={searchPersonnel}
                  onChange={(e) => setSearchPersonnel(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterPersonnelWithMatOnly(!filterPersonnelWithMatOnly)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                    filterPersonnelWithMatOnly
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Avec dotation personnelle uniquement</span>
                </button>

                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2.5 py-2 rounded-xl">
                  {filteredPersonnel.length} / {personnelActif.length}
                </span>
              </div>
            </div>

            {/* Modal Content: 2-Pane Split (List vs Selected Details) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Left Column: Personnel List */}
              <div className="md:col-span-5 p-4 space-y-2 overflow-y-auto max-h-[60vh]">
                {filteredPersonnel.length > 0 ? (
                  filteredPersonnel.map((p) => {
                    const isSelected = selectedPersonnel?.id === p.id;
                    const personalCount = p.materielsPersonnel?.length ?? p.materielsPersonnelCount ?? p.materielsCount ?? 0;
                    const siteCount = p.materielsEmplacement?.length ?? p.materielsEmplacementCount ?? 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPersonnel(p);
                          // default to personal tab if they have personal mats, otherwise to site
                          if (personalCount === 0 && siteCount > 0) {
                            setActivePersonnelTab('emplacement');
                          } else {
                            setActivePersonnelTab('personnel');
                          }
                        }}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-100'
                            : 'bg-white hover:bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {p.beneficiaire.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{p.beneficiaire}</p>
                            <p className="text-[11px] text-gray-400 truncate">{p.email}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                              <span className="text-blue-700 font-semibold">{p.roleNom}</span>
                              <span>•</span>
                              <span className="truncate">{p.emplacementNom}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            personalCount > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {personalCount} perso
                          </span>
                          {siteCount > 0 && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {siteCount} sur site
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-bold text-gray-700">Aucun collaborateur trouvé</p>
                  </div>
                )}
              </div>

              {/* Right Column: Selected Employee Equipment Details (SEPARATED) */}
              <div className="md:col-span-7 p-5 bg-gray-50/50 flex flex-col justify-between overflow-y-auto max-h-[60vh]">
                {selectedPersonnel ? (
                  <div className="space-y-4">
                    {/* Employee Profile Summary */}
                    <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-gray-900">{selectedPersonnel.beneficiaire}</h4>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {selectedPersonnel.statut}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedPersonnel.email}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-[11px]">
                        <div>
                          <span className="text-gray-400 block">Rôle / Poste</span>
                          <strong className="text-gray-800">{selectedPersonnel.roleNom}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Emplacement d'Affectation</span>
                          <strong className="text-gray-800">{selectedPersonnel.emplacementNom}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Tabs: Matériels Personnels vs Matériels de l'Emplacement */}
                    <div className="flex items-center gap-2 p-1 bg-gray-200/60 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setActivePersonnelTab('personnel')}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          activePersonnelTab === 'personnel'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Dotation Personnelle</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          activePersonnelTab === 'personnel' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {selectedPersonnel.materielsPersonnel?.length ?? selectedPersonnel.materielsList?.length ?? 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePersonnelTab('emplacement')}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          activePersonnelTab === 'emplacement'
                            ? 'bg-white text-purple-700 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Matériels sur Site Affectés</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          activePersonnelTab === 'emplacement' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {selectedPersonnel.materielsEmplacement?.length ?? 0}
                        </span>
                      </button>
                    </div>

                    {/* Tab 1: Matériels Personnels */}
                    {activePersonnelTab === 'personnel' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                          <span className="font-semibold text-gray-700">
                            Tous les équipements attribués à ce collaborateur
                          </span>
                          <span className="text-[11px] font-mono">
                            {selectedPersonnel.materielsPersonnel?.length ?? selectedPersonnel.materielsList?.length ?? 0} équipement(s)
                          </span>
                        </div>

                        {(selectedPersonnel.materielsPersonnel?.length || selectedPersonnel.materielsList?.length) ? (
                          (selectedPersonnel.materielsPersonnel || selectedPersonnel.materielsList).map((m) => {
                            const Icon = getCategoryIcon(m.categorie || m.designation);
                            return (
                              <div key={m.id} className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-blue-200 transition flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <Icon className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold text-gray-900 truncate">{m.designation}</p>
                                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                                        {m.categorie}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400 font-mono mt-0.5">
                                      <span>Réf: {m.reference}</span>
                                      {m.codeSerie && <span>• S/N: {m.codeSerie}</span>}
                                      {m.garantie && <span className="text-purple-600">• Gar: {m.garantie}</span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block ${
                                    m.statut === 'En service' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                                  }`}>
                                    {m.statut}
                                  </span>
                                  {m.valeurPlafond > 0 && (
                                    <span className="text-[10px] font-mono text-gray-500 mt-1 block font-semibold">
                                      {m.valeurPlafond.toLocaleString('fr-FR')} TND
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 rounded-2xl bg-white border border-dashed border-gray-200 text-center text-gray-400">
                            <Laptop className="w-8 h-8 mx-auto mb-1.5 text-gray-300" />
                            <p className="text-xs font-bold text-gray-700">Aucune dotation personnelle</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Ce collaborateur n'a pas de matériel informatique affecté à son nom propre.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Matériels sur le site & affectés à ce collaborateur */}
                    {activePersonnelTab === 'emplacement' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                          <span className="font-semibold text-gray-700">
                            Matériels situés sur le site <strong>{selectedPersonnel.emplacementNom}</strong> et affectés à ce collaborateur
                          </span>
                          <span className="text-[11px] font-mono">
                            {selectedPersonnel.materielsEmplacement?.length || 0} équipement(s)
                          </span>
                        </div>

                        {selectedPersonnel.materielsEmplacement && selectedPersonnel.materielsEmplacement.length > 0 ? (
                          selectedPersonnel.materielsEmplacement.map((m) => {
                            const Icon = getCategoryIcon(m.categorie || m.designation);
                            return (
                              <div key={m.id} className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-2xs hover:border-purple-200 transition flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                    <Icon className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold text-gray-900 truncate">{m.designation}</p>
                                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                                        {m.categorie}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400 font-mono mt-0.5">
                                      <span>Réf: {m.reference}</span>
                                      {m.codeSerie && <span>• S/N: {m.codeSerie}</span>}
                                      <span className="text-emerald-600 font-medium">• Affecté sur site</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block ${
                                    m.statut === 'En service' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                                  }`}>
                                    {m.statut}
                                  </span>
                                  {m.valeurPlafond > 0 && (
                                    <span className="text-[10px] font-mono text-gray-500 mt-1 block font-semibold">
                                      {m.valeurPlafond.toLocaleString('fr-FR')} TND
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 rounded-2xl bg-white border border-dashed border-gray-200 text-center text-gray-400">
                            <Building2 className="w-8 h-8 mx-auto mb-1.5 text-gray-300" />
                            <p className="text-xs font-bold text-gray-700">Aucun matériel affecté sur ce site</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Ce collaborateur n'a pas d'équipements rattachés spécifiquement au site {selectedPersonnel.emplacementNom}.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-center text-gray-400">
                    <Laptop className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <h5 className="text-xs font-bold text-gray-700">Sélectionnez un collaborateur</h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Cliquez sur un membre du personnel pour consulter ses équipements personnels et les matériels de son emplacement.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Données synchronisées en direct avec MongoDB
              </span>
              <button
                onClick={() => setIsPersonnelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EXPLICATION: RÔLE, CALCUL ET UTILITÉ DE L'ÉLÉMENT (KPI / COURBE) */}
      {/* ========================================================================= */}
      {activeExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Info className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {activeExplanation.categorie}
                  </span>
                  <h3 className="text-base font-black text-gray-900 mt-1">
                    {activeExplanation.titre}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveExplanation(null)}
                className="w-8 h-8 rounded-xl hover:bg-gray-200/80 text-gray-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Role */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                <p className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Rôle & Objectif de l'indicateur
                </p>
                <p className="text-gray-700 leading-relaxed">{activeExplanation.role}</p>
              </div>

              {/* Mode de Calcul */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 mb-1 font-mono">
                  <span>🔢 Mode de calcul & Données sources</span>
                </p>
                <p className="text-gray-600 leading-relaxed">{activeExplanation.calcul}</p>
              </div>

              {/* Utilité DSI */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Valeur ajoutée & Décisions DSI
                </p>
                <p className="text-gray-700 leading-relaxed">{activeExplanation.utiliteDSI}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setActiveExplanation(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <p>© 2025-2026 OMODA & JAECOO TUNISIE • Système de Gestion & Supervision du Parc IT.</p>
        <p className="font-mono">Supervision DSI • Connecté MongoDB</p>
      </div>
      </div>
    </div>
  );
};
