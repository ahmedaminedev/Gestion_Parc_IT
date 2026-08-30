import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import bgImage from '../../assets/images/jaecoo_cliff_login_bg.webp';
import { authService, AuthUser } from '../../services/authService';

interface BackofficeLoginGuardProps {
  onLoginSuccess: () => void;
}

export const BackofficeLoginGuard: React.FC<BackofficeLoginGuardProps> = ({
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSupportInfo, setShowSupportInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<AuthUser | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await authService.login(email, password);
      if (res.success && res.user) {
        setSuccessUser(res.user);
        setTimeout(() => {
          onLoginSuccess();
        }, 500);
      } else {
        setErrorMsg(res.message || 'Email ou mot de passe incorrect.');
      }
    } catch (err: any) {
      setErrorMsg('Erreur de connexion avec le serveur de sécurité.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0f16] flex items-center justify-center sm:justify-end overflow-hidden font-sans select-none">
      {/* Background Image exactly matching scenic JAECOO 7 on cliff */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <img
          src={bgImage}
          alt="Véhicule JAECOO 7 au coucher du soleil"
          width={1376}
          height={768}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-center"
        />
        {/* Subtle cinematic vignette */}
        <div className="absolute inset-0 bg-linear-to-r from-black/40 via-transparent to-black/70" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Top Left Branding Logo */}
      <div className="absolute top-6 left-6 sm:top-10 sm:left-12 z-20 flex items-center">
        <div className="flex items-center space-x-2">
          <span className="text-white text-xl sm:text-2xl font-black tracking-[0.25em] font-sans">
            OMODA
          </span>
          <span className="text-red-600 text-xl sm:text-2xl font-bold">|</span>
          <span className="text-white text-xl sm:text-2xl font-black tracking-[0.25em] font-sans">
            JAECOO
          </span>
        </div>
      </div>

      {/* Bottom Left Slogan */}
      <div className="hidden md:block absolute bottom-10 left-8 sm:left-12 z-20 space-y-1 max-w-lg">
        <p className="text-xs sm:text-sm font-black tracking-[0.15em] text-white uppercase drop-shadow-md">
          L'AVENTURE COMMENCE ICI.
        </p>
        <p className="text-xs sm:text-sm font-black tracking-[0.15em] text-gray-300 uppercase drop-shadow-md">
          CONNECTEZ-VOUS POUR CONTINUER.
        </p>
      </div>

      {/* Right-aligned Login Card */}
      <div className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex items-center justify-center md:justify-end py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-115 bg-[#11161f]/92 backdrop-blur-xl border border-gray-700/50 rounded-[28px] p-6 sm:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-white"
        >
          {/* Top Steering Wheel Icon with Neon Cyan Ring */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center bg-[#0d141d] relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-cyan-500/40 flex items-center justify-center">
                {/* Stylized Steering Wheel SVG */}
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="2.8" />
                  <path d="M12 14.8V21" />
                  <path d="M9.2 12L3.5 10" />
                  <path d="M14.8 12L20.5 10" />
                  <path d="M9.5 14.5l-3 3" />
                  <path d="M14.5 14.5l3 3" />
                </svg>
              </div>
            </div>
          </div>

          {/* Titles */}
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Connexion
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-normal">
              Accédez à votre espace OMODA <span className="text-red-500 font-bold">|</span> JAECOO
            </p>
          </div>

          {/* Form */}
          <form noValidate onSubmit={handleLogin} className="space-y-3.5">
            {/* Field 1: Email */}
            <div className="relative bg-[#161c24]/90 border border-gray-700/60 focus-within:border-cyan-400/80 rounded-2xl p-3 sm:p-3.5 transition-all">
              <div className="flex items-center space-x-3.5">
                <div className="text-gray-400 shrink-0">
                  {/* Geometric Hourglass/Mail icon matching capture */}
                  <svg
                    className="w-5 h-5 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 3h12v4l-4 4 4 4v4H6v-4l4-4-4-4V3z" />
                    <path d="M6 3l6 6 6-6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="login-email" className="block text-[11px] font-medium text-gray-300 leading-none mb-1">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Entrez votre email"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-normal"
                  />
                </div>
              </div>
            </div>

            {/* Field 2: Mot de passe */}
            <div className="relative bg-[#161c24]/90 border border-gray-700/60 focus-within:border-cyan-400/80 rounded-2xl p-3 sm:p-3.5 transition-all">
              <div className="flex items-center space-x-3.5">
                <div className="text-gray-400 shrink-0">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="login-password" className="block text-[11px] font-medium text-gray-300 leading-none mb-1">
                    Mot de passe
                  </label>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-normal"
                  />
                </div>
                <button
                  type="button"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-white transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Feedback */}
            {successUser && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Connexion réussie. Redirection...</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !!successUser}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-linear-to-r from-[#113d48] via-[#105e6d] to-[#127686] hover:from-[#134956] hover:to-[#17889c] text-white font-medium text-sm sm:text-base tracking-wide flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] border border-cyan-400/40 transition-all group disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Connexion en cours...' : 'Se connecter'}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="w-full border-t border-gray-800" />
              <span className="absolute bg-[#11161f] px-3 text-xs text-gray-500 font-medium">
                ou
              </span>
            </div>

            {/* Help / Support Links */}
            <div className="flex flex-col space-y-2 pt-1 text-xs text-gray-400">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-mono text-[11px]">
                  Gestion Parc IT • v2.4
                </span>

                <button
                  type="button"
                  onClick={() => setShowSupportInfo(!showSupportInfo)}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium cursor-pointer"
                >
                  Besoin d'aide ?
                </button>
              </div>

              {showSupportInfo && (
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200">
                  <p className="font-semibold text-cyan-300">Support DSI OMODA & JAECOO</p>
                  <p>Email: support.it@omoda-jaecoo.tn</p>
                  <p>Tél: +216 70 000 000</p>
                </div>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
