import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  Monitor,
  Smartphone,
  Printer,
  Server,
  Cpu,
  Package,
  X,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  UserX,
  Sparkles,
  Mail,
  Send,
  MapPin,
  PackagePlus,
  SlidersHorizontal,
  ArrowRight,
  Info,
  Archive,
  Crown
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import { authService } from '../../services/authService';
import { Beneficiaire, Emplacement, Materiel, GroupeMateriel, Role, normalizeRoleName } from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';
import { CustomConfirmModal, ConfirmModalItem } from '../common/CustomConfirmModal';

type ActiveTab = 'roles' | 'users' | 'employees';

export const UsersPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState(authService.getUser());

  useEffect(() => {
    const unsub = authService.subscribe(() => {
      setCurrentUser(authService.getUser());
    });
    return unsub;
  }, []);

  const isCurrentUserSuperAdmin = Boolean(currentUser?.isSuperAdmin || authService.isSuperAdmin());

  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>(itParkService.getBeneficiaires());
  const [roles, setRoles] = useState<Role[]>(itParkService.getRoles());
  const [emplacements, setEmplacements] = useState<Emplacement[]>(itParkService.getEmplacements());
  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());
  const [groupesMateriel, setGroupesMateriel] = useState<GroupeMateriel[]>(itParkService.getGroupesMateriel());

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  const [emplacementFilter, setEmplacementFilter] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isEmailPreviewModalOpen, setIsEmailPreviewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [accessTargetEmployee, setAccessTargetEmployee] = useState<Beneficiaire | null>(null);

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
  const [isConfirmActionLoading, setIsConfirmActionLoading] = useState(false);

  // Error Alert Modal & Inline Form Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userModalAlert, setUserModalAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [accessModalAlert, setAccessModalAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [roleModalAlert, setRoleModalAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Form States
  const [userFormData, setUserFormData] = useState({
    beneficiaire: '',
    email: '',
    role: 'Responsable IT',
    grantAccess: true,
    accesApp: 'GLOBAL_BACKOFFICE' as 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS' | 'NONE',
    password: '',
    statut: 'Actif' as 'Actif' | 'Inactif',
    id_Emplacement: '',
    sendWelcomeEmail: true,
  });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState<string | null>(null);
  const [copiedGeneratedPwd, setCopiedGeneratedPwd] = useState(false);

  // Access Modal Form Data
  const [accessFormData, setAccessFormData] = useState({
    accesApp: 'ESPACE_RECLAMATIONS' as 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS',
    password: '',
    sendWelcomeEmail: true,
  });
  const [showAccessPassword, setShowAccessPassword] = useState(false);

  const [roleFormData, setRoleFormData] = useState({
    nom: '',
    description: '',
    couleur: 'blue',
  });

  // Modal State for Hardware Assignment from Stock
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [hardwareTargetUser, setHardwareTargetUser] = useState<Beneficiaire | null>(null);
  const [hardwareModalAlert, setHardwareModalAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [selectedStockMatId, setSelectedStockMatId] = useState<string>('');
  const [isAssigningHardware, setIsAssigningHardware] = useState(false);
  const [hardwareSearchTerm, setHardwareSearchTerm] = useState('');

  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean; mode: string } | null>(null);

  useEffect(() => {
    // Initial sync with backend
    itParkService.syncFromBackend().then(() => {
      setBeneficiaires(itParkService.getBeneficiaires());
      setRoles(itParkService.getRoles());
      setEmplacements(itParkService.getEmplacements());
      setMateriels(itParkService.getMateriels());
      setGroupesMateriel(itParkService.getGroupesMateriel());
    });

    itParkService.getSmtpStatus().then(status => {
      setSmtpStatus(status);
    });

    const unsub = itParkService.subscribe(() => {
      setBeneficiaires(itParkService.getBeneficiaires());
      setRoles(itParkService.getRoles());
      setEmplacements(itParkService.getEmplacements());
      setMateriels(itParkService.getMateriels());
      setGroupesMateriel(itParkService.getGroupesMateriel());
    });
    return unsub;
  }, []);

  // Generate a random secure password
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = 'Omoda' + new Date().getFullYear().toString().slice(-2) + '!';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleApplyGeneratedPasswordToAccess = () => {
    const pwd = generateSecurePassword();
    setAccessFormData(prev => ({ ...prev, password: pwd }));
    setShowAccessPassword(true);
    setCopiedGeneratedPwd(true);
    navigator.clipboard.writeText(pwd);
    setTimeout(() => setCopiedGeneratedPwd(false), 2500);
  };

  // Compute lists for each section: users with login account vs all employees
  const itUsersList = beneficiaires.filter(u => u.hasPassword || u.isITUser || normalizeRoleName(u.role) === normalizeRoleName('Responsable IT'));
  const employeesList = beneficiaires; // All employees & users can have hardware assigned

  // Compute Metrics
  const totalITUsers = itUsersList.length;
  const totalEmployees = beneficiaires.length;
  const totalRolesCount = roles.length;

  // Helper to get location name
  const getLocationName = (id_Emplacement?: string) => {
    if (!id_Emplacement) return 'Non assigné';
    const emp = emplacements.find(e => e.id === id_Emplacement);
    if (!emp) return 'Non assigné';
    return emp.emplacement2 ? `${emp.emplacement1} (${emp.emplacement2})` : emp.emplacement1;
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper for assigned materials
  const getUserMaterials = (userId: string) => {
    return materiels.filter(m => m.id_Beneficiaire === userId);
  };

  // Helper for material category icon
  const getMaterialIcon = (mat: Materiel) => {
    const g = (groupesMateriel.find(gm => gm.id === mat.id_GroupeMateriel)?.Groupe || '').toLowerCase();
    const des = (mat.designation || '').toLowerCase();
    const combined = `${des} ${g}`;
    if (combined.includes('mac') || combined.includes('ordinateur') || combined.includes('laptop') || combined.includes('pc')) return Laptop;
    if (combined.includes('écran') || combined.includes('moniteur') || combined.includes('display')) return Monitor;
    if (combined.includes('téléphone') || combined.includes('iphone') || combined.includes('smartphone')) return Smartphone;
    if (combined.includes('imprimante') || combined.includes('laserjet') || combined.includes('print')) return Printer;
    if (combined.includes('serveur') || combined.includes('server') || combined.includes('poweredge')) return Server;
    if (combined.includes('switch') || combined.includes('cisco') || combined.includes('réseau')) return Cpu;
    return Package;
  };

  // Helper to get color classes for roles
  const getRoleBadgeClasses = (roleName: string) => {
    if (normalizeRoleName(roleName) === normalizeRoleName('Responsable IT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    const roleObj = roles.find(r => normalizeRoleName(r.nom) === normalizeRoleName(roleName));
    const c = roleObj?.couleur || 'blue';
    switch (c) {
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cyan': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'teal': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'orange': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // --- ACTIONS: USER WITH ACCOUNT MODAL ---
  const handleOpenAddUserModal = () => {
    setEditingItem(null);
    setUserModalAlert(null);
    setUserFormData({
      beneficiaire: '',
      email: '',
      role: 'Responsable IT',
      grantAccess: true,
      accesApp: 'GLOBAL_BACKOFFICE',
      password: '',
      statut: 'Actif',
      id_Emplacement: emplacements[0]?.id || '',
      sendWelcomeEmail: true,
    });
    setShowUserPassword(false);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (user: Beneficiaire) => {
    setEditingItem(user);
    setUserModalAlert(null);
    const isIT = normalizeRoleName(user.role) === normalizeRoleName('Responsable IT');
    const hasAccount = Boolean(user.hasPassword || user.isITUser || user.isUserAccount || (user.accesApp && user.accesApp !== 'NONE'));
    const safeAcces: 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS' | 'NONE' = isIT
      ? 'GLOBAL_BACKOFFICE'
      : (hasAccount && user.accesApp !== 'NONE' ? 'ESPACE_RECLAMATIONS' : 'NONE');

    setUserFormData({
      beneficiaire: user.beneficiaire,
      email: user.email,
      role: user.role || 'Responsable IT',
      grantAccess: isIT ? true : (hasAccount && user.accesApp !== 'NONE'),
      accesApp: safeAcces,
      password: '',
      statut: user.statut || 'Actif',
      id_Emplacement: user.id_Emplacement || '',
      sendWelcomeEmail: false,
    });
    setShowUserPassword(false);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalAlert(null);
    const cleanEmail = userFormData.email.trim();
    const isIT = normalizeRoleName(userFormData.role) === normalizeRoleName('Responsable IT');
    const willGrantAccess = isIT ? true : userFormData.grantAccess;

    if (willGrantAccess && userFormData.password && userFormData.password.trim().length > 0) {
      const pwd = userFormData.password.trim();
      if (pwd.length < 8 || !/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
        setUserModalAlert({
          type: 'error',
          message: 'Le mot de passe doit comporter au moins 8 caractères et contenir au moins une lettre et un chiffre.',
        });
        return;
      }
    }

    let finalPassword = userFormData.password ? userFormData.password.trim() : '';
    if (!editingItem && willGrantAccess && !finalPassword) {
      finalPassword = generateSecurePassword();
    }

    const payload: Partial<Beneficiaire> & { id?: string; password?: string; removePassword?: boolean; hasPassword?: boolean; isUserAccount?: boolean; accesApp?: string; sendWelcomeEmail?: boolean } = {
      id: editingItem ? editingItem.id : undefined,
      beneficiaire: userFormData.beneficiaire.trim(),
      email: cleanEmail,
      role: userFormData.role || (isIT ? 'Responsable IT' : 'Commercial'),
      accesApp: isIT ? 'GLOBAL_BACKOFFICE' : (willGrantAccess ? 'ESPACE_RECLAMATIONS' : 'NONE'),
      statut: userFormData.statut,
      id_Emplacement: userFormData.id_Emplacement,
      password: willGrantAccess ? (finalPassword || undefined) : undefined,
      removePassword: !willGrantAccess && editingItem ? true : undefined,
      hasPassword: willGrantAccess,
      isUserAccount: willGrantAccess,
      sendWelcomeEmail: willGrantAccess ? userFormData.sendWelcomeEmail : false,
      derniereActivite: editingItem ? editingItem.derniereActivite : "À l'instant",
    };

    const res = await itParkService.saveBeneficiaire(payload);
    if (!res.success) {
      setUserModalAlert({
        type: 'error',
        message: res.message || "Erreur lors de l'enregistrement de l'utilisateur.",
      });
      return;
    }

    setIsUserModalOpen(false);
  };

  // --- ACTIONS: DEDICATED ACCESS GRANTING MODAL (QUICK POPUP FOR MANAGER) ---
  const handleOpenAccessModal = (emp: Beneficiaire) => {
    setAccessTargetEmployee(emp);
    setAccessModalAlert(null);
    const isIT = normalizeRoleName(emp.role) === normalizeRoleName('Responsable IT');
    const safeAcces: 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS' = isIT
      ? (emp.accesApp === 'ESPACE_RECLAMATIONS' ? 'ESPACE_RECLAMATIONS' : 'GLOBAL_BACKOFFICE')
      : 'ESPACE_RECLAMATIONS';

    setAccessFormData({
      accesApp: safeAcces,
      password: '',
      sendWelcomeEmail: true,
    });
    setShowAccessPassword(false);
    setIsAccessModalOpen(true);
  };

  const handleSaveGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessTargetEmployee) return;
    setAccessModalAlert(null);

    const isIT = normalizeRoleName(accessTargetEmployee.role) === normalizeRoleName('Responsable IT');

    let pwd = accessFormData.password.trim();
    if (!pwd && !accessTargetEmployee.hasPassword) {
      // Generate default secure password if empty
      pwd = generateSecurePassword();
    }

    if (pwd && pwd.length > 0) {
      if (pwd.length < 8 || !/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
        setAccessModalAlert({
          type: 'error',
          message: 'Le mot de passe doit comporter au moins 8 caractères et contenir au moins une lettre et un chiffre.',
        });
        return;
      }
    }

    const payload: Partial<Beneficiaire> & { id?: string; password?: string; hasPassword?: boolean; isUserAccount?: boolean; accesApp?: string; sendWelcomeEmail?: boolean } = {
      id: accessTargetEmployee.id,
      beneficiaire: accessTargetEmployee.beneficiaire,
      email: accessTargetEmployee.email,
      role: accessTargetEmployee.role,
      statut: accessTargetEmployee.statut || 'Actif',
      id_Emplacement: accessTargetEmployee.id_Emplacement,
      isUserAccount: true,
      hasPassword: true,
      accesApp: isIT ? accessFormData.accesApp : 'ESPACE_RECLAMATIONS',
      password: pwd || undefined,
      sendWelcomeEmail: accessFormData.sendWelcomeEmail,
    };

    const res = await itParkService.saveBeneficiaire(payload);
    if (!res.success) {
      setAccessModalAlert({
        type: 'error',
        message: res.message || "Erreur lors de l'activation des accès.",
      });
      return;
    }

    setIsAccessModalOpen(false);
  };

  const handleRequestRevokeAccess = (emp: Beneficiaire) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Révoquer l\'accès utilisateur ?',
      subtitle: `${emp.beneficiaire} (${emp.email})`,
      type: 'warning',
      message: `Êtes-vous sûr de vouloir révoquer l'accès applicatif de "${emp.beneficiaire}" ?`,
      impacts: [
        'Le collaborateur ne pourra plus se connecter aux interfaces de réclamations.',
        'Ses identifiants et mot de passe de connexion seront révoqués.',
        'Il restera enregistré comme collaborateur dans l\'annuaire.',
      ],
      confirmText: 'Révoquer l\'accès',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setIsConfirmActionLoading(true);
        const res = await itParkService.saveBeneficiaire({
          id: emp.id,
          beneficiaire: emp.beneficiaire,
          email: emp.email,
          role: emp.role,
          statut: emp.statut,
          id_Emplacement: emp.id_Emplacement,
          isUserAccount: false,
          hasPassword: false,
          removePassword: true,
          accesApp: 'NONE',
        });
        setIsConfirmActionLoading(false);
        if (!res.success) {
          setErrorMessage(res.message || "Impossible de révoquer l'accès.");
        } else {
          setIsAccessModalOpen(false);
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleResendWelcomeEmail = async (user: Beneficiaire) => {
    setEmailSendingStatus(`Envoi en cours à ${user.email}...`);
    const tempPassword = generateSecurePassword();
    const res = await itParkService.resendWelcomeEmail({
      email: user.email,
      beneficiaire: user.beneficiaire,
      tempPassword,
      role: user.role,
      accesApp: user.accesApp || 'ESPACE_RECLAMATIONS',
    });
    if (res.success) {
      setEmailSendingStatus(`✅ Identifiants envoyés à ${user.email} (Mot de passe temporaire : ${tempPassword})`);
      setTimeout(() => setEmailSendingStatus(null), 8000);
    } else {
      setEmailSendingStatus(`❌ Erreur : ${res.message}`);
      setTimeout(() => setEmailSendingStatus(null), 6000);
    }
  };

  // --- ACTIONS: ROLE MODAL ---
  const handleOpenAddRoleModal = () => {
    setEditingItem(null);
    setRoleModalAlert(null);
    setRoleFormData({
      nom: '',
      description: '',
      couleur: 'blue',
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = (role: Role) => {
    setEditingItem(role);
    setRoleModalAlert(null);
    setRoleFormData({
      nom: role.nom,
      description: role.description || '',
      couleur: role.couleur || 'blue',
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleModalAlert(null);
    const cleanNom = roleFormData.nom.trim();

    const res = await itParkService.saveRole({
      id: editingItem ? editingItem.id : undefined,
      nom: cleanNom,
      description: roleFormData.description.trim(),
      couleur: roleFormData.couleur,
    });

    if (!res.success) {
      setRoleModalAlert({
        type: 'error',
        message: res.message || "Erreur lors de l'enregistrement du rôle.",
      });
      return;
    }

    setIsRoleModalOpen(false);
  };

  const handleRequestDeleteRole = (role: Role) => {
    const isSystemRole = role.isSystem || normalizeRoleName(role.nom) === normalizeRoleName('Responsable IT');
    if (isSystemRole) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Suppression impossible',
        subtitle: role.nom,
        type: 'danger',
        isBlocked: true,
        message: 'Ce rôle est un rôle système fondamental protégé et ne peut être supprimé.',
      });
      return;
    }

    const roleNorm = normalizeRoleName(role.nom);
    const roleId = role.id;
    const roleDbId = (role as any)._id ? String((role as any)._id) : '';

    const usersWithRole = beneficiaires.filter(u => {
      if (u.id_Role && (u.id_Role === roleId || (roleDbId && u.id_Role === roleDbId))) {
        return true;
      }
      if (u.role && normalizeRoleName(u.role) === roleNorm) {
        return true;
      }
      return false;
    });

    if (usersWithRole.length > 0) {
      const isPlural = usersWithRole.length > 1;
      setConfirmModalConfig({
        isOpen: true,
        title: 'Suppression impossible',
        subtitle: role.nom,
        type: 'danger',
        isBlocked: true,
        message: `Ce rôle est assigné à ${isPlural ? 'plusieurs utilisateurs' : 'un utilisateur'} (${usersWithRole.length} collaborateur${isPlural ? 's' : ''}), vous ne pouvez pas le supprimer. Vous devez d'abord réassigner ou modifier le rôle de ces utilisateurs avant de pouvoir supprimer ce rôle.`,
        itemsListTitle: `Utilisateur${isPlural ? 's' : ''} actuellement assigné${isPlural ? 's' : ''} à ce rôle (${usersWithRole.length})`,
        itemsList: usersWithRole.map(u => ({
          id: u.id,
          label: u.beneficiaire,
          sublabel: `${u.email} • ${u.statut || 'Actif'}`,
          badge: u.statut || 'Actif',
        })),
      });
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Supprimer ce rôle ?',
      subtitle: role.nom,
      type: 'danger',
      message: `Êtes-vous sûr de vouloir supprimer définitivement le rôle métier "${role.nom}" ?`,
      impacts: [
        'Ce rôle ne sera plus disponible dans les listes déroulantes de création/modification de collaborateurs.',
      ],
      confirmText: 'Supprimer le rôle',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setIsConfirmActionLoading(true);
        const res = await itParkService.deleteRole(role.id);
        setIsConfirmActionLoading(false);
        if (!res.success) {
          setErrorMessage(res.message || 'Impossible de supprimer ce rôle.');
        } else {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRequestDeleteUserOrEmployee = (u: Beneficiaire) => {
    const isTargetSuperAdmin = Boolean(u.isSuperAdmin);
    const isTargetIT = normalizeRoleName(u.role) === normalizeRoleName('Responsable IT');
    const isSelf = currentUser && (currentUser.id === u.id || (currentUser.email && u.email && currentUser.email.toLowerCase() === u.email.toLowerCase()));

    // 1. Le compte Super Admin ne peut JAMAIS être supprimé
    if (isTargetSuperAdmin) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Suppression impossible',
        subtitle: `${u.beneficiaire} (Super Admin)`,
        type: 'danger',
        isBlocked: true,
        message: 'Le compte du Super Admin est le compte principal protégé du système et ne peut être supprimé.',
      });
      return;
    }

    // 2. Si la cible est un Responsable IT (non Super Admin)
    if (isTargetIT) {
      if (!isCurrentUserSuperAdmin) {
        setConfirmModalConfig({
          isOpen: true,
          title: 'Privilèges Super Admin requis',
          subtitle: `${u.beneficiaire} (${u.role})`,
          type: 'danger',
          isBlocked: true,
          message: 'Seul le Responsable IT ayant le double rôle Super Admin a le privilège de supprimer ou d\'archiver un autre Responsable IT.',
        });
        return;
      }

      if (isSelf) {
        setConfirmModalConfig({
          isOpen: true,
          title: 'Action impossible',
          subtitle: `${u.beneficiaire} (Votre compte)`,
          type: 'danger',
          isBlocked: true,
          message: 'Vous ne pouvez pas supprimer votre propre compte.',
        });
        return;
      }
    }

    const assignedMats = getUserMaterials(u.id);
    const empName = getLocationName(u.id_Emplacement);
    const enPanneMats = assignedMats.filter(m => m.statut === 'En panne');
    const enServiceMats = assignedMats.filter(m => m.statut !== 'En panne');

    const impacts: string[] = [
      'Suppression définitive du collaborateur et révocation immédiate de ses accès applicatifs.',
      'Suppression de l\'ensemble de ses réclamations enregistrées.',
      'Suppression de toutes ses messageries et conversations instantanées.',
    ];

    if (assignedMats.length > 0) {
      impacts.push(
        `Désaffectation de ses ${assignedMats.length} matériel(s) : ${enServiceMats.length} remis en stock disponible (+${enServiceMats.length} au stock)${
          enPanneMats.length > 0 ? `, ${enPanneMats.length} matériel(s) actuellement en panne maintenu(s) en panne sans réintégrer le stock disponible` : ''
        }.`
      );
    } else {
      impacts.push('Aucun matériel informatique n\'était assigné à ce collaborateur.');
    }

    if (u.id_Emplacement) {
      impacts.push(`Désaffectation automatique de son emplacement : ${empName}.`);
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Supprimer ce collaborateur ?',
      subtitle: `${u.beneficiaire} (${u.email})`,
      type: 'danger',
      message: 'Attention : cette action supprimera définitivement le collaborateur, ses réclamations et ses messages, et désaffectera automatiquement tous ses équipements.',
      impacts,
      itemsListTitle: assignedMats.length > 0 ? 'Matériels actuellement assignés' : undefined,
      itemsList: assignedMats.map(m => ({
        id: m.id,
        label: m.designation,
        sublabel: `Réf: ${m.reference} | S/N: ${m.codeSerie || (m as any).codeBarre || 'N/A'}`,
        badge: m.statut === 'En panne' ? 'En panne (Reste en panne)' : 'En service -> Remis en stock',
        badgeColor: m.statut === 'En panne' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
      })),
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setIsConfirmActionLoading(true);
        const res = await itParkService.deleteBeneficiaire(u.id);
        setIsConfirmActionLoading(false);
        if (!res.success) {
          setErrorMessage(res.message || 'Impossible de supprimer ce collaborateur.');
        } else {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleRequestArchiveUserOrEmployee = (u: Beneficiaire) => {
    const isTargetSuperAdmin = Boolean(u.isSuperAdmin);
    const isTargetIT = normalizeRoleName(u.role) === normalizeRoleName('Responsable IT');
    const isSelf = currentUser && (currentUser.id === u.id || (currentUser.email && u.email && currentUser.email.toLowerCase() === u.email.toLowerCase()));

    // 1. Le compte Super Admin ne peut JAMAIS être archivé
    if (isTargetSuperAdmin) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Archivage impossible',
        subtitle: `${u.beneficiaire} (Super Admin)`,
        type: 'warning',
        isBlocked: true,
        message: 'Le compte du Super Admin est le compte principal protégé du système et ne peut être archivé.',
      });
      return;
    }

    // 2. Si la cible est un Responsable IT (non Super Admin)
    if (isTargetIT) {
      if (!isCurrentUserSuperAdmin) {
        setConfirmModalConfig({
          isOpen: true,
          title: 'Privilèges Super Admin requis',
          subtitle: `${u.beneficiaire} (${u.role})`,
          type: 'warning',
          isBlocked: true,
          message: 'Seul le Responsable IT ayant le double rôle Super Admin a le privilège de supprimer ou d\'archiver un autre Responsable IT.',
        });
        return;
      }

      if (isSelf) {
        setConfirmModalConfig({
          isOpen: true,
          title: 'Action impossible',
          subtitle: `${u.beneficiaire} (Votre compte)`,
          type: 'warning',
          isBlocked: true,
          message: 'Vous ne pouvez pas archiver votre propre compte.',
        });
        return;
      }
    }

    const assignedMats = getUserMaterials(u.id);
    const empName = getLocationName(u.id_Emplacement);
    const enPanneMats = assignedMats.filter(m => m.statut === 'En panne');
    const enServiceMats = assignedMats.filter(m => m.statut !== 'En panne');

    const impacts: string[] = [
      'Le compte sera marqué "Inactif" et rendu totalement inaccessible (mot de passe et tokens révoqués).',
    ];

    if (assignedMats.length > 0) {
      impacts.push(
        `Désaffectation de ses ${assignedMats.length} matériel(s) : ${enServiceMats.length} remis en stock disponible (+${enServiceMats.length} au stock)${
          enPanneMats.length > 0 ? `, ${enPanneMats.length} matériel(s) actuellement en panne maintenu(s) en panne sans réintégrer le stock disponible` : ''
        }.`
      );
    } else {
      impacts.push('Aucun matériel informatique n\'était assigné à ce collaborateur.');
    }

    if (u.id_Emplacement) {
      impacts.push(`Désaffectation automatique de son emplacement : ${empName}.`);
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Archiver ce collaborateur ?',
      subtitle: `${u.beneficiaire} (${u.email})`,
      type: 'warning',
      message: 'L\'archivage désactivera immédiatement la connexion du collaborateur et remettra ses matériels disponibles en stock.',
      impacts,
      itemsListTitle: assignedMats.length > 0 ? 'Matériels qui seront désaffectés' : undefined,
      itemsList: assignedMats.map(m => ({
        id: m.id,
        label: m.designation,
        sublabel: `Réf: ${m.reference} | S/N: ${m.codeSerie || (m as any).codeBarre || 'N/A'}`,
        badge: m.statut === 'En panne' ? 'En panne (Reste en panne)' : 'En service -> Remis en stock',
        badgeColor: m.statut === 'En panne' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
      })),
      confirmText: 'Archiver le collaborateur',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setIsConfirmActionLoading(true);
        const res = await itParkService.archiveBeneficiaire(u.id);
        setIsConfirmActionLoading(false);
        if (!res.success) {
          setErrorMessage(res.message || "Impossible d'archiver ce collaborateur.");
        } else {
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // --- ACTIONS: HARDWARE ASSIGNMENT FROM STOCK ---
  const handleOpenHardwareModal = (user: Beneficiaire) => {
    setHardwareTargetUser(user);
    setHardwareModalAlert(null);
    setSelectedStockMatId('');
    setHardwareSearchTerm('');
    setIsHardwareModalOpen(true);
  };

  const handleAssignMaterialFromStock = async (matId?: string) => {
    const targetId = matId || selectedStockMatId;
    if (!targetId || !hardwareTargetUser) {
      setHardwareModalAlert({
        type: 'warning',
        message: 'Veuillez sélectionner un matériel disponible en stock.',
      });
      return;
    }
    const matToAssign = materiels.find(m => m.id === targetId);
    if (!matToAssign) return;

    setIsAssigningHardware(true);
    setHardwareModalAlert(null);

    try {
      const updated: Materiel = {
        ...matToAssign,
        id_Beneficiaire: hardwareTargetUser.id,
        id_Emplacement: hardwareTargetUser.id_Emplacement || matToAssign.id_Emplacement || '',
        statut: 'En service',
      };

      const res = await itParkService.saveMateriel(updated);
      if (!res.success) {
        setHardwareModalAlert({
          type: 'error',
          message: res.message || "Erreur lors de l'affectation du matériel.",
        });
        return;
      }

      setMateriels(itParkService.getMateriels());
      setSelectedStockMatId('');
      const empName = getLocationName(hardwareTargetUser.id_Emplacement);
      setHardwareModalAlert({
        type: 'success',
        message: `Le matériel "${matToAssign.designation}" a été affecté avec succès à ${hardwareTargetUser.beneficiaire}${empName && empName !== '—' ? ` (Emplacement: ${empName})` : ''}. Le stock a été mis à jour.`,
      });
    } catch (err: any) {
      setHardwareModalAlert({
        type: 'error',
        message: err.message || "Une erreur inattendue est survenue lors de l'affectation.",
      });
    } finally {
      setIsAssigningHardware(false);
    }
  };

  const handleUnassignMaterialToStock = async (mat: Materiel) => {
    if (!hardwareTargetUser) return;
    setIsAssigningHardware(true);
    setHardwareModalAlert(null);

    try {
      const updated: Materiel = {
        ...mat,
        id_Beneficiaire: undefined,
        id_Emplacement: hardwareTargetUser.id_Emplacement || mat.id_Emplacement || '',
        statut: 'En stock',
      };

      const res = await itParkService.saveMateriel(updated);
      if (!res.success) {
        setHardwareModalAlert({
          type: 'error',
          message: res.message || "Erreur lors de la remise en stock du matériel.",
        });
        return;
      }

      setMateriels(itParkService.getMateriels());
      const empName = getLocationName(updated.id_Emplacement);
      setHardwareModalAlert({
        type: 'success',
        message: `Le matériel "${mat.designation}" a été désaffecté et conservé en réserve disponible ${empName && empName !== '—' ? `sur l'emplacement "${empName}"` : 'en stock général'} (Statut: En stock).`,
      });
    } catch (err: any) {
      setHardwareModalAlert({
        type: 'error',
        message: err.message || "Une erreur inattendue est survenue lors de la désaffectation.",
      });
    } finally {
      setIsAssigningHardware(false);
    }
  };

  // Filtered List based on active tab
  const getFilteredData = () => {
    const searchLower = searchTerm.toLowerCase();

    if (activeTab === 'roles') {
      return roles.filter(r => 
        r.nom.toLowerCase().includes(searchLower) ||
        (r.description || '').toLowerCase().includes(searchLower)
      );
    }

    if (activeTab === 'users') {
      return itUsersList.filter(u => {
        const empName = getLocationName(u.id_Emplacement).toLowerCase();
        const matchesSearch = u.beneficiaire.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.role.toLowerCase().includes(searchLower) ||
          empName.includes(searchLower);
        const matchesStatut = statutFilter === 'all' || (u.statut || 'Actif') === statutFilter;
        const matchesLocation = emplacementFilter === 'all' || u.id_Emplacement === emplacementFilter;
        return matchesSearch && matchesStatut && matchesLocation;
      });
    }

    // Employees tab
    return employeesList.filter(u => {
      const empName = getLocationName(u.id_Emplacement).toLowerCase();
      const matchesSearch = u.beneficiaire.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.role.toLowerCase().includes(searchLower) ||
        empName.includes(searchLower);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatut = statutFilter === 'all' || (u.statut || 'Actif') === statutFilter;
      const matchesLocation = emplacementFilter === 'all' || u.id_Emplacement === emplacementFilter;
      return matchesSearch && matchesRole && matchesStatut && matchesLocation;
    });
  };

  const filteredItems = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const paginatedRoles = (activeTab === 'roles' ? paginatedItems : []) as Role[];
  const paginatedUsers = (activeTab === 'users' ? paginatedItems : []) as Beneficiaire[];
  const paginatedEmployees = (activeTab === 'employees' ? paginatedItems : []) as Beneficiaire[];

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen text-gray-900">
      {/* Banner / Email status alert */}
      {emailSendingStatus && (
        <div className="p-4 bg-emerald-900 text-white rounded-2xl shadow-lg border border-emerald-700 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-emerald-300" />
            <span className="text-xs font-bold">{emailSendingStatus}</span>
          </div>
          <button
            onClick={() => setEmailSendingStatus(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span>Gestion des Utilisateurs & Rôles</span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              OMODA & JAECOO
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les rôles métiers uniques, activez des accès applicatifs dynamiques pour les employés et affectez le matériel IT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'roles' && (
            <button
              onClick={handleOpenAddRoleModal}
              className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Rôle</span>
            </button>
          )}

          {activeTab === 'users' && (
            <button
              onClick={handleOpenAddUserModal}
              className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Nouveau Compte Utilisateur</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tab 1: Roles */}
        <button
          onClick={() => { setActiveTab('roles'); setCurrentPage(1); setSearchTerm(''); }}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'roles'
              ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white/80 border-gray-200 hover:border-gray-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-purple-100/60 text-purple-700 rounded-full">
              {totalRolesCount} rôles
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-gray-900 text-base">1. Gestion des Rôles</h3>
            <p className="text-xs text-gray-500 mt-1">
              Configuration des fonctions métiers uniques (sans doublons).
            </p>
          </div>
          {activeTab === 'roles' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
          )}
        </button>

        {/* Tab 2: Users with login account */}
        <button
          onClick={() => { setActiveTab('users'); setCurrentPage(1); setSearchTerm(''); }}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'users'
              ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white/80 border-gray-200 hover:border-gray-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-100/60 text-blue-700 rounded-full">
              {totalITUsers} comptes actifs
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-gray-900 text-base">2. Comptes Utilisateurs (Accès Web)</h3>
            <p className="text-xs text-gray-500 mt-1">
              Collaborateurs habilités à se connecter avec un mot de passe.
            </p>
          </div>
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
          )}
        </button>

        {/* Tab 3: All Employees / Beneficiaires */}
        <button
          onClick={() => { setActiveTab('employees'); setCurrentPage(1); setSearchTerm(''); }}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'employees'
              ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white/80 border-gray-200 hover:border-gray-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100/60 text-emerald-700 rounded-full">
              {totalEmployees} collaborateurs
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-gray-900 text-base">3. Gestion des Employés & Matériels</h3>
            <p className="text-xs text-gray-500 mt-1">
              Bénéficiaires de matériel informatique & attribution dynamique d'accès.
            </p>
          </div>
          {activeTab === 'employees' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'roles'
                  ? 'Rechercher un rôle...'
                  : activeTab === 'users'
                  ? 'Rechercher un compte utilisateur, email, rôle...'
                  : 'Rechercher un collaborateur, email, rôle, emplacement...'
              }
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'employees' && (
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Tous les rôles</option>
                {roles.map(r => (
                  <option key={r.id} value={r.nom}>{r.nom}</option>
                ))}
              </select>
            )}

            {activeTab !== 'roles' && (
              <>
                <select
                  value={statutFilter}
                  onChange={(e) => { setStatutFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>

                <select
                  value={emplacementFilter}
                  onChange={(e) => { setEmplacementFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer max-w-50 truncate"
                >
                  <option value="all">Tous les emplacements</option>
                  {emplacements.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.emplacement1} {e.emplacement2 ? `(${e.emplacement2})` : ''}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* SECTION 1 : CRUD RÔLES */}
        {activeTab === 'roles' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Rôle & Badge</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6 text-center">Collaborateurs assignés</th>
                  <th className="py-3.5 px-6 text-center">Unicité & Type</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {paginatedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      Aucun rôle trouvé.
                    </td>
                  </tr>
                ) : (
                  paginatedRoles.map((role: Role) => {
                    const count = beneficiaires.filter(u => normalizeRoleName(u.role) === normalizeRoleName(role.nom)).length;
                    const isSystemRole = role.isSystem || normalizeRoleName(role.nom) === normalizeRoleName('Responsable IT');
                    return (
                      <tr key={role.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getRoleBadgeClasses(role.nom)}`}>
                              {role.nom}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-medium">
                          {role.description || <span className="text-gray-400 italic">Aucune description</span>}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-gray-700">
                          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs">
                            {count} collaborateur{count > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {isSystemRole ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-full text-[11px] border border-blue-200">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Système (Protégé)</span>
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">Personnalisé</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditRoleModal(role)}
                              className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                              title="Modifier le rôle"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {!isSystemRole && (
                              <button
                                onClick={() => handleRequestDeleteRole(role)}
                                className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer le rôle"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 2 : COMPTES UTILISATEURS (AVEC ACCÈS & MOT DE PASSE) */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Utilisateur</th>
                  <th className="py-3.5 px-6">Rôle</th>
                  <th className="py-3.5 px-6">Périmètre d'Accès</th>
                  <th className="py-3.5 px-6">Emplacement</th>
                  <th className="py-3.5 px-6">Matériels IT Assignés</th>
                  <th className="py-3.5 px-6 text-center">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Aucun compte utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u: Beneficiaire) => {
                    const assignedMats = getUserMaterials(u.id);
                    const isBackoffice = normalizeRoleName(u.role) === normalizeRoleName('Responsable IT') && u.accesApp !== 'ESPACE_RECLAMATIONS';
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                              {getInitials(u.beneficiaire)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 flex items-center gap-2">
                                {u.beneficiaire}
                                {u.isSuperAdmin && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 font-extrabold rounded-md text-[10px] border border-amber-300 shadow-2xs">
                                    <Crown className="w-3 h-3 text-amber-600" />
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getRoleBadgeClasses(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-bold rounded-lg text-[11px] border ${
                            isBackoffice
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isBackoffice ? <ShieldCheck className="w-3.5 h-3.5 text-red-600" /> : <UserPlus className="w-3.5 h-3.5 text-blue-600" />}
                            <span>{isBackoffice ? 'Backoffice IT Global' : 'Espace Collaborateur'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-medium">
                          {getLocationName(u.id_Emplacement)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {assignedMats.length === 0 ? (
                              <span className="text-gray-400 italic text-[11px]">Aucun matériel</span>
                            ) : (
                              assignedMats.map((mat) => {
                                const Icon = getMaterialIcon(mat);
                                return (
                                  <span
                                    key={mat.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium text-[11px] border border-gray-200"
                                    title={`${mat.designation} (Réf: ${mat.reference})`}
                                  >
                                    <Icon className="w-3 h-3 text-gray-500" />
                                    <span className="max-w-30 truncate">{mat.designation}</span>
                                  </span>
                                );
                              })
                            )}
                            <button
                              onClick={() => handleOpenHardwareModal(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-md text-[10px] border border-blue-200 transition-colors cursor-pointer"
                              title="Affecter ou gérer les matériels de ce collaborateur"
                            >
                              <PackagePlus className="w-3 h-3 text-blue-600" />
                              <span>{assignedMats.length > 0 ? 'Gérer' : '+ Affecter'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            (u.statut || 'Actif') === 'Actif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (u.statut || 'Actif') === 'Actif' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                            {u.statut || 'Actif'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenHardwareModal(u)}
                              className="p-1.5 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer"
                              title="Affecter un matériel du stock ou gérer les équipements"
                            >
                              <Laptop className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResendWelcomeEmail(u)}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                              title="Renvoyer l'email d'identifiants"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenAccessModal(u)}
                              className="p-1.5 hover:bg-purple-50 text-purple-600 hover:text-purple-700 rounded-lg transition-colors cursor-pointer"
                              title="Configurer les accès & mot de passe"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditUserModal(u)}
                              className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                              title="Modifier la fiche utilisateur"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {u.isSuperAdmin ? (
                              <>
                                <button
                                  disabled
                                  className="p-1.5 opacity-30 cursor-not-allowed text-gray-400 rounded-lg"
                                  title="Compte Super Admin maître protégé (non archivable)"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button
                                  disabled
                                  className="p-1.5 opacity-30 cursor-not-allowed text-gray-400 rounded-lg"
                                  title="Compte Super Admin maître protégé (non supprimable)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRequestArchiveUserOrEmployee(u)}
                                  className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                                  title="Archiver ce compte (retire accès, matériels et emplacement)"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRequestDeleteUserOrEmployee(u)}
                                  className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Supprimer l'utilisateur"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 3 : GESTION DES EMPLOYÉS & BÉNÉFICIAIRES */}
        {activeTab === 'employees' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Collaborateur</th>
                  <th className="py-3.5 px-6">Rôle Métier</th>
                  <th className="py-3.5 px-6">Accès Applicatif</th>
                  <th className="py-3.5 px-6">Emplacement</th>
                  <th className="py-3.5 px-6">Matériels IT Assignés</th>
                  <th className="py-3.5 px-6 text-center">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Aucun employé trouvé.
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((u: Beneficiaire) => {
                    const assignedMats = getUserMaterials(u.id);
                    const isUserAccount = Boolean(u.hasPassword || u.isITUser || normalizeRoleName(u.role) === normalizeRoleName('Responsable IT'));
                    const isBackoffice = normalizeRoleName(u.role) === normalizeRoleName('Responsable IT') && u.accesApp !== 'ESPACE_RECLAMATIONS';
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shadow-xs ${
                              isUserAccount ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {getInitials(u.beneficiaire)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 flex items-center gap-2">
                                {u.beneficiaire}
                                {u.isSuperAdmin && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 font-extrabold rounded-md text-[10px] border border-amber-300 shadow-2xs">
                                    <Crown className="w-3 h-3 text-amber-600" />
                                    Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getRoleBadgeClasses(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {isUserAccount ? (
                            <button
                              onClick={() => handleOpenAccessModal(u)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-bold rounded-lg text-[11px] border cursor-pointer transition-all hover:scale-105 ${
                                isBackoffice
                                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              }`}
                              title="Cliquer pour gérer ou modifier l'accès"
                            >
                              {isBackoffice ? <ShieldCheck className="w-3.5 h-3.5 text-red-600" /> : <UserPlus className="w-3.5 h-3.5 text-blue-600" />}
                              <span>{isBackoffice ? 'Backoffice Global' : 'Espace Collaborateur'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenAccessModal(u)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] border border-amber-200 shadow-2xs transition-all cursor-pointer hover:scale-105"
                              title="Ouvrir la fenêtre pour accorder un accès utilisateur"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                              <span>Donner Accès</span>
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-medium">
                          {getLocationName(u.id_Emplacement)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {assignedMats.length === 0 ? (
                              <span className="text-gray-400 italic text-[11px]">Aucun matériel</span>
                            ) : (
                              assignedMats.map((mat) => {
                                const Icon = getMaterialIcon(mat);
                                return (
                                  <span
                                    key={mat.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium text-[11px] border border-gray-200"
                                    title={`${mat.designation} (Réf: ${mat.reference}${mat.ref_immo ? ` | Immo ERP: ${mat.ref_immo}` : ''})`}
                                  >
                                    <Icon className="w-3 h-3 text-gray-500" />
                                    <span className="max-w-30 truncate">{mat.designation}</span>
                                  </span>
                                );
                              })
                            )}
                            <button
                              onClick={() => handleOpenHardwareModal(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-md text-[10px] border border-blue-200 transition-colors cursor-pointer"
                              title="Affecter ou gérer les matériels de ce collaborateur"
                            >
                              <PackagePlus className="w-3 h-3 text-blue-600" />
                              <span>{assignedMats.length > 0 ? 'Gérer' : '+ Affecter'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            (u.statut || 'Actif') === 'Actif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (u.statut || 'Actif') === 'Actif' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                            {u.statut || 'Actif'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenHardwareModal(u)}
                              className="p-1.5 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer"
                              title="Affecter un matériel du stock ou gérer les équipements"
                            >
                              <Laptop className="w-4 h-4" />
                            </button>
                            {isUserAccount && (
                              <button
                                onClick={() => handleResendWelcomeEmail(u)}
                                className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                                title="Renvoyer l'email d'identifiants"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenAccessModal(u)}
                              className="p-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                              title="Gérer l'accès utilisateur"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditUserModal(u)}
                              className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                              title="Modifier la fiche"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {u.isSuperAdmin ? (
                              <>
                                <button
                                  disabled
                                  className="p-1.5 opacity-30 cursor-not-allowed text-gray-400 rounded-lg"
                                  title="Compte Super Admin maître protégé (non archivable)"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button
                                  disabled
                                  className="p-1.5 opacity-30 cursor-not-allowed text-gray-400 rounded-lg"
                                  title="Compte Super Admin maître protégé (non supprimable)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRequestArchiveUserOrEmployee(u)}
                                  className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                                  title="Archiver ce collaborateur (retire accès, matériels et emplacement)"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRequestDeleteUserOrEmployee(u)}
                                  className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Supprimer l'employé"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/30">
          <div>
            Affichage de <span className="font-bold text-gray-800">{paginatedItems.length > 0 ? startIndex + 1 : 0}</span> à{' '}
            <span className="font-bold text-gray-800">{Math.min(startIndex + itemsPerPage, filteredItems.length)}</span> sur{' '}
            <span className="font-bold text-gray-800">{filteredItems.length}</span> éléments
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-gray-700">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: IT USER ================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">
                    {editingItem ? 'Modifier le Compte Utilisateur' : 'Nouveau Compte Utilisateur'}
                  </h3>
                  <p className="text-xs text-gray-500">Compte avec mot de passe pour accès à la plateforme</p>
                </div>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userModalAlert && (
              <div className="mb-4 shrink-0">
                <FormAlert
                  type={userModalAlert.type}
                  message={userModalAlert.message}
                  onClose={() => setUserModalAlert(null)}
                />
              </div>
            )}

            <form noValidate onSubmit={handleSaveUser} className="overflow-y-auto flex-1 pr-0.5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Nom complet / Bénéficiaire</label>
                <input
                  type="text"
                  placeholder="Ex: Ahmed Amin Nafti"
                  value={userFormData.beneficiaire}
                  onChange={e => setUserFormData({ ...userFormData, beneficiaire: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Adresse Email Professionnelle</label>
                <input
                  type="email"
                  placeholder="Ex: ahmed.nafti@omoda-jaecoo.tn"
                  value={userFormData.email}
                  onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Rôle Attribué</label>
                  <select
                    value={userFormData.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      const isIT = normalizeRoleName(newRole) === normalizeRoleName('Responsable IT');
                      setUserFormData(prev => ({
                        ...prev,
                        role: newRole,
                        grantAccess: isIT ? true : prev.grantAccess,
                        accesApp: isIT ? 'GLOBAL_BACKOFFICE' : (prev.grantAccess ? 'ESPACE_RECLAMATIONS' : 'NONE'),
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.nom}>
                        {r.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Emplacement</label>
                  <select
                    value={userFormData.id_Emplacement}
                    onChange={e => setUserFormData({ ...userFormData, id_Emplacement: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                  >
                    {emplacements.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.emplacement1} {e.emplacement2 ? `(${e.emplacement2})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SÉLECTION DU NIVEAU D'ACCÈS APPLICATION */}
              {(() => {
                const isUserITRole = normalizeRoleName(userFormData.role) === normalizeRoleName('Responsable IT');
                return (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-gray-900 font-extrabold text-xs">
                        Périmètre d'accès de l'application
                      </label>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        isUserITRole
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : (userFormData.grantAccess ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200')
                      }`}>
                        {isUserITRole ? 'Rôle IT Privilégié' : (userFormData.grantAccess ? 'Espace Collaborateur' : 'Sans Accès')}
                      </span>
                    </div>

                    {isUserITRole ? (
                      <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-red-950 text-xs flex items-center gap-1.5">
                              <span>Accès Backoffice IT Global (Supervision Complète)</span>
                            </div>
                            <p className="text-[11px] text-red-900/90 mt-0.5 leading-relaxed font-medium">
                              Supervision complète : toutes les réclamations, matériels, factures, emplacements, fournisseurs, rôles et utilisateurs.
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-red-200/60 flex items-center gap-1.5 text-[11px] text-red-800">
                          <Info className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span>Périmètre d'administration globale attribué automatiquement au <strong>Responsable IT</strong>.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="text-[11px] font-bold text-gray-700">
                          Donner un accès de connexion à l'application à ce collaborateur ?
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* OPTION 1: OUI - ACCÈS ESPACE COLLABORATEUR */}
                          <label
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                              userFormData.grantAccess
                                ? 'bg-blue-50/90 border-blue-500/50 shadow-xs ring-2 ring-blue-500/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 opacity-75'
                            }`}
                          >
                            <input
                              type="radio"
                              name="userGrantAccessRadio"
                              checked={userFormData.grantAccess === true}
                              onChange={() =>
                                setUserFormData(prev => ({
                                  ...prev,
                                  grantAccess: true,
                                  accesApp: 'ESPACE_RECLAMATIONS',
                                }))
                              }
                              className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <UserPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Oui, donner accès</span>
                              </div>
                              <div className="text-[10.5px] font-bold text-blue-700 mt-0.5">
                                Espace Collaborateur
                              </div>
                              <p className="text-[10.5px] text-gray-500 mt-1 leading-snug">
                                Réclamations & matériels personnels avec mot de passe.
                              </p>
                            </div>
                          </label>

                          {/* OPTION 2: NON - AUCUN ACCÈS */}
                          <label
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                              !userFormData.grantAccess
                                ? 'bg-slate-100/90 border-slate-400/50 shadow-xs ring-2 ring-slate-400/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 opacity-75'
                            }`}
                          >
                            <input
                              type="radio"
                              name="userGrantAccessRadio"
                              checked={userFormData.grantAccess === false}
                              onChange={() =>
                                setUserFormData(prev => ({
                                  ...prev,
                                  grantAccess: false,
                                  accesApp: 'NONE',
                                }))
                              }
                              className="mt-0.5 text-slate-600 focus:ring-slate-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <UserX className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <span>Non, aucun accès</span>
                              </div>
                              <div className="text-[10.5px] font-bold text-slate-700 mt-0.5">
                                Annuaire seul
                              </div>
                              <p className="text-[10.5px] text-gray-500 mt-1 leading-snug">
                                Pas de compte ni de mot de passe (fiche interne).
                              </p>
                            </div>
                          </label>
                        </div>

                        {userFormData.grantAccess ? (
                          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                            <div className="flex items-start gap-2.5">
                              <UserPlus className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-bold text-blue-950 text-xs">
                                  Espace Collaborateur (Réclamations & Matériels personnels)
                                </div>
                                <p className="text-[11px] text-blue-900/90 mt-0.5 leading-relaxed font-medium">
                                  Ne voit que ses propres réclamations et son équipement informatique personnel.
                                </p>
                              </div>
                            </div>
                            <div className="pt-1.5 border-t border-blue-200/60 flex items-center gap-1.5 text-[10.5px] text-blue-800">
                              <Info className="w-3 h-3 shrink-0 text-blue-600" />
                              <span>Attribué au rôle « <strong>{userFormData.role}</strong> ». La supervision complète est réservée au Responsable IT.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
                            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Ce collaborateur sera créé comme bénéficiaire d'équipements sans compte de connexion.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SECTION MOT DE PASSE (CONDITIONNELLE) */}
              {(() => {
                const isUserITRole = normalizeRoleName(userFormData.role) === normalizeRoleName('Responsable IT');
                const showPasswordSection = isUserITRole || userFormData.grantAccess;

                if (!showPasswordSection) {
                  return (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
                      <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Aucun mot de passe requis (aucun compte de connexion créé pour ce collaborateur).</span>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-gray-700 font-bold">
                          {editingItem ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe de connexion'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const pwd = generateSecurePassword();
                            setUserFormData(prev => ({ ...prev, password: pwd }));
                            setShowUserPassword(true);
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Générer un mot de passe</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showUserPassword ? 'text' : 'password'}
                          placeholder={editingItem ? "Laisser vide pour conserver l'actuel" : 'Ex: Password123!'}
                          value={userFormData.password}
                          onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                          className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowUserPassword(!showUserPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <input
                        id="sendWelcomeEmailUser"
                        type="checkbox"
                        checked={userFormData.sendWelcomeEmail}
                        onChange={e => setUserFormData({ ...userFormData, sendWelcomeEmail: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="sendWelcomeEmailUser" className="text-[11px] text-emerald-900 font-semibold cursor-pointer">
                        Envoyer l'email officiel de bienvenue avec les identifiants
                      </label>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0c1017] hover:bg-black text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                >
                  {editingItem ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DEDICATED POPUP : GESTION RAPIDE DES ACCÈS UTILISATEUR ================= */}
      {isAccessModalOpen && accessTargetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">
                    Attribution d'Accès Utilisateur
                  </h3>
                  <p className="text-xs text-gray-500">{accessTargetEmployee.beneficiaire} ({accessTargetEmployee.email})</p>
                </div>
              </div>
              <button
                onClick={() => setIsAccessModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {accessModalAlert && (
              <div className="mb-4 shrink-0">
                <FormAlert
                  type={accessModalAlert.type}
                  message={accessModalAlert.message}
                  onClose={() => setAccessModalAlert(null)}
                />
              </div>
            )}

            <form noValidate onSubmit={handleSaveGrantAccess} className="overflow-y-auto flex-1 pr-0.5 space-y-4 text-xs">
              {/* Choix du périmètre */}
              {(() => {
                const isTargetIT = accessTargetEmployee ? normalizeRoleName(accessTargetEmployee.role) === normalizeRoleName('Responsable IT') : false;
                return (
                  <div className="space-y-2">
                    <label className="block text-gray-900 font-extrabold text-xs">
                      Périmètre d'accès accordé à ce collaborateur :
                    </label>

                    {isTargetIT ? (
                      <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-red-950 text-xs flex items-center gap-1.5">
                              <span>Accès Backoffice IT Global (Supervision Complète)</span>
                            </div>
                            <p className="text-[11px] text-red-900/90 mt-0.5 leading-relaxed font-medium">
                              Supervision complète : toutes les réclamations, matériels, factures, emplacements, fournisseurs, rôles et utilisateurs.
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-red-200/60 flex items-center gap-1.5 text-[11px] text-red-800">
                          <Info className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span>Périmètre d'administration globale attribué automatiquement au <strong>Responsable IT</strong>.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                            <UserPlus className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                              <span>Espace Collaborateur (Réclamations & Matériels personnels)</span>
                            </div>
                            <p className="text-[11px] text-blue-900/90 mt-0.5 leading-relaxed font-medium">
                              Ne voit que ses propres réclamations et son équipement informatique personnel.
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-blue-200/60 flex items-center gap-1.5 text-[11px] text-blue-800">
                          <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span>Rôle « <strong>{accessTargetEmployee?.role}</strong> » : accès restreint à la gestion de ses réclamations et matériels personnels.</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-gray-700 font-bold">
                    {accessTargetEmployee.hasPassword ? 'Nouveau mot de passe (optionnel)' : 'Définir le mot de passe'}
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyGeneratedPasswordToAccess}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span>{copiedGeneratedPwd ? 'Copié dans le presse-papier !' : 'Générer un mot de passe'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAccessPassword ? 'text' : 'password'}
                    placeholder="Laissez vide pour générer automatiquement"
                    value={accessFormData.password}
                    onChange={e => setAccessFormData({ ...accessFormData, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessPassword(!showAccessPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showAccessPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox envoi email */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    id="sendWelcomeEmailQuick"
                    type="checkbox"
                    checked={accessFormData.sendWelcomeEmail}
                    onChange={e => setAccessFormData({ ...accessFormData, sendWelcomeEmail: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="sendWelcomeEmailQuick" className="text-[11px] text-emerald-950 font-semibold cursor-pointer">
                    Envoyer l'email officiel avec les identifiants à {accessTargetEmployee.email}
                  </label>
                </div>
                {!smtpStatus?.configured && (
                  <p className="text-[10px] text-amber-700 pl-6">
                    Note : SMTP non configuré dans .env (l'e-mail sera archivé dans le journal d'audit des paramètres).
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2 pt-4 border-t border-gray-100 shrink-0">
                {accessTargetEmployee.hasPassword ? (
                  <button
                    type="button"
                    onClick={() => handleRequestRevokeAccess(accessTargetEmployee)}
                    className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer text-center sm:text-left py-1"
                  >
                    Révoquer l'accès
                  </button>
                ) : <div />}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAccessModalOpen(false)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 cursor-pointer text-center"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                  >
                    Valider & Activer l'Accès
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EMAIL PREVIEW ================= */}
      {isEmailPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-gray-900 text-base">Aperçu de l'Email de Bienvenue</h3>
              </div>
              <button
                onClick={() => setIsEmailPreviewModalOpen(false)}
                className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-0.5 space-y-4">
              <div className="bg-[#0c1017] text-white p-5 sm:p-6 rounded-xl border border-gray-800 space-y-4 text-xs font-sans">
                <div className="text-center border-b border-gray-800 pb-4">
                  <div className="text-lg font-black tracking-widest text-white">
                    OMODA <span className="text-red-500">|</span> JAECOO
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                    Direction des Systèmes d'Information • Tunisie
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-bold text-gray-100">
                    Bonjour {userFormData.beneficiaire || 'Collaborateur'},
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    Bienvenue dans l'application <strong>OMODA | JAECOO Backoffice</strong>. Vos identifiants de connexion ont été créés avec succès :
                  </p>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Identifiant de connexion (Email) :</span>
                    <span className="font-mono font-bold text-blue-400 break-all">{userFormData.email || 'email@omoda.tn'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Mot de passe temporaire :</span>
                    <span className="font-mono font-bold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800">
                      {userFormData.password || '••••••••'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Espace attribué :</span>
                    <span className="font-semibold text-emerald-400">
                      {userFormData.accesApp === 'GLOBAL_BACKOFFICE' ? 'Backoffice Global IT' : 'Espace Collaborateur (Réclamations & Matériels)'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400">
                  Vous pouvez désormais vous connecter directement depuis la page d'accueil de la plateforme avec ces identifiants.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setIsEmailPreviewModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-black cursor-pointer text-center"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ROLE CRUD ================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">
                    {editingItem ? 'Modifier le Rôle' : 'Nouveau Rôle Métier'}
                  </h3>
                  <p className="text-xs text-gray-500">Nom unique (insensible à la casse, espaces et tirets)</p>
                </div>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleModalAlert && (
              <div className="mb-4 shrink-0">
                <FormAlert
                  type={roleModalAlert.type}
                  message={roleModalAlert.message}
                  onClose={() => setRoleModalAlert(null)}
                />
              </div>
            )}

            <form noValidate onSubmit={handleSaveRole} className="overflow-y-auto flex-1 pr-0.5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Intitulé du Rôle (Unique)</label>
                <input
                  type="text"
                  placeholder="Ex: Responsable Logistique"
                  value={roleFormData.nom}
                  onChange={e => setRoleFormData({ ...roleFormData, nom: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Ex: "Responsable IT", "responsable_it" ou "Responsable-IT" sont considérés identiques et rejetés en cas de doublon.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Description</label>
                <input
                  type="text"
                  placeholder="Ex: Gestion des approvisionnements et pièces"
                  value={roleFormData.description}
                  onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Couleur du Badge</label>
                <select
                  value={roleFormData.couleur}
                  onChange={e => setRoleFormData({ ...roleFormData, couleur: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="blue">Bleu (Standard)</option>
                  <option value="purple">Violet (Direction)</option>
                  <option value="rose">Rose (RH)</option>
                  <option value="emerald">Émeraude (Finance & Compta)</option>
                  <option value="amber">Ambre (Technique & SAV)</option>
                  <option value="cyan">Cyan (Projets)</option>
                  <option value="teal">Teal (Développement)</option>
                  <option value="orange">Orange (Logistique & Magasin)</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0c1017] hover:bg-black text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                >
                  {editingItem ? 'Enregistrer' : 'Créer le Rôle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: HARDWARE ASSIGNMENT & STOCK DEDUCTION ================= */}
      {isHardwareModalOpen && hardwareTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                    <span>Affectation Matériels IT & Déstockage</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Collaborateur : <strong className="text-gray-900">{hardwareTargetUser.beneficiaire}</strong> ({hardwareTargetUser.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHardwareModalOpen(false)}
                className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-0.5 space-y-5">
              {/* Alert in modal */}
              {hardwareModalAlert && (
                <div className="mb-2">
                  <FormAlert
                    type={hardwareModalAlert.type}
                    message={hardwareModalAlert.message}
                    onClose={() => setHardwareModalAlert(null)}
                  />
                </div>
              )}

              {/* Overview / Stats pill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Matériels Actuellement Affectés</div>
                  <div className="text-xl font-black text-gray-900 mt-0.5">
                    {getUserMaterials(hardwareTargetUser.id).length} <span className="text-xs font-normal text-gray-500">équipement(s)</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                  <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Disponibles en Stock (Réserve)</div>
                  <div className="text-xl font-black text-blue-900 mt-0.5">
                    {materiels.filter(m => m.statut === 'En stock' || !m.id_Beneficiaire || m.id_Beneficiaire.trim() === '').length} <span className="text-xs font-normal text-blue-600">matériel(s)</span>
                  </div>
                </div>
              </div>

            <div className="space-y-6">
              {/* SECTION 1: MATÉRIELS ACTUELLEMENT AFFECTÉS */}
              <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Matériels en possession ({getUserMaterials(hardwareTargetUser.id).length})</span>
                  </span>
                  <span className="text-[10px] font-normal text-gray-400">Emplacement: {getLocationName(hardwareTargetUser.id_Emplacement)}</span>
                </h4>

                {getUserMaterials(hardwareTargetUser.id).length === 0 ? (
                  <div className="text-center py-5 border border-dashed border-gray-200 rounded-xl bg-white text-xs text-gray-400">
                    Aucun matériel n'est actuellement affecté à {hardwareTargetUser.beneficiaire}.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {getUserMaterials(hardwareTargetUser.id).map(mat => {
                      const Icon = getMaterialIcon(mat);
                      return (
                        <div
                          key={mat.id}
                          className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl shadow-2xs hover:border-gray-300 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                                <span>{mat.designation}</span>
                                {mat.statut && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                    {mat.statut}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                <span>Réf: <strong className="text-gray-600">{mat.reference}</strong></span>
                                {(mat.codeBarre || (mat as any).code_barre) && <span>S/N: {mat.codeBarre || (mat as any).code_barre}</span>}
                                {mat.ref_immo && <span className="text-blue-600 font-semibold">ERP: {mat.ref_immo}</span>}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isAssigningHardware}
                            onClick={() => handleUnassignMaterialToStock(mat)}
                            className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            title="Remettre ce matériel dans le stock (Stock = Stock + 1)"
                          >
                            <span>Désaffecter</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-[10px] font-mono">(Stock +1)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: AFFECTER DU STOCK (STOCK = STOCK - 1) */}
              <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-4">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-blue-600" />
                    <span>Affecter un équipement depuis le Stock disponible</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Stock = Stock - 1
                  </span>
                </h4>

                {(() => {
                  const userEmpId = hardwareTargetUser.id_Emplacement;
                  const userEmpName = getLocationName(userEmpId);

                  const allAvailable = materiels.filter(m => 
                    m.statut === 'En stock' || !m.id_Beneficiaire || m.id_Beneficiaire.trim() === ''
                  );

                  const locAvailable = allAvailable.filter(m => 
                    userEmpId && m.id_Emplacement === userEmpId
                  );

                  const otherAvailable = allAvailable.filter(m => 
                    !userEmpId || m.id_Emplacement !== userEmpId
                  );

                  const matchesSearch = (m: Materiel) => {
                    if (!hardwareSearchTerm) return true;
                    const q = hardwareSearchTerm.toLowerCase();
                    const sn = (m.codeBarre || (m as any).code_barre || m.codeSerie || '').toLowerCase();
                    const refImmo = (m.ref_immo || '').toLowerCase();
                    return m.designation.toLowerCase().includes(q) ||
                      m.reference.toLowerCase().includes(q) ||
                      sn.includes(q) ||
                      refImmo.includes(q);
                  };

                  const filteredLoc = locAvailable.filter(matchesSearch);
                  const filteredOther = otherAvailable.filter(matchesSearch);
                  const totalMatches = filteredLoc.length + filteredOther.length;

                  if (allAvailable.length === 0) {
                    return (
                      <div className="text-center py-6 bg-white border border-dashed border-blue-200 rounded-xl">
                        <Package className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-gray-700">Aucun matériel disponible en stock</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Tous les équipements sont actuellement en service. Vous pouvez ajouter un nouveau matériel "Pas affecté (En stock)" ou sur un emplacement dans le menu Matériels.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Priority Highlight: Materials available on the user's emplacement */}
                      {userEmpId && locAvailable.length > 0 && (
                        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-emerald-950">
                                  Matériels non affectés sur son emplacement ({userEmpName})
                                </h5>
                                <p className="text-[10px] text-emerald-700">
                                  {locAvailable.length} équipement(s) déjà présent(s) dans son bureau, prêts à être assignés directement :
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Disponibles sur site
                            </span>
                          </div>

                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {filteredLoc.length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic py-2 text-center bg-white rounded-xl border border-dashed border-emerald-200">
                                Aucun matériel sur cet emplacement ne correspond à la recherche.
                              </p>
                            ) : (
                              filteredLoc.map(mat => {
                                const SIcon = getMaterialIcon(mat);
                                const sn = mat.codeBarre || (mat as any).code_barre || mat.codeSerie;
                                const pr = mat.montantHT || (mat as any).prix_unitaire_ht || (mat as any).prix;
                                return (
                                  <div
                                    key={mat.id}
                                    className="flex items-center justify-between p-2.5 bg-white border border-emerald-200/80 rounded-xl shadow-2xs hover:border-emerald-400 transition-all"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                        <SIcon className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-gray-900 truncate">{mat.designation}</div>
                                        <div className="text-[10px] text-gray-400 flex items-center gap-2 flex-wrap">
                                          <span>Réf: <strong>{mat.reference}</strong></span>
                                          {sn && <span>S/N: {sn}</span>}
                                          {mat.ref_immo && <span className="text-blue-600 font-semibold">ERP: {mat.ref_immo}</span>}
                                          {pr && <span className="text-gray-700 font-semibold">{pr} TND</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isAssigningHardware}
                                      onClick={() => handleAssignMaterialFromStock(mat.id)}
                                      className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                      title="Affecter directement ce matériel situé sur son emplacement"
                                    >
                                      <PackagePlus className="w-3.5 h-3.5" />
                                      <span>Affecter</span>
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {/* Search in stock */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Rechercher dans tout le stock (désignation, série, référence, ERP)..."
                          value={hardwareSearchTerm}
                          onChange={(e) => setHardwareSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>

                      {/* Stock selection dropdown/list with optgroups */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Sélectionner un matériel à affecter ({totalMatches} disponible(s)) :
                        </label>
                        <select
                          value={selectedStockMatId}
                          onChange={(e) => setSelectedStockMatId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">-- Choisir un matériel ({totalMatches} correspondants) --</option>
                          
                          {filteredLoc.length > 0 && (
                            <optgroup label={`📍 Disponibles sur son emplacement : ${userEmpName} (${filteredLoc.length})`}>
                              {filteredLoc.map(m => {
                                const sn = m.codeBarre || (m as any).code_barre || m.codeSerie;
                                const pr = m.montantHT || (m as any).prix_unitaire_ht || (m as any).prix;
                                return (
                                  <option key={m.id} value={m.id}>
                                    📍 [Sur site] {m.designation} (Réf: {m.reference}{sn ? ` | S/N: ${sn}` : ''}{m.ref_immo ? ` | ERP: ${m.ref_immo}` : ''}) - {pr ? `${pr} TND` : 'En stock'}
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}

                          {filteredOther.length > 0 && (
                            <optgroup label={`📦 Réserve générale / Autres emplacements (${filteredOther.length})`}>
                              {filteredOther.map(m => {
                                const sn = m.codeBarre || (m as any).code_barre || m.codeSerie;
                                const pr = m.montantHT || (m as any).prix_unitaire_ht || (m as any).prix;
                                const mLoc = m.id_Emplacement ? getLocationName(m.id_Emplacement) : 'Stock général';
                                return (
                                  <option key={m.id} value={m.id}>
                                    📦 [{mLoc}] {m.designation} (Réf: {m.reference}{sn ? ` | S/N: ${sn}` : ''}{m.ref_immo ? ` | ERP: ${m.ref_immo}` : ''}) - {pr ? `${pr} TND` : 'En stock'}
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Selected item summary */}
                      {selectedStockMatId && (
                        <div className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between animate-in fade-in">
                          {(() => {
                            const sm = materiels.find(m => m.id === selectedStockMatId);
                            if (!sm) return null;
                            const SIcon = getMaterialIcon(sm);
                            const sn = sm.codeBarre || (sm as any).code_barre || sm.codeSerie;
                            return (
                              <>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                                    <SIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-gray-900">{sm.designation}</div>
                                    <div className="text-[10px] text-gray-400">
                                      Réf: {sm.reference} {sn ? `| S/N: ${sn}` : ''} {sm.ref_immo ? `| ERP: ${sm.ref_immo}` : ''} {sm.id_Emplacement ? `| Loc: ${getLocationName(sm.id_Emplacement)}` : ''}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={isAssigningHardware}
                                  onClick={() => handleAssignMaterialFromStock()}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <PackagePlus className="w-4 h-4" />
                                  <span>Confirmer l'affectation (Stock - 1)</span>
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-4 mt-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsHardwareModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs text-center"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM CONFIRM / INTEGRITY MODAL ================= */}
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
        isLoading={isConfirmActionLoading}
        isBlocked={confirmModalConfig.isBlocked}
      />

      {/* ================= MODAL: ERROR / ALERTE DOUBLON ================= */}
      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-gray-900 text-lg">Attention</h3>
            <p className="text-xs text-gray-600 mt-2 font-medium leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage(null)}
              className="mt-6 w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
