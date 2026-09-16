import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Send, ShieldCheck, Eye, X } from 'lucide-react';
import { itParkService } from '../../services/itParkService';

interface EmailAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSmtpStatus?: {
    configured: boolean;
    host?: string;
    port?: number;
    user?: string;
    from?: string;
    mode?: string;
  } | null;
}

export const EmailAuditModal: React.FC<EmailAuditModalProps> = ({
  isOpen,
  onClose,
  initialSmtpStatus,
}) => {
  const [smtpStatus, setSmtpStatus] = useState<any>(initialSmtpStatus || null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [previewLog, setPreviewLog] = useState<any | null>(null);

  const loadStatusAndLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const status = await itParkService.getSmtpStatus();
      setSmtpStatus(status);
      const emailLogs = await itParkService.fetchEmailLogs();
      setLogs(Array.isArray(emailLogs) ? emailLogs : []);
    } catch (e) {
      console.warn('Erreur chargement logs email:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatusAndLogs();
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) return;

    setIsTestingSmtp(true);
    setTestResult(null);
    try {
      const res = await itParkService.testSmtpConnection(testEmail.trim());
      setTestResult(res);
      // Reload logs to show test email
      const updatedLogs = await itParkService.fetchEmailLogs();
      setLogs(updatedLogs);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Erreur inconnue lors du test.',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BIENVENUE_USER':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-100 text-purple-700">Bienvenue</span>;
      case 'MISE_A_JOUR_USER':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 text-blue-700">Mise à jour compte</span>;
      case 'NOTIFICATION_RECLAMATION':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800">Ticket Réclamation</span>;
      case 'RESOLUTION_RECLAMATION':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800">Résolution Ticket</span>;
      case 'OTP_RESET_PASSWORD':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-100 text-rose-700">Code OTP</span>;
      case 'PASSWORD_CHANGED':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-100 text-indigo-700">Mot de passe</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-gray-100 text-gray-700">{type || 'Système'}</span>;
    }
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'Envoyé' || statut === 'Délivré') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {statut}
        </span>
      );
    }
    if (statut.includes('Simulation')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Simulation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3 text-rose-600" />
        Échec
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                Centre de Messagerie & Diagnostic SMTP
              </h2>
              <p className="text-xs text-gray-500">
                Suivi des notifications par e-mail (création, modification collaborateur, tickets) et vérification du serveur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* SMTP Status & Diagnostic Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Status Summary */}
            <div className="md:col-span-2 p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gray-700" />
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Statut du Service E-mail
                  </span>
                </div>
                {smtpStatus?.configured ? (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    SMTP Réel Configuré
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Mode Simulation Local
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs border-t border-gray-100">
                <div>
                  <div className="text-gray-500 text-[11px]">Serveur SMTP :</div>
                  <div className="font-bold text-gray-800 truncate">{smtpStatus?.host || 'smtp.gmail.com'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[11px]">Port :</div>
                  <div className="font-bold text-gray-800">{smtpStatus?.port || 587}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[11px]">Compte :</div>
                  <div className="font-bold text-gray-800 truncate">{smtpStatus?.user || 'Non renseigné'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-[11px]">Expéditeur :</div>
                  <div className="font-bold text-gray-800 truncate">{smtpStatus?.from || 'support@omoda-jaecoo.tn'}</div>
                </div>
              </div>

              {!smtpStatus?.configured && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <p className="font-semibold">💡 Comment activer l'envoi réel d'e-mails :</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    Définissez <code>SMTP_USER</code> et <code>SMTP_PASS</code> dans le fichier <code>.env</code> du serveur. Pour un compte Gmail professionnel, activez la validation 2FA et générez un <em>Mot de passe d'application</em> de 16 caractères sur votre compte Google.
                  </p>
                </div>
              )}
            </div>

            {/* Test Mail Form */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  Test de Connexion
                </div>
                <p className="text-[11px] text-gray-500 mb-3">
                  Envoyez un e-mail de test pour valider la délivrabilité immédiate.
                </p>
                <form onSubmit={handleRunTest} className="space-y-2">
                  <input
                    type="email"
                    placeholder="ex: admin@omoda.tn"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isTestingSmtp || !testEmail}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isTestingSmtp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Test en cours...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Tester l'envoi</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Test Result Alert */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">{testResult.message}</div>
                {testResult.details?.suggestion && (
                  <div className="text-[11px] text-rose-700 bg-rose-100/60 p-2 rounded-md mt-1">
                    👉 {testResult.details.suggestion}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email Logs Audit Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-700" />
                <h3 className="text-sm font-black text-gray-900">
                  Journal d'Audit des E-mails ({logs.length})
                </h3>
              </div>
              <button
                onClick={loadStatusAndLogs}
                disabled={isLoadingLogs}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-gray-600">Date & Heure</th>
                      <th className="py-2.5 px-3 font-bold text-gray-600">Destinataire</th>
                      <th className="py-2.5 px-3 font-bold text-gray-600">Type</th>
                      <th className="py-2.5 px-3 font-bold text-gray-600">Sujet</th>
                      <th className="py-2.5 px-3 font-bold text-gray-600">Statut</th>
                      <th className="py-2.5 px-3 font-bold text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Aucun e-mail enregistré pour le moment.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log: any, index: number) => {
                        const dateStr = log.dateEnvoi || log.createdAt;
                        const formattedDate = dateStr
                          ? new Date(dateStr).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Récemment';

                        return (
                          <tr key={log._id || log.id || index} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{formattedDate}</td>
                            <td className="py-2.5 px-3 font-medium text-gray-900">
                              <div>{log.destinataireNom}</div>
                              <div className="text-[11px] text-gray-400 font-mono">{log.destinataireEmail}</div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{getTypeBadge(log.type)}</td>
                            <td className="py-2.5 px-3 text-gray-700 max-w-[200px] truncate" title={log.sujet}>
                              {log.sujet}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(log.statut)}</td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setPreviewLog(log)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Aperçu</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* HTML Email Preview Modal */}
      {previewLog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{previewLog.sujet}</h3>
                <div className="text-xs text-gray-500">
                  À : {previewLog.destinataireNom} ({previewLog.destinataireEmail})
                </div>
              </div>
              <button
                onClick={() => setPreviewLog(null)}
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-gray-900 text-white text-xs">
              <iframe
                title="Aperçu Email"
                srcDoc={previewLog.contenuHtml}
                className="w-full h-96 rounded-xl border border-gray-700 bg-white"
              />
            </div>
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
              <div>Statut : {previewLog.statut}</div>
              <button
                onClick={() => setPreviewLog(null)}
                className="px-4 py-1.5 bg-gray-800 text-white font-bold rounded-lg hover:bg-black cursor-pointer"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
