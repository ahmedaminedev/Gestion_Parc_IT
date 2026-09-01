import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Building,
  Layers,
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import { Facture, Fournisseur, Materiel } from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';

export const FacturesPage: React.FC = () => {
  const [factures, setFactures] = useState<Facture[]>(itParkService.getFactures());
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(itParkService.getFournisseurs());
  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());

  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFct, setEditingFct] = useState<Facture | null>(null);

  const [form, setForm] = useState({
    factureFrs: '',
    dateAcquisition: '',
    id_Fournisseur: '',
    montantHT: 0,
    statut: 'En attente' as Facture['statut'],
  });

  const [pageAlert, setPageAlert] = useState<{ type: 'error' | 'warning' | 'info' | 'success'; message: string } | null>(null);
  const [formAlert, setFormAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = itParkService.subscribe(() => {
      setFactures(itParkService.getFactures());
      setFournisseurs(itParkService.getFournisseurs());
      setMateriels(itParkService.getMateriels());
    });
    return unsub;
  }, []);

  const handleOpenAdd = () => {
    setEditingFct(null);
    setFormAlert(null);
    setForm({
      factureFrs: 'FACT-2025-' + Math.floor(100 + Math.random() * 900),
      dateAcquisition: new Date().toISOString().slice(0, 10),
      id_Fournisseur: fournisseurs[0]?.id || '',
      montantHT: 5000,
      statut: 'En attente',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: Facture) => {
    setEditingFct(f);
    setFormAlert(null);
    setForm({
      factureFrs: f.factureFrs,
      dateAcquisition: f.dateAcquisition,
      id_Fournisseur: f.id_Fournisseur,
      montantHT: f.montantHT,
      statut: f.statut,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAlert(null);

    const saved: Facture = {
      id: editingFct ? editingFct.id : 'fct-' + Date.now(),
      factureFrs: form.factureFrs,
      dateAcquisition: form.dateAcquisition,
      id_Fournisseur: form.id_Fournisseur,
      montantHT: Number(form.montantHT),
      statut: form.statut,
    };

    setIsSaving(true);
    const result = await itParkService.saveFacture(saved);
    setIsSaving(false);

    if (!result.success) {
      setFormAlert({ type: 'error', message: result.message || 'Impossible d\'enregistrer cette facture.' });
      return;
    }

    setIsModalOpen(false);
    setPageAlert({ type: 'success', message: `Facture "${saved.factureFrs}" enregistrée avec succès.` });
  };

  const handleDelete = async (id: string) => {
    const fct = factures.find(f => f.id === id);
    if (confirm(`Confirmez-vous la suppression de la facture "${fct?.factureFrs || id}" ?`)) {
      const result = await itParkService.deleteFacture(id);
      if (!result.success) {
        setPageAlert({ type: 'error', message: result.message || 'Erreur lors de la suppression.' });
      } else {
        setPageAlert({ type: 'success', message: 'Facture supprimée avec succès.' });
      }
    }
  };

  const getSupplierName = (id: string) => fournisseurs.find(f => f.id === id)?.Fournisseur || 'Inconnu';

  const filtered = factures.filter(f => {
    const matchesSearch =
      f.factureFrs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSupplierName(f.id_Fournisseur).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = statutFilter === 'all' || f.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  const totalMontantHT = factures.reduce((acc, c) => acc + c.montantHT, 0);
  const totalPayee = factures.filter(f => f.statut === 'Payée').reduce((acc, c) => acc + c.montantHT, 0);
  const totalAttente = factures.filter(f => f.statut === 'En attente').reduce((acc, c) => acc + c.montantHT, 0);

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-gray-900">
      <div className="max-w-[1400px] 2xl:max-w-[1480px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 space-y-6 lg:space-y-8">
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestion des factures</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des pièces comptables, règlements et factures fournisseurs de votre parc informatique.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une facture</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-xs font-medium text-gray-500">Total Cumulé Facturé</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalMontantHT.toLocaleString()} TND</p>
          <p className="text-[10px] text-gray-400 mt-1">{factures.length} factures enregistrées</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-xs font-medium text-gray-500">Montant Payé</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{totalPayee.toLocaleString()} TND</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">Factures réglées</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-xs font-medium text-gray-500">En attente de paiement</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{totalAttente.toLocaleString()} TND</p>
          <p className="text-[10px] text-amber-600 font-bold mt-1">À décaisser</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {/* Filters and Search */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par n° facture, nom de fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-black focus:outline-hidden transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:outline-hidden"
            >
              <option value="all">Tous les statuts</option>
              <option value="Payée">Payée</option>
              <option value="En attente">En attente</option>
              <option value="En retard">En retard</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-5">Numéro Facture</th>
                <th className="py-3.5 px-5">Fournisseur</th>
                <th className="py-3.5 px-5">Date d'acquisition</th>
                <th className="py-3.5 px-5">Montant HT</th>
                <th className="py-3.5 px-5">Statut</th>
                <th className="py-3.5 px-5">Équipements liés</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                    <p className="font-semibold text-gray-600 text-sm">Aucune facture trouvée</p>
                    <p className="text-xs text-gray-400 mt-1">Créez une nouvelle facture ou modifiez vos critères de recherche.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const linkedCount = materiels.filter(m => m.id_Facture === f.id).length;
                  return (
                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-gray-900">
                        {f.factureFrs}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 font-medium text-gray-800">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          <span>{getSupplierName(f.id_Fournisseur)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-gray-500 font-medium">
                        {f.dateAcquisition}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-gray-900">
                        {f.montantHT.toLocaleString()} TND
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            f.statut === 'Payée'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : f.statut === 'En attente'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {f.statut}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          linkedCount > 0
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Layers className="w-3 h-3" />
                          {linkedCount} matériel{linkedCount > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(f)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-gray-900 text-base">
                {editingFct ? "Modifier la Facture" : "Nouvelle Facture"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formAlert && (
              <FormAlert
                type={formAlert.type}
                message={formAlert.message}
                onClose={() => setFormAlert(null)}
                className="mt-4 shrink-0"
              />
            )}

            <form noValidate onSubmit={handleSave} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-0.5">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  N° Facture Fournisseur
                </label>
                <input
                  type="text"
                  value={form.factureFrs}
                  onChange={(e) => setForm({ ...form, factureFrs: e.target.value })}
                  placeholder="ex: FACT-2025-078"
                  className="w-full px-3 py-2 border rounded-xl font-mono text-gray-900 bg-gray-50 border-gray-200 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fournisseur</label>
                <select
                  value={form.id_Fournisseur}
                  onChange={(e) => setForm({ ...form, id_Fournisseur: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-hidden"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {fournisseurs.map(frs => (
                    <option key={frs.id} value={frs.id}>{frs.Fournisseur}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date d'acquisition</label>
                  <input
                    type="date"
                    value={form.dateAcquisition}
                    onChange={(e) => setForm({ ...form, dateAcquisition: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Montant HT (TND)</label>
                  <input
                    type="number"
                    value={form.montantHT}
                    onChange={(e) => setForm({ ...form, montantHT: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-bold bg-gray-50 border-gray-200 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Statut du règlement</label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value as Facture['statut'] })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-hidden"
                >
                  <option value="Payée">Payée (Règlement effectué)</option>
                  <option value="En attente">En attente (En cours de traitement)</option>
                  <option value="En retard">En retard (Échéance dépassée)</option>
                </select>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
