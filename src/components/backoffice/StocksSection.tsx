import React, { useState, useEffect } from 'react';
import {
  Layers,
  Boxes,
  Droplets,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle
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
    totalMateriels = 0,
    materielsEnStock = 0,
    materielsEnService = 0,
    materielsEnPanne = 0,
    totalComposants = 0,
    composantsEnStock = 0,
    composantsSortisDuStock = 0,
    stockGlobalCalcule = 0,
    tauxDisponibiliteGlobal = 100,
    groupesStock = [],
    composantsSummary,
  } = stocksSummary || {};

  const totalArticlesPhysiques = totalMateriels + totalComposants;

  return (
    <div className="space-y-6">
      {/* En-tête : Style épuré conforme au design du site */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Gestionnaire des Stocks & Métrologie Globale DSI
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Calcul dynamique et consolidé en temps réel du parc matériel et des liquides d'écriture (règle : 0% = en stock, sinon stock - 1).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs text-gray-600 font-medium bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
            Total parc : <strong className="text-gray-900">{totalArticlesPhysiques}</strong> articles
          </span>
          <button
            onClick={refreshStocks}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title={`Dernière actualisation : ${lastRefreshed.toLocaleTimeString('fr-FR')}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards Épurées & Lisibles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock Global Consolidé */}
        <div className="bg-gradient-to-br from-slate-900 to-gray-800 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Stock Global Consolidé
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              En direct
            </span>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{stockGlobalCalcule}</span>
            <span className="text-xs text-gray-400">unités en stock</span>
          </div>
          <div className="text-[11px] text-gray-300 flex items-center justify-between border-t border-gray-700/60 pt-2">
            <span>Matériels : <strong>{materielsEnStock}</strong></span>
            <span>+</span>
            <span>Liquides (0%) : <strong>{composantsEnStock}</strong></span>
          </div>
        </div>

        {/* Taux Disponibilité Global */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Disponibilité Globale
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{tauxDisponibiliteGlobal}%</span>
            <span className="text-xs text-emerald-600 font-medium">disponible</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, tauxDisponibiliteGlobal))}%` }}
            />
          </div>
        </div>

        {/* Stock Matériels */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Stock Matériels
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{materielsEnStock}</span>
            <span className="text-xs text-gray-500">/ {totalMateriels} totaux</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-blue-600">En service : <strong>{materielsEnService}</strong></span>
            {materielsEnPanne > 0 && (
              <span className="text-rose-600">En panne : <strong>{materielsEnPanne}</strong></span>
            )}
          </div>
        </div>

        {/* Stock Liquides d'écriture (Litrage) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Stock Liquides (0%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{composantsEnStock}</span>
            <span className="text-xs text-cyan-600 font-medium">/ {totalComposants} totaux</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-emerald-600">Neufs (0%) : <strong>{composantsEnStock}</strong></span>
            <span className="text-amber-600">Entamés (&gt;0%) : <strong>{composantsSortisDuStock}</strong></span>
          </div>
        </div>
      </div>

      {/* TABLEAU SIMPLIFIÉ PAR GROUPE DE MATÉRIEL (Pas de surcharges de colonnes) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-700" />
            <h3 className="font-bold text-gray-900 text-sm">
              Stocks par Groupe de Matériel
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {onNavigateToMateriels && (
              <button
                onClick={onNavigateToMateriels}
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold cursor-pointer"
              >
                <span>Inventaire des Matériels</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onNavigateToComposants && (
              <button
                onClick={onNavigateToComposants}
                className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-800 font-semibold cursor-pointer"
              >
                <span>Gestion des Liquides</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Groupe de Matériel</th>
                <th className="py-3 px-4">Stock Matériels</th>
                <th className="py-3 px-4">Liquides d'écriture</th>
                <th className="py-3 px-4 text-center">
                  <div className="inline-flex items-center gap-1">
                    <span>Disponibilité</span>
                    <span className="cursor-help text-gray-400 hover:text-gray-600" title="Disponibilité en magasin (matériels libres / non affectés) et réserve de liquides neufs (0%)">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupesStock.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                    Aucun groupe de matériel configuré pour le moment.
                  </td>
                </tr>
              ) : (
                groupesStock.map((item: StockGroupeItem) => {
                  const hasLiquides = item.composantsAssociesCount > 0;
                  const pctDispoMat = item.totalMateriels > 0
                    ? Math.round((item.enStock / item.totalMateriels) * 100)
                    : 0;
                  const pctDispoLiq = hasLiquides
                    ? Math.round((item.composantsEnStock / item.composantsAssociesCount) * 100)
                    : null;

                  return (
                    <tr key={item.idGroupe} className="hover:bg-gray-50/70 transition-colors">
                      {/* Groupe Matériel */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{item.nomGroupe}</p>
                            <p className="text-[11px] text-gray-400">
                              {item.totalMateriels} matériel{item.totalMateriels > 1 ? 's' : ''} au total
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Stock Matériels */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {item.enStock} en stock
                          </span>
                          <span className="text-xs text-gray-500">
                            ({item.enService} en service{item.enPanne > 0 ? `, ${item.enPanne} en panne` : ''})
                          </span>
                        </div>
                      </td>

                      {/* Liquides d'écriture (Vide pour les matériels sans liquides comme PC/écrans) */}
                      <td className="py-3.5 px-4">
                        {!hasLiquides ? (
                          <span className="text-gray-300 font-mono text-sm" title="Aucun liquide requis pour ce matériel">
                            —
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                              <Droplets className="w-3 h-3 text-cyan-600" />
                              <span>{item.composantsEnStock} en stock (0%)</span>
                            </span>
                            {item.composantsEnService + item.composantsEpuises > 0 && (
                              <span className="text-xs text-amber-600 font-medium">
                                ({item.composantsEnService + item.composantsEpuises} entamé{item.composantsEnService + item.composantsEpuises > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Taux Disponibilité Groupe (Détaillé Matériels + Liquides pour éviter toute ambiguïté) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pctDispoMat > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                style={{ width: `${pctDispoMat}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-800 min-w-[32px] text-right">
                              {pctDispoMat}%
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {item.enStock}/{item.totalMateriels} matériel{item.totalMateriels > 1 ? 's' : ''} libre{item.enStock > 1 ? 's' : ''}
                          </span>

                          {hasLiquides && pctDispoLiq !== null && (
                            <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-800 bg-cyan-50/80 px-1.5 py-0.5 rounded border border-cyan-200" title="Réserve de liquides neufs (0%) disponibles">
                              <Droplets className="w-2.5 h-2.5 text-cyan-600" />
                              <span>Encre : {pctDispoLiq}% ({item.composantsEnStock}/{item.composantsAssociesCount} neuf{item.composantsEnStock > 1 ? 's' : ''})</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {onNavigateToMateriels && (
                          <button
                            onClick={onNavigateToMateriels}
                            className="text-xs text-gray-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
                          >
                            Consulter
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SYNTHÈSE DES LIQUIDES D'ÉCRITURE (Litrage uniquement - pas de toner/poudre) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">
                État des Liquides d'écriture (Litrage - cl / l)
              </h4>
              <p className="text-xs text-gray-500">
                Suivi du niveau de consommation selon la règle DSI : 0% = en stock, supérieur à 0% = décompté du stock.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 self-start sm:self-auto">
            {totalComposants} liquide{totalComposants > 1 ? 's' : ''} au total
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 0% Neuf en stock */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-bold">Neuf (0%)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-emerald-700 mt-1.5 block">
              {composantsSummary?.parUtilisation?.['0%'] ?? composantsEnStock ?? 0}
            </span>
            <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
              ✅ Compté en stock
            </span>
          </div>

          {/* 25% - 50% Entamé */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-800 font-bold">Entamé (25% - 50%)</span>
              <Droplets className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-700 mt-1.5 block">
              {(composantsSummary?.parUtilisation?.['25%'] ?? 0) + (composantsSummary?.parUtilisation?.['50%'] ?? 0)}
            </span>
            <span className="text-[11px] text-blue-600 mt-0.5 block font-medium">
              Sorti du stock (Stock - 1)
            </span>
          </div>

          {/* 75% Niveau bas */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-800 font-bold">Niveau bas (75%)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-amber-700 mt-1.5 block">
              {composantsSummary?.parUtilisation?.['75%'] ?? 0}
            </span>
            <span className="text-[11px] text-amber-600 mt-0.5 block font-medium">
              Sorti du stock (Stock - 1)
            </span>
          </div>

          {/* 100% Épuisé */}
          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-800 font-bold">Épuisé (100%)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-2xl font-bold text-rose-700 mt-1.5 block">
              {composantsSummary?.parUtilisation?.['100%'] ?? composantsSummary?.epuises ?? 0}
            </span>
            <span className="text-[11px] text-rose-600 mt-0.5 block font-medium">
              À renouveler (Stock - 1)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-4 h-4 text-cyan-600 shrink-0" />
          <span>
            Seuls les flacons ou cartouches liquides non entamés (0%) alimentent le compteur de stock disponible. Les équipements ne nécessitant pas de consommable liquide (ordinateurs, écrans, périphériques...) affichent un état vide dans le tableau.
          </span>
        </div>
      </div>
    </div>
  );
};
