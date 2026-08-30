import React from 'react';
import { AlertTriangle, Trash2, X, AlertCircle, ShieldAlert } from 'lucide-react';

export interface ConfirmModalItem {
  id?: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
}

export interface CustomConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  subtitle?: string;
  type?: 'danger' | 'warning' | 'info';
  message?: string;
  impacts?: string[];
  itemsListTitle?: string;
  itemsList?: ConfirmModalItem[];
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isBlocked?: boolean; // When action cannot be performed (e.g. invoice has materials linked)
}

export const CustomConfirmModal: React.FC<CustomConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  type = 'danger',
  message,
  impacts = [],
  itemsListTitle,
  itemsList = [],
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isLoading = false,
  isBlocked = false,
}) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                isBlocked
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isDanger
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : isWarning
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}
            >
              {isBlocked ? (
                <ShieldAlert className="w-5 h-5" />
              ) : isDanger ? (
                <Trash2 className="w-5 h-5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base leading-tight">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto flex-1 pr-0.5 space-y-4 text-xs">
          {message && (
            <p className="text-gray-700 leading-relaxed font-medium">
              {message}
            </p>
          )}

          {/* Detailed impacts warning list */}
          {impacts.length > 0 && (
            <div
              className={`p-4 rounded-2xl border space-y-2.5 ${
                isBlocked
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : isDanger
                  ? 'bg-red-50/70 border-red-200 text-red-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Conséquences de cette opération :</span>
              </div>
              <ul className="space-y-1.5 pl-1 font-medium leading-relaxed">
                {impacts.map((impact, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        isBlocked || isDanger ? 'bg-red-600' : 'bg-amber-600'
                      }`}
                    />
                    <span>{impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Linked items list */}
          {itemsList.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              {itemsListTitle && (
                <div className="text-[11px] font-bold text-gray-700">
                  {itemsListTitle} ({itemsList.length}) :
                </div>
              )}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {itemsList.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-xl shadow-2xs text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-gray-900 truncate">
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div className="text-[10px] text-gray-400 truncate">
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          item.badgeColor || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100 shrink-0 mt-4">
          {isBlocked ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-center"
            >
              J'ai compris (Fermer)
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 cursor-pointer disabled:opacity-50 text-center text-xs"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onConfirm}
                className={`px-5 py-2.5 font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 text-center text-xs text-white ${
                  isDanger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : isWarning
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <span>Traitement en cours...</span>
                ) : (
                  <>
                    {isDanger && <Trash2 className="w-4 h-4" />}
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
