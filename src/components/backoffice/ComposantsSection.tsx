import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Package,
  Layers,
  Percent,
  Printer,
  Info
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import {
  Composant,
  LiquideEcriture,
  Materiel,
  CapaciteType,
  CapaciteUnite,
  TauxUtilisationComposant,
} from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';
import { CustomConfirmModal } from '../common/CustomConfirmModal';

interface ComposantsSectionProps {
  isDSIAdmin: boolean;
  materiels: Materiel[];
  composants: (Composant | LiquideEcriture)[];
  onRefresh: () => void;
}

export const ComposantsSection: React.FC<ComposantsSectionProps> = ({
  isDSIAdmin,
  materiels,
  composants,
  onRefresh,
}) => {
  // Alertes
  const [sectionAlert, setSectionAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterielFilter, setSelectedMaterielFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');

  // Modal Ajout / Modification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Composant | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modèles / Références internes uniques de matériels (imprimantes, etc.)
  const modelesRefs = useMemo(() => {
    const map = new Map<string, { ref: string; designation: string; count: number; machines: Materiel[] }>();
    for (const m of materiels) {
      const r = (m.reference || '').trim().toUpperCase();
      if (!r) continue;
      const entry = map.get(r);
      if (entry) {
        entry.count++;
        entry.machines.push(m);
      } else {
        map.set(r, { ref: r, designation: m.designation, count: 1, machines: [m] });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.ref.localeCompare(b.ref));
  }, [materiels]);

  // Form State : lier à la référence interne en majuscules (refMateriel)
  const [form, setForm] = useState({
    REF_composant: '',
    nom: '',
    refMateriel: '',
    capaciteType: 'litrage' as CapaciteType,
    capaciteUnite: 'cl' as CapaciteUnite,
    capaciteValeur: 250,
    utilisation: '0%' as TauxUtilisationComposant,
    description: '',
  });

  // Modal Suppression
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [compToDelete, setCompToDelete] = useState<Composant | null>(null);

  // Ouvrir modal pour créer
  const handleOpenCreateModal = () => {
    setModalAlert(null);
    setEditingComp(null);
    const defaultRef = modelesRefs.length > 0 ? modelesRefs[0].ref : '';
    setForm({
      REF_composant: 'LIQ-' + Math.floor(1000 + Math.random() * 9000),
      nom: "Liquide d'écriture (Encre / Toner)",
      refMateriel: defaultRef,
      capaciteType: 'litrage',
      capaciteUnite: 'cl',
      capaciteValeur: 250,
      utilisation: '0%',
      description: '',
    });
    setIsModalOpen(true);
  };

  // Ouvrir modal pour éditer
  const handleOpenEditModal = (comp: Composant) => {
    setModalAlert(null);
    setEditingComp(comp);
    const currentRef = (comp.refMateriel || comp.materielReference || comp.id_Materiel || '').trim().toUpperCase();
    setForm({
      REF_composant: comp.REF_composant,
      nom: comp.nom,
      refMateriel: currentRef,
      capaciteType: comp.capaciteType,
      capaciteUnite: comp.capaciteUnite,
      capaciteValeur: comp.capaciteValeur,
      utilisation: comp.utilisation,
      description: comp.description || '',
    });
    setIsModalOpen(true);
  };

  // Changement dynamique du type de capacité (litrage -> l/cl, grammage -> g/kg)
  const handleCapaciteTypeChange = (type: CapaciteType) => {
    setForm((prev) => ({
      ...prev,
      capaciteType: type,
      capaciteUnite: type === 'litrage' ? 'cl' : 'g',
    }));
  };

  // Sauvegarde (Création / Modification)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalAlert(null);

    // Contrôles de base côté client
    if (!form.REF_composant.trim()) {
      setModalAlert({
        type: 'error',
        message: "La référence du liquide d'écriture (REF) est obligatoire.",
      });
      return;
    }

    if (!form.nom.trim()) {
      setModalAlert({
        type: 'error',
        message: "Le nom / la désignation du liquide d'écriture est obligatoire.",
      });
      return;
    }

    const cleanRefUpper = form.refMateriel.trim().toUpperCase();
    if (!cleanRefUpper) {
      setModalAlert({
        type: 'error',
        message: 'Veuillez renseigner la référence interne du matériel compatible (ex: HP-M404).',
      });
      return;
    }

    if (form.capaciteValeur <= 0 || isNaN(Number(form.capaciteValeur))) {
      setModalAlert({
        type: 'error',
        message: 'La valeur de capacité doit être un nombre strictement positif (> 0).',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Composant> = {
        ...(editingComp?.id ? { id: editingComp.id } : {}),
        REF_composant: form.REF_composant.trim().toUpperCase(),
        nom: form.nom.trim(),
        refMateriel: cleanRefUpper,
        id_Materiel: cleanRefUpper,
        capaciteType: form.capaciteType,
        capaciteUnite: form.capaciteUnite,
        capaciteValeur: Number(form.capaciteValeur),
        utilisation: form.utilisation,
        description: form.description.trim(),
      };

      const result = await itParkService.saveComposant(payload);
      if (!result.success) {
        setModalAlert({
          type: 'error',
          message: result.message || "Erreur lors de l'enregistrement du liquide d'écriture.",
        });
        return;
      }

      setIsModalOpen(false);
      setSectionAlert({
        type: 'success',
        message: editingComp
          ? `Liquide d'écriture "${form.nom}" (Réf: ${form.REF_composant}) mis à jour avec succès.`
          : `Liquide d'écriture "${form.nom}" (Réf: ${form.REF_composant}) enregistré avec succès.`,
      });
      onRefresh();
    } catch (err: any) {
      setModalAlert({
        type: 'error',
        message: err.message || 'Erreur inattendue lors de la sauvegarde.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Suppression
  const handleDelete = async () => {
    if (!compToDelete) return;
    try {
      const result = await itParkService.deleteComposant(compToDelete.id);
      if (!result.success) {
        setSectionAlert({
          type: 'error',
          message: result.message || "Impossible de supprimer ce liquide d'écriture.",
        });
      } else {
        setSectionAlert({
          type: 'success',
          message: `Liquide d'écriture "${compToDelete.nom}" supprimé avec succès.`,
        });
        onRefresh();
      }
    } catch (err: any) {
      setSectionAlert({
        type: 'error',
        message: err.message || 'Erreur inattendue lors de la suppression.',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setCompToDelete(null);
    }
  };

  // Filtrage des liquides d'écriture
  const filteredComposants = composants.filter((c) => {
    const cRefUpper = (c.refMateriel || c.materielReference || c.id_Materiel || '').trim().toUpperCase();

    // Recherche textuelle
    const matchesSearch =
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.REF_composant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cRefUpper.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.materielDesignation && c.materielDesignation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtre Référence Matériel
    let matchesMateriel = true;
    if (selectedMaterielFilter !== 'all') {
      matchesMateriel = cRefUpper === selectedMaterielFilter.toUpperCase() || c.id_Materiel === selectedMaterielFilter;
    }

    // Filtre Type
    const matchesType = selectedTypeFilter === 'all' || c.capaciteType === selectedTypeFilter;

    // Filtre Stock
    let matchesStock = true;
    if (selectedStockFilter === 'en_stock') {
      matchesStock = c.utilisation === '0%';
    } else if (selectedStockFilter === 'utilise') {
      matchesStock = c.utilisation !== '0%';
    }

    return matchesSearch && matchesMateriel && matchesType && matchesStock;
  });

  // Statistiques rapides
  const totalComposants = composants.length;
  const enStockCount = composants.filter((c) => c.utilisation === '0%').length;
  const enUtilisationCount = composants.filter((c) => ['25%', '50%', '75%'].includes(c.utilisation)).length;
  const epuisesCount = composants.filter((c) => c.utilisation === '100%').length;

  return (
    <div className="space-y-6" id="liquides-ecriture-section">
      {sectionAlert && (
        <FormAlert
          type={sectionAlert.type}
          message={sectionAlert.message}
          onClose={() => setSectionAlert(null)}
        />
      )}

      {/* Règle et Information Métier */}
      <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold text-sm text-blue-950">
            Liaison par Référence Interne de Matériel (Modèle Partagé)
          </p>
          <p className="mt-1">
            Les liquides d'écriture sont reliés à la <strong>référence interne</strong> du matériel (enregistrée en majuscules). Deux imprimantes (ou plus) du même modèle possèdent la même référence interne et utilisent ainsi le même liquide d'écriture, tout en conservant leur numéro de série propre et unique pour distinguer chaque machine.
          </p>
        </div>
      </div>

      {/* KPI Cards Liquides d'écriture & Règle Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Total Liquides d'écriture
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {totalComposants}
            </span>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Inventoriés dans le parc
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <Droplets className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs flex items-center justify-between bg-emerald-50/20">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                En Stock (Disponible)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                0%
              </span>
            </div>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              {enStockCount}
            </span>
            <span className="text-xs text-emerald-600 mt-0.5 block">
              ✅ Appartient au stockage
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs flex items-center justify-between bg-amber-50/20">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                En Utilisation
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                25% - 75%
              </span>
            </div>
            <span className="text-2xl font-bold text-amber-700 mt-1 block">
              {enUtilisationCount}
            </span>
            <span className="text-xs text-amber-600 mt-0.5 block">
              ⚠️ Sorti du stock (Stock -1)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-xs flex items-center justify-between bg-rose-50/20">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                Épuisés / Consommés
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                100%
              </span>
            </div>
            <span className="text-2xl font-bold text-rose-700 mt-1 block">
              {epuisesCount}
            </span>
            <span className="text-xs text-rose-600 mt-0.5 block">
              ❌ Sorti du stock (Stock -1)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-liquides-input"
              placeholder="Rechercher par REF, nom, référence matériel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Filtre Référence Modèle Matériel */}
          <select
            id="filter-materiel-ref"
            value={selectedMaterielFilter}
            onChange={(e) => setSelectedMaterielFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Toutes références matériels</option>
            {modelesRefs.map((mod) => (
              <option key={mod.ref} value={mod.ref}>
                {mod.ref} — {mod.designation} ({mod.count} appareil{mod.count > 1 ? 's' : ''})
              </option>
            ))}
          </select>

          {/* Filtre Type (Litrage / Grammage) */}
          <select
            id="filter-capacite-type"
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tous types de mesure</option>
            <option value="litrage">💧 Litrage (l / cl - Encre)</option>
            <option value="grammage">⚖️ Grammage (g / kg - Toner)</option>
          </select>

          {/* Filtre Disponibilité Stock */}
          <select
            id="filter-stock-statut"
            value={selectedStockFilter}
            onChange={(e) => setSelectedStockFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Tous états de stock</option>
            <option value="en_stock">📦 En Stock disponible (0%)</option>
            <option value="utilise">📉 Sortis du stock (&gt; 0%)</option>
          </select>
        </div>

        {/* Bouton Ajouter Liquide d'écriture */}
        {isDSIAdmin && (
          <button
            id="btn-nouveau-liquide"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium text-sm rounded-lg hover:from-red-700 hover:to-red-800 shadow-xs shadow-red-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nouveau Liquide d'écriture
          </button>
        )}
      </div>

      {/* Tableau des Liquides d'écriture */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="table-liquides-ecriture">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">RÉF Liquide</th>
                <th className="py-3 px-4">Désignation</th>
                <th className="py-3 px-4">Réf. Interne Matériel Lié</th>
                <th className="py-3 px-4">Imprimantes / Équipements Associés</th>
                <th className="py-3 px-4">Capacité</th>
                <th className="py-3 px-4">Taux d'Utilisation</th>
                <th className="py-3 px-4">Statut Stock</th>
                {isDSIAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredComposants.length === 0 ? (
                <tr>
                  <td colSpan={isDSIAdmin ? 8 : 7} className="py-12 text-center text-gray-500">
                    <Droplets className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-700">Aucun liquide d'écriture trouvé</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchTerm || selectedMaterielFilter !== 'all' || selectedTypeFilter !== 'all' || selectedStockFilter !== 'all'
                        ? 'Essayez de réinitialiser vos critères de recherche ou filtres.'
                        : "Enregistrez un nouveau liquide d'écriture lié à la référence interne de vos imprimantes."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredComposants.map((comp) => {
                  const isEnStock = comp.utilisation === '0%';
                  const refUpper = (comp.refMateriel || comp.materielReference || comp.id_Materiel || '').trim().toUpperCase();
                  
                  // Trouver tous les matériels qui partagent cette référence interne
                  const associatedMats = materiels.filter((m) => {
                    const mRef = (m.reference || '').trim().toUpperCase();
                    return mRef === refUpper || m.id === comp.id_Materiel;
                  });

                  return (
                    <tr key={comp.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* REF_composant */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                            {comp.REF_composant}
                          </span>
                        </div>
                      </td>

                      {/* Désignation */}
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{comp.nom}</span>
                          {comp.description && (
                            <span className="text-xs text-gray-400 truncate max-w-xs">{comp.description}</span>
                          )}
                        </div>
                      </td>

                      {/* Référence Interne Matériel Lié */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-mono text-xs font-bold uppercase">
                            <Layers className="w-3.5 h-3.5 text-purple-600" />
                            {refUpper || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Imprimantes / Équipements Associés */}
                      <td className="py-3 px-4 text-gray-700">
                        {associatedMats.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                associatedMats.length > 1
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}>
                                <Printer className="w-3 h-3 text-blue-600" />
                                <span>
                                  {associatedMats.length} {associatedMats.length > 1 ? 'imprimantes compatibles' : 'imprimante compatible'}
                                </span>
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono truncate max-w-xs" title={associatedMats.map(m => `${m.designation} (S/N: ${m.codeSerie})`).join(' | ')}>
                              {associatedMats.map(m => m.codeSerie).join(', ')}
                            </div>
                          </div>
                        ) : comp.materielDesignation ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-900">{comp.materielDesignation}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            En attente d'imprimante avec la réf {refUpper}
                          </span>
                        )}
                      </td>

                      {/* Capacité (Litrage ou Grammage) */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                          {comp.capaciteType === 'litrage' ? (
                            <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                          ) : (
                            <Scale className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>
                            {comp.capaciteValeur} {comp.capaciteUnite}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            ({comp.capaciteType === 'litrage' ? 'Volume' : 'Poids'})
                          </span>
                        </div>
                      </td>

                      {/* Utilisation (0%, 25%, 50%, 75%, 100%) */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800">{comp.utilisation}</span>
                            <span className="text-[10px] text-gray-500">
                              {comp.utilisation === '0%'
                                ? 'Neuf'
                                : comp.utilisation === '100%'
                                ? 'Épuisé'
                                : 'Partiel'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                comp.utilisation === '0%'
                                  ? 'bg-emerald-500 w-0'
                                  : comp.utilisation === '25%'
                                  ? 'bg-blue-500 w-1/4'
                                  : comp.utilisation === '50%'
                                  ? 'bg-amber-500 w-1/2'
                                  : comp.utilisation === '75%'
                                  ? 'bg-orange-500 w-3/4'
                                  : 'bg-rose-500 w-full'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Statut Stock (Règle Métier : 0% = En Stock, sinon Stock - 1) */}
                      <td className="py-3 px-4">
                        {isEnStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            En stock (0%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            Stock - 1 ({comp.utilisation})
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {isDSIAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(comp)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Modifier ce liquide d'écriture"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCompToDelete(comp);
                                setDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer ce liquide d'écriture"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION / MODIFICATION LIQUIDE D'ÉCRITURE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingComp ? "Modifier le Liquide d'écriture" : "Nouveau Liquide d'écriture"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Lié à la référence interne du modèle matériel (partagé entre plusieurs machines).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalAlert && (
              <div className="mt-4">
                <FormAlert
                  type={modalAlert.type}
                  message={modalAlert.message}
                  onClose={() => setModalAlert(null)}
                />
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* REF_composant & Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    RÉF Liquide (Unique) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: LIQ-HP-01, TONER-404..."
                    value={form.REF_composant}
                    onChange={(e) => setForm({ ...form, REF_composant: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Référence consommable interne (majuscules)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Nom / Désignation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Encre Noire Haute Capacité, Toner HP 58A..."
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Matériel Lié par Référence Interne (Modèle) */}
              <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 space-y-2">
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Référence Interne du Matériel Lié (Modèle) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-purple-700 font-medium mb-1">
                      Choisir parmi les références existantes :
                    </label>
                    <select
                      value={form.refMateriel}
                      onChange={(e) => setForm({ ...form, refMateriel: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Sélectionner un modèle --</option>
                      {modelesRefs.map((mod) => (
                        <option key={mod.ref} value={mod.ref}>
                          {mod.ref} — {mod.designation} ({mod.count} appareil{mod.count > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-purple-700 font-medium mb-1">
                      Ou saisie manuelle (enregistrée en majuscules) :
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: HP-M404"
                      value={form.refMateriel}
                      onChange={(e) => setForm({ ...form, refMateriel: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-800">
                  <Printer className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    Deux imprimantes du même modèle partageant la référence <strong>{form.refMateriel || '...'}</strong> pourront utiliser ce liquide d'écriture.
                  </span>
                </div>
              </div>

              {/* Capacité Type : Litrage vs Grammage */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-3">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Type de Mesure de Capacité <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCapaciteTypeChange('litrage')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                      form.capaciteType === 'litrage'
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Droplets className="w-4 h-4" />
                    Litrage (Volume - Encre)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCapaciteTypeChange('grammage')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
                      form.capaciteType === 'grammage'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    Grammage (Poids - Toner)
                  </button>
                </div>

                {/* Valeur et Unité Conditionnelle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Valeur de Capacité <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      placeholder="Ex: 250, 500, 1.5..."
                      value={form.capaciteValeur}
                      onChange={(e) => setForm({ ...form, capaciteValeur: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Unité de Mesure ({form.capaciteType === 'litrage' ? 'Litrage: cl / l' : 'Grammage: g / kg'}) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.capaciteUnite}
                      onChange={(e) => setForm({ ...form, capaciteUnite: e.target.value as CapaciteUnite })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {form.capaciteType === 'litrage' ? (
                        <>
                          <option value="cl">cl (Centilitres)</option>
                          <option value="l">l (Litres)</option>
                        </>
                      ) : (
                        <>
                          <option value="g">g (Grammes)</option>
                          <option value="kg">kg (Kilogrammes)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Taux d'Utilisation : "0%", "25%", "50%", "75%", "100%" */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Taux d'Utilisation <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    form.utilisation === '0%'
                      ? 'bg-emerald-100 text-emerald-800'
                      : form.utilisation === '100%'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {form.utilisation === '0%' ? '✅ En Stock (0%)' : `Stock - 1 (${form.utilisation})`}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-1">
                  {(['0%', '25%', '50%', '75%', '100%'] as TauxUtilisationComposant[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm({ ...form, utilisation: val })}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        form.utilisation === val
                          ? val === '0%'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : val === '100%'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {/* Explication Règle de stockage */}
                <div className={`p-2.5 rounded-lg text-xs mt-2 border ${
                  form.utilisation === '0%'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {form.utilisation === '0%' ? (
                    <p className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Règle de stockage :</strong> Ce liquide d'écriture est à 0% d'utilisation, il <strong>appartient au stock disponible</strong>.</span>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span><strong>Règle de stockage :</strong> Niveau à {form.utilisation}, le liquide d'écriture est sorti du stock (<strong>Stock - 1</strong>).</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description / Remarques (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes techniques, compatibilité modèles, couleur d'encre..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>

              {/* Boutons d'Action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? 'Enregistrement...' : editingComp ? 'Mettre à jour' : "Créer le Liquide d'écriture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      <CustomConfirmModal
        isOpen={deleteConfirmOpen}
        title="Supprimer ce liquide d'écriture ?"
        message={
          compToDelete
            ? `Êtes-vous certain de vouloir supprimer le liquide d'écriture "${compToDelete.nom}" (Réf: ${compToDelete.REF_composant}) ? Cette action est irréversible.`
            : ''
        }
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        type="danger"
        itemsListTitle="Détails du liquide d'écriture à supprimer"
        itemsList={
          compToDelete
            ? [
                { label: 'Référence', sublabel: compToDelete.REF_composant },
                { label: 'Désignation', sublabel: compToDelete.nom },
                { label: 'Réf. Matériel Lié', sublabel: compToDelete.refMateriel || compToDelete.id_Materiel },
                { label: 'Capacité', sublabel: `${compToDelete.capaciteValeur} ${compToDelete.capaciteUnite}` },
                { label: 'Utilisation', sublabel: compToDelete.utilisation },
              ]
            : []
        }
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCompToDelete(null);
        }}
      />
    </div>
  );
};

export const LiquidesEcritureSection = ComposantsSection;
