import { useState, useEffect, lazy, Suspense } from 'react';
import { authService } from './services/authService';
import { BackofficeLoginGuard } from './components/backoffice/BackofficeLoginGuard';

const BackofficeShell = lazy(() => import('./components/backoffice/BackofficeShell'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen w-full bg-[#0a0f16]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
      <span className="text-sm font-medium text-gray-400 tracking-wider">Chargement de l'application...</span>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());

  useEffect(() => {
    const unsubscribeAuth = authService.subscribe(() => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased selection:bg-red-600 selection:text-white">
      {!isAuthenticated ? (
        <BackofficeLoginGuard onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Suspense fallback={<LoadingFallback />}>
          <BackofficeShell onLogout={handleLogout} />
        </Suspense>
      )}
    </div>
  );
}
