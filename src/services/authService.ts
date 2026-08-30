export interface AuthUser {
  id: string;
  beneficiaire: string;
  email: string;
  id_Role?: string;
  role: string;
  statut?: 'Actif' | 'Inactif';
  id_Emplacement?: string;
  isSuperAdmin?: boolean;
  derniereActivite?: string;
  accesApp?: 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS';
}

export interface DecodedToken {
  id?: string;
  email?: string;
  role?: string;
  isSuperAdmin?: boolean;
  beneficiaire?: string;
  accesApp?: 'GLOBAL_BACKOFFICE' | 'ESPACE_RECLAMATIONS';
  iat?: number;
  exp?: number;
}

class AuthService {
  // Access Token is stored in memory and synchronized to local storage for page reload resilience
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private user: AuthUser | null = null;

  // Exact expiration timestamps (ms) for drift-free countdown and background refresh
  private accessTokenExpiresAt: number | null = null;
  private sessionExpiresAt: number | null = null;
  private maxSessionExpiresAt: number | null = null;

  // Dynamic configuration thresholds (loaded from .env / backend /api/auth/config)
  private refreshBeforeExpirySec: number = 120; // Default 2m (120s) before access token expires
  private sessionWarningBeforeExpirySec: number = 60; // Default 1m (60s) before refresh token/session expires

  private listeners: (() => void)[] = [];
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  private monitorInterval: any = null;
  private warningDispatched: boolean = false;
  private syncChannel: BroadcastChannel | null = null;
  private lastUserActivity: number = Date.now();

  constructor() {
    this.loadEnvConfig();
    this.fetchServerConfig();
    this.initMultiTabSync();
    this.initUserActivityListeners();
    this.loadFromStorage();
    this.startSessionMonitor();

    // On startup, validate/restore in-memory access token via HttpOnly cookie
    if (this.hasStoredSession()) {
      this.validateSession().catch((err) => {
        console.warn('[AUTH] Initial session check info:', err);
      });
    }
  }

  // User activity tracker and Tab visibility wakeup (Resilient for Private Browsing & Background throttling)
  private initUserActivityListeners() {
    if (typeof window === 'undefined') return;

    const onUserActivity = () => {
      this.lastUserActivity = Date.now();
    };

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('click', onUserActivity, { passive: true });
    window.addEventListener('scroll', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });

