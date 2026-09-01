import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Layers,
  Users,
  Monitor,
  Building2,
  Wrench,
  ConciergeBell,
  Server,
  Warehouse,
  FlaskConical,
  Store,
  Boxes
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import {
  Emplacement,
  GroupeEmplacement,
  Beneficiaire,
  Materiel
} from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';

// Available Icon map
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  building: Building2,
  wrench: Wrench,
  concierge: ConciergeBell,
  server: Server,
  warehouse: Warehouse,
  flask: FlaskConical,
  store: Store,
  boxes: Boxes,
  mappin: MapPin,
};

const ICON_LABELS: Record<string, string> = {
  building: 'Bureau',
  wrench: 'Atelier / SAV',
  concierge: 'Accueil',
  server: 'Serveur / IT',
  warehouse: 'Stock / Magasin',
  flask: 'Laboratoire',
  store: 'Boutique / Vente',
  boxes: 'Logistique',
  mappin: 'Général',
};

// Available Color map
const COLOR_MAP: Record<string, { badgeClass: string; iconBoxClass: string; name: string; bgHex: string }> = {
  blue: {
    badgeClass: 'text-blue-600 bg-blue-50 border border-blue-100',
    iconBoxClass: 'bg-blue-50 text-blue-600 border-blue-100',
    name: 'Bleu',
    bgHex: 'bg-blue-500',
  },
  amber: {
    badgeClass: 'text-amber-700 bg-amber-50 border border-amber-100',
    iconBoxClass: 'bg-amber-50 text-amber-600 border-amber-100',
    name: 'Ambre',
    bgHex: 'bg-amber-500',
  },
  emerald: {
    badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
    iconBoxClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    name: 'Émeraude',
    bgHex: 'bg-emerald-500',
  },
  purple: {
    badgeClass: 'text-purple-700 bg-purple-50 border border-purple-100',
    iconBoxClass: 'bg-purple-50 text-purple-600 border-purple-100',
    name: 'Violet',
    bgHex: 'bg-purple-500',
  },
  rose: {
    badgeClass: 'text-rose-700 bg-rose-50 border border-rose-100',
    iconBoxClass: 'bg-rose-50 text-rose-600 border-rose-100',
    name: 'Rose',
    bgHex: 'bg-rose-500',
  },
  cyan: {
    badgeClass: 'text-cyan-700 bg-cyan-50 border border-cyan-100',
    iconBoxClass: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    name: 'Cyan',
    bgHex: 'bg-cyan-500',
  },
  indigo: {
    badgeClass: 'text-indigo-700 bg-indigo-50 border border-indigo-100',
    iconBoxClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    name: 'Indigo',
    bgHex: 'bg-indigo-500',
  },
  teal: {
    badgeClass: 'text-teal-700 bg-teal-50 border border-teal-100',
    iconBoxClass: 'bg-teal-50 text-teal-600 border-teal-100',
    name: 'Teal',
    bgHex: 'bg-teal-500',
  },
};

// Helper to resolve group-specific icon and color theme
const getGroupStyleByGroup = (g?: GroupeEmplacement | null, fallbackName?: string) => {
  if (g?.couleur && COLOR_MAP[g.couleur] && g?.icon && ICON_MAP[g.icon]) {
    return {
      colorKey: g.couleur,
      iconKey: g.icon,
      icon: ICON_MAP[g.icon],
      ...COLOR_MAP[g.couleur],
    };
  }

  const name = (g?.nom || fallbackName || '').toLowerCase().trim();
  let colorKey = 'blue';
  let iconKey = 'building';

  if (name.includes('bureau')) {
    colorKey = 'blue';
    iconKey = 'building';
  } else if (name.includes('atelier')) {
    colorKey = 'amber';
    iconKey = 'wrench';
  } else if (name.includes('accueil') || name.includes('acceuil')) {
    colorKey = 'emerald';
    iconKey = 'concierge';
  } else if (name.includes('serveur') || name.includes('it') || name.includes('data')) {
    colorKey = 'purple';
    iconKey = 'server';
  } else if (name.includes('magasin') || name.includes('stock') || name.includes('réserve')) {
    colorKey = 'cyan';
    iconKey = 'warehouse';
  } else if (name.includes('lab') || name.includes('tech')) {
    colorKey = 'teal';
    iconKey = 'flask';
  } else if (name.includes('boutique') || name.includes('vente') || name.includes('showroom')) {
    colorKey = 'rose';
    iconKey = 'store';
  } else {
    const colors = Object.keys(COLOR_MAP);
    const icons = Object.keys(ICON_MAP);
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    colorKey = colors[Math.abs(hash) % colors.length];
    iconKey = icons[Math.abs(hash) % icons.length];
  }

  return {
    colorKey,
    iconKey,
    icon: ICON_MAP[iconKey] || MapPin,
    ...COLOR_MAP[colorKey],
  };
};

