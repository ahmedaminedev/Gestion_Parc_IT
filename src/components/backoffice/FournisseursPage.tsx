import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import { Fournisseur, Materiel, Facture } from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';

export const FournisseursPage: React.FC = () => {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(itParkService.getFournisseurs());
  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());
  const [factures, setFactures] = useState<Facture[]>(itParkService.getFactures());

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFrs, setEditingFrs] = useState<Fournisseur | null>(null);

  const [form, setForm] = useState({
    Fournisseur: '',
    email: '',
    telephone: '',
    adresse: '',
  });

  const [pageAlert, setPageAlert] = useState<{ type: 'error' | 'warning' | 'info' | 'success'; message: string } | null>(null);
  const [formAlert, setFormAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = itParkService.subscribe(() => {
      setFournisseurs(itParkService.getFournisseurs());
      setMateriels(itParkService.getMateriels());
      setFactures(itParkService.getFactures());
    });
    return unsub;
  }, []);

  const handleOpenAdd = () => {
    setEditingFrs(null);
    setFormAlert(null);
    setForm({
      Fournisseur: '',
      email: '',
      telephone: '',
      adresse: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (frs: Fournisseur) => {
    setEditingFrs(frs);
    setFormAlert(null);
    setForm({
      Fournisseur: frs.Fournisseur,
      email: frs.email || '',
      telephone: frs.telephone || '',
      adresse: frs.adresse || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAlert(null);

    const saved: Fournisseur = {
      id: editingFrs ? editingFrs.id : 'frs-' + Date.now(),
      Fournisseur: form.Fournisseur,
      email: form.email,
      telephone: form.telephone,
      adresse: form.adresse,
    };

    setIsSaving(true);
    const result = await itParkService.saveFournisseur(saved);
    setIsSaving(false);

    if (!result.success) {
      setFormAlert({ type: 'error', message: result.message || 'Impossible d\'enregistrer ce fournisseur.' });
      return;
    }

    setIsModalOpen(false);
    setPageAlert({ type: 'success', message: `Fournisseur "${saved.Fournisseur}" enregistré avec succès.` });
  };

  const handleDelete = async (id: string) => {
    const frs = fournisseurs.find(f => f.id === id);
    if (confirm(`Confirmez-vous la suppression du fournisseur "${frs?.Fournisseur || id}" ?`)) {
      const result = await itParkService.deleteFournisseur(id);
      if (!result.success) {
        setPageAlert({ type: 'error', message: result.message || 'Erreur lors de la suppression.' });
      } else {
        setPageAlert({ type: 'success', message: 'Fournisseur supprimé avec succès.' });
      }
    }
  };

  const filtered = fournisseurs.filter(f =>
    f.Fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6 bg-[#f8fafc] min-h-screen text-gray-900">
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestion des fournisseurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez vos partenaires technologiques et prestataires informatiques.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un fournisseur</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs max-w-md relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un fournisseur par nom ou email..."
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((frs) => {
          const matCount = materiels.filter(m => m.id_Fournisseur === frs.id).length;
          const fctCount = factures.filter(f => f.id_Fournisseur === frs.id).length;
          const totalHT = factures
            .filter(f => f.id_Fournisseur === frs.id)
            .reduce((acc, c) => acc + c.montantHT, 0);

          return (
            <div key={frs.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 text-base">{frs.Fournisseur}</h3>
                      <p className="text-[10px] text-gray-400">Partenaire agréé IT</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(frs)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(frs.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
                  {frs.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{frs.email}</span>
                    </div>
                  )}
                  {frs.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{frs.telephone}</span>
                    </div>
                  )}
                  {frs.adresse && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{frs.adresse}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-medium">Matériels</p>
                  <p className="font-extrabold text-gray-900">{matCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-medium">Factures</p>
                  <p className="font-extrabold text-gray-900">{fctCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-medium">Total HT</p>
                  <p className="font-extrabold text-emerald-600">{totalHT.toLocaleString()} TND</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-gray-900 text-base">
                {editingFrs ? "Modifier le Fournisseur" : "Nouveau Fournisseur"}
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
                  Nom de l'entreprise fournisseur
                </label>
                <input
                  type="text"
                  value={form.Fournisseur}
                  onChange={(e) => setForm({ ...form, Fournisseur: e.target.value })}
                  placeholder="ex: Tech Solutions, Dell Tunisie"
                  className="w-full px-3 py-2 border rounded-xl text-gray-900 bg-gray-50 border-gray-200 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email de contact</label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ex: contact@fournisseur.tn"
                  className="w-full px-3 py-2 border rounded-xl text-gray-900 bg-gray-50 border-gray-200 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="ex: +216 71 000 111"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="ex: Les Berges du Lac, Tunis"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-hidden"
                />
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
  );
};
