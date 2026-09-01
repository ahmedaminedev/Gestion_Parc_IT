import {
  GroupeMateriel,
  Fournisseur,
  Facture,
  GroupeEmplacement,
  Emplacement,
  Beneficiaire,
  Materiel,
  DashboardStats,
  Role,
  Reclamation,
  EmailLog,
} from '../types/itPark';
import { authService } from './authService';

class ITParkService {
  private roles: Role[] = [];
  private groupesMateriel: GroupeMateriel[] = [];
  private fournisseurs: Fournisseur[] = [];
  private factures: Facture[] = [];
  private groupesEmplacement: GroupeEmplacement[] = [];
  private emplacements: Emplacement[] = [];
  private beneficiaires: Beneficiaire[] = [];
  private materiels: Materiel[] = [];
  private reclamations: Reclamation[] = [];
  private emailLogs: EmailLog[] = [];
  private dashboardStats: DashboardStats | null = null;
  private listeners: (() => void)[] = [];
  private isLoading: boolean = false;
  private isBackendConnected: boolean = false;

  constructor() {
    // Subscribe to auth state changes
    authService.subscribe(() => {
      if (authService.isAuthenticated()) {
        this.syncFromBackend();
      } else {
        this.clearLocalData();
      }
    });

    if (authService.isAuthenticated()) {
      this.syncFromBackend();
    }
  }

  public clearLocalData() {
    this.roles = [];
    this.groupesMateriel = [];
    this.fournisseurs = [];
    this.factures = [];
    this.groupesEmplacement = [];
    this.emplacements = [];
    this.beneficiaires = [];
    this.materiels = [];
    this.reclamations = [];
    this.emailLogs = [];
    this.dashboardStats = null;
    this.isBackendConnected = false;
    this.notify();
  }

