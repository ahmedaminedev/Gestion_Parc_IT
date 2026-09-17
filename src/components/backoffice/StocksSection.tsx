import React, { useState, useEffect } from 'react';
import {
  Layers,
  Boxes,
  Scale,
  Droplets,
  RefreshCw,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import { StockGlobalSummary, StockGroupeItem } from '../../types/itPark';

interface StocksSectionProps {
  onNavigateToComposants?: () => void;
  onNavigateToMateriels?: () => void;
}

export const StocksSection: React.FC<StocksSectionProps> = ({
  onNavigateToComposants,
  onNavigateToMateriels,
}) => {
  const [stocksSummary, setStocksSummary] = useState<StockGlobalSummary>(itParkService.getStocksSummary());
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const refreshStocks = async () => {
    setIsLoading(true);
    try {
      const summary = await itParkService.fetchStocksSummary();
      if (summary) {
        setStocksSummary(summary);
      } else {
        setStocksSummary(itParkService.getStocksSummary());
      }
      setLastRefreshed(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsub = itParkService.subscribe(() => {
      setStocksSummary(itParkService.getStocksSummary());
    });
    refreshStocks();
    return unsub;
  }, []);

  const {
    totalMateriels,
    materielsEnStock,
    materielsEnService,
    materielsEnPanne,
    totalComposants,
    composantsEnStock,
    composantsSortisDuStock,
    stockGlobalCalcule,
    tauxDisponibiliteGlobal,
    groupesStock,
    composantsSummary,
  } = stocksSummary;

  const totalArticlesPhysiques = totalMateriels + totalComposants;

  return (
    <div className="space-y-6">
      {/* En-tête Information et Rafraîchissement */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-red-100 text-red-600">
              <Boxes className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              Gestionnaire des Stocks & Métrologie Globale DSI
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Calcul dynamique en direct pour l'affichage et les statistiques. Chaque groupe de matériel dispose de son stock,
            les liquides d'écriture sont régis par la règle <strong>0% = en stock, sinon stock - 1</strong>, et le <strong>stock global</strong> est consolidé en temps réel sans duplication en base de données.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
            Total parc : <strong>{totalArticlesPhysiques}</strong> articles physiques
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            Mis à jour: {lastRefreshed.toLocaleTimeString('fr-FR')}
          </span>
          <button
            onClick={refreshStocks}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock Global Total */}
        <div className="bg-gradient-to-br from-slate-900 to-gray-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Stock Global Consolidé
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Direct DSI
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{stockGlobalCalcule}</span>
            <span className="text-xs text-gray-400">unités en stock</span>
          </div>
          <div className="mt-2 text-xs text-gray-300 flex items-center justify-between border-t border-gray-700/60 pt-2">
            <span>Matériels : <strong>{materielsEnStock}</strong></span>
            <span>+</span>
            <span>Liquides d'écriture (0%) : <strong>{composantsEnStock}</strong></span>
          </div>
        </div>

        {/* Taux Disponibilité Global */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Disponibilité Globale
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{tauxDisponibiliteGlobal}%</span>
            <span className="text-xs text-emerald-600 font-medium">du parc global</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, tauxDisponibiliteGlobal))}%` }}
            />
          </div>
        </div>

        {/* Matériels en Stock vs En Service */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Stock des Matériels
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{materielsEnStock}</span>
            <span className="text-xs text-gray-500">/ {totalMateriels} totaux</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-blue-600">En service: <strong>{materielsEnService}</strong></span>
            <span className="text-rose-600">En panne: <strong>{materielsEnPanne}</strong></span>
          </div>
        </div>

        {/* Composants en Stock vs Sortis */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Stock des Liquides d'écriture
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{composantsEnStock}</span>
            <span className="text-xs text-emerald-600 font-medium">(à 0% usage)</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2">
            <span>Total : <strong>{totalComposants}</strong></span>
            <span className="text-amber-600">Stock -1 (&gt;0%): <strong>{composantsSortisDuStock}</strong></span>
          </div>
        </div>
      </div>

      {/* SECTION 1 : STOCK PAR GROUPE MATÉRIEL */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-700" />
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                Stock Dédié par Groupe de Matériel
              </h3>
              <p className="text-xs text-gray-500">
                Chaque groupe matériel possède ses stocks propres (matériels + liquides d'écriture rattachés).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToMateriels && (
              <button
                onClick={onNavigateToMateriels}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
              >
                Gérer les Matériels <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onNavigateToComposants && (
              <button
                onClick={onNavigateToComposants}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
              >
                Gérer les Liquides d'écriture <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Groupe Matériel</th>
                <th className="py-3 px-4 text-center">Total Matériels</th>
                <th className="py-3 px-4 text-center">Matériels en Stock</th>
                <th className="py-3 px-4 text-center">En Service</th>
                <th className="py-3 px-4 text-center">En Panne</th>
                <th className="py-3 px-4 text-center">Liquides Liés</th>
                <th className="py-3 px-4 text-center">Liquides en Stock (0%)</th>
                <th className="py-3 px-4 text-center">Liquides Consommés</th>
                <th className="py-3 px-4 text-right">Disponibilité Groupe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupesStock.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Aucun groupe matériel configuré pour le moment.
                  </td>
                </tr>
              ) : (
                groupesStock.map((item: StockGroupeItem) => {
                  const totalGroupeArticles = item.totalMateriels + item.composantsAssociesCount;
                  const totalEnStockGroupe = item.enStock + item.composantsEnStock;
                  const pctDispo = totalGroupeArticles > 0
                    ? Math.round((totalEnStockGroupe / totalGroupeArticles) * 100)
                    : 100;

                  return (
                    <tr key={item.idGroupe} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                          <span>{item.nomGroupe}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                        {item.totalMateriels}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {item.enStock}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-blue-700 font-medium">
                        {item.enService}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.enPanne > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            {item.enPanne}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-gray-700">
                        {item.composantsAssociesCount}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          {item.composantsEnStock}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-amber-700 font-medium">
                        {item.composantsEnService + item.composantsEpuises}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${pctDispo}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-800">{pctDispo}%</span>
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

      {/* SECTION 2 : SYNTHÈSE COMPOSANTS PAR TYPE (GRAMMAGE VS LITRAGE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grammage (g / kg) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  Stock Liquides d'écriture - Grammage (Poids)
                </h4>
                <p className="text-xs text-gray-500">
                  Unités g (Grammes) & kg (Kilogrammes)
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800">
              {composantsSummary?.parType.grammage.total || 0} liquide(s)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-xs text-emerald-800 font-medium block">
                En Stock (0% utilisation)
              </span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                {composantsSummary?.parType.grammage.enStock || 0}
              </span>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">
                Disponibles immédiatement
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
              <span className="text-xs text-amber-800 font-medium block">
                Sortis du Stock (&gt;0% utilisation)
              </span>
              <span className="text-2xl font-bold text-amber-700 mt-1 block">
                {composantsSummary?.parType.grammage.enCours || 0}
              </span>
              <span className="text-[10px] text-amber-600 mt-0.5 block">
                En service / Épuisés (Stock -1)
              </span>
            </div>
          </div>
        </div>

        {/* Litrage (l / cl) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  Stock Liquides d'écriture - Litrage (Volume)
                </h4>
                <p className="text-xs text-gray-500">
                  Unités l (Litres) & cl (Centilitres)
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-100 text-cyan-800">
              {composantsSummary?.parType.litrage.total || 0} liquide(s)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-xs text-emerald-800 font-medium block">
                En Stock (0% utilisation)
              </span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                {composantsSummary?.parType.litrage.enStock || 0}
              </span>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">
                Disponibles immédiatement
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
              <span className="text-xs text-amber-800 font-medium block">
                Sortis du Stock (&gt;0% utilisation)
              </span>
              <span className="text-2xl font-bold text-amber-700 mt-1 block">
                {composantsSummary?.parType.litrage.enCours || 0}
              </span>
              <span className="text-[10px] text-amber-600 mt-0.5 block">
                En service / Épuisés (Stock -1)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
