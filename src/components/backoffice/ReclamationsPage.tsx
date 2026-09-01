import React, { useState, useEffect, useMemo } from 'react';
import {
  LifeBuoy,
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  User,
  Users,
  Monitor,
  Pencil,
  Trash2,
  Send,
  ShieldCheck,
  X,
  Inbox,
  Calendar,
  Laptop,
  Check,
  Filter,
  ArrowRight
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import { authService, AuthUser } from '../../services/authService';
import {
  Reclamation,
  GroupeMateriel,
  Materiel,
  Beneficiaire
} from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';

type SubTab = 'mes-reclamations' | 'collaborateurs';

export const ReclamationsPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getUser());
  const isDSIAdmin = currentUser?.role === 'Responsable IT' || currentUser?.accesApp === 'GLOBAL_BACKOFFICE';

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('mes-reclamations');

  // Data states
  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [allGroupes, setAllGroupes] = useState<GroupeMateriel[]>([]);
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNatureFilter, setSelectedNatureFilter] = useState<'all' | 'materiel' | 'autre'>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [selectedPriorite, setSelectedPriorite] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Page Alert
  const [pageAlert, setPageAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // --- MODAL: CRÉATION / ÉDITION DE RÉCLAMATION (2 ÉTAPES INVERSÉES : 1- MATÉRIELS/CATÉGORIES, 2- INFORMATIONS) ---
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Reclamation | null>(null);
  
  // Ticket Form State
  const [ticketFormPart, setTicketFormPart] = useState<1 | 2>(1);
  const [ticketFormData, setTicketFormData] = useState({
    // ÉTAPE 1 : Choix Nature (Matériel vs Catégorie)
    nature: 'materiel' as 'materiel' | 'autre',
    selectedMaterielsIds: [] as string[],
    selectedCategoriesIds: [] as string[],
    // ÉTAPE 2 : Informations Générales
    titre: '',
    description: '',
    priorite: 'Moyenne' as 'Basse' | 'Moyenne' | 'Haute' | 'Urgente',
    // Options avancées (Admin IT)
    delaiTraitementHeures: 24,
    dateMaxResolution: '',
    id_TechnicienAssigne: '',
    statut: 'Ouverte' as 'Ouverte' | 'En cours' | 'En attente' | 'Résolue' | 'Rejetée',
  });
  const [ticketModalAlert, setTicketModalAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Inline Quick Category Creation inside Ticket Modal
  const [isCreatingQuickCatInTicket, setIsCreatingQuickCatInTicket] = useState(false);
  const [quickCatNameInTicket, setQuickCatNameInTicket] = useState('');
  const [isSavingQuickCatInTicket, setIsSavingQuickCatInTicket] = useState(false);

  // --- MODAL: GESTION SLA / DEADLINE / URGENCE (RESPONSABLE IT) ---
  const [isAssignSlaModalOpen, setIsAssignSlaModalOpen] = useState(false);
  const [targetTicketForSla, setTargetTicketForSla] = useState<Reclamation | null>(null);
  const [assignSlaFormData, setAssignSlaFormData] = useState({
    priorite: 'Moyenne' as 'Basse' | 'Moyenne' | 'Haute' | 'Urgente',
    delaiTraitementHeures: 24,
    dateMaxResolution: '',
    id_TechnicienAssigne: '',
    statut: 'Ouverte' as 'Ouverte' | 'En cours' | 'En attente' | 'Résolue' | 'Rejetée',
    solution: '',
  });
  const [assignSlaModalAlert, setAssignSlaModalAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);

  // --- DETAIL & TIMELINE DRAWER ---
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<Reclamation | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  useEffect(() => {
    loadData();
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getUser());
    });
    const unsubPark = itParkService.subscribe(() => {
      setReclamations(itParkService.getReclamations());
      setAllGroupes(itParkService.getGroupesMateriel());
      setMateriels(itParkService.getMateriels());
      setBeneficiaires(itParkService.getBeneficiaires());
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTicketModalOpen(false);
        setIsAssignSlaModalOpen(false);
        setSelectedTicketForDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubAuth();
      unsubPark();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loadData = async () => {
    await itParkService.syncFromBackend();
    setReclamations(itParkService.getReclamations());
    setAllGroupes(itParkService.getGroupesMateriel());
    setMateriels(itParkService.getMateriels());
    setBeneficiaires(itParkService.getBeneficiaires());
  };

  // Helper: Check if ticket belongs to the logged-in user
  const isMyTicket = (rec: Reclamation) => {
    if (!currentUser) return false;
    const currentUserId = currentUser.id || (currentUser as any)._id;
    const matchId = rec.id_Demandeur && (rec.id_Demandeur === currentUserId || rec.id_Demandeur === currentUser.id);
    const matchEmail = rec.demandeurEmail && currentUser.email && rec.demandeurEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
    const matchName = rec.demandeurNom && currentUser.beneficiaire && rec.demandeurNom.toLowerCase().trim() === currentUser.beneficiaire.toLowerCase().trim();
    return Boolean(matchId || matchEmail || matchName);
  };

  // Equipments assigned to the logged-in user
  const userAssignedMateriels = useMemo(() => {
    if (!currentUser) return [];
    const currentUserId = currentUser.id || (currentUser as any)._id;
    const currentUserName = currentUser.beneficiaire?.toLowerCase().trim();
    const currentUserEmail = currentUser.email?.toLowerCase().trim();

    return materiels.filter(m => {
      if (m.id_Beneficiaire && m.id_Beneficiaire === currentUserId) return true;
      if ((m as any).beneficiaireNom && currentUserName && (m as any).beneficiaireNom.toLowerCase().trim() === currentUserName) return true;
      if ((m as any).beneficiaireEmail && currentUserEmail && (m as any).beneficiaireEmail.toLowerCase().trim() === currentUserEmail) return true;
      return false;
    });
  }, [materiels, currentUser]);

  // IT Technicians for assignment
  const itTechnicians = useMemo(() => {
    return beneficiaires.filter(b => 
      b.isITUser || 
      b.role?.toLowerCase().includes('it') || 
      b.role?.toLowerCase().includes('responsable') || 
      b.role?.toLowerCase().includes('technicien') || 
      b.role?.toLowerCase().includes('support') ||
      b.role?.toLowerCase().includes('admin') ||
      b.accesApp === 'GLOBAL_BACKOFFICE'
    );
  }, [beneficiaires]);

  // Filtered lists
  const mesReclamations = useMemo(() => {
    return reclamations.filter(r => isMyTicket(r));
  }, [reclamations, currentUser]);

  const collaborateursReclamations = useMemo(() => {
    return reclamations.filter(r => !isMyTicket(r));
  }, [reclamations, currentUser]);

  const activeTabReclamations = useMemo(() => {
    if (activeSubTab === 'mes-reclamations') return mesReclamations;
    if (activeSubTab === 'collaborateurs') return collaborateursReclamations;
    return reclamations;
  }, [activeSubTab, mesReclamations, collaborateursReclamations, reclamations]);

  const filteredReclamations = useMemo(() => {
    return activeTabReclamations.filter(rec => {
      // Nature filter
      if (selectedNatureFilter === 'materiel' && rec.nature !== 'materiel') return false;
      if (selectedNatureFilter === 'autre' && rec.nature !== 'autre') return false;

      // Status filter
      if (selectedStatut !== 'all' && rec.statut !== selectedStatut) return false;

      // Priority filter
      if (selectedPriorite !== 'all' && rec.priorite !== selectedPriorite) return false;

      // Category filter
      if (selectedCategoryFilter !== 'all') {
        const hasCat = (rec.categoriesIds && rec.categoriesIds.includes(selectedCategoryFilter)) ||
          rec.id_GroupeMateriel === selectedCategoryFilter ||
          rec.id_GroupeReclamation === selectedCategoryFilter;
        if (!hasCat) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const inCode = rec.code?.toLowerCase().includes(q);
        const inTitre = rec.titre?.toLowerCase().includes(q);
        const inDesc = rec.description?.toLowerCase().includes(q);
        const inDemandeur = rec.demandeurNom?.toLowerCase().includes(q);
        const inTech = rec.technicienNom?.toLowerCase().includes(q);
        const inMat = rec.materielNom?.toLowerCase().includes(q) || (rec.materielsConcernesNoms && rec.materielsConcernesNoms.some(n => n.toLowerCase().includes(q)));
        const inCat = rec.groupeNom?.toLowerCase().includes(q) || (rec.categoriesNoms && rec.categoriesNoms.some(n => n.toLowerCase().includes(q)));
        return Boolean(inCode || inTitre || inDesc || inDemandeur || inTech || inMat || inCat);
      }

      return true;
    });
  }, [activeTabReclamations, selectedNatureFilter, selectedStatut, selectedPriorite, selectedCategoryFilter, searchTerm]);

  // Statistics counters
  const stats = useMemo(() => {
    const list = activeTabReclamations;
    const total = list.length;
    const ouvertes = list.filter(r => r.statut === 'Ouverte').length;
    const enCours = list.filter(r => r.statut === 'En cours' || r.statut === 'En attente').length;
    const resolues = list.filter(r => r.statut === 'Résolue').length;
    const urgentes = list.filter(r => r.priorite === 'Urgente' || r.priorite === 'Haute').length;
    const materielCount = list.filter(r => r.nature === 'materiel').length;
    const autreCount = list.filter(r => r.nature === 'autre').length;

    return { total, ouvertes, enCours, resolues, urgentes, materielCount, autreCount };
  }, [activeTabReclamations]);

  // --- TICKET CREATION & EDITION MODAL HANDLERS ---
  const handleOpenCreateTicket = () => {
    setEditingTicket(null);
    setTicketModalAlert(null);
    setTicketFormPart(1);
    setIsCreatingQuickCatInTicket(false);
    setQuickCatNameInTicket('');

    // If user has assigned materials, default to selecting the first assigned equipment
    const firstUserMat = userAssignedMateriels[0];
    const initialMatIds = firstUserMat ? [firstUserMat.id] : [];

    setTicketFormData({
      nature: initialMatIds.length > 0 ? 'materiel' : 'autre',
      selectedMaterielsIds: initialMatIds,
      selectedCategoriesIds: allGroupes.length > 0 ? [allGroupes[0].id] : [],
      titre: '',
      description: '',
      priorite: 'Moyenne',
      delaiTraitementHeures: 24,
      dateMaxResolution: '',
      id_TechnicienAssigne: '',
      statut: 'Ouverte',
    });
    setIsTicketModalOpen(true);
  };

  const handleOpenEditMyTicket = (rec: Reclamation) => {
    const isOwner = currentUser?.id && rec.id_Demandeur?.toString() === currentUser.id.toString();
    
    // Si c'est le ticket d'un collaborateur et qu'on est Admin IT, on n'autorise que la modification SLA/Urgence/Date Maximale
    if (!isOwner && isDSIAdmin) {
      handleOpenAssignSla(rec);
      return;
    }

    setEditingTicket(rec);
    setTicketModalAlert(null);
    setTicketFormPart(1);
    setIsCreatingQuickCatInTicket(false);
    setQuickCatNameInTicket('');

    const matIds = Array.isArray(rec.materielsConcernesIds) && rec.materielsConcernesIds.length > 0
      ? rec.materielsConcernesIds
      : (rec.id_MaterielConcerne ? [rec.id_MaterielConcerne] : []);

    const catIds = Array.isArray(rec.categoriesIds) && rec.categoriesIds.length > 0
      ? rec.categoriesIds
      : (rec.id_GroupeMateriel ? [rec.id_GroupeMateriel] : []);

    let dateMaxFormatted = '';
    if (rec.dateMaxResolution) {
      const d = new Date(rec.dateMaxResolution);
      if (!isNaN(d.getTime())) {
        dateMaxFormatted = d.toISOString().slice(0, 16);
      }
    }

    setTicketFormData({
      nature: rec.nature || (matIds.length > 0 ? 'materiel' : 'autre'),
      selectedMaterielsIds: matIds,
      selectedCategoriesIds: catIds,
      titre: rec.titre || '',
      description: rec.description || '',
      priorite: rec.priorite || 'Moyenne',
      delaiTraitementHeures: rec.delaiTraitementHeures || 24,
      dateMaxResolution: dateMaxFormatted,
      id_TechnicienAssigne: rec.id_TechnicienAssigne || '',
      statut: rec.statut || 'Ouverte',
    });
    setIsTicketModalOpen(true);
  };

  const handleToggleSelectMateriel = (matId: string) => {
    setTicketFormData(prev => {
      const exists = prev.selectedMaterielsIds.includes(matId);
      const updated = exists
        ? prev.selectedMaterielsIds.filter(id => id !== matId)
        : [...prev.selectedMaterielsIds, matId];
      return { ...prev, selectedMaterielsIds: updated };
    });
  };

  const handleSelectAllUserMateriels = () => {
    const allUserIds = userAssignedMateriels.map(m => m.id);
    setTicketFormData(prev => ({
      ...prev,
      selectedMaterielsIds: Array.from(new Set([...prev.selectedMaterielsIds, ...allUserIds]))
    }));
  };

  const handleDeselectAllMateriels = () => {
    setTicketFormData(prev => ({ ...prev, selectedMaterielsIds: [] }));
  };

  const handleToggleSelectCategory = (catId: string) => {
    setTicketFormData(prev => {
      const exists = prev.selectedCategoriesIds.includes(catId);
      const updated = exists
        ? prev.selectedCategoriesIds.filter(id => id !== catId)
        : [...prev.selectedCategoriesIds, catId];
      return { ...prev, selectedCategoriesIds: updated };
    });
  };

  const handleSelectAllCategories = () => {
    const allCatIds = allGroupes.map(g => g.id);
    setTicketFormData(prev => ({ ...prev, selectedCategoriesIds: allCatIds }));
  };

  const handleDeselectAllCategories = () => {
    setTicketFormData(prev => ({ ...prev, selectedCategoriesIds: [] }));
  };

  const handleSaveQuickCategoryInTicket = async () => {
    if (!quickCatNameInTicket.trim()) {
      alert("Veuillez saisir le nom de la catégorie.");
      return;
    }
    setIsSavingQuickCatInTicket(true);
    const res = await itParkService.saveGroupeMateriel({
      nom: quickCatNameInTicket.trim(),
      Groupe: quickCatNameInTicket.trim(),
    });
    setIsSavingQuickCatInTicket(false);

    if (!res.success) {
      alert(res.message || "Erreur lors de la création de la catégorie.");
      return;
    }

    await loadData();
    const updated = itParkService.getGroupesMateriel();
    const created = updated.find(g => (g.nom || g.Groupe) === quickCatNameInTicket.trim());
    if (created) {
      setTicketFormData(prev => ({
        ...prev,
        selectedCategoriesIds: [...prev.selectedCategoriesIds, created.id]
      }));
    }
    setIsCreatingQuickCatInTicket(false);
    setQuickCatNameInTicket('');
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketModalAlert(null);

    // Validation Étape 1 : Matériels ou Catégories
    if (ticketFormData.nature === 'materiel') {
      if (ticketFormData.selectedMaterielsIds.length === 0) {
        setTicketModalAlert({
          type: 'error',
          message: "Veuillez sélectionner au moins un matériel concerné par la réclamation (ou basculer en mode 'Par catégorie')."
        });
        setTicketFormPart(1);
        return;
      }
    } else {
      if (ticketFormData.selectedCategoriesIds.length === 0) {
        setTicketModalAlert({
          type: 'error',
          message: "Veuillez sélectionner au moins une catégorie concernée par votre réclamation."
        });
        setTicketFormPart(1);
        return;
      }
    }

    // Validation Étape 2 : Informations Générales
    if (!ticketFormData.titre || !ticketFormData.titre.trim()) {
      setTicketModalAlert({
        type: 'error',
        message: "Veuillez renseigner le Sujet / Objet de votre réclamation."
      });
      setTicketFormPart(2);
      return;
    }

    if (!ticketFormData.description || !ticketFormData.description.trim()) {
      setTicketModalAlert({
        type: 'error',
        message: "Veuillez fournir une description détaillée du problème rencontré."
      });
      setTicketFormPart(2);
      return;
    }

    // Prepare payload
    const primaryGroupId = ticketFormData.selectedCategoriesIds[0] || (allGroupes[0]?.id || '');
    const primaryMatId = ticketFormData.selectedMaterielsIds[0] || undefined;

    const payload: Partial<Reclamation> = {
      id: editingTicket ? editingTicket.id : undefined,
      titre: ticketFormData.titre.trim(),
      description: ticketFormData.description.trim(),
      priorite: ticketFormData.priorite,
      nature: ticketFormData.nature,
      materielsConcernesIds: ticketFormData.nature === 'materiel' ? ticketFormData.selectedMaterielsIds : [],
      categoriesIds: ticketFormData.selectedCategoriesIds,
      id_MaterielConcerne: primaryMatId,
      id_GroupeMateriel: primaryGroupId,
      id_GroupeReclamation: primaryGroupId,
      statut: ticketFormData.statut,
      delaiTraitementHeures: isDSIAdmin ? Number(ticketFormData.delaiTraitementHeures) : 24,
      dateMaxResolution: isDSIAdmin && ticketFormData.dateMaxResolution ? new Date(ticketFormData.dateMaxResolution).toISOString() : undefined,
      id_TechnicienAssigne: isDSIAdmin && ticketFormData.id_TechnicienAssigne ? ticketFormData.id_TechnicienAssigne : undefined,
      // Demandeur identity
      id_Demandeur: editingTicket ? editingTicket.id_Demandeur : (currentUser?.id || (currentUser as any)?._id),
      demandeurNom: editingTicket ? editingTicket.demandeurNom : (currentUser?.beneficiaire || 'Collaborateur IT'),
      demandeurEmail: editingTicket ? editingTicket.demandeurEmail : (currentUser?.email || ''),
    };

    const res = await itParkService.saveReclamation(payload);
    if (!res.success) {
      setTicketModalAlert({
        type: 'error',
        message: res.message || "Erreur lors de l'enregistrement de la réclamation."
      });
      return;
    }

    setIsTicketModalOpen(false);
    setPageAlert({
      type: 'success',
      message: editingTicket ? "Votre réclamation a été mise à jour avec succès." : "Votre réclamation a été enregistrée avec succès."
    });
    await loadData();

    if (selectedTicketForDetail && editingTicket && selectedTicketForDetail.id === editingTicket.id) {
      const updated = itParkService.getReclamations().find(r => r.id === editingTicket.id);
      if (updated) setSelectedTicketForDetail(updated);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette réclamation ?")) {
      return;
    }
    const res = await itParkService.deleteReclamation(id);
    if (!res.success) {
      setPageAlert({ type: 'error', message: res.message || "Erreur lors de la suppression." });
      return;
    }
    setPageAlert({ type: 'success', message: "Réclamation supprimée avec succès." });
    if (selectedTicketForDetail?.id === id) {
      setSelectedTicketForDetail(null);
    }
    await loadData();
  };

  // --- SLA / DEADLINE / URGENCE MANAGEMENT (RESPONSABLE IT) ---
  const handleOpenAssignSla = (rec: Reclamation) => {
    setTargetTicketForSla(rec);
    setAssignSlaModalAlert(null);

    let dateMaxFormatted = '';
    if (rec.dateMaxResolution) {
      const d = new Date(rec.dateMaxResolution);
      if (!isNaN(d.getTime())) {
        dateMaxFormatted = d.toISOString().slice(0, 16);
      }
    } else if (rec.dateEcheanceSla) {
      const d = new Date(rec.dateEcheanceSla);
      if (!isNaN(d.getTime())) {
        dateMaxFormatted = d.toISOString().slice(0, 16);
      }
    }

    setAssignSlaFormData({
      priorite: rec.priorite || 'Moyenne',
      delaiTraitementHeures: rec.delaiTraitementHeures || 24,
      dateMaxResolution: dateMaxFormatted,
      id_TechnicienAssigne: rec.id_TechnicienAssigne || '',
      statut: rec.statut || 'En cours',
      solution: rec.solution || '',
    });
    setIsAssignSlaModalOpen(true);
  };

  const handleApplyPresetDeadline = (hours: number) => {
    const deadline = new Date(Date.now() + hours * 3600 * 1000);
    const dateFormatted = deadline.toISOString().slice(0, 16);
    setAssignSlaFormData(prev => ({
      ...prev,
      delaiTraitementHeures: hours,
      dateMaxResolution: dateFormatted,
    }));
  };

  const handleSaveAssignSla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTicketForSla) return;
    setAssignSlaModalAlert(null);

    if (assignSlaFormData.delaiTraitementHeures <= 0) {
      setAssignSlaModalAlert({
        type: 'error',
        message: "Veuillez indiquer un délai de traitement SLA valide (minimum 1 heure)."
      });
      return;
    }

    const payload: Partial<Reclamation> = {
      id: targetTicketForSla.id,
      priorite: assignSlaFormData.priorite,
      delaiTraitementHeures: Number(assignSlaFormData.delaiTraitementHeures),
      dateMaxResolution: assignSlaFormData.dateMaxResolution ? new Date(assignSlaFormData.dateMaxResolution).toISOString() : undefined,
      id_TechnicienAssigne: assignSlaFormData.id_TechnicienAssigne || undefined,
      statut: assignSlaFormData.statut,
      solution: assignSlaFormData.solution || undefined,
    };

    const res = await itParkService.saveReclamation(payload);
    if (!res.success) {
      setAssignSlaModalAlert({
        type: 'error',
        message: res.message || "Erreur lors de l'enregistrement."
      });
      return;
    }

    setIsAssignSlaModalOpen(false);
    setPageAlert({
      type: 'success',
      message: `Ticket ${targetTicketForSla.code} : Urgence, délai SLA (${assignSlaFormData.delaiTraitementHeures}h) et date maximale de résolution mis à jour.`
    });
    await loadData();

    if (selectedTicketForDetail && selectedTicketForDetail.id === targetTicketForSla.id) {
      const updated = itParkService.getReclamations().find(r => r.id === targetTicketForSla.id);
      if (updated) setSelectedTicketForDetail(updated);
    }
  };

  // --- COMMENTS HANDLER ---
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForDetail || !newCommentText.trim()) return;

    setIsSendingComment(true);
    const res = await itParkService.addReclamationComment(selectedTicketForDetail.id, newCommentText.trim());
    setIsSendingComment(false);

    if (!res.success) {
      setPageAlert({ type: 'error', message: res.message || "Impossible d'ajouter le commentaire." });
      return;
    }

    setNewCommentText('');
    await loadData();
    const updated = itParkService.getReclamations().find(r => r.id === selectedTicketForDetail.id);
    if (updated) {
      setSelectedTicketForDetail(updated);
    }
    setPageAlert({ type: 'success', message: "Commentaire ajouté avec succès." });
  };

  // Render Helpers
  const getPrioriteBadge = (priorite: string) => {
    switch (priorite) {
      case 'Urgente':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800"><span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>Urgente</span>;
      case 'Haute':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Haute</span>;
      case 'Moyenne':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Moyenne</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Basse</span>;
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'Résolue':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Résolue</span>;
      case 'En cours':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><Clock className="w-3.5 h-3.5" /> En cours</span>;
      case 'En attente':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"><Clock className="w-3.5 h-3.5" /> En attente</span>;
      case 'Rejetée':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"><AlertCircle className="w-3.5 h-3.5" /> Rejetée</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800"><Inbox className="w-3.5 h-3.5" /> Ouverte</span>;
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-gray-900 pb-16" id="reclamations-page-root">
      <div className="max-w-[1400px] 2xl:max-w-[1480px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 space-y-6 lg:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm" id="reclamations-header">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Gestion des Réclamations & Support IT
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Déclaration d'incidents matériels, suivi SLA des tickets et assistance des collaborateurs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateTicket}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-2 text-sm shadow-sm shadow-blue-600/20 cursor-pointer"
            id="create-reclamation-main-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Réclamation</span>
          </button>
        </div>
      </div>

      {/* Page Alert */}
      {pageAlert && (
        <FormAlert
          type={pageAlert.type}
          message={pageAlert.message}
          onClose={() => setPageAlert(null)}
        />
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3" id="reclamations-nav-tabs">
        <button
          onClick={() => setActiveSubTab('mes-reclamations')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'mes-reclamations'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
          }`}
          id="subtab-mes-reclamations"
        >
          <User className="w-4 h-4" />
          <span>Mes Réclamations</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeSubTab === 'mes-reclamations' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
          }`}>
            {mesReclamations.length}
          </span>
        </button>

        {isDSIAdmin && (
          <button
            onClick={() => setActiveSubTab('collaborateurs')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'collaborateurs'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
            }`}
            id="subtab-collaborateurs"
          >
            <Users className="w-4 h-4" />
            <span>Réclamations des Collaborateurs</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeSubTab === 'collaborateurs' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}>
              {collaborateursReclamations.length}
            </span>
          </button>
        )}
      </div>

      {/* VIEW: TICKETS LIST (MES RÉCLAMATIONS OU COLLABORATEURS) */}
      <div className="space-y-6" id="tickets-view-container">
        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" id="tickets-metrics-grid">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Tickets</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <p className="text-xs text-sky-600 dark:text-sky-400 font-medium">Ouvertes</p>
            <p className="text-xl font-bold text-sky-700 dark:text-sky-300 mt-1">{stats.ouvertes}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">En Traitement</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.enCours}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Résolues</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.resolues}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Urgentes / Hautes</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">{stats.urgentes}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Sur Matériel</p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">{stats.materielCount}</p>
          </div>
        </div>

        {/* Filtering Bar */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-3" id="tickets-filters-bar">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Rechercher par n° code, objet, équipement, demandeur..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="reclamations-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Selector */}
            <select
              value={selectedStatut}
              onChange={e => setSelectedStatut(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="filter-statut-select"
            >
              <option value="all">Tous les Statuts</option>
              <option value="Ouverte">Ouverte</option>
              <option value="En cours">En cours</option>
              <option value="En attente">En attente</option>
              <option value="Résolue">Résolue</option>
              <option value="Rejetée">Rejetée</option>
            </select>

            {/* Priority Selector */}
            <select
              value={selectedPriorite}
              onChange={e => setSelectedPriorite(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="filter-priorite-select"
            >
              <option value="all">Toutes les Urgences</option>
              <option value="Urgente">🔴 Urgente</option>
              <option value="Haute">🟠 Haute</option>
              <option value="Moyenne">🟡 Moyenne</option>
              <option value="Basse">🟢 Basse</option>
            </select>

            {/* Category Selector */}
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="filter-category-select"
            >
              <option value="all">Toutes les Catégories</option>
              {allGroupes.map(g => (
                <option key={g.id} value={g.id}>
                  {g.nom || g.Groupe}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Nature Filter Pills (Materiel vs Autre) */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-medium">
            <span className="text-zinc-500 dark:text-zinc-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Type de demande :
            </span>
            <button
              onClick={() => setSelectedNatureFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedNatureFilter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
              id="filter-nature-all"
            >
              Toutes ({stats.total})
            </button>
            <button
              onClick={() => setSelectedNatureFilter('materiel')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                selectedNatureFilter === 'materiel'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
              id="filter-nature-materiel"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Réclamations Matériel ({stats.materielCount})</span>
            </button>
            <button
              onClick={() => setSelectedNatureFilter('autre')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                selectedNatureFilter === 'autre'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
              id="filter-nature-autre"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Autres Réclamations ({stats.autreCount})</span>
            </button>
          </div>
        </div>

        {/* Tickets List / Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden" id="tickets-table-container">
          {filteredReclamations.length === 0 ? (
            <div className="p-12 text-center" id="tickets-empty-state">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-4">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Aucune réclamation trouvée
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                {searchTerm || selectedStatut !== 'all' || selectedPriorite !== 'all' || selectedNatureFilter !== 'all'
                  ? "Aucun ticket ne correspond à vos critères de recherche actuels."
                  : activeSubTab === 'mes-reclamations'
                  ? "Vous n'avez soumis aucune réclamation pour le moment. En cas de problème avec votre matériel informatique, n'hésitez pas à créer un ticket."
                  : "Aucune réclamation de collaborateur n'est enregistrée pour le moment."}
              </p>
              <button
                onClick={handleOpenCreateTicket}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une Réclamation</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
              {filteredReclamations.map(rec => {
                const isOwner = isMyTicket(rec);
                const hasMats = Array.isArray(rec.materielsConcernesNoms) && rec.materielsConcernesNoms.length > 0;
                const hasCats = Array.isArray(rec.categoriesNoms) && rec.categoriesNoms.length > 0;

                return (
                  <div
                    key={rec.id}
                    className="p-5 hover:bg-zinc-50/70 dark:hover:bg-zinc-850/50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    id={`ticket-row-${rec.id}`}
                  >
                    {/* Left: Code, Nature badge, Title & Description */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                          {rec.code}
                        </span>

                        {rec.nature === 'materiel' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Laptop className="w-3 h-3" />
                            <span>Matériel</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Tag className="w-3 h-3" />
                            <span>Par Catégorie</span>
                          </span>
                        )}

                        {getPrioriteBadge(rec.priorite)}
                        {getStatutBadge(rec.statut)}

                        {/* Max deadline or SLA display */}
                        {rec.dateMaxResolution && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title="Date maximale de résolution">
                            <Calendar className="w-3 h-3" />
                            <span>Max: {new Date(rec.dateMaxResolution).toLocaleDateString('fr-FR')} {new Date(rec.dateMaxResolution).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4
                        onClick={() => setSelectedTicketForDetail(rec)}
                        className="text-base font-semibold text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition"
                      >
                        {rec.titre}
                      </h4>

                      {/* Description snippet */}
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {rec.description}
                      </p>

                      {/* Equipments & Categories Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {hasMats ? (
                          rec.materielsConcernesNoms!.map((mNom, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                            >
                              <Monitor className="w-3 h-3 text-blue-500" />
                              <span>{mNom}</span>
                            </span>
                          ))
                        ) : rec.materielNom ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                            <Monitor className="w-3 h-3 text-blue-500" />
                            <span>{rec.materielNom}</span>
                          </span>
                        ) : null}

                        {hasCats ? (
                          rec.categoriesNoms!.map((cNom, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{cNom}</span>
                            </span>
                          ))
                        ) : rec.groupeNom ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Tag className="w-3 h-3" />
                            <span>{rec.groupeNom}</span>
                          </span>
                        ) : null}

                        {/* Demandeur info */}
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                          <User className="w-3 h-3" />
                          <span>Demandeur: <strong className="text-zinc-700 dark:text-zinc-300">{rec.demandeurNom}</strong></span>
                        </span>

                        {/* Technicien info */}
                        {rec.technicienNom && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Support: <strong>{rec.technicienNom}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800">
                      {/* Detail / Timeline button */}
                      <button
                        onClick={() => setSelectedTicketForDetail(rec)}
                        className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        title="Voir le suivi et les commentaires"
                        id={`view-detail-btn-${rec.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Détails & Suivi</span>
                      </button>

                      {/* IT Admin SLA & Urgence button (for collaborator tickets or all tickets) */}
                      {isDSIAdmin && (
                        <button
                          onClick={() => handleOpenAssignSla(rec)}
                          className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/50 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                          title="Modifier l'urgence, le délai SLA et la date maximale"
                          id={`sla-admin-btn-${rec.id}`}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Urgence & Délais SLA</span>
                        </button>
                      )}

                      {/* Edit button: ONLY for the creator (owner) of the ticket */}
                      {isOwner && (
                        <button
                          onClick={() => handleOpenEditMyTicket(rec)}
                          className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          title="Modifier ma réclamation"
                          id={`edit-ticket-btn-${rec.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete button (DSI or Owner if Ouverte) */}
                      {(isDSIAdmin || (isOwner && rec.statut === 'Ouverte')) && (
                        <button
                          onClick={() => handleDeleteTicket(rec.id)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                          title="Supprimer le ticket"
                          id={`delete-ticket-btn-${rec.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1 : FORMULAIRE EN 2 PARTIES (AJOUT / MODIFICATION RÉCLAMATION)      */}
      {/* ========================================================================= */}
      {isTicketModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
          id="ticket-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTicketModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col" id="ticket-modal-card">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-850/80 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                  {editingTicket ? "Modifier la Réclamation" : "Nouvelle Réclamation IT"}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Remplissez les informations en 2 étapes claires pour un traitement rapide par le support
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Fermer (Échap)"
                id="close-ticket-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper / Tabs indicator */}
            <div className="grid grid-cols-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm font-medium shrink-0">
              <button
                type="button"
                onClick={() => setTicketFormPart(1)}
                className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                  ticketFormPart === 1
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold bg-white dark:bg-zinc-850'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
                id="stepper-step-1-btn"
              >
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Matériels ou Catégories</span>
              </button>

              <button
                type="button"
                onClick={() => setTicketFormPart(2)}
                className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                  ticketFormPart === 2
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold bg-white dark:bg-zinc-850'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
                id="stepper-step-2-btn"
              >
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                <span>Informations Générales</span>
              </button>
            </div>

            {/* Modal Body */}
            <form id="ticket-modal-form" onSubmit={handleSaveTicket} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {ticketModalAlert && (
                <FormAlert
                  type={ticketModalAlert.type}
                  message={ticketModalAlert.message}
                  onClose={() => setTicketModalAlert(null)}
                />
              )}

              {/* ============================================================ */}
              {/* PARTIE 1 : CHOIX ENTRE MATÉRIEL OU PAR CATÉGORIE             */}
              {/* ============================================================ */}
              {ticketFormPart === 1 && (
                <div className="space-y-6 animate-in fade-in duration-150" id="ticket-form-part-1">
                  
                  {/* Select Nature Toggle */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Concerne votre réclamation : <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="nature-choice-group">
                      <button
                        type="button"
                        onClick={() => setTicketFormData(prev => ({ ...prev, nature: 'materiel' }))}
                        className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                          ticketFormData.nature === 'materiel'
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                        }`}
                        id="choose-nature-materiel-btn"
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${ticketFormData.nature === 'materiel' ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                          <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Un ou plusieurs Matériels</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Sélectionnez vos équipements affectés (PC, écran, clavier, etc.)
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTicketFormData(prev => ({ ...prev, nature: 'autre' }))}
                        className={`p-4 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                          ticketFormData.nature === 'autre'
                            ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                        }`}
                        id="choose-nature-category-btn"
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${ticketFormData.nature === 'autre' ? 'bg-purple-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Par Catégorie uniquement</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Demande générale, logiciel, réseau ou sans équipement spécifique
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* OPTION A : LISTE DES MATÉRIELS (AFFECTÉS OU PARC)       */}
                  {/* -------------------------------------------------------- */}
                  {ticketFormData.nature === 'materiel' && (
                    <div className="space-y-4 bg-zinc-50/70 dark:bg-zinc-850/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800" id="materiels-selection-section">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <Monitor className="w-4 h-4 text-blue-600" />
                            <span>Matériels affectés à votre compte ({userAssignedMateriels.length})</span>
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Cochez le ou les matériels présentant une anomalie :
                          </p>
                        </div>

                        {userAssignedMateriels.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={handleSelectAllUserMateriels}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                            >
                              Tout cocher
                            </button>
                            <span className="text-zinc-300 dark:text-zinc-600">|</span>
                            <button
                              type="button"
                              onClick={handleDeselectAllMateriels}
                              className="text-zinc-500 hover:underline cursor-pointer"
                            >
                              Tout décocher
                            </button>
                          </div>
                        )}
                      </div>

                      {/* User's assigned materials cards */}
                      {userAssignedMateriels.length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                          <p className="font-semibold">Aucun matériel n'est actuellement affecté à votre profil.</p>
                          <p className="mt-0.5">Pour faire une réclamation générale ou liée à un autre problème, veuillez sélectionner l'option <strong>"Autre Réclamation (Par Catégorie)"</strong> ci-dessus.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {userAssignedMateriels.map(mat => {
                            const isChecked = ticketFormData.selectedMaterielsIds.includes(mat.id);
                            return (
                              <div
                                key={mat.id}
                                onClick={() => handleToggleSelectMateriel(mat.id)}
                                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                  isChecked
                                    ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 shadow-sm'
                                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-2 rounded-lg ${isChecked ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}`}>
                                    <Monitor className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{mat.designation}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                      Réf: {mat.reference} {mat.codeBarre ? `| Série: ${mat.codeBarre}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isChecked ? (
                                    <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-md border-2 border-zinc-300 dark:border-zinc-600"></div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* OPTION B : LISTE DES CATÉGORIES                          */}
                  {/* -------------------------------------------------------- */}
                  {ticketFormData.nature === 'autre' && (
                    <div className="space-y-4 bg-purple-50/40 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/40" id="categories-selection-section">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-purple-600" />
                            <span>Catégories d'incidents / Matériels ({allGroupes.length})</span>
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Sélectionnez une ou plusieurs catégories correspondantes :
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={handleSelectAllCategories}
                            className="text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                          >
                            Tout cocher
                          </button>
                          <span className="text-zinc-300 dark:text-zinc-600">|</span>
                          <button
                            type="button"
                            onClick={handleDeselectAllCategories}
                            className="text-zinc-500 hover:underline cursor-pointer"
                          >
                            Tout décocher
                          </button>
                        </div>
                      </div>

                      {/* Categories Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                        {allGroupes.map(cat => {
                          const isChecked = ticketFormData.selectedCategoriesIds.includes(cat.id);
                          return (
                            <div
                              key={cat.id}
                              onClick={() => handleToggleSelectCategory(cat.id)}
                              className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                                isChecked
                                  ? 'border-purple-600 bg-purple-100/70 dark:bg-purple-950/60 text-purple-950 dark:text-purple-100 font-semibold shadow-sm'
                                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Tag className={`w-4 h-4 shrink-0 ${isChecked ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'}`} />
                                <span className="text-xs truncate">{cat.nom || cat.Groupe}</span>
                              </div>

                              <div className="shrink-0">
                                {isChecked ? (
                                  <div className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded border-2 border-zinc-300 dark:border-zinc-600"></div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Inline quick create category */}
                      <div className="pt-2 border-t border-purple-200/50 dark:border-purple-900/50">
                        {isCreatingQuickCatInTicket ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nom de la nouvelle catégorie..."
                              value={quickCatNameInTicket}
                              onChange={e => setQuickCatNameInTicket(e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-700 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                              type="button"
                              disabled={isSavingQuickCatInTicket}
                              onClick={handleSaveQuickCategoryInTicket}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-medium text-xs hover:bg-purple-700 cursor-pointer"
                            >
                              {isSavingQuickCatInTicket ? "Création..." : "Ajouter"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCreatingQuickCatInTicket(false)}
                              className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsCreatingQuickCatInTicket(true)}
                            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter une nouvelle catégorie personnalisée</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary / Confirmation Box */}
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">Récapitulatif de votre sélection :</p>
                    <p className="mt-0.5">
                      {ticketFormData.nature === 'materiel'
                        ? `${ticketFormData.selectedMaterielsIds.length} matériel(s) sélectionné(s)`
                        : `${ticketFormData.selectedCategoriesIds.length} catégorie(s) sélectionnée(s)`}
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setTicketFormPart(2)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>Passer aux informations générales</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* PARTIE 2 : INPUTS STANDARDS & INFORMATIONS GÉNÉRALES         */}
              {/* ============================================================ */}
              {ticketFormPart === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150" id="ticket-form-part-2">
                  
                  {/* Sujet / Objet */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                      Sujet / Objet de votre réclamation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketFormData.titre}
                      onChange={e => setTicketFormData(prev => ({ ...prev, titre: e.target.value }))}
                      placeholder="Ex: Écran ne s'allume plus après mise en veille..."
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      id="ticket-titre-input"
                    />
                  </div>

                  {/* Description détaillée */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                      Description détaillée du problème <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={ticketFormData.description}
                      onChange={e => setTicketFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Expliquez en détail le dysfonctionnement observé, les messages d'erreur et l'impact sur votre travail..."
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      id="ticket-description-input"
                    />
                  </div>

                  {/* Niveau d'Urgence Estimé */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      Niveau d'Urgence Estimé <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" id="urgence-selector-group">
                      {[
                        { level: 'Basse' as const, label: '🟢 Basse', desc: 'Gêne mineure / Question' },
                        { level: 'Moyenne' as const, label: '🟡 Moyenne', desc: 'Problème partiel' },
                        { level: 'Haute' as const, label: '🟠 Haute', desc: 'Poste bloqué / Ralenti' },
                        { level: 'Urgente' as const, label: '🔴 Urgente', desc: 'Activité arrêtée' },
                      ].map(item => (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => setTicketFormData(prev => ({ ...prev, priorite: item.level }))}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            ticketFormData.priorite === item.level
                              ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                          }`}
                        >
                          <span className="font-semibold text-xs">{item.label}</span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {ticketFormPart === 1 && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTicketFormPart(2)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Passer aux informations générales</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              {ticketFormPart === 2 ? (
                <button
                  type="button"
                  onClick={() => setTicketFormPart(1)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-50 cursor-pointer text-center"
                >
                  Retour à l'étape 1 (Matériels)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-50 cursor-pointer text-center"
                >
                  Annuler
                </button>
              )}

              <div className="flex items-center gap-2">
                {ticketFormPart === 1 ? (
                  <button
                    type="button"
                    onClick={() => setTicketFormPart(2)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Suivant (Informations)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="ticket-modal-form"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 cursor-pointer"
                    id="submit-ticket-form-btn"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingTicket ? "Mettre à jour la Réclamation" : "Valider & Envoyer"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : GESTION SLA / DEADLINE / URGENCE (RESPONSABLE IT)               */}
      {/* ========================================================================= */}
      {isAssignSlaModalOpen && targetTicketForSla && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
          id="assign-sla-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAssignSlaModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-xl w-full max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col" id="assign-sla-modal-card">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-850/80 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>Gestion SLA & Délais IT</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Ticket <strong className="font-mono">{targetTicketForSla.code}</strong> : {targetTicketForSla.titre}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAssignSlaModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Fermer (Échap)"
                id="close-assign-sla-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="assign-sla-form" onSubmit={handleSaveAssignSla} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {assignSlaModalAlert && (
                <FormAlert
                  type={assignSlaModalAlert.type}
                  message={assignSlaModalAlert.message}
                  onClose={() => setAssignSlaModalAlert(null)}
                />
              )}

              {/* Demandeur info banner */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Demandeur :</span>{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{targetTicketForSla.demandeurNom}</strong>
                  {targetTicketForSla.demandeurEmail && ` (${targetTicketForSla.demandeurEmail})`}
                </div>
                <div className="text-zinc-500">
                  Créé le : {new Date(targetTicketForSla.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                </div>
              </div>

              {/* Urgence / Priorité IT */}
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Niveau d'Urgence / Priorité IT <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Basse', 'Moyenne', 'Haute', 'Urgente'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAssignSlaFormData(prev => ({ ...prev, priorite: p }))}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition text-center cursor-pointer ${
                        assignSlaFormData.priorite === p
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* SLA Preset buttons */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Délai de Traitement (SLA en Heures) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-zinc-500">Raccourcis rapides :</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                  {[
                    { h: 4, label: '4h (Critique)' },
                    { h: 8, label: '8h (1 jour)' },
                    { h: 24, label: '24h (Standard)' },
                    { h: 48, label: '48h' },
                    { h: 72, label: '72h' },
                  ].map(preset => (
                    <button
                      key={preset.h}
                      type="button"
                      onClick={() => handleApplyPresetDeadline(preset.h)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        assignSlaFormData.delaiTraitementHeures === preset.h
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  max="720"
                  required
                  value={assignSlaFormData.delaiTraitementHeures}
                  onChange={e => setAssignSlaFormData(prev => ({ ...prev, delaiTraitementHeures: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date & Heure Maximale de Résolution */}
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Date & Heure Maximale de Résolution (Date limite)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={assignSlaFormData.dateMaxResolution}
                    onChange={e => setAssignSlaFormData(prev => ({ ...prev, dateMaxResolution: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Permet de fixer une échéance précise et partagée avec le collaborateur.
                </p>
              </div>

              {/* Technicien Assigné */}
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Technicien / Responsable IT Assigné
                </label>
                <select
                  value={assignSlaFormData.id_TechnicienAssigne}
                  onChange={e => setAssignSlaFormData(prev => ({ ...prev, id_TechnicienAssigne: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Non assigné --</option>
                  {itTechnicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.beneficiaire} ({t.role || 'Support IT'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Statut du Ticket */}
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Statut du Ticket
                </label>
                <select
                  value={assignSlaFormData.statut}
                  onChange={e => setAssignSlaFormData(prev => ({ ...prev, statut: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Ouverte">Ouverte</option>
                  <option value="En cours">En cours de traitement</option>
                  <option value="En attente">En attente (pièces / retour utilisateur)</option>
                  <option value="Résolue">Résolue</option>
                  <option value="Rejetée">Rejetée</option>
                </select>
              </div>

              {/* Solution / Note d'intervention */}
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                  Note d'Intervention / Solution apportée
                </label>
                <textarea
                  rows={3}
                  value={assignSlaFormData.solution}
                  onChange={e => setAssignSlaFormData(prev => ({ ...prev, solution: e.target.value }))}
                  placeholder="Décrivez les actions menées, le diagnostic ou la solution apportée..."
                  className="w-full px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignSlaModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-50 cursor-pointer text-center"
                id="cancel-assign-sla-btn"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="assign-sla-form"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                id="save-sla-admin-btn"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistrer les Paramètres IT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER : DÉTAILS DU TICKET, TIMELINE ET COMMENTAIRES                      */}
      {/* ========================================================================= */}
      {selectedTicketForDetail && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          id="detail-drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTicketForDetail(null);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200" id="detail-drawer-card">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-850/50 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    {selectedTicketForDetail.code}
                  </span>
                  {getStatutBadge(selectedTicketForDetail.statut)}
                  {getPrioriteBadge(selectedTicketForDetail.priorite)}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white pt-1">
                  {selectedTicketForDetail.titre}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicketForDetail(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Fermer (Échap)"
                id="close-detail-drawer-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Informations Générales */}
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Informations de la Réclamation
                </h4>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Demandeur :</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{selectedTicketForDetail.demandeurNom}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Technicien IT :</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-semibold">
                      {selectedTicketForDetail.technicienNom || 'Non assigné'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Délai SLA :</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                      {selectedTicketForDetail.delaiTraitementHeures ? `${selectedTicketForDetail.delaiTraitementHeures}h` : '24h'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Date Maximale :</span>
                    <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                      {selectedTicketForDetail.dateMaxResolution
                        ? new Date(selectedTicketForDetail.dateMaxResolution).toLocaleDateString('fr-FR')
                        : 'Non spécifiée'}
                    </strong>
                  </div>
                </div>

                {/* Badges matériels & catégories */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
                  <span className="text-xs text-zinc-500 block">Équipement(s) / Catégorie(s) :</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(selectedTicketForDetail.materielsConcernesNoms) && selectedTicketForDetail.materielsConcernesNoms.length > 0 ? (
                      selectedTicketForDetail.materielsConcernesNoms.map((n, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-200">
                          🖥️ {n}
                        </span>
                      ))
                    ) : selectedTicketForDetail.materielNom ? (
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-200">
                        🖥️ {selectedTicketForDetail.materielNom}
                      </span>
                    ) : null}

                    {Array.isArray(selectedTicketForDetail.categoriesNoms) && selectedTicketForDetail.categoriesNoms.length > 0 ? (
                      selectedTicketForDetail.categoriesNoms.map((c, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-medium border border-purple-200">
                          🏷️ {c}
                        </span>
                      ))
                    ) : selectedTicketForDetail.groupeNom ? (
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-medium border border-purple-200">
                        🏷️ {selectedTicketForDetail.groupeNom}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Description du Problème
                </h4>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicketForDetail.description}
                </div>
              </div>

              {/* Solution / Note technique si résolu */}
              {selectedTicketForDetail.solution && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Compte-rendu & Solution IT</span>
                  </h4>
                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                    {selectedTicketForDetail.solution}
                  </div>
                </div>
              )}

              {/* Timeline / Historique & Commentaires */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Fil de Discussion & Journal d'Intervention ({selectedTicketForDetail.historique?.length || 0})</span>
                </h4>

                <div className="space-y-3">
                  {selectedTicketForDetail.historique && selectedTicketForDetail.historique.length > 0 ? (
                    selectedTicketForDetail.historique.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl text-xs space-y-1 ${
                          entry.typeAction === 'commentaire'
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="font-semibold">{entry.auteur} ({entry.role})</strong>
                          <span className="text-[11px] text-zinc-500">
                            {new Date(entry.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{entry.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500 italic">Aucun événement enregistré.</p>
                  )}
                </div>

                {/* Form to add a new comment */}
                <form onSubmit={handleAddComment} className="pt-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        placeholder="Écrire un message ou une précision..."
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingComment || !newCommentText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingComment ? "Envoi..." : "Envoyer"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
