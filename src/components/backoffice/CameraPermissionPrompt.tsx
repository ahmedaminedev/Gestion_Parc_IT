import React from 'react';
import { Camera, ShieldCheck, Check, Clock, X, Info } from 'lucide-react';

export type CameraPermissionDecision = 'always' | 'once' | 'cancel';

interface CameraPermissionPromptProps {
  title?: string;
  onDecision: (decision: CameraPermissionDecision) => void;
}

export const isInsideIframe = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
};

export const getStoredCameraPermission = (): boolean => {
  try {
    return localStorage.getItem('omoda_camera_permission') === 'always';
  } catch {
    return false;
  }
};

export const setStoredCameraPermission = (choice: 'always' | 'reset'): void => {
  try {
    if (choice === 'always') {
      localStorage.setItem('omoda_camera_permission', 'always');
    } else {
      localStorage.removeItem('omoda_camera_permission');
    }
  } catch {
    // Ignorer si localStorage restreint
  }
};

export const CameraPermissionPrompt: React.FC<CameraPermissionPromptProps> = ({
  title = "Photo",
  onDecision,
}) => {
  return (
    <div className="p-3.5 bg-gradient-to-br from-cyan-50 via-white to-blue-50/60 border-2 border-cyan-300 rounded-xl shadow-sm text-left animate-in fade-in zoom-in-95 duration-150">
      {/* En-tête */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="p-2 bg-cyan-100 text-cyan-800 rounded-lg shrink-0 mt-0.5 shadow-2xs">
          <Camera className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <span>Autorisation Caméra</span>
              <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-100/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 text-cyan-600" />
                Sécurisé local
              </span>
            </h5>
            <button
              type="button"
              onClick={() => onDecision('cancel')}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
              title="Annuler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
            Autorisez-vous l'accès à la caméra pour capturer : <span className="font-semibold text-gray-800">{title}</span> ?
          </p>
        </div>
      </div>

      {/* Note sécurité */}
      <div className="mb-3 px-2.5 py-1.5 bg-blue-50/80 border border-blue-100 rounded-lg flex items-center gap-1.5 text-[10px] text-blue-800">
        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Traitement 100% sur votre appareil (aucune image n'est transmise à l'extérieur).</span>
      </div>

      {/* 3 Choix explicites */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {/* Choix 1 : Une fois pour toute */}
        <button
          type="button"
          onClick={() => onDecision('always')}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-97 transition-all"
        >
          <Check className="w-3.5 h-3.5 text-cyan-200" />
          <span>Une fois pour toute</span>
        </button>

        {/* Choix 2 : Cette fois seulement */}
        <button
          type="button"
          onClick={() => onDecision('once')}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-cyan-50/80 text-cyan-900 border border-cyan-200 rounded-lg text-xs font-semibold cursor-pointer active:scale-97 transition-all"
        >
          <Clock className="w-3.5 h-3.5 text-cyan-600" />
          <span>Cette fois seulement</span>
        </button>

        {/* Choix 3 : Annuler l'autorisation */}
        <button
          type="button"
          onClick={() => onDecision('cancel')}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer active:scale-97 transition-all"
        >
          <X className="w-3.5 h-3.5 text-gray-500" />
          <span>Annuler</span>
        </button>
      </div>
    </div>
  );
};
