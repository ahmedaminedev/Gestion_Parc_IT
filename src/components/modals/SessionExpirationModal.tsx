import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, RefreshCw, LogOut, ShieldCheck, Clock, X } from 'lucide-react';
import { authService } from '../../services/authService';

interface SessionExpirationModalProps {
  isOpen: boolean;
  initialSeconds?: number;
  onClose: () => void;
  onLogout: () => void;
}

export const SessionExpirationModal: React.FC<SessionExpirationModalProps> = ({
  isOpen,
  initialSeconds = 60,
  onClose,
  onLogout,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [isRenewing, setIsRenewing] = useState<boolean>(false);
  const [renewalSuccess, setRenewalSuccess] = useState<boolean>(false);

  const maxWarningSeconds = initialSeconds || authService.getSessionWarningBeforeExpirySec() || 30;

  useEffect(() => {
    if (!isOpen) return;

    // Synchronize initial seconds (strictly capped to warning window to prevent exposing raw session duration)
    const currentRemaining = authService.getRemainingSeconds();
    const safeInitial = currentRemaining > 0 && currentRemaining <= maxWarningSeconds 
      ? currentRemaining 
      : maxWarningSeconds;

    setSecondsLeft(safeInitial);
    setIsRenewing(false);
    setRenewalSuccess(false);

    const interval = setInterval(() => {
      // Do not recalculate if user is already renewing or if renewal succeeded
      const remaining = authService.getRemainingSeconds();
      if (remaining <= 0) {
        clearInterval(interval);
        setSecondsLeft(0);
        console.warn('[MODAL ALERTE ⏳] Compte à rebours terminé (0s). Fermeture de l\'alerte et bascule sur "Session Expirée".');
        onClose();
        authService.clearSession();
        window.dispatchEvent(
          new CustomEvent('parcit_session_expired', {
            detail: { reason: "Votre session a expiré en raison d'une période d'inactivité prolongée." },
          })
        );
      } else if (remaining <= maxWarningSeconds) {
        // Only update if it is within the alert window (< 30s)
        setSecondsLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, initialSeconds, maxWarningSeconds, onClose]);

  if (!isOpen) return null;

  const handleProlongSession = async () => {
    setIsRenewing(true);
    try {
      const res = await authService.prolongSession();
      if (res.success) {
        setRenewalSuccess(true);
        setTimeout(() => {
          setIsRenewing(false);
          setRenewalSuccess(false);
          onClose();
        }, 1000);
      } else {
        setIsRenewing(false);
        onClose();
        authService.clearSession();
        window.dispatchEvent(
          new CustomEvent('parcit_session_expired', {
            detail: { reason: "Impossible de prolonger la session. Veuillez vous reconnecter." },
          })
        );
      }
    } catch (err) {
      setIsRenewing(false);
      onClose();
      authService.clearSession();
      window.dispatchEvent(
        new CustomEvent('parcit_session_expired', {
          detail: { reason: "Erreur de connexion lors du renouvellement." },
        })
      );
    }
  };

  const handleManualLogout = () => {
    console.log('[MODAL ALERTE 🚪] Clic utilisateur sur "Se déconnecter".');
    onLogout();
  };

  // Format seconds as MM:SS (e.g. 00:28) - strictly clamped to warning window
  const formatTime = (totalSeconds: number) => {
    const clamped = Math.min(maxWarningSeconds, Math.max(0, totalSeconds));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Compute progress percentage for visual countdown bar based on dynamic warning duration
  const progressPercent = Math.min(100, Math.max(0, (Math.min(secondsLeft, maxWarningSeconds) / maxWarningSeconds) * 100));

  return (
    <AnimatePresence>
      <div
        id="session-expiration-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] font-sans select-none"
      >
        <motion.div
          id="session-expiration-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-900/20 border border-slate-100 text-slate-900 overflow-hidden"
        >
          {/* Top-Right Close Button */}
          <button
            id="close-session-expiration-modal-btn"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {renewalSuccess ? (
            /* Success Feedback State */
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-xs"
              >
                <ShieldCheck className="w-9 h-9" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Session prolongée avec succès !</h3>
              <p className="text-sm text-slate-500">
                Vos jetons de sécurité et votre temps de session ont été renouvelés.
              </p>
            </div>
          ) : (
            /* Warning & Countdown State */
            <div>
              {/* Header with Icon, Title and Subtitle */}
              <div className="flex items-center gap-4 pr-8">
                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0 shadow-xs">
                  <AlertTriangle className="w-7 h-7 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">
                    Votre session va expirer
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Restez connecté en prolongeant votre session.
                  </p>
                </div>
              </div>

              {/* Progress bar and Time Pill Row */}
              <div className="flex items-center gap-4 my-6">
                {/* Horizontal Progress bar */}
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Right Time Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200/80 rounded-full text-red-600 font-mono text-xs sm:text-sm font-semibold shrink-0 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-red-500" />
                  <span>{formatTime(secondsLeft)}</span>
                </div>
              </div>

              {/* Information Message Box */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mb-6 shadow-2xs">
                <p className="text-sm font-medium text-slate-800">
                  Votre session expire dans : <span className="text-red-600 font-bold font-mono ml-1">{formatTime(secondsLeft)}</span>
                </p>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-2.5">
                  Pour des raisons de sécurité, votre session sera automatiquement clôturée. Cliquez sur « Continuer ma session » pour rester connecté ou sur « Se déconnecter » pour terminer votre session et conserver vos modifications en cours.
                </p>
              </div>

              {/* Action Buttons (Red Primary + White Secondary) */}
              <div className="flex flex-col sm:flex-row gap-3.5">
                <button
                  id="prolong-session-btn"
                  onClick={handleProlongSession}
                  disabled={isRenewing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isRenewing ? 'animate-spin' : ''}`} />
                  <span>{isRenewing ? 'Prolongation...' : 'Continuer ma session'}</span>
                </button>

                <button
                  id="logout-session-btn"
                  onClick={handleManualLogout}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium text-sm border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-slate-600" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
