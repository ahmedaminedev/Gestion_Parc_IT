import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, ShieldAlert, AlertCircle, ArrowRight } from 'lucide-react';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onClose,
  reason = "Votre session a expiré en raison d’une période d’inactivité prolongée.",
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="session-expired-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] font-sans select-none"
      >
        <motion.div
          id="session-expired-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white rounded-3xl p-7 sm:p-9 shadow-2xl shadow-slate-900/20 border border-slate-100 text-slate-900 overflow-hidden"
        >
          {/* Header Icon & Title */}
          <div className="flex items-center gap-4.5 mb-7">
            <div className="w-16 h-16 rounded-full bg-red-50/90 border border-red-100 flex items-center justify-center text-red-500 shrink-0 shadow-xs">
              <ShieldAlert className="w-8 h-8 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 leading-snug tracking-tight">
                Session Expirée
              </h3>
              <div className="flex items-center gap-1.5 text-red-500 text-sm font-medium mt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Déconnexion de sécurité</span>
              </div>
            </div>
          </div>

          {/* Body explanation Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 mb-7 shadow-2xs">
            <p className="text-base font-bold text-slate-900 leading-snug">
              {reason}
            </p>
            <p className="text-sm text-slate-500 leading-relaxed mt-3.5">
              Pour protéger l’intégrité de vos données du parc IT et votre compte, la session de sécurité a été invalidée. Veuillez vous reconnecter pour poursuivre votre travail.
            </p>
          </div>

          {/* Reconnect Action Button */}
          <button
            id="session-expired-reconnect-btn"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm sm:text-base shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <LogIn className="w-5 h-5 text-white" />
            <span>Se reconnecter à l'application</span>
            <ArrowRight className="w-5 h-5 text-white ml-0.5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

