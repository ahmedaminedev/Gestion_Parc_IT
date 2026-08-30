import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  MessageSquare,
  Video,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ChatContact } from '../../../types/itPark';

interface UsersPresenceSidebarProps {
  contacts: ChatContact[];
  onlineUserIds: string[];
  currentUserId?: string;
  isDSIAdmin: boolean;
  onSelectContact: (contact: ChatContact) => void;
  onStartCall?: (contact: ChatContact, type: 'video' | 'audio') => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const UsersPresenceSidebar: React.FC<UsersPresenceSidebarProps> = ({
  contacts,
  onlineUserIds,
  currentUserId,
  isDSIAdmin,
  onSelectContact,
  onStartCall,
  isOpen,
  onToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Collapse toggles for sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    itOnline: false,
    itOffline: false,
    collabOnline: false,
    collabOffline: false,
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter contacts by search query
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const q = searchTerm.toLowerCase();
    return contacts.filter(
      (c) =>
        c.beneficiaire?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q)
    );
  }, [contacts, searchTerm]);

  // Group contacts
  const { itOnline, itOffline, collabOnline, collabOffline } = useMemo(() => {
    const itOn: ChatContact[] = [];
    const itOff: ChatContact[] = [];
    const colOn: ChatContact[] = [];
    const colOff: ChatContact[] = [];

    filtered.forEach((c) => {
      // Exclude self from the directory if present
      if (currentUserId && (String(c.id) === String(currentUserId) || (c.email && c.email.toLowerCase() === String(currentUserId).toLowerCase()))) {
        return;
      }

      const isOnline = onlineUserIds.some(
        (uid) => String(uid) === String(c.id) || (c.email && String(uid).toLowerCase() === String(c.email).toLowerCase())
      );

      const isITContact = c.isIT || 
                          c.accesApp === 'GLOBAL_BACKOFFICE' ||
                          c.role?.toLowerCase().includes('responsable it') || 
                          c.role?.toLowerCase().includes('admin') || 
                          c.role?.toLowerCase().includes('dsi');

      if (isITContact) {
        if (isOnline) itOn.push(c);
        else itOff.push(c);
      } else {
        // Only relevant if user is IT admin (since collaborators won't get other collaborators in contacts array anyway)
        if (isOnline) colOn.push(c);
        else colOff.push(c);
      }
    });

    // Sort alphabetically
    const sortAlpha = (a: ChatContact, b: ChatContact) =>
      a.beneficiaire.localeCompare(b.beneficiaire);

    return {
      itOnline: itOn.sort(sortAlpha),
      itOffline: itOff.sort(sortAlpha),
      collabOnline: colOn.sort(sortAlpha),
      collabOffline: colOff.sort(sortAlpha),
    };
  }, [filtered, onlineUserIds, currentUserId]);

  const totalConnected = itOnline.length + (isDSIAdmin ? collabOnline.length : 0);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="hidden lg:flex flex-col items-center justify-center w-12 border-l border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors py-4 shrink-0 shadow-xs cursor-pointer gap-4"
        title="Afficher la liste des utilisateurs connectés"
      >
        <div className="relative">
          <Users className="w-5 h-5 text-slate-700" />
          {totalConnected > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5 py-2">
          <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
            {totalConnected}
          </span>
          <span className="text-[10px] font-bold text-slate-400 [writing-mode:vertical-lr] rotate-180 tracking-wider">
            UTILISATEURS
          </span>
        </div>
      </button>
    );
  }

  const renderContactCard = (contact: ChatContact, isOnline: boolean) => {
    return (
      <div
        key={contact.id}
        onClick={() => onSelectContact(contact)}
        className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          isOnline
            ? 'bg-white hover:bg-emerald-50/40 border-slate-200/90 hover:border-emerald-300 shadow-xs'
            : 'bg-slate-50/70 hover:bg-white border-slate-200/60 hover:border-slate-300 opacity-90 hover:opacity-100'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with live status dot */}
          <div className="relative shrink-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs border shadow-xs ${
                contact.isIT
                  ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white border-red-200'
                  : 'bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {contact.beneficiaire ? contact.beneficiaire.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isOnline
                  ? 'bg-emerald-500 ring-1 ring-emerald-300 animate-pulse'
                  : 'bg-slate-300'
              }`}
              title={isOnline ? 'En ligne actuellement' : 'Hors ligne'}
            />
          </div>

          {/* User info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                {contact.beneficiaire}
              </p>
              {contact.isIT && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold border border-red-200 shrink-0">
                  IT
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate">{contact.email}</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
          {onStartCall && isOnline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartCall(contact, 'video');
              }}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Appel Vidéo"
            >
              <Video className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectContact(contact);
            }}
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 group-hover:text-red-600 group-hover:bg-red-50 transition-colors cursor-pointer"
            title="Démarrer la discussion"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop for Drawer Mode */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        onClick={onToggle}
      />

      {/* Main Sidebar Container (Docked on lg+, Drawer on mobile/tablet) */}
      <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-88 max-w-[85vw] bg-white border-l border-slate-200 flex flex-col shrink-0 h-full shadow-2xl lg:shadow-xs lg:static lg:z-auto lg:w-80 transition-all animate-in slide-in-from-right-full lg:slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                <span>Utilisateurs</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {totalConnected} en ligne
                </span>
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                {isDSIAdmin ? 'Responsables IT & Collaborateurs' : 'Équipe Support IT en direct'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Fermer le volet latéral"
          >
            <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-100 bg-white shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrer les utilisateurs..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Users List Accordions */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 divide-y divide-slate-100/80">
          {/* ========================================================================= */}
          {/* 1. SECTION: RESPONSABLES IT */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                <span>Responsables IT</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {itOnline.length + itOffline.length}
              </span>
            </div>

            {/* Sub-group: IT Connectés */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => toggleSection('itOnline')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/60 rounded-lg transition-colors cursor-pointer border border-emerald-200/60"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connectés ({itOnline.length})</span>
                </div>
                {collapsedSections.itOnline ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {!collapsedSections.itOnline && (
                <div className="space-y-1.5 pl-0.5">
                  {itOnline.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic px-2 py-1">
                      Aucun Responsable IT en ligne actuellement.
                    </p>
                  ) : (
                    itOnline.map((user) => renderContactCard(user, true))
                  )}
                </div>
              )}
            </div>

            {/* Sub-group: IT Non connectés / Hors ligne */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => toggleSection('itOffline')}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100/70 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer border border-slate-200/60"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Hors ligne ({itOffline.length})</span>
                </div>
                {collapsedSections.itOffline ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {!collapsedSections.itOffline && (
                <div className="space-y-1.5 pl-0.5">
                  {itOffline.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic px-2 py-1">
                      Tous les Responsables IT sont en ligne.
                    </p>
                  ) : (
                    itOffline.map((user) => renderContactCard(user, false))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. SECTION: COLLABORATEURS (Visible ONLY for Responsables IT / Admins) */}
          {/* ========================================================================= */}
          {isDSIAdmin ? (
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Collaborateurs</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {collabOnline.length + collabOffline.length}
                </span>
              </div>

              {/* Sub-group: Collaborateurs Connectés */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleSection('collabOnline')}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/60 rounded-lg transition-colors cursor-pointer border border-emerald-200/60"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connectés ({collabOnline.length})</span>
                  </div>
                  {collapsedSections.collabOnline ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {!collapsedSections.collabOnline && (
                  <div className="space-y-1.5 pl-0.5">
                    {collabOnline.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic px-2 py-1">
                        Aucun collaborateur en ligne actuellement.
                      </p>
                    ) : (
                      collabOnline.map((user) => renderContactCard(user, true))
                    )}
                  </div>
                )}
              </div>

              {/* Sub-group: Collaborateurs Non connectés / Hors ligne */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleSection('collabOffline')}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100/70 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer border border-slate-200/60"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Hors ligne ({collabOffline.length})</span>
                  </div>
                  {collapsedSections.collabOffline ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {!collapsedSections.collabOffline && (
                  <div className="space-y-1.5 pl-0.5">
                    {collabOffline.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic px-2 py-1">
                        Tous les collaborateurs sont connectés.
                      </p>
                    ) : (
                      collabOffline.map((user) => renderContactCard(user, false))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* For Collaborateur: Informative secure notice */
            <div className="pt-3 px-1">
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-blue-950">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Canal de Support Direct
                </p>
                <p className="text-blue-800/90">
                  En tant que collaborateur, vous pouvez contacter en direct les Responsables IT disponibles pour vos demandes et assistance matérielle.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Synchronisation active
          </span>
          <span>OMODA | JAECOO IT</span>
        </div>
      </div>
    </>
  );
};
