import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Monitor,
  FileText,
  MapPin,
  Briefcase,
  LogOut,
  LifeBuoy,
  ShieldCheck,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { BackofficeTab } from '../../types/itPark';
import { authService, AuthUser } from '../../services/authService';
import { chatService } from '../../services/chatService';

interface SidebarProps {
  activeTab: BackofficeTab;
  onSelectTab: (tab: BackofficeTab) => void;
  onOpenPublicSite?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
}) => {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [unreadCount, setUnreadCount] = useState<number>(chatService.getTotalUnreadCount());

  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      setUser(authService.getUser());
    });
    const unsubUnread = chatService.subscribeUnreadCount((cnt) => {
      setUnreadCount(cnt);
    });
    return () => {
      unsubAuth();
      unsubUnread();
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    if (onLogout) {
      onLogout();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'IT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isDSIAdmin = user?.role === 'Responsable IT' || user?.accesApp === 'GLOBAL_BACKOFFICE';

  // Menu items for IT Admin (GLOBAL_BACKOFFICE)
  const adminMenuItems: { id: BackofficeTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard IT', icon: LayoutDashboard },
    { id: 'reclamations', label: 'Gestion Réclamations', icon: LifeBuoy },
    { id: 'messagerie', label: 'Messagerie IT', icon: MessageSquare, badge: unreadCount },
    { id: 'utilisateurs', label: 'Gestion Utilisateurs', icon: Users },
    { id: 'materiels', label: 'Gestion des Matériels', icon: Monitor },
    { id: 'factures', label: 'Gestion des Factures', icon: FileText },
    { id: 'emplacements', label: 'Gestion Emplacements', icon: MapPin },
    { id: 'fournisseurs', label: 'Gestion Fournisseurs', icon: Briefcase },
  ];

  // Menu items for Standard Employee (ESPACE_RECLAMATIONS)
  const employeeMenuItems: { id: BackofficeTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Mon Tableau de Bord', icon: LayoutDashboard },
    { id: 'reclamations', label: 'Mes Réclamations', icon: LifeBuoy },
    { id: 'messagerie', label: 'Messagerie Support IT', icon: MessageSquare, badge: unreadCount },
    { id: 'materiels', label: 'Mes Équipements IT', icon: Monitor },
    { id: 'profile', label: 'Mon Profil & Sécurité', icon: Users },
  ];

  const menuItems = isDSIAdmin ? adminMenuItems : employeeMenuItems;


  return (
    <aside className="w-64 bg-[#0c1017] text-gray-300 flex flex-col justify-between h-screen sticky top-0 border-r border-gray-800 shrink-0 select-none z-30 overflow-hidden">
      {/* Scrollable Upper Area: Logo + Badge + Nav Links */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <div className="h-20 px-6 flex items-center justify-between border-b border-gray-800/80 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold tracking-wider text-lg font-mono">
                OMODA <span className="text-red-500">|</span> JAECOO
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-0.5">
              {isDSIAdmin ? 'Direction des Systèmes d\'Info' : 'Espace Collaborateur'}
            </span>
          </div>
        </div>

        {/* Access Badge */}
        <div className="px-4 pt-3 shrink-0">
          <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
            isDSIAdmin 
              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {isDSIAdmin ? (
              <>
                <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">Accès Backoffice Complet</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">Espace Réclamations</span>
              </>
            )}
          </div>
        </div>

        {/* Main Navigation Menu */}
        <nav className="p-4 space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = item.badge || 0;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600/20 to-red-500/10 text-white border-l-4 border-red-500 shadow-sm shadow-red-950/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {badgeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-sm shadow-red-600/50 animate-pulse">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Menu: Déconnexion & Profil (Always pinned at bottom) */}
      <div className="p-4 border-t border-gray-800/80 space-y-2 shrink-0 bg-[#0c1017]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span>Déconnexion</span>
        </button>

        {/* Connected User Profile Pill */}
        <div 
          onClick={() => onSelectTab('profile')}
          className="mt-2 pt-2.5 border-t border-gray-800/60 flex items-center gap-3 bg-gray-900/60 p-2 rounded-2xl border border-gray-800 cursor-pointer hover:bg-gray-800/80 hover:border-gray-700 transition-colors"
          title="Accéder à mon profil et photo de profil"
        >
          <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-black border border-red-500/30 shrink-0 overflow-hidden">
            {user?.photo ? (
              <img src={user.photo} alt={user.beneficiaire} className="w-full h-full object-cover" />
            ) : (
              getInitials(user?.beneficiaire)
            )}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {user?.beneficiaire || 'Non connecté'}
            </p>
            <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{user?.role || 'Collaborateur'}</span>
            </p>
          </div>
        </div>

      </div>
    </aside>
  );
};