    // Handle tab focus or un-minimizing in private navigation (where background timers are throttled)
    const onTabWakeup = () => {
      if (!this.isAuthenticated()) return;
      const now = Date.now();
      const sessionRemainingSec = this.sessionExpiresAt
        ? Math.max(0, Math.floor((this.sessionExpiresAt - now) / 1000))
        : 0;
      const accessRemainingSec = this.accessTokenExpiresAt
        ? Math.max(0, Math.floor((this.accessTokenExpiresAt - now) / 1000))
        : 0;

      // If tab resumed from background and AccessToken expired or near end, rotate token immediately
      if (sessionRemainingSec > 0 && accessRemainingSec <= this.refreshBeforeExpirySec && !this.isRefreshing) {
        this.refreshAccessToken(false, true).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onTabWakeup();
      }
    });
    window.addEventListener('focus', onTabWakeup);
  }

  // Load client environment variables if provided
  private loadEnvConfig() {
    try {
      const viteRefreshBefore = (import.meta as any).env?.VITE_REFRESH_BEFORE_EXPIRY;
      const viteWarningBefore = (import.meta as any).env?.VITE_SESSION_WARNING_BEFORE_EXPIRY;

      if (viteRefreshBefore) {
        this.refreshBeforeExpirySec = this.parseDurationToSeconds(viteRefreshBefore);
      }
      if (viteWarningBefore) {
        this.sessionWarningBeforeExpirySec = this.parseDurationToSeconds(viteWarningBefore);
      }
    } catch (e) {
      // Ignore env parsing error in non-standard context
    }
  }

  // Fetch dynamic duration configs from backend /api/auth/config
  private async fetchServerConfig() {
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        const config = await res.json();
        if (config.refreshBeforeExpirySec) {
          this.refreshBeforeExpirySec = config.refreshBeforeExpirySec;
        }
        if (config.sessionWarningBeforeExpirySec) {
          this.sessionWarningBeforeExpirySec = config.sessionWarningBeforeExpirySec;
        }
      }
    } catch (e) {
      // Silent catch, default 120s/60s will be used
    }
  }

  private parseDurationToSeconds(durationStr: string): number {
    const match = durationStr.match(/^(\d+)([smhd])$/);
    if (!match) return 120;
    const val = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 120;
    }
  }

  public getRefreshBeforeExpirySec(): number {
    return this.refreshBeforeExpirySec;
  }

  public getSessionWarningBeforeExpirySec(): number {
    return this.sessionWarningBeforeExpirySec;
  }

  public getLastUserActivity(): number {
    return this.lastUserActivity;
  }

  // Multi-Tab Synchronization via BroadcastChannel
  private initMultiTabSync() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.syncChannel = new BroadcastChannel('parcit_auth_sync');
        this.syncChannel.onmessage = (event) => {
          const { type, data } = event.data || {};
          if (type === 'AUTH_REFRESHED' && data) {
            this.accessToken = data.accessToken;
            if (data.refreshToken) {
              this.refreshTokenValue = data.refreshToken;
            }
            this.accessTokenExpiresAt = data.accessTokenExpiresAt;
            this.sessionExpiresAt = data.sessionExpiresAt;
            this.maxSessionExpiresAt = data.maxSessionExpiresAt;
            if (data.user) this.user = data.user;
            this.warningDispatched = false;
            this.notify();
          } else if (type === 'AUTH_LOGOUT') {
            this.clearSession(false);
          }
        };
      } catch (e) {
        console.warn('[AUTH] BroadcastChannel init error:', e);
      }
    }
  }

  private broadcast(type: 'AUTH_REFRESHED' | 'AUTH_LOGOUT', data?: any) {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage({ type, data });
      } catch (e) {
        // Ignore channel errors
      }
    }
  }

  // Parse payload from JWT token safely
  public decodeToken(token: string): DecodedToken | null {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  private hasStoredSession(): boolean {
    return !!localStorage.getItem('parcit_user');
  }

  private loadFromStorage() {
    try {
      const savedUser = localStorage.getItem('parcit_user');
      const savedAccessExp = localStorage.getItem('parcit_access_exp');
      const savedSessionExp = localStorage.getItem('parcit_session_exp');
      const savedMaxSessionExp = localStorage.getItem('parcit_max_session_exp');
      const savedAccessToken = localStorage.getItem('parcit_access_token');
      const savedRefreshToken = localStorage.getItem('parcit_refresh_token');

      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        this.user = {
          ...parsed,
          role: parsed.role === 'Administrateur' ? 'ADMIN' : parsed.role,
        };
      }

      if (savedAccessExp) {
        this.accessTokenExpiresAt = parseInt(savedAccessExp, 10);
      }
      if (savedSessionExp) {
        this.sessionExpiresAt = parseInt(savedSessionExp, 10);
      }
      if (savedMaxSessionExp) {
        this.maxSessionExpiresAt = parseInt(savedMaxSessionExp, 10);
      }
      if (savedRefreshToken) {
        this.refreshTokenValue = savedRefreshToken;
      }
      if (savedAccessToken && this.accessTokenExpiresAt && this.accessTokenExpiresAt > Date.now()) {
        this.accessToken = savedAccessToken;
      }
    } catch (e) {
      console.warn('[AUTH] Storage load error:', e);
    }
  }

  private saveSessionState(
    user: AuthUser,
    accessToken: string,
    accessExpTimestamp: number,
    sessionExpTimestamp: number,
    maxSessionExpTimestamp?: number,
    refreshToken?: string,
    shouldBroadcast: boolean = true
  ) {
    this.user = user;
    this.accessToken = accessToken;
    this.accessTokenExpiresAt = accessExpTimestamp;
    this.sessionExpiresAt = sessionExpTimestamp;
    this.maxSessionExpiresAt = maxSessionExpTimestamp || this.maxSessionExpiresAt || sessionExpTimestamp;
    if (refreshToken) {
      this.refreshTokenValue = refreshToken;
      localStorage.setItem('parcit_refresh_token', refreshToken);
    }

    // Store tokens and metadata for fast page loads, offline checks and proxy resilience
    localStorage.setItem('parcit_user', JSON.stringify(user));
    localStorage.setItem('parcit_access_token', accessToken);
    localStorage.setItem('parcit_access_exp', this.accessTokenExpiresAt.toString());
    localStorage.setItem('parcit_session_exp', this.sessionExpiresAt.toString());
    if (this.maxSessionExpiresAt) {
      localStorage.setItem('parcit_max_session_exp', this.maxSessionExpiresAt.toString());
    }

    if (shouldBroadcast) {
      this.broadcast('AUTH_REFRESHED', {
        accessToken,
        refreshToken: this.refreshTokenValue,
        accessTokenExpiresAt: this.accessTokenExpiresAt,
        sessionExpiresAt: this.sessionExpiresAt,
        maxSessionExpiresAt: this.maxSessionExpiresAt,
        user,
      });
    }

    this.notify();
  }

  public clearSession(shouldBroadcast: boolean = true) {
    this.user = null;
    this.accessToken = null;
    this.refreshTokenValue = null;
    this.accessTokenExpiresAt = null;
    this.sessionExpiresAt = null;
    this.maxSessionExpiresAt = null;
    this.warningDispatched = false;

    localStorage.removeItem('parcit_user');
    localStorage.removeItem('parcit_access_exp');
    localStorage.removeItem('parcit_session_exp');
    localStorage.removeItem('parcit_max_session_exp');
    localStorage.removeItem('parcit_access_token');
    localStorage.removeItem('parcit_refresh_token');

    if (shouldBroadcast) {
      this.broadcast('AUTH_LOGOUT');
    }

    this.notify();
  }

  // Session monitor:
  // 1. Silent automatic renewal of Access Token (REFRESH_BEFORE_EXPIRY, e.g. 15s) before its 45s expiration
  // 2. Triggers the warning modal strictly (SESSION_WARNING_BEFORE_EXPIRY, e.g. 30s) before Session expiration
  // 3. Automatically logs out and shows Expired Modal when Session reaches 0s
  private startSessionMonitor() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    let lastLoggedQuarter = -1;

    this.monitorInterval = setInterval(() => {
      if (!this.isAuthenticated() || !this.sessionExpiresAt) {
        return;
      }

      const now = Date.now();
      const sessionRemainingSec = Math.max(0, Math.floor((this.sessionExpiresAt - now) / 1000));
      const accessRemainingSec = this.accessTokenExpiresAt
        ? Math.max(0, Math.floor((this.accessTokenExpiresAt - now) / 1000))
        : 0;

      // Log session status every 15s in DevTools Console
      if (sessionRemainingSec > 0 && sessionRemainingSec % 15 === 0 && sessionRemainingSec !== lastLoggedQuarter) {
        lastLoggedQuarter = sessionRemainingSec;
        console.log(
          `%c[AUTH ⏱️ SUIVI SESSION]%c Expire dans: ${sessionRemainingSec}s | AccessToken valide: ${accessRemainingSec}s | Alerte prévue à: ${this.sessionWarningBeforeExpirySec}s`,
          'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
          'color: #0284c7; font-weight: 500;'
        );
      }

      // 1. Silent automatic renewal of Access Token (e.g. 15s before 45s expires)
      // Only renew in background if session still has time left (> warning window)
      if (
        accessRemainingSec <= this.refreshBeforeExpirySec &&
        sessionRemainingSec > this.sessionWarningBeforeExpirySec &&
        !this.isRefreshing
      ) {
        console.log(
          `%c[AUTH 🔄 ROTATION SILENCIEUSE]%c AccessToken approche de la fin (${accessRemainingSec}s restantes). Rafraîchissement automatique en arrière-plan...`,
          'background: #1e1b4b; color: #a5b4fc; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
          'color: #4f46e5; font-weight: 500;'
        );
        this.refreshAccessToken(false).catch((err) => {
          console.warn('[AUTH] Échec silencieux du renouvellement automatique:', err);
        });
      }

      // 2. Warning modal before Session / Refresh Token Expiration (e.g. 30s before 2 minutes)
      if (sessionRemainingSec <= this.sessionWarningBeforeExpirySec && sessionRemainingSec > 0) {
        if (!this.warningDispatched) {
          this.warningDispatched = true;
          console.warn(
            `%c[AUTH ⚠️ ALERTE SESSION ACTIVÉE]%c Il ne reste que ${sessionRemainingSec} secondes avant expiration ! Affichage de la fenêtre d'avertissement avec compte à rebours.`,
            'background: #78350f; color: #fde047; font-weight: bold; padding: 3px 8px; border-radius: 4px;',
            'color: #ea580c; font-weight: bold;'
          );
          window.dispatchEvent(
            new CustomEvent('parcit_session_warning', {
              detail: { secondsRemaining: sessionRemainingSec },
            })
          );
        }
      }

      // 3. Session completely expired (Refresh Token reached 0s)
      if (sessionRemainingSec <= 0) {
        console.error(
          `%c[AUTH 🛑 SESSION EXPIRÉE]%c La durée de session d'inactivité est écoulée ! Déconnexion et affichage de la fenêtre modale "Session Expirée".`,
          'background: #450a0a; color: #fca5a5; font-weight: bold; padding: 3px 8px; border-radius: 4px;',
          'color: #dc2626; font-weight: bold;'
        );
        this.clearSession();
        window.dispatchEvent(
          new CustomEvent('parcit_session_expired', {
            detail: { reason: "Votre session a expiré en raison d'une période d'inactivité prolongée." },
          })
        );
      }
    }, 1000);
  }

  // Returns remaining seconds before the SESSION (Refresh Token) expires
  public getRemainingSeconds(): number {
    if (!this.sessionExpiresAt) return 0;
    return Math.max(0, Math.floor((this.sessionExpiresAt - Date.now()) / 1000));
  }

  // Returns remaining seconds before the Access Token expires
  public getAccessRemainingSeconds(): number {
    if (!this.accessTokenExpiresAt) return 0;
    return Math.max(0, Math.floor((this.accessTokenExpiresAt - Date.now()) / 1000));
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    });
  }

  public getUser(): AuthUser | null {
    if (!this.user) {
      return null;
    }
    return this.user;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public isAuthenticated(): boolean {
    return !!this.user;
  }

  public isAdmin(): boolean {
    if (!this.user) return false;
    return this.user.role === 'ADMIN';
  }

  public isResponsableIT(): boolean {
    if (!this.user) return false;
    return this.user.role === 'Responsable IT' || this.user.role === 'ADMIN';
  }

  public isSuperAdmin(): boolean {
    if (!this.user) return false;
    return !!this.user.isSuperAdmin;
  }

  // Validate session against Backend MongoDB (restores in-memory token from HttpOnly cookie or storage on page reload)
  public async validateSession(): Promise<boolean> {
    if (!this.accessToken) {
      return await this.refreshAccessToken(false, true);
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const freshUser = await response.json();
        if (freshUser && (freshUser.id || freshUser._id)) {
          this.user = {
            id: freshUser.id || freshUser._id,
            beneficiaire: freshUser.beneficiaire,
            email: freshUser.email,
            id_Role: freshUser.id_Role || '',
            role: freshUser.role || 'Responsable IT',
            isSuperAdmin: !!freshUser.isSuperAdmin,
            accesApp: freshUser.accesApp || (freshUser.role === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS'),
            statut: freshUser.statut || 'Actif',
            id_Emplacement: freshUser.id_Emplacement || '',
            derniereActivite: freshUser.derniereActivite || "À l'instant",
          };
          localStorage.setItem('parcit_user', JSON.stringify(this.user));
          this.notify();
          return true;
        }
      } else if (response.status === 401) {
        return await this.refreshAccessToken(false, true);
      } else {
        this.clearSession(false);
        return false;
      }
      return false;
    } catch (e) {
      console.warn('[AUTH] validateSession error:', e);
      return false;
    }
  }

  // Login method against /api/auth/login
  public async login(
    email: string,
    password: string,
    role?: string
  ): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
    try {
      console.log(`%c[AUTH 🔐 TENTATIVE LOGIN]%c Connexion pour: ${email}${role ? ` (Rôle: ${role})` : ''}...`, 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #0369a1;');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, role: role?.trim() }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        if (!response.ok) {
          return {
            success: false,
            message: `Erreur HTTP ${response.status} (${response.statusText || 'Non trouvé'}). Assurez-vous que le serveur backend est bien lancé sur le port 5000.`,
          };
        }
      }

      if (!response.ok) {
        console.warn('[AUTH ❌ ÉCHEC LOGIN]', data.message);
        return {
          success: false,
          message: data.message || 'Identifiants incorrects ou compte invalide dans MongoDB.',
        };
      }

      if (!data.accessToken || !data.user) {
        return {
          success: false,
          message: 'Réponse invalide reçue du serveur backend.',
        };
      }

      const formattedUser: AuthUser = {
        id: data.user.id || data.user._id,
        beneficiaire: data.user.beneficiaire,
        email: data.user.email,
        id_Role: data.user.id_Role || '',
        role: data.user.role || 'Responsable IT',
        isSuperAdmin: !!data.user.isSuperAdmin,
        accesApp: data.user.accesApp || (data.user.role === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS'),
        statut: data.user.statut || 'Actif',
        id_Emplacement: data.user.id_Emplacement,
        derniereActivite: data.user.derniereActivite,
      };

      const now = Date.now();
      const accessExp = data.accessTokenExpiresAt || now + 45 * 1000;
      const sessionExp = data.sessionExpiresAt || now + 2 * 60 * 1000;
      const maxSessionExp = data.maxSessionExpiresAt || now + 5 * 60 * 1000;

      if (data.refreshBeforeExpirySec) {
        this.refreshBeforeExpirySec = data.refreshBeforeExpirySec;
      }
      if (data.sessionWarningBeforeExpirySec) {
        this.sessionWarningBeforeExpirySec = data.sessionWarningBeforeExpirySec;
      }

      this.warningDispatched = false;
      this.lastUserActivity = Date.now();
      this.saveSessionState(formattedUser, data.accessToken, accessExp, sessionExp, maxSessionExp, data.refreshToken);

      console.log(
        `%c[AUTH 🔑 CONNEXION RÉUSSIE]%c Utilisateur: ${formattedUser.email} (${formattedUser.role})\n• AccessToken: expire dans 45s\n• RefreshToken (Session): expire dans 2m\n• Alerte d'avertissement: se déclenche 30s avant la fin`,
        'background: #14532d; color: #86efac; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
        'color: #15803d; font-weight: 500;'
      );

      return { success: true, user: formattedUser };
    } catch (err: any) {
      console.error('[AUTH] Login MongoDB backend error:', err);
      return {
        success: false,
        message: 'Impossible de contacter le serveur backend MongoDB. Veuillez vérifier la connexion.',
      };
    }
  }

  // Refresh Token with MongoDB session rotation (Uses HttpOnly Cookie & Mutex Lock & Storage fallback & Header)
  public async refreshAccessToken(isUserProlong: boolean = false, isSilentCheck: boolean = false): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const wasAuthenticated = this.isAuthenticated();
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const payload: any = {};
        const storedRefreshToken = this.refreshTokenValue || (typeof localStorage !== 'undefined' ? localStorage.getItem('parcit_refresh_token') : null);
        if (storedRefreshToken) {
          payload.refreshToken = storedRefreshToken;
          this.refreshTokenValue = storedRefreshToken;
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (storedRefreshToken) {
          headers['x-refresh-token'] = storedRefreshToken;
        }

        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        let data: any = {};
        try {
          data = await response.json();
        } catch (jsonErr) {
          data = { message: `Erreur HTTP ${response.status}` };
        }

        if (!response.ok || !data.accessToken) {
          console.warn('[AUTH ⚠️] Refresh backend refusé:', data.message || response.statusText);
          this.clearSession(false);
          // Only show session expired modal if the user was actively logged in and this was not an initial silent check
          if (wasAuthenticated && !isSilentCheck) {
            window.dispatchEvent(
              new CustomEvent('parcit_session_expired', {
                detail: { reason: data.message || 'Session expirée ou révoquée.' },
              })
            );
          }
          return false;
        }

        const freshUser: AuthUser = data.user
          ? {
              id: data.user.id || data.user._id,
              beneficiaire: data.user.beneficiaire,
              email: data.user.email,
              id_Role: data.user.id_Role || this.user?.id_Role || '',
              role: data.user.role || this.user?.role || 'Collaborateur',
              isSuperAdmin: data.user.isSuperAdmin !== undefined ? !!data.user.isSuperAdmin : !!this.user?.isSuperAdmin,
              accesApp: data.user.accesApp || this.user?.accesApp || (data.user.role === 'Responsable IT' ? 'GLOBAL_BACKOFFICE' : 'ESPACE_RECLAMATIONS'),
              statut: data.user.statut || 'Actif',
              id_Emplacement: data.user.id_Emplacement,
              derniereActivite: data.user.derniereActivite,
            }
          : this.user!;

        const now = Date.now();
        const accessExp = data.accessTokenExpiresAt || now + 45 * 1000;
        
        // If user explicitly asked to prolong, reset session expiry forward (+2 min)
        // If silent background token rotation, keep the current session countdown intact
        let sessionExp: number;
        if (isUserProlong) {
          sessionExp = data.sessionExpiresAt || now + 2 * 60 * 1000;
          this.warningDispatched = false;
        } else {
          sessionExp = this.sessionExpiresAt || data.sessionExpiresAt || (now + 2 * 60 * 1000);
        }

        const maxSessionExp = data.maxSessionExpiresAt || now + 5 * 60 * 1000;

        if (data.refreshBeforeExpirySec) {
          this.refreshBeforeExpirySec = data.refreshBeforeExpirySec;
        }
        if (data.sessionWarningBeforeExpirySec) {
          this.sessionWarningBeforeExpirySec = data.sessionWarningBeforeExpirySec;
        }

        this.saveSessionState(freshUser, data.accessToken, accessExp, sessionExp, maxSessionExp, data.refreshToken);

        if (isUserProlong) {
          console.log(
            `%c[AUTH 🟢 SESSION PROLONGÉE]%c Nouvelle expiration de la session à: ${new Date(sessionExp).toLocaleTimeString()}`,
            'background: #064e3b; color: #a7f3d0; font-weight: bold; padding: 3px 8px; border-radius: 4px;',
            'color: #047857; font-weight: bold;'
          );
        } else {
          console.log(
            `%c[AUTH 🔄 TOKEN RENOUVELÉ]%c Nouvel AccessToken obtenu avec succès. Session termine à: ${new Date(sessionExp).toLocaleTimeString()}`,
            'background: #1e1b4b; color: #c7d2fe; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
            'color: #4338ca; font-weight: 500;'
          );
        }

        return true;
      } catch (err) {
        console.error('[AUTH] Refresh token error with MongoDB:', err);
        this.clearSession(false);
        if (wasAuthenticated && !isSilentCheck) {
          window.dispatchEvent(
            new CustomEvent('parcit_session_expired', {
              detail: { reason: 'Connexion perdue avec le serveur.' },
            })
          );
        }
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Helper called when user clicks "Continuer ma session" in the warning modal
  public async prolongSession(): Promise<{ success: boolean; message?: string }> {
    console.log(
      '%c[AUTH 🖱️ ACTION UTILISATEUR]%c Clic sur "Continuer ma session" -> Demande de prolongation (+2 minutes)...',
      'background: #042f2e; color: #5eead4; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
      'color: #0f766e; font-weight: bold;'
    );
    const success = await this.refreshAccessToken(true);
    if (success) {
      this.lastUserActivity = Date.now();
      this.warningDispatched = false;
      return { success: true, message: 'Votre session a été prolongée avec succès !' };
    }
    return { success: false, message: 'Impossible de prolonger la session.' };
  }

  // Helper for manual logout
  public async logout(): Promise<void> {
    console.log('[AUTH 🚪 DÉCONNEXION] Fermeture de la session utilisateur...');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (e) {
      // Ignore network errors on logout
    }
    this.clearSession();
  }

  // Helper for testing the countdown modal
  public triggerWarningModalForTesting() {
    const testSec = Math.max(10, this.sessionWarningBeforeExpirySec - 1);
    this.sessionExpiresAt = Date.now() + testSec * 1000;
    this.warningDispatched = true;
    window.dispatchEvent(
      new CustomEvent('parcit_session_warning', {
        detail: { secondsRemaining: testSec },
      })
    );
  }

  // Fetch Wrapper with strict single-retry Mutex queue & 401 handling
  public async fetchWithAuth(url: string, options: RequestInit & { _isRetry?: boolean } = {}): Promise<Response> {
    let token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    // If 401 Unauthorized, perform single retry after token refresh
    if (response.status === 401) {
      if (options._isRetry) {
        // Prevent infinite loop if retry also fails
        console.warn(`[AUTH] 401 persisted on retry for ${url}. Terminating session.`);
        this.clearSession();
        window.dispatchEvent(
          new CustomEvent('parcit_session_expired', {
            detail: { reason: 'Accès refusé ou session révoquée. Veuillez vous reconnecter.' },
          })
        );
        return response;
      }

      console.warn(`[AUTH] 401 reçu pour ${url}. Tentative de rafraîchissement unique...`);
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        const newToken = this.getAccessToken();
        const retryHeaders = {
          ...headers,
          ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
        };
        response = await fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
          _isRetry: true,
        } as any);
      } else {
        this.clearSession();
        window.dispatchEvent(
          new CustomEvent('parcit_session_expired', {
            detail: { reason: 'Votre session a expiré ou vos droits ont changé. Veuillez vous reconnecter.' },
          })
        );
      }
    }

    return response;
  }

  public async getActiveRoles(): Promise<string[]> {
    try {
      const res = await fetch('/api/auth/active-roles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.roles) && data.roles.length > 0) {
          return data.roles;
        }
      }
    } catch (e) {
      console.warn('[AUTH] Error fetching active roles, fallback to default:', e);
    }
    return ['Responsable IT'];
  }

  // Profile: Change Password with Old Password
  public async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string; field?: string }> {
    try {
      const res = await this.fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Erreur lors du changement de mot de passe.',
          field: data.field,
        };
      }
      return {
        success: true,
        message: data.message || 'Mot de passe modifié avec succès.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Erreur de connexion au serveur.',
      };
    }
  }

  // Profile: Request OTP Code for Forgot Password
  public async requestPasswordOtp(email?: string): Promise<{
    success: boolean;
    message: string;
    isSimulation?: boolean;
    email?: string;
  }> {
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email || this.user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Erreur lors de la génération du code OTP.',
        };
      }
      return {
        success: true,
        message: data.message || 'Code OTP envoyé avec succès.',
        isSimulation: data.isSimulation,
        email: data.email,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Erreur de connexion au serveur.',
      };
    }
  }

  // Profile: Reset Password using OTP
  public async resetPasswordWithOtp(payload: {
    otpCode: string;
    newPassword: string;
    confirmPassword: string;
    email?: string;
  }): Promise<{ success: boolean; message: string; field?: string }> {
    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          email: payload.email || this.user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Erreur lors de la réinitialisation.',
          field: data.field,
        };
      }
      return {
        success: true,
        message: data.message || 'Mot de passe réinitialisé avec succès.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Erreur de connexion au serveur.',
      };
    }
  }
}

export const authService = new AuthService();

