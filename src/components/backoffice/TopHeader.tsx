import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  RefreshCw,
  KeyRound,
  MessageSquare
} from 'lucide-react';
import { authService, AuthUser } from '../../services/authService';
import { itParkService } from '../../services/itParkService';
import { chatService } from '../../services/chatService';
import { BackofficeTab, Reclamation, Materiel, Facture } from '../../types/itPark';

interface TopHeaderProps {
  onToggleSidebar?: () => void;
  onSearchChange?: (term: string) => void;
  titleSearchPlaceholder?: string;
  onNavigateTab?: (tab: BackofficeTab) => void;
  onLogout?: () => void;
}

interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'info' | 'warning' | 'error' | 'success';
  tabTarget?: BackofficeTab;
  ticketCode?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleSidebar,
  onSearchChange,
  titleSearchPlaceholder = "Rechercher...",
  onNavigateTab,
  onLogout
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [reclamations, setReclamations] = useState<Reclamation[]>(itParkService.getReclamations());
  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());
  const [factures, setFactures] = useState<Facture[]>(itParkService.getFactures());
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(chatService.getTotalUnreadCount());

  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      setUser(authService.getUser());
    });
    const unsubPark = itParkService.subscribe(() => {
      setReclamations(itParkService.getReclamations());
      setMateriels(itParkService.getMateriels());
      setFactures(itParkService.getFactures());
    });
    const unsubChat = chatService.subscribeUnreadCount((cnt) => {
      setUnreadMsgCount(cnt);
    });
    return () => {
      unsubAuth();
      unsubPark();
      unsubChat();
    };
  }, []);

  const isDSIAdmin = useMemo(() => {
    if (!user) return false;
    return authService.isResponsableIT() || authService.isAdmin() || user.role === 'Responsable IT' || (user.id_Role && user.id_Role.toLowerCase().includes('it'));
  }, [user]);

  // Build notifications dynamically based on user role
  const notifications: AppNotification[] = useMemo(() => {
    if (!user) return [];

    const formatRelativeTime = (dateStr?: string) => {
      if (!dateStr) return "Récemment";
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "À l'instant";
      if (diffMin < 60) return `Il y a ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Il y a ${diffDays} j`;
    };

    // 1. COLLABORATEUR NOTIFICATIONS : ONLY messages / updates from IT Manager on their reclamations
    if (!isDSIAdmin) {
      const userRecs = reclamations.filter(r => {
        const byId = user.id && r.id_Demandeur && (r.id_Demandeur === user.id || String(r.id_Demandeur) === String(user.id));
        const byEmail = user.email && r.demandeurEmail && r.demandeurEmail.toLowerCase() === user.email.toLowerCase();
        const byNom = user.beneficiaire && r.demandeurNom && r.demandeurNom.toLowerCase() === user.beneficiaire.toLowerCase();
        return byId || byEmail || byNom;
      });

      const list: AppNotification[] = [];

      userRecs.forEach(rec => {
        if (Array.isArray(rec.historique)) {
          rec.historique.forEach((h, idx) => {
            const isFromIT = 
              h.role === 'Responsable IT' ||
              (h.auteur && h.auteur.toLowerCase() !== (user.beneficiaire || '').toLowerCase()) ||
              h.typeAction === 'commentaire' ||
              h.typeAction === 'statut' ||
              h.typeAction === 'assignation' ||
              h.typeAction === 'resolution';

            if (isFromIT && h.typeAction !== 'creation') {
              let title = `Message IT sur ${rec.code}`;
              let type: 'info' | 'warning' | 'error' | 'success' = 'info';
              if (h.typeAction === 'statut') {
                title = `Statut mis à jour sur ${rec.code}`;
                type = 'warning';
              } else if (h.typeAction === 'resolution') {
                title = `Ticket résolu : ${rec.code}`;
                type = 'success';
              } else if (h.typeAction === 'assignation') {
                title = `Suivi SLA / Assignation sur ${rec.code}`;
                type = 'info';
              }

              list.push({
                id: `notif-msg-${rec.id}-${idx}`,
                title,
                desc: `${h.auteur ? h.auteur + ' : ' : ''}${h.message}`,
                time: formatRelativeTime(h.date),
                type,
                tabTarget: 'reclamations',
                ticketCode: rec.code,
              });
            }
          });
        }

        // Solution note if ticket resolved
        if (rec.statut === 'Résolue' && rec.solution) {
          const alreadyAdded = list.some(l => l.ticketCode === rec.code && l.type === 'success');
          if (!alreadyAdded) {
            list.push({
              id: `notif-sol-${rec.id}`,
              title: `Solution apportée sur ${rec.code}`,
              desc: `${rec.technicienNom ? rec.technicienNom + ' : ' : ''}${rec.solution}`,
              time: formatRelativeTime(rec.dateResolution || rec.updatedAt),
              type: 'success',
              tabTarget: 'reclamations',
              ticketCode: rec.code,
            });
          }
        }
      });

      return list;
    }

    // 2. RESPONSABLE IT NOTIFICATIONS : Global IT supervisor alerts
    const dsiList: AppNotification[] = [];

    // Open tickets
    const openTickets = reclamations.filter(r => r.statut === 'Ouverte');
    if (openTickets.length > 0) {
      dsiList.push({
        id: 'dsi-open-tickets',
        title: `${openTickets.length} Nouvelle(s) Réclamation(s)`,
        desc: `${openTickets.length} ticket(s) ouvert(s) par des collaborateurs en attente de prise en charge SLA.`,
        time: 'En temps réel',
        type: 'warning',
        tabTarget: 'reclamations',
      });
    }

    // Urgent tickets
    const urgentTickets = reclamations.filter(r => r.priorite === 'Urgente' && r.statut !== 'Résolue' && r.statut !== 'Rejetée');
    if (urgentTickets.length > 0) {
      dsiList.push({
        id: 'dsi-urgent-tickets',
        title: `${urgentTickets.length} Incident(s) IT Urgent(s)`,
        desc: `Tickets prioritaires nécessitant une intervention immédiate du support IT.`,
        time: 'Priorité SLA',
        type: 'error',
        tabTarget: 'reclamations',
      });
    }

    // Broken materials
    const brokenMats = materiels.filter(m => m.statut === 'En panne');
    if (brokenMats.length > 0) {
      dsiList.push({
        id: 'dsi-broken-mats',
        title: `${brokenMats.length} Matériel(s) en Panne`,
        desc: `Équipements déclarés hors-service nécessitant réparation ou remplacement.`,
        time: 'Parc Matériel',
        type: 'error',
        tabTarget: 'materiels',
      });
    }

    // Overdue invoices
    const overdueFactures = factures.filter(f => f.statut === 'En retard');
    if (overdueFactures.length > 0) {
      dsiList.push({
        id: 'dsi-overdue-factures',
        title: `${overdueFactures.length} Facture(s) en Retard`,
        desc: `Factures fournisseurs IT échues et non encore réglées.`,
        time: 'Trésorerie IT',
        type: 'warning',
        tabTarget: 'factures',
      });
    }

    return dsiList;
  }, [user, isDSIAdmin, reclamations, materiels, factures]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readNotifIds.has(n.id)).length;
  }, [notifications, readNotifIds]);

  const handleNotificationClick = (notif: AppNotification) => {
    setReadNotifIds(prev => new Set(prev).add(notif.id));
    setShowNotifications(false);
    if (notif.tabTarget && onNavigateTab) {
      onNavigateTab(notif.tabTarget);
    }
  };

  const handleMarkAllRead = () => {
    setReadNotifIds(new Set(notifications.map(n => n.id)));
  };

  const handleLogout = () => {
    authService.logout();
    setShowUserDropdown(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <header className="h-20 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder={titleSearchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Messagerie Button */}
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('messagerie')}
            className="p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 relative transition-colors cursor-pointer"
            title="Messagerie Instantanée"
            id="header-messages-btn"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMsgCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            )}
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 relative transition-colors cursor-pointer"
            title="Notifications"
            id="notifications-bell-btn"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-88 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150" id="notifications-popover">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    {isDSIAdmin ? "Alertes & Pilotage DSI" : "Messages du Responsable IT"}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {isDSIAdmin ? "Supervision du parc informatique" : "Réponses et suivi sur vos réclamations"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                    {unreadCount} {unreadCount > 1 ? 'nouveaux' : 'nouveau'}
                  </span>
                )}
              </div>

              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto my-2">
                {notifications.length > 0 ? (
                  notifications.map((n) => {
                    const isRead = readNotifIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`py-3 px-2 rounded-xl transition-colors cursor-pointer ${
                          isRead ? 'opacity-70 hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70 font-medium'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {n.type === 'error' && <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                          {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                          {n.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                          {n.type === 'info' && <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-gray-900 truncate">{n.title}</p>
                              {!isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{n.desc}</p>
                            <span className="text-[10px] text-gray-400 mt-1 block font-mono">{n.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-gray-400 space-y-1.5">
                    {isDSIAdmin ? (
                      <>
                        <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                        <p className="text-xs font-bold text-gray-800">Parc IT 100% Opérationnel</p>
                        <p className="text-[11px] text-gray-500">Aucun incident ouvert ni facture en retard.</p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-8 h-8 mx-auto text-blue-400 mb-2 opacity-80" />
                        <p className="text-xs font-bold text-gray-800">Aucun nouveau message</p>
                        <p className="text-[11px] text-gray-500">Les messages et retours du support IT sur vos réclamations s'afficheront ici.</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    onClick={handleMarkAllRead}
                    className="font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Tout marquer comme lu
                  </button>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      if (onNavigateTab) onNavigateTab('reclamations');
                    }}
                    className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Voir mes réclamations →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            id="user-menu-btn"
          >
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200 uppercase">
              {user?.beneficiaire ? user.beneficiaire.slice(0, 2) : ''}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-gray-900 leading-tight">{user?.beneficiaire || ''}</p>
              <p className="text-[10px] text-gray-500">{user?.role || ''}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-800">{user?.beneficiaire || ''}</p>
                <p className="text-[10px] text-gray-500">{user?.email || ''}</p>
              </div>
              <div className="px-4 py-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 my-1 mx-2 rounded-lg flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Session Active (MongoDB)</span>
                </span>
                <span className="text-[9px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">
                  {user?.role || ''}
                </span>
              </div>

              <div className="px-2 py-1 space-y-1">
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      onNavigateTab('profile');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-red-600" />
                    <span>Mon Profil & Mot de passe</span>
                  </button>
                )}

                <button
                  onClick={async () => {
                    await authService.prolongSession();
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Renouveler Token (Refresh)</span>
                </button>
              </div>

              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