export const EmplacementsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'emplacements' | 'groupes'>('emplacements');

  const [emplacements, setEmplacements] = useState<Emplacement[]>(itParkService.getEmplacements());
  const [groupes, setGroupes] = useState<GroupeEmplacement[]>(itParkService.getGroupesEmplacement());
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>(itParkService.getBeneficiaires());
  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());

  const [searchTerm, setSearchTerm] = useState('');

  // Modal State Emplacement
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Emplacement | null>(null);
  const [empForm, setEmpForm] = useState({
    id_GroupeEmplacement: '',
    emplacement1: '',
    emplacement2: '',
  });

  // Modal State GroupeEmplacement
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupeEmplacement | null>(null);
  const [groupNomInput, setGroupNomInput] = useState('');
  const [groupColorSelect, setGroupColorSelect] = useState('blue');
  const [groupIconSelect, setGroupIconSelect] = useState('building');

  const [pageAlert, setPageAlert] = useState<{ type: 'error' | 'warning' | 'info' | 'success'; message: string } | null>(null);
  const [empModalAlert, setEmpModalAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [groupModalAlert, setGroupModalAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = itParkService.subscribe(() => {
      setEmplacements(itParkService.getEmplacements());
      setGroupes(itParkService.getGroupesEmplacement());
      setBeneficiaires(itParkService.getBeneficiaires());
      setMateriels(itParkService.getMateriels());
    });
    return unsub;
  }, []);

  // Emplacement Handlers
  const handleOpenAddEmp = () => {
    setEditingEmp(null);
    setEmpModalAlert(null);
    const defaultGroup = groupes[0] || { id: 'ge-1', nom: 'Bureau' };
    setEmpForm({
      id_GroupeEmplacement: defaultGroup.id,
      emplacement1: defaultGroup.nom || 'Bureau',
      emplacement2: '',
    });
    setIsEmpModalOpen(true);
  };

  const handleOpenEditEmp = (emp: Emplacement) => {
    setEditingEmp(emp);
    setEmpModalAlert(null);
    const g = groupes.find(grp => grp.id === emp.id_GroupeEmplacement);
    setEmpForm({
      id_GroupeEmplacement: emp.id_GroupeEmplacement,
      emplacement1: emp.emplacement1 || g?.nom || 'Bureau',
      emplacement2: emp.emplacement2,
    });
    setIsEmpModalOpen(true);
  };

  const handleGroupSelectChange = (groupId: string) => {
    const matchingGroup = groupes.find(g => g.id === groupId);
    setEmpForm({
      ...empForm,
      id_GroupeEmplacement: groupId,
      emplacement1: matchingGroup?.nom || 'Bureau',
    });
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpModalAlert(null);

    const matchingGroup = groupes.find(g => g.id === empForm.id_GroupeEmplacement);
    const emp1 = matchingGroup ? matchingGroup.nom : (empForm.emplacement1 || 'Bureau');

    const saved: Emplacement = {
      id: editingEmp ? editingEmp.id : 'emp-' + Date.now(),
      id_GroupeEmplacement: empForm.id_GroupeEmplacement,
      emplacement1: emp1,
      emplacement2: empForm.emplacement2,
    };

    setIsSaving(true);
    const result = await itParkService.saveEmplacement(saved);
    setIsSaving(false);

    if (!result.success) {
      setEmpModalAlert({ type: 'error', message: result.message || 'Impossible d\'enregistrer cet emplacement.' });
      return;
    }

    setIsEmpModalOpen(false);
    setPageAlert({ type: 'success', message: `Emplacement "${saved.emplacement1} - ${saved.emplacement2}" enregistré avec succès.` });
  };

  const handleDeleteEmp = async (id: string) => {
    const emp = emplacements.find(e => e.id === id);
    if (confirm(`Confirmez-vous la suppression de l'emplacement "${emp?.emplacement1} - ${emp?.emplacement2}" ?`)) {
      const result = await itParkService.deleteEmplacement(id);
      if (!result.success) {
        setPageAlert({ type: 'error', message: result.message || 'Erreur lors de la suppression.' });
      } else {
        setPageAlert({ type: 'success', message: 'Emplacement supprimé avec succès.' });
      }
    }
  };

  // GroupeEmplacement Handlers
  const handleOpenAddGroup = () => {
    setEditingGroup(null);
    setGroupModalAlert(null);
    setGroupNomInput('');
    const colorKeys = Object.keys(COLOR_MAP);
    const iconKeys = Object.keys(ICON_MAP);
    const nextIdx = groupes.length % colorKeys.length;
    setGroupColorSelect(colorKeys[nextIdx]);
    setGroupIconSelect(iconKeys[nextIdx % iconKeys.length]);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: GroupeEmplacement) => {
    setEditingGroup(g);
    setGroupModalAlert(null);
    setGroupNomInput(g.nom);
    const style = getGroupStyleByGroup(g);
    setGroupColorSelect(g.couleur || style.colorKey);
    setGroupIconSelect(g.icon || style.iconKey);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupModalAlert(null);

    const saved: GroupeEmplacement = {
      id: editingGroup ? editingGroup.id : 'ge-' + Date.now(),
      nom: groupNomInput,
      couleur: groupColorSelect,
      icon: groupIconSelect,
    };

    setIsSaving(true);
    const result = await itParkService.saveGroupeEmplacement(saved);
    setIsSaving(false);

    if (!result.success) {
      setGroupModalAlert({ type: 'error', message: result.message || 'Impossible d\'enregistrer ce groupe.' });
      return;
    }

    setIsGroupModalOpen(false);
    setPageAlert({ type: 'success', message: `Groupe d'emplacement "${saved.nom}" enregistré avec succès.` });
  };

  const handleDeleteGroup = async (id: string) => {
    const grp = groupes.find(g => g.id === id);
    if (confirm(`Confirmez-vous la suppression du groupe d'emplacement "${grp?.nom}" ?`)) {
      const result = await itParkService.deleteGroupeEmplacement(id);
      if (!result.success) {
        setPageAlert({ type: 'error', message: result.message || 'Erreur lors de la suppression.' });
      } else {
        setPageAlert({ type: 'success', message: 'Groupe d\'emplacement supprimé avec succès.' });
      }
    }
  };

  const getGroupForEmp = (emp: Emplacement) => {
    return groupes.find(g => g.id === emp.id_GroupeEmplacement) || null;
  };

  const filteredEmp = emplacements.filter(e =>
    e.emplacement1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.emplacement2.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-gray-900">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 sm:py-7 space-y-6 lg:space-y-8">
      {pageAlert && (
        <FormAlert
          type={pageAlert.type}
          message={pageAlert.message}
          onClose={() => setPageAlert(null)}
          className="mb-4"
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestion des emplacements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez la localisation géographique et les affectations de vos locaux et ateliers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'emplacements' ? (
            <button
              onClick={handleOpenAddEmp}
              className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvel Emplacement</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddGroup}
              className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Groupe Emplacement</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('emplacements')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'emplacements'
              ? 'border-red-500 text-red-600 bg-red-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Emplacements ({emplacements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groupes')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'groupes'
              ? 'border-red-500 text-red-600 bg-red-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Groupes d'emplacement ({groupes.length})</span>
        </button>
      </div>

      {/* TAB 1: EMPLACEMENTS */}
      {activeTab === 'emplacements' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un emplacement..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmp.map((emp) => {
              const usersCount = beneficiaires.filter(b => b.id_Emplacement === emp.id).length;
              const matCount = materiels.filter(m => m.id_Emplacement === emp.id).length;
              const grp = getGroupForEmp(emp);
              const gName = grp?.nom || emp.emplacement1 || 'N/A';
              const groupStyle = getGroupStyleByGroup(grp, emp.emplacement1 || gName);
              const IconComp = groupStyle.icon;

              return (
                <div key={emp.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${groupStyle.iconBoxClass}`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${groupStyle.badgeClass}`}>
                            {gName}
                          </span>
                          <h3 className="font-black text-gray-900 text-base mt-1">
                            {emp.emplacement2 || emp.emplacement1}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditEmp(emp)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 cursor-pointer"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmp(emp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-3 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      Rattaché au groupe <span className="font-bold text-gray-700">{gName}</span>
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="flex items-center justify-center gap-2 bg-gray-50 p-2 rounded-xl">
                      <Users className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="font-bold text-gray-900">{usersCount}</p>
                        <p className="text-[9px] text-gray-400">Utilisateurs</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 bg-gray-50 p-2 rounded-xl">
                      <Monitor className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-bold text-gray-900">{matCount}</p>
                        <p className="text-[9px] text-gray-400">Matériels</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GROUPES EMPLACEMENT */}
      {activeTab === 'groupes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groupes.map((g) => {
            const empCount = emplacements.filter(e => e.id_GroupeEmplacement === g.id).length;
            const groupStyle = getGroupStyleByGroup(g);
            const IconComp = groupStyle.icon;

            return (
              <div key={g.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${groupStyle.iconBoxClass}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${groupStyle.badgeClass}`}>
                        Groupe
                      </span>
                      <h3 className="font-black text-gray-900 text-lg mt-0.5">{g.nom}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditGroup(g)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(g.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Emplacements rattachés</span>
                  <span className="font-extrabold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                    {empCount} lieux
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Emplacement */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-gray-900 text-base">
                {editingEmp ? "Modifier l'Emplacement" : "Nouvel Emplacement"}
              </h3>
              <button onClick={() => setIsEmpModalOpen(false)} className="p-1 text-gray-400 cursor-pointer hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {empModalAlert && (
              <FormAlert
                type={empModalAlert.type}
                message={empModalAlert.message}
                onClose={() => setEmpModalAlert(null)}
                className="mt-4 shrink-0"
              />
            )}

            <form noValidate onSubmit={handleSaveEmp} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-0.5">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Groupe d'emplacement</label>
                <select
                  value={empForm.id_GroupeEmplacement}
                  onChange={(e) => handleGroupSelectChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold text-sm focus:ring-2 focus:ring-black focus:bg-white"
                >
                  <option value="">Sélectionnez un groupe</option>
                  {groupes.map(g => (
                    <option key={g.id} value={g.id}>{g.nom}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Sélectionnez le groupe auquel est rattaché l'emplacement.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Nom emplacement - Bureau / Local
                </label>
                <input
                  type="text"
                  value={empForm.emplacement2}
                  onChange={(e) => setEmpForm({ ...empForm, emplacement2: e.target.value })}
                  placeholder="ex: Bureau Direction 101, Zone SAV, Salle Réunion..."
                  className="w-full px-3 py-2.5 border rounded-xl font-medium text-sm text-gray-900 bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold cursor-pointer text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-white bg-[#0c1017] hover:bg-black font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>{isSaving ? "Enregistrement..." : "Enregistrer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal GroupeEmplacement with Custom Name, Icon & Color picker */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-gray-900 text-base">
                {editingGroup ? "Modifier le Groupe Emplacement" : "Nouveau Groupe Emplacement"}
              </h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {groupModalAlert && (
              <FormAlert
                type={groupModalAlert.type}
                message={groupModalAlert.message}
                onClose={() => setGroupModalAlert(null)}
                className="mt-4 shrink-0"
              />
            )}

            <form noValidate onSubmit={handleSaveGroup} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-0.5">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nom du Groupe</label>
                <input
                  type="text"
                  value={groupNomInput}
                  onChange={(e) => setGroupNomInput(e.target.value)}
                  placeholder="ex: Serveur / IT, Magasin / Stock, Laboratoire, Chantier..."
                  className="w-full px-3 py-2.5 border rounded-xl font-bold text-gray-900 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Saisissez un nom pour ce groupe d'emplacement.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Icône unique (*)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(ICON_MAP).map(([key, IconComponent]) => {
                    const isSelected = groupIconSelect === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setGroupIconSelect(key)}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'border-red-500 bg-red-50/50 text-red-600 font-bold shadow-xs'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] truncate">{ICON_LABELS[key] || key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Couleur d'affichage (*)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(COLOR_MAP).map(([key, config]) => {
                    const isSelected = groupColorSelect === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setGroupColorSelect(key)}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-gray-900 bg-gray-100 font-bold shadow-xs'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${config.bgHex} shrink-0`} />
                        <span className="text-[11px] font-medium">{config.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Aperçu :</span>
                {(() => {
                  const PreviewIcon = ICON_MAP[groupIconSelect] || MapPin;
                  const previewColor = COLOR_MAP[groupColorSelect] || COLOR_MAP.blue;
                  return (
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${previewColor.iconBoxClass}`}>
                        <PreviewIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${previewColor.badgeClass}`}>
                        {groupNomInput.trim() || 'Nom du groupe'}
                      </span>
                    </div>
                  );
                })()}
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
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-white bg-[#0c1017] hover:bg-black font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>{isSaving ? "Enregistrement..." : "Enregistrer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