  public getIsBackendConnected(): boolean {
    return this.isBackendConnected;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public async syncFromBackend() {
    if (!authService.isAuthenticated()) {
      this.clearLocalData();
      return;
    }
    this.isLoading = true;

    try {
      // Sync Roles directly from MongoDB
      const resRoles = await authService.fetchWithAuth('/api/roles');
      if (resRoles.ok) {
        const roles = await resRoles.json();
        if (Array.isArray(roles)) {
          this.roles = roles.map((r: any) => ({
            id: r.id || r._id,
            nom: r.nom,
            description: r.description || '',
            couleur: r.couleur || 'blue',
            isSystem: !!r.isSystem,
          }));
        }
      }

      // Sync Users directly from MongoDB
      const resUsers = await authService.fetchWithAuth('/api/users');
      if (resUsers.ok) {
        const users = await resUsers.json();
        if (Array.isArray(users)) {
          this.beneficiaires = users.map((u: any) => {
            const matchedRole = this.roles.find(r => r.id === u.id_Role) || this.roles.find(r => r.nom === u.role);
            return {
              id: u.id || u._id,
              beneficiaire: u.beneficiaire,
              email: u.email,
              id_Role: u.id_Role || (matchedRole ? matchedRole.id : ''),
              role: u.role || (matchedRole ? matchedRole.nom : 'Responsable IT'),
              statut: u.statut || 'Actif',
              id_Emplacement: u.id_Emplacement || '',
              derniereActivite: u.derniereActivite || "À l'instant",
              hasPassword: !!u.hasPassword,
              isITUser: (u.role || (matchedRole ? matchedRole.nom : '')) === 'Responsable IT' || !!u.hasPassword,
            };
          });
        }
      }

      // Sync Materiels from MongoDB
      const resMat = await authService.fetchWithAuth('/api/materiels');
      if (resMat.ok) {
        const mats = await resMat.json();
        if (Array.isArray(mats)) {
          this.materiels = mats.map((m: any) => ({
            id: m.id || m._id,
            reference: m.reference,
            ref_immo: m.ref_immo || '',
            designation: m.designation,
            codeSerie: m.codeSerie,
            qte: m.qte || 1,
            montantHT: m.montantHT || m.valeurPlafond || 0,
            valeurPlafond: m.valeurPlafond || m.montantHT || 0,
            dateEntree: m.dateEntree || m.dateMiseEnService || '',
            dateMiseEnService: m.dateEntree || m.dateMiseEnService || '',
            statut: m.statut || 'En service',
            garantie: m.garantie || '12 mois',
            id_GroupeMateriel: m.id_GroupeMateriel || '',
            id_Fournisseur: m.id_Fournisseur || '',
            id_Facture: m.id_Facture || '',
            id_Emplacement: m.id_Emplacement || '',
            id_Beneficiaire: m.id_Beneficiaire || '',
            image: m.image,
          }));
        }
      }

      // Sync Emplacements from MongoDB
      const resEmp = await authService.fetchWithAuth('/api/emplacements');
      if (resEmp.ok) {
        const emps = await resEmp.json();
        if (Array.isArray(emps)) {
          this.emplacements = emps.map((e: any) => ({
            id: e.id || e._id,
            id_GroupeEmplacement: e.id_GroupeEmplacement || '',
            emplacement1: e.emplacement1,
            emplacement2: e.emplacement2,
          }));
        }
      }

      // Sync Groupes Emplacement from MongoDB
      const resGE = await authService.fetchWithAuth('/api/groupes-emplacement');
      if (resGE.ok) {
        const ges = await resGE.json();
        if (Array.isArray(ges)) {
          this.groupesEmplacement = ges.map((g: any) => ({
            id: g.id || g._id,
            nom: g.nom,
            couleur: g.couleur || 'blue',
            icon: g.icon || 'building',
          }));
        }
      }

      // Sync Groupes Materiel from MongoDB
      const resGM = await authService.fetchWithAuth('/api/groupes-materiel');
      if (resGM.ok) {
        const gms = await resGM.json();
        if (Array.isArray(gms)) {
          this.groupesMateriel = gms.map((g: any) => ({
            id: g.id || g._id,
            Groupe: g.nom || g.Groupe || '',
            codeSerieObligatoire: !!g.codeSerieObligatoire,
          }));
        }
      }

      // Sync Factures from MongoDB
      const resFct = await authService.fetchWithAuth('/api/factures');
      if (resFct.ok) {
        const fcts = await resFct.json();
        if (Array.isArray(fcts)) {
          this.factures = fcts.map((f: any) => ({
            id: f.id || f._id,
            factureFrs: f.factureFrs,
            dateAcquisition: f.dateAcquisition,
            id_Fournisseur: f.id_Fournisseur,
            montantHT: f.montantHT,
            statut: f.statut || 'Payée',
          }));
        }
      }

      // Sync Fournisseurs from MongoDB
      const resFrs = await authService.fetchWithAuth('/api/fournisseurs');
      if (resFrs.ok) {
        const frss = await resFrs.json();
        if (Array.isArray(frss)) {
          this.fournisseurs = frss.map((f: any) => ({
            id: f.id || f._id,
            Fournisseur: f.Fournisseur,
            email: f.email,
            telephone: f.telephone,
            adresse: f.adresse,
          }));
        }
      }

      // Sync Reclamations from MongoDB
      const currentUser = authService.getUser();
      const isDSIAdmin = currentUser?.role === 'Responsable IT' || currentUser?.accesApp === 'GLOBAL_BACKOFFICE';
      const reclamationUrl = isDSIAdmin ? '/api/reclamations' : `/api/reclamations?id_Demandeur=${currentUser?.id}`;
      
      const resRec = await authService.fetchWithAuth(reclamationUrl);
      if (resRec.ok) {
        const recs = await resRec.json();
        if (Array.isArray(recs)) {
          this.reclamations = recs.map((r: any) => ({
            id: r.id || r._id,
            code: r.code,
            titre: r.titre,
            description: r.description,
            nature: r.nature || ((r.materielsConcernesIds && r.materielsConcernesIds.length > 0) ? 'materiel' : 'autre'),
            materielsConcernesIds: r.materielsConcernesIds || (r.id_MaterielConcerne ? [r.id_MaterielConcerne] : []),
            materielsConcernesNoms: r.materielsConcernesNoms || (r.materielNom ? [r.materielNom] : []),
            categoriesIds: r.categoriesIds || (r.id_GroupeMateriel ? [r.id_GroupeMateriel] : []),
            categoriesNoms: r.categoriesNoms || (r.groupeNom ? [r.groupeNom] : []),
            id_GroupeMateriel: r.id_GroupeMateriel || r.id_GroupeReclamation || '',
            id_GroupeReclamation: r.id_GroupeMateriel || r.id_GroupeReclamation || '',
            groupeNom: r.groupeNom,
            groupeCouleur: r.groupeCouleur,
            priorite: r.priorite || 'Moyenne',
            statut: r.statut || 'Ouverte',
            id_Demandeur: r.id_Demandeur,
            demandeurNom: r.demandeurNom,
            demandeurEmail: r.demandeurEmail,
            id_TechnicienAssigne: r.id_TechnicienAssigne,
            technicienNom: r.technicienNom,
            id_MaterielConcerne: r.id_MaterielConcerne,
            materielNom: r.materielNom,
            delaiTraitementHeures: r.delaiTraitementHeures,
            dateEcheanceSla: r.dateEcheanceSla,
            dateMaxResolution: r.dateMaxResolution,
            solution: r.solution,
            dateResolution: r.dateResolution,
            piecesJointes: r.piecesJointes || [],
            historique: r.historique || [],
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          }));
        }
      }

      // Sync Email Logs if DSI Admin
      if (isDSIAdmin) {
        const resLogs = await authService.fetchWithAuth('/api/emails/logs');
        if (resLogs.ok) {
          const logs = await resLogs.json();
          if (Array.isArray(logs)) {
            this.emailLogs = logs.map((l: any) => ({
              id: l.id || l._id,
              destinataireEmail: l.destinataireEmail,
              destinataireNom: l.destinataireNom,
              sujet: l.sujet,
              contenuHtml: l.contenuHtml,
              type: l.type,
              statut: l.statut,
              dateEnvoi: l.dateEnvoi,
            }));
          }
        }
      }

      // Sync Dashboard Analytics calculated directly from MongoDB
      const statsUrl = isDSIAdmin ? '/api/dashboard/stats' : `/api/dashboard/stats?id_Demandeur=${currentUser?.id}`;
      const resStats = await authService.fetchWithAuth(statsUrl);
      if (resStats.ok) {
        const stats = await resStats.json();
        this.dashboardStats = stats;
      }

      this.isBackendConnected = true;
      this.notify();
    } catch (err) {
      console.warn('Error fetching data from MongoDB backend:', err);
      this.isBackendConnected = false;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('ITParkService listener error:', e);
      }
    });
  }

  // --- GETTERS (FROM MONGODB) ---
  public getDashboardStats(): DashboardStats {
    if (this.dashboardStats) {
      return this.dashboardStats;
    }

    const totalMateriels = this.materiels.reduce((acc, m) => acc + (m.qte || 1), 0);
    const totalUsers = this.beneficiaires.length;
    const totalFacturesCount = this.factures.length;
    const totalEmplacementsCount = this.emplacements.length;
    const totalFournisseursCount = this.fournisseurs.length;
    const totalGarantiesActives = this.materiels.filter(
      (m) => m.garantie && !m.garantie.toLowerCase().includes('expir')
    ).length;

    const colors = ['#111827', '#ef4444', '#f97316', '#3b82f6', '#a855f7', '#22c55e', '#06b6d4', '#94a3b8'];
    const groupCountMap: Record<string, number> = {};
    this.materiels.forEach((m) => {
      const g = this.groupesMateriel.find((gm) => gm.id === m.id_GroupeMateriel)?.Groupe || 'Autres';
      groupCountMap[g] = (groupCountMap[g] || 0) + (m.qte || 1);
    });

    const divisor = totalMateriels > 0 ? totalMateriels : 1;
    const pieData = Object.entries(groupCountMap).map(([name, count], i) => ({
      name,
      value: count,
      percent: `${((count / divisor) * 100).toFixed(1)}%`,
      color: colors[i % colors.length],
    }));

    const countEnService = this.materiels.filter((m) => m.statut === 'En service' || !m.statut).length;
    const countEnPanne = this.materiels.filter((m) => m.statut === 'En panne').length;
    const countHorsService = this.materiels.filter((m) => m.statut === 'Hors service' || m.statut === 'En stock').length;

    const days = ['12 Mai', '13 Mai', '14 Mai', '15 Mai', '16 Mai', '17 Mai', '18 Mai'];
    const lineData = days.map((date, idx) => {
      const mults = [
        { s: 0.9, p: 0.9, h: 1.0 },
        { s: 0.92, p: 0.85, h: 0.9 },
        { s: 0.9, p: 1.05, h: 1.1 },
        { s: 1.05, p: 0.88, h: 0.8 },
        { s: 0.97, p: 1.12, h: 1.2 },
        { s: 0.95, p: 1.15, h: 1.0 },
        { s: 1.0, p: 1.0, h: 1.0 },
      ][idx];
      return {
        date,
        enService: Math.round(countEnService * mults.s),
        enPanne: Math.round(countEnPanne * mults.p),
        horsService: Math.round(countHorsService * mults.h),
      };
    });

    const recentMateriels = this.materiels.slice(0, 4).map((m) => {
      const g = this.groupesMateriel.find((gm) => gm.id === m.id_GroupeMateriel);
      return {
        id: m.id,
        designation: m.designation,
        reference: m.reference,
        ref_immo: m.ref_immo || '',
        categorie: g?.Groupe || 'Équipement',
        dateEntree: m.dateMiseEnService || '2025-05-18',
        statut: m.statut || 'En service',
      };
    });

    const recentFactures = this.factures.slice(0, 4).map((f) => {
      const frs = this.fournisseurs.find((fr) => fr.id === f.id_Fournisseur);
      return {
        id: f.id,
        factureFrs: f.factureFrs,
        fournisseurNom: frs?.Fournisseur || 'Fournisseur',
        montantHT: f.montantHT,
        montantFormatte: `${f.montantHT.toLocaleString()} TND`,
        statut: f.statut || 'Payée',
      };
    });

    const alerts = [
      {
        id: 'alt-1',
        type: 'danger' as const,
        titre: 'Matériel en panne',
        description: `${countEnPanne} matériel(s) actuellement en panne ou maintenance`,
        time: 'En direct',
      },
      {
        id: 'alt-2',
        type: 'warning' as const,
        titre: 'Garantie active',
        description: `${totalGarantiesActives} matériel(s) sous garantie`,
        time: 'Il y a 1 heure',
      },
      {
        id: 'alt-3',
        type: 'info' as const,
        titre: 'Factures enregistrées',
        description: `${totalFacturesCount} factures gérées dans MongoDB`,
        time: 'Il y a 3 heures',
      },
      {
        id: 'alt-4',
        type: 'purple' as const,
        titre: 'Mise à jour du parc',
        description: `${totalMateriels} équipements répertoriés dans MongoDB`,
        time: 'En temps réel',
      },
    ];

    const valeurTotaleParcHT = this.materiels
      .filter((m) => m.statut === 'En service' || !m.statut)
      .reduce((acc, m) => acc + ((m.valeurPlafond || 0) * (m.qte || 1)), 0);

    const materielsEnStock = this.materiels.filter((m) => m.statut === 'En stock' || !m.id_Beneficiaire).length;
    const tauxDisponibilite = totalMateriels > 0 ? Number(((countEnService / totalMateriels) * 100).toFixed(1)) : 100;
    const ticketsUrgentsOuverts = this.reclamations.filter((r) => r.priorite === 'Urgente' && r.statut !== 'Résolue').length;

    return {
      metrics: {
        totalMateriels,
        totalUsers,
        totalFacturesCount,
        totalEmplacementsCount,
        totalFournisseursCount,
        totalGarantiesActives,
        valeurTotaleParcHT,
        valeurTotaleParcFormatte: `${valeurTotaleParcHT.toLocaleString('fr-FR')} TND`,
        tauxDisponibilite,
        tauxDisponibiliteFormatte: `${tauxDisponibilite}%`,
        materielsEnStock,
        materielsEnPanneTotal: countEnPanne,
        ticketsUrgentsOuverts,
        garantiesExpirantes60Jours: totalGarantiesActives,
        mttrMoyenHeures: 4.2,
        mttrFormatte: '4.2h',
        materielsTrend: '↑ 98.5% service',
        usersTrend: '↑ 8.2% actifs',
        facturesTrend: '↑ 15.3%',
        emplacementsTrend: '↑ 4.3%',
        fournisseursTrend: '↑ 6.7%',
        garantiesTrend: '↑ 10.1%',
      },
      pieData,
      lineData,
      emplacementsStats: [],
      personnelActif: [],
      facturesStats: {
        parStatut: [
          {
            statut: 'Payée',
            count: this.factures.filter((f) => f.statut === 'Payée').length,
            montantHT: this.factures.filter((f) => f.statut === 'Payée').reduce((acc, f) => acc + (f.montantHT || 0), 0),
            montantFormatte: '0 TND',
            pourcentage: '0%',
            color: '#10b981',
          },
          {
            statut: 'En attente',
            count: this.factures.filter((f) => f.statut === 'En attente').length,
            montantHT: this.factures.filter((f) => f.statut === 'En attente').reduce((acc, f) => acc + (f.montantHT || 0), 0),
            montantFormatte: '0 TND',
            pourcentage: '0%',
            color: '#f59e0b',
          },
          {
            statut: 'En retard',
            count: this.factures.filter((f) => f.statut === 'En retard').length,
            montantHT: this.factures.filter((f) => f.statut === 'En retard').reduce((acc, f) => acc + (f.montantHT || 0), 0),
            montantFormatte: '0 TND',
            pourcentage: '0%',
            color: '#ef4444',
          },
        ],
        totalMontantHT: this.factures.reduce((acc, f) => acc + (f.montantHT || 0), 0),
        totalMontantFormatte: '0 TND',
      },
      fournisseursPannes: [],
      prioritesReclamations: [],
      activeReclamations: [],
      recentMateriels,
      recentFactures,
      alerts,
      totalCategoryCount: totalMateriels,
    };
  }

  public getGroupesMateriel(): GroupeMateriel[] {
    return [...this.groupesMateriel];
  }

  public getFournisseurs(): Fournisseur[] {
    return [...this.fournisseurs];
  }

  public getFactures(): Facture[] {
    return [...this.factures];
  }

  public getGroupesEmplacement(): GroupeEmplacement[] {
    return [...this.groupesEmplacement];
  }

  public getEmplacements(): Emplacement[] {
    return [...this.emplacements];
  }

  public getBeneficiaires(): Beneficiaire[] {
    return [...this.beneficiaires];
  }

  public getBeneficiairesByEmplacement(id_Emplacement: string): Beneficiaire[] {
    if (!id_Emplacement) return [];
    return this.beneficiaires.filter((b) => b.id_Emplacement === id_Emplacement);
  }

  public async fetchBeneficiairesByEmplacement(id_Emplacement: string): Promise<Beneficiaire[]> {
    if (!id_Emplacement) return [];
    try {
      const res = await authService.fetchWithAuth(`/api/emplacements/${id_Emplacement}/users`);
      if (res.ok) {
        const users = await res.json();
        if (Array.isArray(users)) {
          return users.map((u: any) => ({
            id: u.id || u._id,
            beneficiaire: u.beneficiaire,
            email: u.email,
            id_Role: u.id_Role || '',
            role: u.role || 'Responsable IT',
            statut: u.statut || 'Actif',
            id_Emplacement: u.id_Emplacement || id_Emplacement,
            derniereActivite: u.derniereActivite || "À l'instant",
          }));
        }
      }
    } catch (err) {
      console.warn('Erreur récupération des bénéficiaires par emplacement:', err);
    }
    return this.getBeneficiairesByEmplacement(id_Emplacement);
  }

  public getMateriels(): Materiel[] {
    return [...this.materiels];
  }

  // Obtenir uniquement les groupes de matériel ayant au moins 1 matériel affecté
  public getActiveGroupesMateriel(): GroupeMateriel[] {
    const assignedGroupIds = new Set(this.materiels.map((m) => m.id_GroupeMateriel).filter(Boolean));
    return this.groupesMateriel.filter((g) => assignedGroupIds.has(g.id));
  }

  // --- GROUPE MATERIEL CRUD ON MONGODB ---
  public async saveGroupeMateriel(groupe: Partial<GroupeMateriel> & { Groupe?: string; nom?: string }): Promise<{ success: boolean; message?: string; field?: string; data?: GroupeMateriel }> {
    try {
      const nom = (groupe.Groupe || (groupe as any).nom || '').trim();
      const payload = {
        nom,
        Groupe: nom,
        codeSerieObligatoire: !!groupe.codeSerieObligatoire,
      };
      let res: Response;
      if (groupe.id && this.groupesMateriel.some((g) => g.id === groupe.id)) {
        res = await authService.fetchWithAuth(`/api/groupes-materiel/${groupe.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await authService.fetchWithAuth('/api/groupes-materiel', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de l\'enregistrement', field: data.field };
      }
      await this.syncFromBackend();
      const createdItem: GroupeMateriel = {
        id: data.id || data._id,
        Groupe: data.nom || data.Groupe || nom,
        nom: data.nom || data.Groupe || nom,
        codeSerieObligatoire: !!data.codeSerieObligatoire,
      };
      return { success: true, data: createdItem };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async deleteGroupeMateriel(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/groupes-materiel/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  // --- FOURNISSEUR CRUD ON MONGODB ---
  public async saveFournisseur(fournisseur: Fournisseur): Promise<{ success: boolean; message?: string; field?: string }> {
    try {
      let res: Response;
      if (fournisseur.id && this.fournisseurs.some((f) => f.id === fournisseur.id)) {
        res = await authService.fetchWithAuth(`/api/fournisseurs/${fournisseur.id}`, {
          method: 'PUT',
          body: JSON.stringify(fournisseur),
        });
      } else {
        res = await authService.fetchWithAuth('/api/fournisseurs', {
          method: 'POST',
          body: JSON.stringify(fournisseur),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de l\'enregistrement', field: data.field };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async deleteFournisseur(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/fournisseurs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  // --- FACTURE CRUD ON MONGODB ---
  public async saveFacture(facture: Facture): Promise<{ success: boolean; message?: string; field?: string }> {
    try {
      let res: Response;
      if (facture.id && this.factures.some((f) => f.id === facture.id)) {
        res = await authService.fetchWithAuth(`/api/factures/${facture.id}`, {
          method: 'PUT',
          body: JSON.stringify(facture),
        });
      } else {
        res = await authService.fetchWithAuth('/api/factures', {
          method: 'POST',
          body: JSON.stringify(facture),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de l\'enregistrement', field: data.field };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async deleteFacture(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/factures/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  // --- GROUPE EMPLACEMENT CRUD ON MONGODB ---
  public async saveGroupeEmplacement(ge: GroupeEmplacement): Promise<{ success: boolean; message?: string; field?: string }> {
    try {
      let res: Response;
      if (ge.id && this.groupesEmplacement.some((g) => g.id === ge.id)) {
        res = await authService.fetchWithAuth(`/api/groupes-emplacement/${ge.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nom: ge.nom, couleur: ge.couleur, icon: ge.icon }),
        });
      } else {
        res = await authService.fetchWithAuth('/api/groupes-emplacement', {
          method: 'POST',
          body: JSON.stringify({ nom: ge.nom, couleur: ge.couleur, icon: ge.icon }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de l\'enregistrement', field: data.field };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async deleteGroupeEmplacement(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/groupes-emplacement/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  // --- EMPLACEMENT CRUD ON MONGODB ---
  public async saveEmplacement(emp: Emplacement): Promise<{ success: boolean; message?: string; field?: string }> {
    try {
      let res: Response;
      if (emp.id && this.emplacements.some((e) => e.id === emp.id)) {
        res = await authService.fetchWithAuth(`/api/emplacements/${emp.id}`, {
          method: 'PUT',
          body: JSON.stringify(emp),
        });
      } else {
        res = await authService.fetchWithAuth('/api/emplacements', {
          method: 'POST',
          body: JSON.stringify(emp),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de l\'enregistrement', field: data.field };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async deleteEmplacement(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/emplacements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public getRoles(): Role[] {
    return [...this.roles];
  }

  // --- ROLE CRUD ON MONGODB ---
  public async saveRole(role: { id?: string; nom: string; description?: string; couleur?: string }): Promise<{ success: boolean; message?: string; field?: string }> {
    try {
      if (role.id && this.roles.some((r) => r.id === role.id)) {
        const res = await authService.fetchWithAuth(`/api/roles/${role.id}`, {
          method: 'PUT',
          body: JSON.stringify(role),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message || 'Erreur lors de la modification du rôle', field: data.field };
        }
      } else {
        const res = await authService.fetchWithAuth('/api/roles', {
          method: 'POST',
          body: JSON.stringify(role),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message || 'Erreur lors de la création du rôle', field: data.field };
        }
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur serveur' };
    }
  }

  public async deleteRole(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/roles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression du rôle' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur serveur' };
    }
  }

  // --- BENEFICIAIRE (UTILISATEUR & EMPLOYÉ) CRUD ON MONGODB ---
  public async saveBeneficiaire(ben: Partial<Beneficiaire> & { id?: string; password?: string; removePassword?: boolean; hasPassword?: boolean; isUserAccount?: boolean; accesApp?: string; sendWelcomeEmail?: boolean; sendNotificationEmail?: boolean }): Promise<{ success: boolean; message?: string; field?: string }> {
    try {
      const payload: any = {
        beneficiaire: ben.beneficiaire,
        email: ben.email,
        id_Role: ben.id_Role,
        role: ben.role,
        statut: ben.statut,
        derniereActivite: ben.derniereActivite || "À l'instant",
        id_Emplacement: ben.id_Emplacement,
        password: ben.password,
        removePassword: ben.removePassword,
        hasPassword: ben.hasPassword,
        isUserAccount: ben.isUserAccount ?? ben.hasPassword,
        accesApp: ben.accesApp,
        sendWelcomeEmail: ben.sendWelcomeEmail !== undefined ? ben.sendWelcomeEmail : true,
        sendNotificationEmail: ben.sendNotificationEmail !== undefined ? ben.sendNotificationEmail : true,
      };

      if (ben.id && this.beneficiaires.some((b) => b.id === ben.id)) {
        const res = await authService.fetchWithAuth(`/api/users/${ben.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message || 'Erreur lors de la modification du collaborateur', field: data.field };
        }
      } else {
        const res = await authService.fetchWithAuth('/api/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message || 'Erreur lors de la création du collaborateur', field: data.field };
        }
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur serveur' };
    }
  }

  public async deleteBeneficiaire(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression du collaborateur' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur serveur' };
    }
  }

  public async archiveBeneficiaire(id: string): Promise<{ success: boolean; message?: string; unassignedCount?: number }> {
    try {
      const res = await authService.fetchWithAuth(`/api/users/${id}/archive`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Erreur lors de l'archivage du collaborateur" };
      }
      await this.syncFromBackend();
      return { success: true, message: data.message, unassignedCount: data.unassignedCount };
    } catch (e: any) {
      return { success: false, message: e.message || "Erreur serveur lors de l'archivage" };
    }
  }

  // --- MATERIEL CRUD ON MONGODB ---
  public async saveMateriel(mat: Materiel): Promise<{ success: boolean; message?: string; field?: string }> {
    try {
      let res: Response;
      if (mat.id && this.materiels.some((m) => m.id === mat.id)) {
        res = await authService.fetchWithAuth(`/api/materiels/${mat.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...mat,
            valeurPlafond: mat.montantHT,
            dateEntree: mat.dateMiseEnService,
          }),
        });
      } else {
        res = await authService.fetchWithAuth('/api/materiels', {
          method: 'POST',
          body: JSON.stringify({
            ...mat,
            valeurPlafond: mat.montantHT,
            dateEntree: mat.dateMiseEnService,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de l\'enregistrement', field: data.field };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async deleteMateriel(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/materiels/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  // --- RÉCLAMATIONS CRUD & SUPPORT ---
  public getReclamations(): Reclamation[] {
    return [...this.reclamations];
  }

  public async saveReclamation(rec: Partial<Reclamation>): Promise<{ success: boolean; message?: string; field?: string; data?: Reclamation }> {
    try {
      const isEdit = !!(rec.id && this.reclamations.some((r) => r.id === rec.id));
      const url = isEdit ? `/api/reclamations/${rec.id}` : '/api/reclamations';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authService.fetchWithAuth(url, {
        method,
        body: JSON.stringify(rec),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Erreur lors de l'enregistrement de la réclamation", field: data.field };
      }
      await this.syncFromBackend();
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async addReclamationComment(id: string, message: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/reclamations/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Erreur lors de l'ajout du commentaire" };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async deleteReclamation(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await authService.fetchWithAuth(`/api/reclamations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Erreur lors de la suppression de la réclamation' };
      }
      await this.syncFromBackend();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  // --- EMAIL AUDIT LOGS & SMTP ---
  public getEmailLogs(): EmailLog[] {
    return [...this.emailLogs];
  }

  public async fetchEmailLogs(): Promise<EmailLog[]> {
    try {
      const res = await authService.fetchWithAuth('/api/emails/logs');
      if (res.ok) {
        const logs = await res.json();
        if (Array.isArray(logs)) {
          this.emailLogs = logs;
          this.notify();
          return this.emailLogs;
        }
      }
    } catch (err) {
      console.warn('Erreur récupération logs emails:', err);
    }
    return this.emailLogs;
  }

  public async getSmtpStatus(): Promise<{
    configured: boolean;
    host: string;
    port: number;
    user: string;
    from: string;
    mode: string;
  }> {
    try {
      const res = await authService.fetchWithAuth('/api/emails/smtp-status');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Erreur récupération statut SMTP:', err);
    }
    return {
      configured: false,
      host: 'smtp.gmail.com',
      port: 587,
      user: 'Non configuré',
      from: 'support@omoda-jaecoo.tn',
      mode: 'Simulation locale (SMTP non configuré)',
    };
  }

  public async testSmtpConnection(recipient?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const res = await authService.fetchWithAuth('/api/emails/test-smtp', {
        method: 'POST',
        body: JSON.stringify({ recipient }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Erreur réseau ou serveur' };
    }
  }

  public async resetToDefaults() {
    await this.syncFromBackend();
  }
}

export const itParkService = new ITParkService();
