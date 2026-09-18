import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Layers,
  MapPin,
  User,
  Package,
  AlertTriangle,
  ShieldCheck,
  Boxes,
  Droplets,
  Printer
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import { authService, AuthUser } from '../../services/authService';
import {
  Beneficiaire,
  Emplacement,
  Facture,
  Fournisseur,
  GroupeMateriel,
  Materiel,
  Composant,
  StatutMateriel
} from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';
import { CustomConfirmModal, ConfirmModalItem } from '../common/CustomConfirmModal';
import { ComposantsSection } from './ComposantsSection';
import { StocksSection } from './StocksSection';

export interface MatFormComposantItem {
  id?: string;
  REF_composant: string;
  nom: string;
  capaciteType?: 'grammage' | 'litrage';
  capaciteValeur?: number | '';
  capaciteUnite?: 'g' | 'kg' | 'l' | 'cl';
  utilisation: '0%' | '25%' | '50%' | '75%' | '100%';
}

interface MaterielsPageProps {
  initialTab?: 'materiels' | 'groupes' | 'composants' | 'stocks';
}

export const MaterielsPage: React.FC<MaterielsPageProps> = ({ initialTab = 'materiels' }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getUser());
  const [activeTab, setActiveTab] = useState<'materiels' | 'groupes' | 'composants' | 'stocks'>(initialTab);

  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());
  const [groupes, setGroupes] = useState<GroupeMateriel[]>(itParkService.getGroupesMateriel());
  const [composants, setComposants] = useState<Composant[]>(itParkService.getComposants());
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(itParkService.getFournisseurs());
  const [factures, setFactures] = useState<Facture[]>(itParkService.getFactures());
  const [emplacements, setEmplacements] = useState<Emplacement[]>(itParkService.getEmplacements());
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>(itParkService.getBeneficiaires());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getUser());
    });
    const unsubData = itParkService.subscribe(() => {
      setMateriels(itParkService.getMateriels());
      setGroupes(itParkService.getGroupesMateriel());
      setComposants(itParkService.getComposants());
      setFournisseurs(itParkService.getFournisseurs());
      setFactures(itParkService.getFactures());
      setEmplacements(itParkService.getEmplacements());
      setBeneficiaires(itParkService.getBeneficiaires());
    });
    return () => {
      unsubAuth();
      unsubData();
    };
  }, []);

  const isDSIAdmin = currentUser?.role === 'Responsable IT' || currentUser?.accesApp === 'GLOBAL_BACKOFFICE';

  // Alerts
  const [pageAlert, setPageAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [matModalAlert, setMatModalAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [groupModalAlert, setGroupModalAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Filter States for Materiels
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [selectedFournisseur, setSelectedFournisseur] = useState<string>('all');

  // Modal State for Materiel
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState<Materiel | null>(null);

  const [matForm, setMatForm] = useState({
    reference: '',
    ref_immo: '',
    designation: '',
    codeSerie: '',
    qte: 1,
    montantHT: 0,
    dateMiseEnService: '',
    statut: 'En service' as StatutMateriel,
    garantie: '24 mois',
    id_GroupeMateriel: '',
    id_Fournisseur: '',
    id_Facture: '',
    typeAffectation: 'non_affecte' as 'non_affecte' | 'personnel' | 'emplacement',
    id_Emplacement: '',
    id_Beneficiaire: '',
    isImprimante: false,
  });

  // Optional Components / Consumables sub-form inside Materiel Modal (0, 1 or multiple components)
  const [formComposants, setFormComposants] = useState<MatFormComposantItem[]>([]);

  const handleAddFormComposant = () => {
    const isPrinter = matForm.isImprimante ||
                      matForm.designation.toLowerCase().includes('imprim') ||
                      matForm.designation.toLowerCase().includes('print') ||
                      matForm.designation.toLowerCase().includes('copieur');

    const defaultName = isPrinter ? "Liquide d'écriture (Encre)" : "Liquide d'écriture";

    setFormComposants(prev => [
      ...prev,
      {
        REF_composant: 'LIQ-' + Math.floor(1000 + Math.random() * 9000),
        nom: defaultName,
        utilisation: '0%',
      }
    ]);
  };

  const handleRemoveFormComposant = (index: number) => {
    setFormComposants(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFormComposant = (index: number, updates: Partial<MatFormComposantItem>) => {
    setFormComposants(prev => {
      const updated = [...prev];
      const current = updated[index];
      if (!current) return prev;

      let newUnite = updates.capaciteUnite !== undefined ? updates.capaciteUnite : current.capaciteUnite;
      if (updates.capaciteType && updates.capaciteType !== current.capaciteType) {
        if (updates.capaciteType === 'grammage' && newUnite !== 'g' && newUnite !== 'kg') {
          newUnite = 'g';
        } else if (updates.capaciteType === 'litrage' && newUnite !== 'l' && newUnite !== 'cl') {
          newUnite = 'cl';
        }
      }

      updated[index] = {
        ...current,
        ...updates,
        capaciteUnite: newUnite,
      };
      return updated;
    });
  };

  // Modal State for GroupeMateriel
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupeMateriel | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [codeSerieObligatoireInput, setCodeSerieObligatoireInput] = useState(false);

  // Custom Confirm & Integrity Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    type?: 'danger' | 'warning' | 'info';
    message?: string;
    impacts?: string[];
    itemsListTitle?: string;
    itemsList?: ConfirmModalItem[];
    confirmText?: string;
    cancelText?: string;
    isBlocked?: boolean;
    onConfirm?: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Quick group creation inside Materiel modal
  const [isCreatingQuickGroup, setIsCreatingQuickGroup] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');
  const [quickGroupCodeSerie, setQuickGroupCodeSerie] = useState(false);
  const [isSavingQuickGroup, setIsSavingQuickGroup] = useState(false);

  const handleSaveQuickGroup = async () => {
    if (!quickGroupName.trim()) {
      alert("Veuillez saisir un nom pour le nouveau groupe.");
      return;
    }
    setIsSavingQuickGroup(true);
    const res = await itParkService.saveGroupeMateriel({
      Groupe: quickGroupName.trim(),
      nom: quickGroupName.trim(),
      codeSerieObligatoire: quickGroupCodeSerie,
    });
    setIsSavingQuickGroup(false);
    if (!res.success) {
      alert(res.message || "Erreur lors de la création du groupe.");
      return;
    }
    const freshGroups = itParkService.getGroupesMateriel();
    setGroupes(freshGroups);
    const newGroup = res.data || freshGroups.find(g => (g.Groupe || (g as any).nom) === quickGroupName.trim());
    if (newGroup) {
      setMatForm(prev => ({ ...prev, id_GroupeMateriel: newGroup.id }));
    }
    setQuickGroupName('');
    setQuickGroupCodeSerie(false);
    setIsCreatingQuickGroup(false);
  };

  // Derived list of Fournisseurs who have at least one invoice (any status)
  const suppliersWithInvoices = fournisseurs.filter(frs =>
    factures.some(f => f.id_Fournisseur === frs.id)
  );

  // Derived list of Invoices for the currently selected Fournisseur (any status)
  const invoicesForSelectedSupplier = factures.filter(f =>
    f.id_Fournisseur === matForm.id_Fournisseur
  );

  // Derived list of Beneficiaires assigned to the currently selected Emplacement
  const locationBeneficiaires = beneficiaires.filter(b =>
    matForm.id_Emplacement ? b.id_Emplacement === matForm.id_Emplacement : false
  );

  // Handlers for dynamic form selections
  const handleFournisseurChange = (fournisseurId: string) => {
    const supplierInvoices = factures.filter(f => f.id_Fournisseur === fournisseurId);
    setMatForm(prev => ({
      ...prev,
      id_Fournisseur: fournisseurId,
      id_Facture: supplierInvoices[0]?.id || '',
    }));
  };

  const handleTypeAffectationChange = (type: 'non_affecte' | 'personnel' | 'emplacement') => {
    if (type === 'non_affecte') {
      setMatForm(prev => ({
        ...prev,
        typeAffectation: 'non_affecte',
        statut: 'En stock',
        id_Emplacement: '',
        id_Beneficiaire: '',
      }));
    } else if (type === 'personnel') {
      setMatForm(prev => ({
        ...prev,
        typeAffectation: 'personnel',
        statut: prev.statut === 'En stock' ? 'En service' : prev.statut,
        id_Emplacement: '',
        id_Beneficiaire: prev.id_Beneficiaire || beneficiaires[0]?.id || '',
      }));
    } else {
      const defaultEmp = emplacements[0]?.id || '';
      setMatForm(prev => ({
        ...prev,
        typeAffectation: 'emplacement',
        statut: prev.statut || 'En service',
        id_Emplacement: defaultEmp,
        id_Beneficiaire: '', // Par défaut aucun bénéficiaire (disponible sur emplacement)
      }));
    }
  };

  const handleEmplacementChange = (empId: string) => {
    const usersInEmp = beneficiaires.filter(b => b.id_Emplacement === empId);
    setMatForm(prev => {
      const isCurrentInEmp = usersInEmp.some(u => u.id === prev.id_Beneficiaire);
      return {
        ...prev,
        id_Emplacement: empId,
        id_Beneficiaire: isCurrentInEmp ? prev.id_Beneficiaire : '',
      };
    });
  };

  useEffect(() => {
    const unsub = itParkService.subscribe(() => {
      setMateriels(itParkService.getMateriels());
      setGroupes(itParkService.getGroupesMateriel());
      setFournisseurs(itParkService.getFournisseurs());
      setFactures(itParkService.getFactures());
      setEmplacements(itParkService.getEmplacements());
      setBeneficiaires(itParkService.getBeneficiaires());
    });
    return unsub;
  }, []);

  // Open Materiel Modal
  const handleOpenAddMat = () => {
    setEditingMat(null);
    setMatModalAlert(null);
    setFormComposants([]);
    const defaultFrs = suppliersWithInvoices[0] || fournisseurs[0];
    const defaultInvoices = factures.filter(f => f.id_Fournisseur === defaultFrs?.id);
    const defaultGrp = groupes[0];
    const isDefaultPrinter = defaultGrp ? ((defaultGrp.Groupe || (defaultGrp as any).nom || '').toLowerCase().includes('imprim')) : false;

    setMatForm({
      reference: 'REF-' + Math.floor(1000 + Math.random() * 9000),
      ref_immo: 'IMM-2025-' + Math.floor(1000 + Math.random() * 9000),
      designation: '',
      codeSerie: 'SN-' + Math.floor(100000 + Math.random() * 900000),
      qte: 1,
      montantHT: 1200,
      dateMiseEnService: new Date().toLocaleDateString('fr-FR'),
      statut: 'En stock',
      garantie: '24 mois',
      id_GroupeMateriel: groupes[0]?.id || 'gm-1',
      id_Fournisseur: defaultFrs?.id || '',
      id_Facture: defaultInvoices[0]?.id || '',
      typeAffectation: 'non_affecte',
      id_Emplacement: '',
      id_Beneficiaire: '',
      isImprimante: isDefaultPrinter,
    });
    setIsMatModalOpen(true);
  };

  const handleOpenEditMat = (mat: Materiel) => {
    setEditingMat(mat);
    setMatModalAlert(null);

    // Load components attached to this material
    const existingComps = itParkService.getComposantsByMateriel(mat.id);
    setFormComposants(existingComps.map(c => ({
      id: c.id,
      REF_composant: c.REF_composant,
      nom: c.nom,
      utilisation: c.utilisation,
    })));

    let typeAffectation: 'non_affecte' | 'personnel' | 'emplacement' = 'non_affecte';
    if (mat.id_Emplacement) {
      typeAffectation = 'emplacement';
    } else if (mat.id_Beneficiaire) {
      typeAffectation = 'personnel';
    } else {
      typeAffectation = 'non_affecte';
    }

    const matGrp = groupes.find(g => g.id === mat.id_GroupeMateriel);
    const isPrinterGroup = matGrp ? ((matGrp.Groupe || (matGrp as any).nom || '').toLowerCase().includes('imprim')) : false;
    const isPrinterDesignation = (mat.designation || '').toLowerCase().includes('imprim') ||
                                 (mat.designation || '').toLowerCase().includes('printer') ||
                                 (mat.designation || '').toLowerCase().includes('copieur');
    const isImprimante = mat.isImprimante !== undefined
      ? !!mat.isImprimante
      : (isPrinterGroup || isPrinterDesignation || existingComps.length > 0);

    setMatForm({
      reference: mat.reference,
      ref_immo: mat.ref_immo || '',
      designation: mat.designation,
      codeSerie: mat.codeSerie,
      qte: mat.qte,
      montantHT: mat.montantHT ?? 0,
      dateMiseEnService: mat.dateMiseEnService,
      statut: mat.statut,
      garantie: mat.garantie,
      id_GroupeMateriel: mat.id_GroupeMateriel,
      id_Fournisseur: mat.id_Fournisseur,
      id_Facture: mat.id_Facture,
      typeAffectation,
      id_Emplacement: mat.id_Emplacement || '',
      id_Beneficiaire: mat.id_Beneficiaire || '',
      isImprimante,
    });
    setIsMatModalOpen(true);
  };

  const handleSaveMat = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatModalAlert(null);
    setIsSaving(true);

    try {
      // 1. Validation of associated components (if isImprimante and components exist)
      if (matForm.isImprimante && formComposants.length > 0) {
        const refSet = new Set<string>();
        for (let i = 0; i < formComposants.length; i++) {
          const c = formComposants[i];
          const cRef = c.REF_composant.trim();
          const cNom = c.nom.trim();

          if (!cRef) {
            setMatModalAlert({
              type: 'error',
              message: `Liquide d'écriture #${i + 1} : La référence du liquide est obligatoire.`
            });
            setIsSaving(false);
            return;
          }
          if (!cNom) {
            setMatModalAlert({
              type: 'error',
              message: `Liquide d'écriture #${i + 1} (${cRef}) : Le nom / libellé est obligatoire.`
            });
            setIsSaving(false);
            return;
          }
          if (refSet.has(cRef.toLowerCase())) {
            setMatModalAlert({
              type: 'error',
              message: `La référence "${cRef}" est présente plusieurs fois dans la liste.`
            });
            setIsSaving(false);
            return;
          }
          refSet.add(cRef.toLowerCase());
        }
      }

      const isNonAffecte = matForm.typeAffectation === 'non_affecte';
      const isPersonnel = matForm.typeAffectation === 'personnel';

      const saved: Materiel = {
        id: editingMat ? editingMat.id : 'mat-' + Date.now(),
        reference: matForm.reference.trim().toUpperCase(),
        ref_immo: matForm.ref_immo ? matForm.ref_immo.trim() : '',
        designation: matForm.designation.trim(),
        codeSerie: matForm.codeSerie.trim(),
        qte: Number(matForm.qte),
        montantHT: Number(matForm.montantHT),
        dateMiseEnService: matForm.dateMiseEnService,
        statut: isNonAffecte ? 'En stock' : matForm.statut,
        garantie: matForm.garantie,
        id_GroupeMateriel: matForm.id_GroupeMateriel,
        id_Fournisseur: matForm.id_Fournisseur,
        id_Facture: matForm.id_Facture,
        id_Emplacement: isNonAffecte || isPersonnel ? '' : matForm.id_Emplacement,
        id_Beneficiaire: isNonAffecte ? undefined : (matForm.id_Beneficiaire ? matForm.id_Beneficiaire : undefined),
        isImprimante: !!matForm.isImprimante,
      };

      const result = await itParkService.saveMateriel(saved);

      if (!result.success) {
        setMatModalAlert({
          type: 'error',
          message: result.message || "Erreur de validation lors de l'enregistrement du matériel."
        });
        return;
      }

      // 2. Persist associated components for this material (ONLY if isImprimante)
      const oldComps = itParkService.getComposantsByMateriel(saved.id);
      const keptIds: string[] = [];

      if (matForm.isImprimante) {
        for (const c of formComposants) {
          const compId = c.id || ('comp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
          keptIds.push(compId);
          await itParkService.saveComposant({
            id: compId,
            REF_composant: c.REF_composant.trim().toUpperCase(),
            nom: c.nom.trim(),
            utilisation: c.utilisation,
            refMateriel: saved.reference,
            id_Materiel: saved.reference,
          });
        }
      }

      // If existing components were detached/removed in this form, delete them
      for (const oldC of oldComps) {
        if (!keptIds.includes(oldC.id)) {
          await itParkService.deleteComposant(oldC.id);
        }
      }

      setIsMatModalOpen(false);
      const compCountMsg = (matForm.isImprimante && formComposants.length > 0) ? ` avec ${formComposants.length} liquide(s) d'écriture` : '';
      setPageAlert({
        type: 'success',
        message: result.message || (editingMat ? `Matériel mis à jour avec succès${compCountMsg}.` : `Matériel créé avec succès${compCountMsg}.`)
      });
    } catch (err: any) {
      setMatModalAlert({
        type: 'error',
        message: err.message || "Une erreur inattendue est survenue."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeleteMat = (mat: Materiel) => {
    const assignedUser = beneficiaires.find(b => b.id === mat.id_Beneficiaire);
    const assignedLocation = emplacements.find(e => e.id === mat.id_Emplacement);

    const impacts: string[] = [
      'Suppression définitive de la fiche d\'inventaire du matériel.',
    ];

    if (assignedUser) {
      impacts.push(`Désaffectation automatique du collaborateur : ${assignedUser.beneficiaire} (${assignedUser.email}).`);
    }

    if (assignedLocation) {
      impacts.push(`Détachement de l'emplacement : ${assignedLocation.emplacement1}.`);
    }

    impacts.push('Les tickets de réclamation associés à ce matériel seront mis à jour.');

    setConfirmModalConfig({
      isOpen: true,
      title: 'Supprimer ce matériel ?',
      subtitle: `${mat.designation} (Réf: ${mat.reference})`,
      type: 'danger',
      message: assignedUser
        ? `Attention : Ce matériel est actuellement affecté au collaborateur "${assignedUser.beneficiaire}". Sa suppression le désaffectera automatiquement et supprimera définitivement le matériel du parc.`
        : `Êtes-vous sûr de vouloir supprimer définitivement ce matériel (${mat.designation}) ?`,
      impacts,
      confirmText: 'Supprimer le matériel',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setIsConfirmLoading(true);
        const res = await itParkService.deleteMateriel(mat.id);
        setIsConfirmLoading(false);
        if (!res.success) {
          setPageAlert({
            type: 'error',
            message: res.message || 'Impossible de supprimer ce matériel.'
          });
        } else {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
          setPageAlert({
            type: 'success',
            message: res.message || 'Matériel supprimé avec succès.'
          });
        }
      },
    });
  };

  const handleRequestDeleteGroup = (group: GroupeMateriel) => {
    const matsInGroup = materiels.filter(m => m.id_GroupeMateriel === group.id);
    if (matsInGroup.length > 0) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Suppression impossible',
        subtitle: group.Groupe,
        type: 'danger',
        isBlocked: true,
        message: `Vous ne pouvez pas supprimer ce groupe car il contient encore ${matsInGroup.length} matériel(s). Veuillez d'abord réaffecter ou supprimer ces matériels.`,
        itemsListTitle: 'Matériels présents dans ce groupe',
        itemsList: matsInGroup.map(m => ({
          id: m.id,
          label: m.designation,
          sublabel: `Réf: ${m.reference} | Statut: ${m.statut}`,
          badge: m.statut,
        })),
      });
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Supprimer ce groupe de matériel ?',
      subtitle: group.Groupe,
      type: 'danger',
      message: `Êtes-vous sûr de vouloir supprimer le groupe "${group.Groupe}" ?`,
      impacts: [
        'Ce groupe ne sera plus proposé lors de la création ou modification de matériels.',
      ],
      confirmText: 'Supprimer le groupe',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setIsConfirmLoading(true);
        const res = await itParkService.deleteGroupeMateriel(group.id);
        setIsConfirmLoading(false);
        if (!res.success) {
          setPageAlert({
            type: 'error',
            message: res.message || 'Impossible de supprimer ce groupe.'
          });
        } else {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
          setPageAlert({
            type: 'success',
            message: res.message || 'Groupe matériel supprimé avec succès.'
          });
        }
      },
    });
  };

  // Open Groupe Modal
  const handleOpenAddGroup = () => {
    setEditingGroup(null);
    setGroupModalAlert(null);
    setGroupNameInput('');
    setCodeSerieObligatoireInput(false);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: GroupeMateriel) => {
    setEditingGroup(g);
    setGroupModalAlert(null);
    setGroupNameInput(g.Groupe);
    setCodeSerieObligatoireInput(!!g.codeSerieObligatoire);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupModalAlert(null);
    setIsSaving(true);

    try {
      const saved: GroupeMateriel = {
        id: editingGroup ? editingGroup.id : 'gm-' + Date.now(),
        Groupe: groupNameInput.trim(),
        codeSerieObligatoire: codeSerieObligatoireInput,
      };

      const result = await itParkService.saveGroupeMateriel(saved);

      if (!result.success) {
        setGroupModalAlert({
          type: 'error',
          message: result.message || "Erreur de validation lors de l'enregistrement du groupe."
        });
        return;
      }

      setIsGroupModalOpen(false);
      setPageAlert({
        type: 'success',
        message: result.message || (editingGroup ? 'Groupe matériel mis à jour.' : 'Groupe matériel créé.')
      });
    } catch (err: any) {
      setGroupModalAlert({
        type: 'error',
        message: err.message || "Une erreur inattendue est survenue."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save Group

  // Helper resolvers
  const getGroupName = (id: string) => groupes.find(g => g.id === id)?.Groupe || 'N/A';
  const getSupplierName = (id: string) => fournisseurs.find(f => f.id === id)?.Fournisseur || 'N/A';
  const getInvoiceCode = (id: string) => factures.find(f => f.id === id)?.factureFrs || 'N/A';
  const getLocationName = (id: string) => emplacements.find(e => e.id === id)?.emplacement1 || 'N/A';
  const getUserName = (id?: string) => beneficiaires.find(b => b.id === id)?.beneficiaire || 'Non attribué';

  // Filtering
  const filteredMateriels = materiels.filter(m => {
    // If not DSI Admin, show ONLY equipment assigned to this user or their office
    if (!isDSIAdmin && currentUser) {
      const isDirectMatch = m.id_Beneficiaire === currentUser.id ||
        (currentUser.beneficiaire && m.id_Beneficiaire === currentUser.beneficiaire) ||
        (currentUser.beneficiaire && getUserName(m.id_Beneficiaire).toLowerCase().includes(currentUser.beneficiaire.toLowerCase()));
      const isLocationMatch = currentUser.id_Emplacement && m.id_Emplacement === currentUser.id_Emplacement;
      if (!isDirectMatch && !isLocationMatch) {
        return false;
      }
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      m.designation.toLowerCase().includes(searchLower) ||
      m.reference.toLowerCase().includes(searchLower) ||
      (m.ref_immo && m.ref_immo.toLowerCase().includes(searchLower)) ||
      m.codeSerie.toLowerCase().includes(searchLower);
    const matchesGroup = selectedGroupe === 'all' || m.id_GroupeMateriel === selectedGroupe;
    const matchesStatut = selectedStatut === 'all' || m.statut === selectedStatut;
    const matchesFournisseur = selectedFournisseur === 'all' || m.id_Fournisseur === selectedFournisseur;
    return matchesSearch && matchesGroup && matchesStatut && matchesFournisseur;
  });

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-gray-900">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 sm:py-7 space-y-6 lg:space-y-8">
      {/* Title & Subheader */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isDSIAdmin ? 'Gestion des matériels' : 'Mes Équipements IT'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDSIAdmin
              ? 'Gérez vos équipements informatiques, affectations aux groupes et suivis de garanties.'
              : `Liste des matériels et équipements informatiques affectés à votre profil (${currentUser?.beneficiaire || 'Collaborateur'}).`}
          </p>
        </div>

        {isDSIAdmin && (
          <div className="flex items-center gap-3">
            {activeTab === 'materiels' ? (
              <button
                onClick={handleOpenAddMat}
                className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Matériel</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddGroup}
                className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Groupe</span>
              </button>
            )}
          </div>
        )}
      </div>

      {pageAlert && (
        <FormAlert
          type={pageAlert.type}
          message={pageAlert.message}
          onClose={() => setPageAlert(null)}
        />
      )}

      {/* Non-admin notice */}
      {!isDSIAdmin && (
        <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-900">Équipements attribués à {currentUser?.beneficiaire}</p>
              <p className="text-[11px] text-blue-700">Vous avez {filteredMateriels.length} matériel(s) informatique(s) sous votre responsabilité.</p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
            {currentUser?.role || 'Collaborateur'}
          </span>
        </div>
      )}

      {/* Tabs (Only if DSI Admin) */}
      {isDSIAdmin && (
        <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('materiels')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'materiels'
                ? 'border-red-500 text-red-600 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Tous les matériels ({materiels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('groupes')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'groupes'
                ? 'border-red-500 text-red-600 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Groupes Matériel ({groupes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('composants')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'composants'
                ? 'border-red-500 text-red-600 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>Liquides d'écriture ({composants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stocks')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'stocks'
                ? 'border-red-500 text-red-600 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Stocks & Synthèse Globale</span>
          </button>
        </div>
      )}

      {/* TAB 1: ALL MATERIELS */}
      {activeTab === 'materiels' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par désignation, réf. interne, réf. immo ERP, code série..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500/20 text-gray-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <select
                value={selectedGroupe}
                onChange={(e) => setSelectedGroupe(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700"
              >
                <option value="all">Tous les groupes</option>
                {groupes.map(g => (
                  <option key={g.id} value={g.id}>{g.Groupe}</option>
                ))}
              </select>

              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700"
              >
                <option value="all">Tous les statuts</option>
                <option value="En service">En service</option>
                <option value="En panne">En panne</option>
                <option value="Hors service">Hors service</option>
                <option value="En stock">En stock</option>
              </select>

              <select
                value={selectedFournisseur}
                onChange={(e) => setSelectedFournisseur(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700"
              >
                <option value="all">Tous les fournisseurs</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>{f.Fournisseur}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Désignation & Réf.</th>
                    <th className="py-3.5 px-5">Réf. Immo (ERP)</th>
                    <th className="py-3.5 px-5">Groupe</th>
                    <th className="py-3.5 px-5">Code Série</th>
                    <th className="py-3.5 px-5">Montant HT</th>
                    <th className="py-3.5 px-5">Statut</th>
                    <th className="py-3.5 px-5">Emplacement / Bénéficiaire</th>
                    <th className="py-3.5 px-5">Fournisseur & Facture</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredMateriels.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        Aucun matériel trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredMateriels.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <div>
                            <p className="font-bold text-gray-900">{m.designation}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{m.reference}</p>
                            {(() => {
                              const mRef = (m.reference || '').trim().toUpperCase();
                              const matComps = composants.filter(c => {
                                const cRef = (c.refMateriel || c.materielReference || c.id_Materiel || '').trim().toUpperCase();
                                return c.id_Materiel === m.id || (mRef && cRef === mRef);
                              });
                              if (matComps.length === 0) return null;
                              return (
                                <div className="mt-1 flex items-center gap-1 flex-wrap">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200/80 rounded-md text-[10px] font-semibold"
                                    title={matComps.map(c => `${c.nom} (${c.capaciteValeur}${c.capaciteUnite} - Utilisation: ${c.utilisation})`).join(' | ')}
                                  >
                                    <Droplets className="w-3 h-3 text-cyan-600 shrink-0" />
                                    <span>{matComps.length} liquide{matComps.length > 1 ? 's' : ''} d'écriture</span>
                                    <span className="text-cyan-600 font-normal">
                                      ({matComps.map(c => `${c.nom.split(' ')[0]} ${c.utilisation}`).join(', ')})
                                    </span>
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          {m.ref_immo ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg font-mono text-[11px] font-bold tracking-tight shadow-2xs" title="Référence d'immobilisation ERP">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                              {m.ref_immo}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">
                              —
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          <span className="bg-gray-100 text-gray-800 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                            {getGroupName(m.id_GroupeMateriel)}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 font-mono text-[11px] text-gray-600">
                          {m.codeSerie}
                        </td>

                        <td className="py-3.5 px-5 font-black text-gray-900">
                          {(m.montantHT ?? 0).toLocaleString()} TND
                        </td>

                        <td className="py-3.5 px-5">
                          {m.statut === 'En service' && (
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">
                              En service
                            </span>
                          )}
                          {m.statut === 'En panne' && (
                            <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px]">
                              En panne
                            </span>
                          )}
                          {m.statut === 'Hors service' && (
                            <span className="text-gray-600 font-bold bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full text-[10px]">
                              Hors service
                            </span>
                          )}
                          {m.statut === 'En stock' && (
                            <span className="text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-[10px]">
                              En stock
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          {m.id_Emplacement ? (
                            <div>
                              <div className="flex items-center gap-1.5 font-medium text-gray-800">
                                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <span>{getLocationName(m.id_Emplacement)}</span>
                              </div>
                              {m.id_Beneficiaire ? (
                                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                  <User className="w-3 h-3 text-emerald-600" />
                                  <span>{getUserName(m.id_Beneficiaire)}</span>
                                </p>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 font-semibold px-1.5 py-0.5 rounded border border-amber-200 mt-0.5">
                                  Non assigné (Sur site)
                                </span>
                              )}
                            </div>
                          ) : m.id_Beneficiaire ? (
                            <div>
                              <p className="font-medium text-gray-800 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                                <span>{getUserName(m.id_Beneficiaire)}</span>
                              </p>
                              <p className="text-[10px] text-gray-400">Attribution directe</p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-lg text-[11px] font-bold">
                              <Package className="w-3.5 h-3.5 text-blue-600" />
                              <span>En réserve générale</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          <p className="font-medium text-gray-800">{getSupplierName(m.id_Fournisseur)}</p>
                          <p className="text-[10px] text-blue-600 font-mono">{getInvoiceCode(m.id_Facture)}</p>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          {isDSIAdmin ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditMat(m)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRequestDeleteMat(m)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setPageAlert({
                                  type: 'info',
                                  message: `Pour signaler un problème sur ce matériel (${m.designation}), rendez-vous dans l'onglet "Mes Réclamations" pour créer un ticket.`
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border border-red-200/60"
                              title="Signaler un incident"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Signaler un problème</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GROUPES MATERIEL */}
      {activeTab === 'groupes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {groupes.map((g) => {
            const count = materiels.filter(m => m.id_GroupeMateriel === g.id).length;
            const sumVal = materiels
              .filter(m => m.id_GroupeMateriel === g.id)
              .reduce((acc, curr) => acc + (curr.montantHT || 0), 0);

            return (
              <div key={g.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Groupe Matériel
                    </span>
                    <h3 className="font-black text-gray-900 text-lg mt-2">{g.Groupe}</h3>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {g.codeSerieObligatoire ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-md font-semibold text-[10px]" title="Le code série est obligatoire pour les matériels de ce groupe">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          Code série obligatoire
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium text-[10px]" title="Le code série est optionnel pour les matériels de ce groupe">
                          Code série optionnel
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditGroup(g)}
                      className="p-1.5 text-gray-400 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRequestDeleteGroup(g)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Équipements</p>
                    <p className="font-extrabold text-gray-900">{count} matériels</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-medium">Valeur totale</p>
                    <p className="font-extrabold text-emerald-600">{sumVal.toLocaleString()} TND</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: COMPOSANTS IT & CONSOMMABLES */}
      {activeTab === 'composants' && (
        <ComposantsSection
          isDSIAdmin={isDSIAdmin}
          materiels={materiels}
          composants={composants}
          onRefresh={async () => {
            await itParkService.syncFromBackend();
          }}
        />
      )}

      {/* TAB 4: GESTIONNAIRE DES STOCKS & SYNTHÈSE GLOBALE */}
      {activeTab === 'stocks' && (
        <StocksSection
          onNavigateToComposants={() => setActiveTab('composants')}
          onNavigateToMateriels={() => setActiveTab('materiels')}
        />
      )}

      {/* Modal: Add/Edit Materiel with ALL UML attributes & relationships */}
      {isMatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-gray-900 text-lg">
                {editingMat ? "Modifier le matériel" : "Ajouter un nouveau matériel"}
              </h3>
              <button onClick={() => setIsMatModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {matModalAlert && (
              <div className="mt-4 shrink-0">
                <FormAlert
                  type={matModalAlert.type}
                  message={matModalAlert.message}
                  onClose={() => setMatModalAlert(null)}
                />
              </div>
            )}

            <form noValidate onSubmit={handleSaveMat} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-0.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Référence interne (Modèle partagé)
                  </label>
                  <input
                    type="text"
                    value={matForm.reference}
                    onChange={(e) => setMatForm({ ...matForm, reference: e.target.value.toUpperCase() })}
                    placeholder="ex: HP-M404"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase font-bold text-gray-900 focus:bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Non unique : plusieurs imprimantes du même modèle peuvent partager cette référence.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Réf. Immo ERP</span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">ERP externe</span>
                  </label>
                  <input
                    type="text"
                    value={matForm.ref_immo}
                    onChange={(e) => setMatForm({ ...matForm, ref_immo: e.target.value })}
                    placeholder="ex: IMM-2025-0042"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Désignation</label>
                  <input
                    type="text"
                    value={matForm.designation}
                    onChange={(e) => setMatForm({ ...matForm, designation: e.target.value })}
                    placeholder="ex: MacBook Pro 16"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Groupe Matériel</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingQuickGroup(!isCreatingQuickGroup)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                    >
                      {isCreatingQuickGroup ? 'Annuler' : '+ Nouveau'}
                    </button>
                  </label>
                  <select
                    value={isCreatingQuickGroup ? '__custom_new__' : matForm.id_GroupeMateriel}
                    onChange={(e) => {
                      if (e.target.value === '__custom_new__') {
                        setIsCreatingQuickGroup(true);
                      } else {
                        setIsCreatingQuickGroup(false);
                        const selectedG = groupes.find(g => g.id === e.target.value);
                        const isPrn = selectedG ? ((selectedG.Groupe || (selectedG as any).nom || '').toLowerCase().includes('imprim')) : false;
                        setMatForm(prev => ({
                          ...prev,
                          id_GroupeMateriel: e.target.value,
                          isImprimante: isPrn ? true : prev.isImprimante,
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 focus:bg-white cursor-pointer"
                  >
                    {groupes.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.Groupe} {g.codeSerieObligatoire ? '(Code série requis)' : ''}
                      </option>
                    ))}
                    <option value="__custom_new__" className="text-blue-600 font-bold bg-blue-50">
                      + Autre (Créer un nouveau groupe)...
                    </option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Numéro de Série (Unique par machine)</span>
                      {(() => {
                        const curGroup = groupes.find(g => g.id === matForm.id_GroupeMateriel);
                        return curGroup?.codeSerieObligatoire ? (
                          <span className="text-red-500 font-black">(*)</span>
                        ) : (
                          <span className="text-gray-400 font-normal text-[10px]">(Optionnel)</span>
                        );
                      })()}
                    </span>
                    {(() => {
                      const curGroup = groupes.find(g => g.id === matForm.id_GroupeMateriel);
                      if (curGroup?.codeSerieObligatoire) {
                        return (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                            Obligatoire pour « {curGroup.Groupe} »
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </label>
                  <input
                    type="text"
                    value={matForm.codeSerie}
                    onChange={(e) => setMatForm({ ...matForm, codeSerie: e.target.value })}
                    placeholder={
                      groupes.find(g => g.id === matForm.id_GroupeMateriel)?.codeSerieObligatoire
                        ? "ex: SN-HP-998822 (Numéro unique requis)"
                        : "ex: SN-HP-998822 (Numéro unique pour distinguer cette machine)"
                    }
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-gray-900 ${
                      groupes.find(g => g.id === matForm.id_GroupeMateriel)?.codeSerieObligatoire && !matForm.codeSerie.trim()
                        ? 'bg-amber-50/40 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                        : 'bg-gray-50 border border-gray-200 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Inline Quick Group Creator Card */}
              {isCreatingQuickGroup && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span>Créer un nouveau Groupe de Matériel</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingQuickGroup(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nom du nouveau groupe (ex: Tablettes, Drones...)"
                      value={quickGroupName}
                      onChange={(e) => setQuickGroupName(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <label className="flex items-center gap-2 text-xs text-blue-900 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickGroupCodeSerie}
                        onChange={(e) => setQuickGroupCodeSerie(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Code série obligatoire pour ce groupe</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingQuickGroup(false)}
                      className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200/60 rounded-lg cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={isSavingQuickGroup || !quickGroupName.trim()}
                      onClick={handleSaveQuickGroup}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingQuickGroup ? 'Enregistrement...' : 'Créer et sélectionner'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Statut</label>
                  <select
                    value={matForm.statut}
                    onChange={(e) => setMatForm({ ...matForm, statut: e.target.value as StatutMateriel })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white"
                  >
                    <option value="En service">En service</option>
                    <option value="En panne">En panne</option>
                    <option value="Hors service">Hors service</option>
                    <option value="En stock">En stock</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Qté</label>
                  <input
                    type="number"
                    min={1}
                    value={matForm.qte}
                    onChange={(e) => setMatForm({ ...matForm, qte: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Montant HT (TND)</label>
                  <input
                    type="number"
                    value={matForm.montantHT}
                    onChange={(e) => setMatForm({ ...matForm, montantHT: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Garantie</label>
                  <input
                    type="text"
                    value={matForm.garantie}
                    onChange={(e) => setMatForm({ ...matForm, garantie: e.target.value })}
                    placeholder="ex: 24 mois"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Fournisseur</span>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-md">Avec factures ({suppliersWithInvoices.length})</span>
                  </label>
                  <select
                    value={matForm.id_Fournisseur}
                    onChange={(e) => handleFournisseurChange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 focus:bg-white cursor-pointer"
                  >
                    <option value="">-- Sélectionnez un fournisseur --</option>
                    {suppliersWithInvoices.map(f => {
                      const count = factures.filter(inv => inv.id_Fournisseur === f.id).length;
                      return (
                        <option key={f.id} value={f.id}>
                          {f.Fournisseur} ({count} facture{count > 1 ? 's' : ''})
                        </option>
                      );
                    })}
                  </select>
                  {suppliersWithInvoices.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">Aucun fournisseur avec facture trouvé.</p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Facture d'achat</span>
                    {matForm.id_Fournisseur && (
                      <span className="text-[10px] text-gray-500 font-medium">{invoicesForSelectedSupplier.length} facture(s)</span>
                    )}
                  </label>
                  <select
                    disabled={!matForm.id_Fournisseur}
                    value={matForm.id_Facture}
                    onChange={(e) => setMatForm({ ...matForm, id_Facture: e.target.value })}
                    className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono focus:bg-white ${
                      !matForm.id_Fournisseur ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {!matForm.id_Fournisseur ? (
                      <option value="">-- Sélectionnez un fournisseur d'abord --</option>
                    ) : invoicesForSelectedSupplier.length === 0 ? (
                      <option value="">-- Aucune facture pour ce fournisseur --</option>
                    ) : (
                      invoicesForSelectedSupplier.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.factureFrs} ({f.dateAcquisition}) - {f.montantHT} TND [{f.statut || 'Enregistrée'}]
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                <div>
                  <label className="font-bold text-gray-800 mb-1 flex items-center justify-between">
                    <span>Type d'affectation</span>
                    {matForm.typeAffectation === 'non_affecte' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        📦 Matériel en stock
                      </span>
                    )}
                  </label>
                  <select
                    value={matForm.typeAffectation}
                    onChange={(e) => handleTypeAffectationChange(e.target.value as 'non_affecte' | 'personnel' | 'emplacement')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-black cursor-pointer"
                  >
                    <option value="non_affecte">Pas affecté (En stock / Réserve)</option>
                    <option value="emplacement">Avec emplacement (Attribué à un bureau / local)</option>
                    <option value="personnel">Personnel (Attribué directement à un collaborateur)</option>
                  </select>
                </div>

                {matForm.typeAffectation === 'non_affecte' && (
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-blue-900">Équipement non affecté (En stock / Réserve)</h5>
                      <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                        Le matériel reste dans la réserve avec le statut <strong>"En stock"</strong>. Dès qu'il sera affecté à un collaborateur (depuis cette fiche ou depuis l'espace <em>Gestion Utilisateurs & Employés</em>), il sera automatiquement décompté du stock disponible (<strong>Stock = Stock - 1</strong>).
                      </p>
                    </div>
                  </div>
                )}

                {matForm.typeAffectation === 'personnel' && (
                  <div>
                    <label className="font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Bénéficiaire (Personnel)</span>
                    </label>
                    <select
                      value={matForm.id_Beneficiaire}
                      onChange={(e) => setMatForm({ ...matForm, id_Beneficiaire: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900 focus:ring-2 focus:ring-black cursor-pointer"
                    >
                      <option value="">-- Sélectionnez un bénéficiaire --</option>
                      {beneficiaires.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.beneficiaire} ({b.role})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Le matériel sera affecté directement à la personne. L'emplacement reste vide.
                    </p>
                  </div>
                )}

                {matForm.typeAffectation === 'emplacement' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-red-500" />
                            <span>Emplacement</span>
                          </span>
                          <span className="text-[10px] font-medium text-gray-500">
                            {emplacements.length} disponible(s)
                          </span>
                        </label>
                        <select
                          value={matForm.id_Emplacement}
                          onChange={(e) => handleEmplacementChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900 focus:ring-2 focus:ring-black cursor-pointer"
                        >
                          <option value="">-- Sélectionnez un emplacement --</option>
                          {emplacements.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.emplacement1} - {e.emplacement2}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-gray-700 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-emerald-600" />
                            <span>Bénéficiaire (Optionnel)</span>
                          </span>
                          {matForm.id_Emplacement && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              locationBeneficiaires.length > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {locationBeneficiaires.length > 0
                                ? `${locationBeneficiaires.length} employé(s)`
                                : 'Emplacement sans employé'}
                            </span>
                          )}
                        </label>
                        <select
                          disabled={!matForm.id_Emplacement}
                          value={matForm.id_Beneficiaire}
                          onChange={(e) => setMatForm({ ...matForm, id_Beneficiaire: e.target.value })}
                          className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900 focus:ring-2 focus:ring-black ${
                            !matForm.id_Emplacement ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
                          }`}
                        >
                          {!matForm.id_Emplacement ? (
                            <option value="">-- Sélectionnez un emplacement d'abord --</option>
                          ) : (
                            <>
                              <option value="">-- Aucun bénéficiaire (Matériel non assigné sur cet emplacement) --</option>
                              {locationBeneficiaires.map(b => (
                                <option key={b.id} value={b.id}>
                                  👤 {b.beneficiaire} ({b.role})
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {matForm.id_Emplacement && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        !matForm.id_Beneficiaire 
                          ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      }`}>
                        {!matForm.id_Beneficiaire ? (
                          <>
                            <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Matériel en réserve sur l'emplacement</p>
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                Ce matériel sera assigné à l'emplacement choisi sans bénéficiaire attitré. Vous pourrez l'affecter ultérieurement à un collaborateur de ce bureau depuis la gestion des utilisateurs.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Matériel affecté au collaborateur</p>
                              <p className="text-[11px] text-emerald-700 mt-0.5">
                                Le matériel est affecté à {locationBeneficiaires.find(b => b.id === matForm.id_Beneficiaire)?.beneficiaire || 'ce collaborateur'} sur cet emplacement.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Question: Est-ce que c'est une imprimante ? */}
              <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/90 flex items-center justify-between gap-4 transition-colors hover:bg-purple-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    matForm.isImprimante ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-purple-600 border border-purple-200'
                  }`}>
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <label htmlFor="checkbox-is-imprimante" className="font-bold text-sm text-gray-900 cursor-pointer flex items-center gap-2">
                      Est-ce que c'est une imprimante ?
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Cochez cette option si ce matériel est une imprimante ou un copieur afin d'activer et de gérer ses liquides d'écriture (consommables).
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="checkbox-is-imprimante"
                    type="checkbox"
                    checked={matForm.isImprimante}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setMatForm(prev => ({ ...prev, isImprimante: checked }));
                      if (!checked) {
                        setFormComposants([]);
                      } else if (formComposants.length === 0) {
                        handleAddFormComposant();
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* SECTION: Liquides d'écriture (Affichée UNIQUEMENT si Est-ce que c'est une imprimante est cochée) */}
              {matForm.isImprimante && (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-purple-100 text-purple-700 rounded-xl mt-0.5 shrink-0">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-xs">
                            Liquides d'écriture de l'imprimante
                          </h4>
                          {formComposants.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                              {formComposants.length} liquide{formComposants.length > 1 ? 's' : ''} d'écriture
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Les liquides sont reliés au modèle de cette imprimante (référence <strong>{matForm.reference || 'REF'}</strong>).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleAddFormComposant}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
                        title="Ajouter un liquide d'écriture pour cette imprimante"
                      >
                        <Plus className="w-3.5 h-3.5 text-purple-600" />
                        <span>+ Ajouter liquide</span>
                      </button>
                    </div>
                  </div>

                  {/* Empty State: 0 components */}
                  {formComposants.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-gray-300 text-center space-y-2">
                      <div className="mx-auto w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">Aucun liquide d'écriture associé</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 max-w-md mx-auto">
                          Cette imprimante n'a pas encore de liquide d'écriture. Cliquez sur le bouton ci-dessous pour lui en affecter un.
                        </p>
                      </div>
                      <div className="pt-1 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddFormComposant}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-purple-600" />
                          <span>Associer un liquide d'écriture</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formComposants.map((comp, idx) => {
                        const isStock = comp.utilisation === '0%';
                        const percentNum = parseInt(comp.utilisation.replace('%', ''), 10) || 0;
                        const remainPercent = 100 - percentNum;

                        return (
                          <div key={idx} className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="font-bold text-gray-800 text-xs">
                                  {comp.nom || `Liquide #${idx + 1}`}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  [{comp.REF_composant}]
                                </span>
                                {isStock ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    En stock disponible (0%)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    <Droplets className="w-3 h-3" />
                                    Consommé à {comp.utilisation} (Sorti du stock)
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFormComposant(idx)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer ce liquide d'écriture"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                  Réf. Liquide <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={comp.REF_composant}
                                  onChange={(e) => handleUpdateFormComposant(idx, { REF_composant: e.target.value.toUpperCase() })}
                                  placeholder="ex: LIQ-BK-001"
                                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono uppercase font-medium focus:bg-white focus:ring-1 focus:ring-black"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                  Nom / Désignation <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={comp.nom}
                                  onChange={(e) => handleUpdateFormComposant(idx, { nom: e.target.value })}
                                  placeholder="ex: Liquide d'écriture Noir"
                                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-1 focus:ring-black"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                Taux d'utilisation / Consommation
                              </label>
                              <select
                                value={comp.utilisation}
                                onChange={(e) => handleUpdateFormComposant(idx, { utilisation: e.target.value as any })}
                                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:bg-white cursor-pointer"
                              >
                                <option value="0%">0% (Neuf - En stock)</option>
                                <option value="25%">25% (Entamé - 1/4 utilisé)</option>
                                <option value="50%">50% (À moitié consommé)</option>
                                <option value="75%">75% (Presque vide - 3/4 utilisé)</option>
                                <option value="100%">100% (Épuisé / Vide)</option>
                              </select>
                            </div>

                            {/* Visual Consumption Gauge */}
                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1 text-[11px]">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="flex items-center gap-1 text-gray-600">
                                  <Droplets className="w-3.5 h-3.5 text-indigo-500" />
                                  Niveau restant de consommable :
                                </span>
                                <span className={`font-mono font-bold ${remainPercent > 50 ? 'text-emerald-700' : remainPercent > 20 ? 'text-amber-700' : 'text-red-600'}`}>
                                  {remainPercent}% restant
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    remainPercent > 50 ? 'bg-emerald-500' : remainPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${remainPercent}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {isStock
                                  ? '✨ Non entamé (0%) : comptabilisé comme disponible en stock.'
                                  : `⚠️ Utilisé à ${comp.utilisation} : ce liquide n'est plus en stock disponible (Stock = Stock - 1).`}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddFormComposant}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-purple-600" />
                          <span>+ Ajouter un autre liquide d'écriture</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMatModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-white bg-[#0c1017] hover:bg-black font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le matériel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit GroupeMateriel */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-gray-900 text-base">
                {editingGroup ? "Modifier le Groupe" : "Nouveau Groupe Matériel"}
              </h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {groupModalAlert && (
              <div className="mt-4 shrink-0">
                <FormAlert
                  type={groupModalAlert.type}
                  message={groupModalAlert.message}
                  onClose={() => setGroupModalAlert(null)}
                />
              </div>
            )}

            <form noValidate onSubmit={handleSaveGroup} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-0.5">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nom du Groupe</label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="ex: Ordinateurs, Serveurs, Rétroprojecteurs"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white"
                />
              </div>

              {/* Option: Code Série Obligatoire */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={codeSerieObligatoireInput}
                    onChange={(e) => setCodeSerieObligatoireInput(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-gray-800 block">
                      Code série obligatoire
                    </span>
                    <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                      Cocher cette option pour rendre la saisie du code série obligatoire lors de l'ajout ou la modification d'un matériel de ce groupe.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-white bg-[#0c1017] hover:bg-black font-bold disabled:opacity-50 cursor-pointer text-center"
                >
                  {isSaving ? 'Validation...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Custom Confirm */}
      <CustomConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        subtitle={confirmModalConfig.subtitle}
        type={confirmModalConfig.type}
        message={confirmModalConfig.message}
        impacts={confirmModalConfig.impacts}
        itemsListTitle={confirmModalConfig.itemsListTitle}
        itemsList={confirmModalConfig.itemsList}
        confirmText={confirmModalConfig.confirmText}
        cancelText={confirmModalConfig.cancelText}
        isLoading={isConfirmLoading}
        isBlocked={confirmModalConfig.isBlocked}
      />
      </div>
    </div>
  );
};
