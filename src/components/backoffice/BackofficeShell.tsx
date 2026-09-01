import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { itParkService } from '../../services/itParkService';
import { chatService, IncomingCallEvent } from '../../services/chatService';
import { BackofficeTab } from '../../types/itPark';

const DashboardPage = lazy(() => import('./DashboardPage').then(m => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import('./UsersPage').then(m => ({ default: m.UsersPage })));
const MaterielsPage = lazy(() => import('./MaterielsPage').then(m => ({ default: m.MaterielsPage })));
const FacturesPage = lazy(() => import('./FacturesPage').then(m => ({ default: m.FacturesPage })));
const EmplacementsPage = lazy(() => import('./EmplacementsPage').then(m => ({ default: m.EmplacementsPage })));
const FournisseursPage = lazy(() => import('./FournisseursPage').then(m => ({ default: m.FournisseursPage })));
const ReclamationsPage = lazy(() => import('./ReclamationsPage').then(m => ({ default: m.ReclamationsPage })));
const ProfilePage = lazy(() => import('./ProfilePage').then(m => ({ default: m.ProfilePage })));
const MessagesPage = lazy(() => import('./MessagesPage').then(m => ({ default: m.MessagesPage })));

const SessionExpirationModal = lazy(() => import('../modals/SessionExpirationModal').then(m => ({ default: m.SessionExpirationModal })));
const SessionExpiredModal = lazy(() => import('../modals/SessionExpiredModal').then(m => ({ default: m.SessionExpiredModal })));
const LiveCallModal = lazy(() => import('./chat/LiveCallModal').then(m => ({ default: m.LiveCallModal })));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[400px] w-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-gray-500">Chargement du module...</span>
    </div>
  </div>
);

interface BackofficeShellProps {
  onLogout: () => Promise<void>;
}

export const BackofficeShell: React.FC<BackofficeShellProps> = ({ onLogout }) => {
  const [activeBackofficeTab, setActiveBackofficeTab] = useState<BackofficeTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Session warning and timeout states
  const [isSessionWarningOpen, setIsSessionWarningOpen] = useState(false);
  const [warningSeconds, setWarningSeconds] = useState(30);
  const [isSessionExpiredOpen, setIsSessionExpiredOpen] = useState(false);
  const [expiredReason, setExpiredReason] = useState<string | undefined>(undefined);

  // Global Incoming Call State
  const [globalIncomingCall, setGlobalIncomingCall] = useState<IncomingCallEvent | null>(null);

  useEffect(() => {
    // Initial sync
    itParkService.syncFromBackend();

    // Listen for incoming call globally
    const handleIncomingCall = (e: any) => {
      const callData = e.detail as IncomingCallEvent;
      if (callData && activeBackofficeTab !== 'messagerie') {
        setGlobalIncomingCall(callData);
      }
    };

    const handleCallEndedGlobal = () => {
      setGlobalIncomingCall(null);
    };

    window.addEventListener('parcit_incoming_call', handleIncomingCall);
    window.addEventListener('parcit_call_ended', handleCallEndedGlobal);

    return () => {
      window.removeEventListener('parcit_incoming_call', handleIncomingCall);
      window.removeEventListener('parcit_call_ended', handleCallEndedGlobal);
    };
  }, [activeBackofficeTab]);

  useEffect(() => {
    // Session warning event
    const handleSessionWarning = (e: any) => {
      const remaining = e.detail?.secondsRemaining || 30;
      setWarningSeconds(remaining);
      setIsSessionWarningOpen(true);
    };

    // Handle session expired event
    const handleSessionExpired = (e: any) => {
      const reason = e?.detail?.reason || 'Votre session a expiré.';
      setIsSessionWarningOpen(false);
      setExpiredReason(reason);
      setIsSessionExpiredOpen(true);
    };

    window.addEventListener('parcit_session_warning', handleSessionWarning);
    window.addEventListener('parcit_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('parcit_session_warning', handleSessionWarning);
      window.removeEventListener('parcit_session_expired', handleSessionExpired);
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc]">
      {/* Left Dark Sidebar */}
      {sidebarOpen && (
        <Sidebar
          activeTab={activeBackofficeTab}
          onSelectTab={(tab) => setActiveBackofficeTab(tab)}
          onLogout={onLogout}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-auto">
        <TopHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigateTab={(tab) => setActiveBackofficeTab(tab)}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0 w-full overflow-x-auto overflow-y-auto">
          <Suspense fallback={<PageFallback />}>
            {activeBackofficeTab === 'dashboard' && (
              <DashboardPage onNavigateTab={(tab) => setActiveBackofficeTab(tab)} />
            )}
            {activeBackofficeTab === 'reclamations' && <ReclamationsPage />}
            {activeBackofficeTab === 'messagerie' && <MessagesPage />}
            {activeBackofficeTab === 'utilisateurs' && <UsersPage />}
            {activeBackofficeTab === 'materiels' && <MaterielsPage />}
            {activeBackofficeTab === 'factures' && <FacturesPage />}
            {activeBackofficeTab === 'emplacements' && <EmplacementsPage />}
            {activeBackofficeTab === 'fournisseurs' && <FournisseursPage />}
            {activeBackofficeTab === 'profile' && <ProfilePage />}
          </Suspense>
        </main>
      </div>

      {/* Session Modals */}
      <Suspense fallback={null}>
        <SessionExpirationModal
          isOpen={isSessionWarningOpen}
          initialSeconds={warningSeconds}
          onClose={() => setIsSessionWarningOpen(false)}
          onLogout={onLogout}
        />

        <SessionExpiredModal
          isOpen={isSessionExpiredOpen}
          onClose={() => {
            setIsSessionExpiredOpen(false);
            onLogout();
          }}
          reason={expiredReason}
        />

        {globalIncomingCall && (
          <LiveCallModal
            isOpen={!!globalIncomingCall}
            isIncoming={true}
            incomingCallData={globalIncomingCall}
            conversationId={globalIncomingCall.conversationId}
            callType={globalIncomingCall.callType}
            onClose={() => setGlobalIncomingCall(null)}
            onTakeSnapshot={(dataUrl) => {
              if (globalIncomingCall.conversationId) {
                chatService.sendMessage(globalIncomingCall.conversationId, {
                  recipientId: globalIncomingCall.callerId,
                  messageType: 'image',
                  mediaUrl: dataUrl,
                  mediaName: `capture_appel_${Date.now()}.jpg`,
                  mediaMimeType: 'image/jpeg',
                });
              }
            }}
          />
        )}
      </Suspense>
    </div>
  );
};
export default BackofficeShell;
