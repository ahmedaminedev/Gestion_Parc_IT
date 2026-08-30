import React, { useState, useEffect } from 'react';
import {
  Mail,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Building,
  RefreshCw,
  X,
  Check,
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { authService, AuthUser } from '../../services/authService';

export const ProfilePage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getUser());

  // Part 1: Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);

  // Part 2: Forgot Password / OTP Flow State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('');
  const [showOtpNewPass, setShowOtpNewPass] = useState(false);
  const [showOtpConfirmPass, setShowOtpConfirmPass] = useState(false);
  const [isResettingWithOtp, setIsResettingWithOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [otpSimulationNotice, setOtpSimulationNotice] = useState<boolean>(false);
  const [otpTimer, setOtpTimer] = useState<number>(900); // 15 minutes = 900 seconds
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);

  useEffect(() => {
    const unsub = authService.subscribe(() => {
      setCurrentUser(authService.getUser());
    });
    return unsub;
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isOtpModalOpen && otpSentAt) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - otpSentAt) / 1000);
        const remaining = Math.max(0, 900 - elapsed);
        setOtpTimer(remaining);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOtpModalOpen, otpSentAt]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handler: Part 1 - Change Password with Old Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePassError('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    if (newPassword.length < 6) {
      setChangePassError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePassError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    if (currentPassword === newPassword) {
      setChangePassError('Le nouveau mot de passe doit être différent de votre ancien mot de passe.');
      return;
    }

    setIsChangingPass(true);
    try {
      const result = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (result.success) {
        setChangePassSuccess(result.message || 'Mot de passe modifié avec succès. Un email professionnel de confirmation vous a été envoyé.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setChangePassError(result.message || 'Erreur lors du changement de mot de passe.');
      }
    } catch (err: any) {
      setChangePassError(err.message || 'Erreur lors de la communication avec le serveur.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Handler: Part 2 - Trigger OTP Request
  const handleRequestOtp = async () => {
    setOtpError(null);
    setOtpSuccessMessage(null);
    setIsSendingOtp(true);

    try {
      const result = await authService.requestPasswordOtp(currentUser?.email);
      if (result.success) {
        setOtpSentAt(Date.now());
        setOtpTimer(900);
        setOtpSimulationNotice(!!result.isSimulation);
        setIsOtpModalOpen(true);
      } else {
        setChangePassError(result.message || 'Impossible d\'envoyer le code OTP.');
      }
    } catch (err: any) {
      setChangePassError(err.message || 'Erreur lors de l\'envoi du code OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handler: Part 2 - Verify OTP and Reset Password
  const handleResetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const cleanOtp = otpCode.replace(/\s+/g, '').trim();
    if (!cleanOtp) {
      setOtpError('Veuillez saisir le code OTP à 6 chiffres reçu par email.');
      return;
    }

    if (!otpNewPassword || !otpConfirmPassword) {
      setOtpError('Veuillez renseigner et confirmer le nouveau mot de passe.');
      return;
    }

    if (otpNewPassword.length < 6) {
      setOtpError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (otpNewPassword !== otpConfirmPassword) {
      setOtpError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    setIsResettingWithOtp(true);
    try {
      const result = await authService.resetPasswordWithOtp({
        otpCode: cleanOtp,
        newPassword: otpNewPassword,
        confirmPassword: otpConfirmPassword,
        email: currentUser?.email,
      });

      if (result.success) {
        setOtpSuccessMessage(result.message || 'Votre mot de passe a été réinitialisé avec succès !');
        setTimeout(() => {
          setIsOtpModalOpen(false);
          setOtpCode('');
          setOtpNewPassword('');
          setOtpConfirmPassword('');
          setOtpSuccessMessage(null);
          setChangePassSuccess('Votre mot de passe a été réinitialisé avec succès via le code OTP. Un email de confirmation a été envoyé à votre adresse.');
        }, 2000);
      } else {
        setOtpError(result.message || 'Code OTP invalide ou expiré.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setIsResettingWithOtp(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-[#0c1017] via-[#161c24] to-[#1e293b] rounded-2xl p-5 sm:p-6 text-white border border-gray-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-lg sm:text-xl font-black shadow-md shadow-red-900/30 border border-red-400/30 shrink-0">
              {getInitials(currentUser?.beneficiaire)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                  {currentUser?.beneficiaire || 'Mon Profil Collaborateur'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Compte Actif
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {currentUser?.email}
                </span>
                <span className="text-gray-600 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5 text-red-400 font-medium">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  {currentUser?.role || 'Collaborateur'}
                </span>
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto bg-gray-900/80 backdrop-blur-xs px-4 py-3 rounded-xl border border-gray-700/80 text-xs text-gray-300 space-y-1">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Dernière activité : <strong className="text-white">{currentUser?.derniereActivite || "À l'instant"}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Espace : <strong className="text-white">OMODA & JAECOO Tunisie</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Success Notification */}
      {changePassSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-xs animate-in slide-in-from-top duration-150">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">
            <p className="font-bold">{changePassSuccess}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Un email professionnel d'information a été transmis à votre adresse <strong>{currentUser?.email}</strong>.
            </p>
          </div>
          <button onClick={() => setChangePassSuccess(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section Title */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-600" />
          Gestion de la Sécurité & Mots de passe
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Gérez l'accès à votre compte professionnel créé par le Responsable IT. Vous pouvez modifier votre mot de passe ou le réinitialiser par code OTP sécurisé.
        </p>
      </div>

      {/* TWO SECTIONS GRID (As requested) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* ================= PARTIE 1 : MODIFIER LE MOT DE PASSE (AVEC ANCIEN MDP) ================= */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-sm space-y-5 hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Modifier mon mot de passe</h3>
                <p className="text-xs text-gray-500">Mise à jour directe avec votre mot de passe actuel</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
              Méthode Standard
            </span>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            💡 Saisissez le mot de passe initial transmis par le Responsable IT ou votre mot de passe actuel, puis choisissez votre nouveau mot de passe sécurisé. Un <strong>email de confirmation</strong> vous sera automatiquement envoyé.
          </p>

          {changePassError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Attention :</strong>
                <span>{changePassError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Input 1: Ancien Mot de Passe */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Ancien mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Saisissez votre ancien mot de passe..."
                  className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Input 2: Nouveau Mot de Passe */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Nouveau mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Au moins 6 caractères..."
                  className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        newPassword.length < 6
                          ? 'w-1/4 bg-red-500'
                          : newPassword.length < 9
                          ? 'w-2/3 bg-amber-500'
                          : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">
                    {newPassword.length < 6
                      ? 'Trop court'
                      : newPassword.length < 9
                      ? 'Moyen'
                      : 'Robuste'}
                  </span>
                </div>
              )}
            </div>

            {/* Input 3: Copie de Nouveau Mot de Passe (Confirmation) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez le nouveau mot de passe..."
                  className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && (
                <p className="text-[11px] mt-1 flex items-center gap-1 font-medium">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Les mots de passe correspondent
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Les mots de passe ne correspondent pas
                    </span>
                  )}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChangingPass ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validation & Envoi email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Valider & Envoyer l'email de confirmation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ================= PARTIE 2 : MOT DE PASSE OUBLIÉ (FLUX OTP SÉCURISÉ) ================= */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-sm space-y-5 hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Mot de passe oublié / Récupération</h3>
                <p className="text-xs text-gray-500">Réinitialisation sécurisée par Code OTP par Email</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              Code OTP Email
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/60 p-3.5 rounded-xl border border-blue-100/80">
              🛡️ Vous ne vous souvenez plus de votre ancien mot de passe ?
              Cliquez sur le bouton ci-dessous : un <strong>code de vérification à usage unique (OTP)</strong> à 6 chiffres vous sera expédié sur votre email professionnel (<strong>{currentUser?.email}</strong>).
            </p>

            <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-500" />
                Processus de sécurité en 3 étapes :
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Cliquez sur « Mots de passe oublié ou changer mot de passe »</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Saisissez le code OTP reçu par email dans la fenêtre modale</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Définissez et confirmez votre nouveau mot de passe</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleRequestOtp}
              disabled={isSendingOtp}
              className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Génération & Envoi du code OTP...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Mot de passe oublié ou changer mot de passe</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Le code OTP sera envoyé instantanément à : <span className="font-semibold text-gray-600">{currentUser?.email}</span>
            </p>
          </div>
        </div>

      </div>

      {/* ================= FENÊTRE MODALE OTP (Comme requis par le prompt) ================= */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-200 relative my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setIsOtpModalOpen(false)}
              className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate">Vérification de Sécurité (OTP)</h3>
                <p className="text-xs text-gray-500 truncate">Réinitialisation de votre mot de passe</p>
              </div>
            </div>

            {/* Success state */}
            {otpSuccessMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg">Mot de passe réinitialisé !</h4>
                <p className="text-xs text-gray-600 max-w-xs mx-auto">
                  {otpSuccessMessage} Un email de confirmation a été envoyé à <strong>{currentUser?.email}</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetWithOtp} className="space-y-4 pt-4 overflow-y-auto flex-1 pr-0.5">
                <div className="bg-blue-50 text-blue-900 p-3.5 rounded-xl text-xs border border-blue-100 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold">Code OTP envoyé à votre email :</p>
                    <p className="font-mono text-blue-700 mt-0.5 break-all">{currentUser?.email}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-blue-800 font-semibold flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Code valide pendant : <strong className="text-red-600 font-mono">{formatTimer(otpTimer)}</strong></span>
                    </div>
                  </div>
                </div>

                {otpSimulationNotice && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-xs">
                    ℹ️ <strong>Mode simulation :</strong> SMTP local actif. Le code OTP a été enregistré et validé dans le journal système.
                  </div>
                )}

                {otpError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* CHAMP 1 : CODE OTP */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Code OTP à 6 chiffres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 849201"
                    className="w-full px-4 py-2.5 text-center text-xl font-mono tracking-widest bg-gray-50 border-2 border-red-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-900 font-bold"
                    required
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] gap-2 flex-wrap">
                    <span className="text-gray-400">Consultez votre boîte de réception</span>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isSendingOtp}
                      className="text-red-600 hover:text-red-800 font-semibold cursor-pointer underline disabled:opacity-50"
                    >
                      Renvoyer un nouveau code
                    </button>
                  </div>
                </div>

                {/* CHAMP 2 : NOUVEAU MOT DE PASSE */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nouveau mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showOtpNewPass ? 'text' : 'password'}
                      value={otpNewPassword}
                      onChange={(e) => setOtpNewPassword(e.target.value)}
                      placeholder="Au moins 6 caractères..."
                      className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOtpNewPass(!showOtpNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showOtpNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CHAMP 3 : COPIE DE NOUVEAU MOT DE PASSE */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showOtpConfirmPass ? 'text' : 'password'}
                      value={otpConfirmPassword}
                      onChange={(e) => setOtpConfirmPassword(e.target.value)}
                      placeholder="Confirmez le nouveau mot de passe..."
                      className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOtpConfirmPass(!showOtpConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showOtpConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOtpModalOpen(false)}
                    className="w-full sm:w-1/3 py-2.5 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer text-center"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingWithOtp}
                    className="w-full sm:w-2/3 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResettingWithOtp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Validation en cours...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Valider & Réinitialiser</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
