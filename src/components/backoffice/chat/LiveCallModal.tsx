import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Maximize2,
  Minimize2,
  Monitor,
  Camera,
  Check,
  PhoneIncoming,
} from 'lucide-react';
import { chatService, IncomingCallEvent } from '../../../services/chatService';

interface LiveCallModalProps {
  isOpen: boolean;
  isIncoming?: boolean;
  incomingCallData?: IncomingCallEvent | null;
  recipientUser?: {
    id: string;
    beneficiaire: string;
    email: string;
    role: string;
  } | null;
  conversationId?: string;
  callType: 'video' | 'audio';
  onClose: (durationSec?: number) => void;
  onTakeSnapshot?: (dataUrl: string) => void;
}

export const LiveCallModal: React.FC<LiveCallModalProps> = ({
  isOpen,
  isIncoming = false,
  incomingCallData,
  recipientUser,
  conversationId,
  callType = 'video',
  onClose,
  onTakeSnapshot,
}) => {
  const [callStatus, setCallStatus] = useState<'incoming' | 'calling' | 'connected' | 'rejected' | 'ended'>(
    isIncoming ? 'incoming' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const stopRingToneRef = useRef<(() => void) | null>(null);
  const durationRef = useRef<number>(0);
  const hasLoggedCallRef = useRef<boolean>(false);

  durationRef.current = duration;

  const targetId = incomingCallData ? incomingCallData.callerId : recipientUser?.id;
  const targetName = incomingCallData ? incomingCallData.callerName : recipientUser?.beneficiaire || 'Contact';
  const targetRole = incomingCallData ? incomingCallData.callerRole : recipientUser?.role || 'Utilisateur';
  const effectiveConversationId = incomingCallData ? incomingCallData.conversationId : conversationId;
  const effectiveCallType = incomingCallData ? incomingCallData.callType : callType;

  // Persist call log message into database with duration, timestamps, and status
  const logCallSummary = async (status: 'completed' | 'missed' | 'rejected', finalDurationSec: number) => {
    if (hasLoggedCallRef.current) return;
    hasLoggedCallRef.current = true;

    const convId = effectiveConversationId || conversationId;
    const destId = targetId || (recipientUser ? recipientUser.id : undefined);

    if (!convId) {
      console.warn('[CALL] Cannot log call summary - conversation ID missing');
      return;
    }

    try {
      const typeLabel = effectiveCallType === 'video' ? 'Appel vidéo' : 'Appel vocal';
      let textSummary = '';
      if (status === 'completed') {
        const m = Math.floor(finalDurationSec / 60);
        const s = finalDurationSec % 60;
        const durStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        textSummary = `${typeLabel} terminé (${durStr})`;
      } else if (status === 'missed') {
        textSummary = `${typeLabel} manqué`;
      } else if (status === 'rejected') {
        textSummary = `${typeLabel} refusé`;
      }

      await chatService.sendMessage(convId, {
        recipientId: destId,
        messageType: 'call',
        text: textSummary,
        callData: {
          type: effectiveCallType,
          status: status,
          durationSec: finalDurationSec,
          startedAt: new Date(Date.now() - finalDurationSec * 1000).toISOString(),
          endedAt: new Date().toISOString(),
        },
      });
      chatService.refreshConversations();
    } catch (err) {
      console.warn('[CALL] Error saving call summary to database:', err);
    }
  };

  // Cleanup all media helper
  const stopAllMedia = () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            track.enabled = false;
            track.stop();
          } catch (e) {}
        });
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          try {
            track.enabled = false;
            track.stop();
          } catch (e) {}
        });
        screenStreamRef.current = null;
      }
      if (localVideoRef.current) {
        if (localVideoRef.current.srcObject) {
          const s = localVideoRef.current.srcObject as MediaStream;
          s.getTracks().forEach((t) => {
            try {
              t.enabled = false;
              t.stop();
            } catch (e) {}
          });
        }
        localVideoRef.current.srcObject = null;
        try {
          localVideoRef.current.pause();
          localVideoRef.current.removeAttribute('src');
          localVideoRef.current.load();
        } catch (e) {}
      }
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject) {
          const s = remoteVideoRef.current.srcObject as MediaStream;
          s.getTracks().forEach((t) => {
            try {
              t.enabled = false;
              t.stop();
            } catch (e) {}
          });
        }
        remoteVideoRef.current.srcObject = null;
        try {
          remoteVideoRef.current.pause();
          remoteVideoRef.current.removeAttribute('src');
          remoteVideoRef.current.load();
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[CALL] Error stopping media tracks:', e);
    }
  };

  const startLocalMedia = async () => {
    try {
      stopAllMedia();
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: effectiveCallType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && effectiveCallType === 'video') {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('[CALL] Could not acquire local video/audio stream:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Reset status on open
    if (isIncoming) {
      setCallStatus('incoming');
      // Start incoming ringtone
      stopRingToneRef.current = chatService.playRingTone();
    } else {
      setCallStatus('calling');
      // Start outgoing ringtone
      stopRingToneRef.current = chatService.playRingTone();
      // Start camera preview immediately for caller
      startLocalMedia();
    }

    const handleAccepted = () => {
      handleCallConnected();
    };

    const handleRejected = (_e: any) => {
      if (stopRingToneRef.current) stopRingToneRef.current();
      setStatusMessage('Appel refusé par le destinataire');
      setCallStatus('rejected');
      logCallSummary('rejected', 0);
      setTimeout(() => {
        handleCallEnded();
      }, 1800);
    };

    const handleCallEndedEvent = (e: any) => {
      const incomingDur = e?.detail?.durationSec || durationRef.current;
      if (stopRingToneRef.current) stopRingToneRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllMedia();
      setCallStatus('ended');
      setTimeout(() => {
        onClose(incomingDur);
      }, 400);
    };

    window.addEventListener('parcit_call_accepted', handleAccepted);
    window.addEventListener('parcit_call_rejected', handleRejected);
    window.addEventListener('parcit_call_ended', handleCallEndedEvent);

    return () => {
      if (stopRingToneRef.current) stopRingToneRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllMedia();
      window.removeEventListener('parcit_call_accepted', handleAccepted);
      window.removeEventListener('parcit_call_rejected', handleRejected);
      window.removeEventListener('parcit_call_ended', handleCallEndedEvent);
    };
  }, [isOpen, isIncoming]);

  const handleAcceptIncomingCall = async () => {
    if (stopRingToneRef.current) {
      stopRingToneRef.current();
      stopRingToneRef.current = null;
    }

    // Notify caller via socket
    if (targetId && effectiveConversationId) {
      chatService.acceptCall(targetId, effectiveConversationId);
    }

    // Start video & audio stream
    await startLocalMedia();

    handleCallConnected();
  };

  const handleRejectIncomingCall = async () => {
    if (stopRingToneRef.current) {
      stopRingToneRef.current();
      stopRingToneRef.current = null;
    }

    if (targetId && effectiveConversationId) {
      chatService.rejectCall(targetId, effectiveConversationId, 'Appel refusé');
    }

    await logCallSummary('rejected', 0);

    stopAllMedia();
    setCallStatus('ended');
    onClose(0);
  };

  const handleCallConnected = () => {
    if (stopRingToneRef.current) {
      stopRingToneRef.current();
      stopRingToneRef.current = null;
    }
    setCallStatus('connected');
    setDuration(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = async () => {
    if (isVideoOff) {
      // Turn video ON
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const vTrack = vStream.getVideoTracks()[0];
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(vTrack);
        } else {
          localStreamRef.current = vStream;
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsVideoOff(false);
      } catch (err) {
        console.error('Failed to enable camera:', err);
      }
    } else {
      // Turn video OFF cleanly
      if (localStreamRef.current) {
        const vTracks = localStreamRef.current.getVideoTracks();
        vTracks.forEach((t) => {
          t.enabled = false;
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setIsVideoOff(true);
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
      } catch (err) {
        console.error('Screen sharing canceled or failed:', err);
      }
    }
  };

  // 📸 Take Snapshot & Save directly into conversation database
  const handleTakeSnapshot = () => {
    if (!localVideoRef.current) return;
    const video = localVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/jpeg', 0.9);

    if (onTakeSnapshot) {
      onTakeSnapshot(photoData);
    } else if (effectiveConversationId) {
      chatService.sendMessage(effectiveConversationId, {
        recipientId: targetId,
        messageType: 'image',
        mediaUrl: photoData,
        mediaName: `capture_appel_${Date.now()}.jpg`,
        mediaMimeType: 'image/jpeg',
      });
    }

    setSnapshotFeedback(true);
    setTimeout(() => {
      setSnapshotFeedback(false);
    }, 3000);
  };

  const handleCallEnded = async () => {
    if (stopRingToneRef.current) stopRingToneRef.current();
    if (timerRef.current) clearInterval(timerRef.current);
    stopAllMedia();

    const finalDur = durationRef.current;
    const wasConnected = callStatus === 'connected';
    const status = wasConnected ? 'completed' : 'missed';

    if (targetId && effectiveConversationId) {
      chatService.endCall(targetId, effectiveConversationId, finalDur);
    }

    await logCallSummary(status, finalDur);

    setCallStatus('ended');
    setTimeout(() => {
      onClose(finalDur);
    }, 400);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full h-[85vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {targetName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-extrabold text-sm sm:text-base">{targetName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 font-bold border border-red-800/60">
                  {targetRole}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    callStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : callStatus === 'rejected'
                      ? 'bg-red-500'
                      : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span className="font-medium">
                  {callStatus === 'incoming'
                    ? `Appel ${effectiveCallType === 'video' ? 'Vidéo' : 'Audio'} Entrant...`
                    : callStatus === 'calling'
                    ? 'Sonnerie en cours...'
                    : callStatus === 'rejected'
                    ? statusMessage || 'Appel refusé'
                    : `Connecté • ${formatDuration(duration)}`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {callStatus === 'connected' && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={isFullscreen ? 'Réduire' : 'Plein écran'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Call Stage Area */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Snapshot feedback badge */}
          {snapshotFeedback && (
            <div className="absolute top-4 z-30 bg-emerald-600/90 text-white px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top duration-200">
              <Check className="w-4 h-4 text-emerald-200" />
              <span>📸 Capture enregistrée et envoyée dans la discussion !</span>
            </div>
          )}

          {/* 1. INCOMING CALL SCREEN (Callee View before answering) */}
          {callStatus === 'incoming' && (
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 w-full h-full animate-in zoom-in-95 duration-300">
              {/* Ringing Ripple Avatar */}
              <div className="relative flex items-center justify-center">
                <span className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-ping" />
                <span className="absolute w-48 h-48 rounded-full bg-red-600/10 animate-pulse" />
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-linear-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-2xl shadow-red-600/40 relative z-10">
                  {targetName.slice(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 z-20 p-2.5 bg-emerald-500 text-white rounded-full shadow-lg border-2 border-slate-900 animate-bounce">
                  {effectiveCallType === 'video' ? <Video className="w-5 h-5" /> : <PhoneIncoming className="w-5 h-5" />}
                </div>
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full mb-3">
                  {effectiveCallType === 'video' ? '📹 Appel Vidéo Entrant' : '📞 Appel Audio Entrant'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{targetName}</h2>
                <p className="text-sm text-slate-400 mt-1 font-medium">{targetRole}</p>
              </div>

              {/* ACTION BUTTONS: ACCEPTER / REFUSER */}
              <div className="flex items-center justify-center gap-6 sm:gap-10 mt-6 z-20">
                {/* Refuser Button */}
                <button
                  type="button"
                  onClick={handleRejectIncomingCall}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-hover:scale-110 transition-all border border-red-500">
                    <PhoneOff className="w-7 h-7" />
                  </div>
                  <span className="text-xs text-slate-300 font-bold group-hover:text-red-400 transition-colors">
                    Refuser
                  </span>
                </button>

                {/* Accepter Button */}
                <button
                  type="button"
                  onClick={handleAcceptIncomingCall}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/50 group-hover:scale-110 transition-all border-2 border-emerald-400 animate-pulse">
                    {effectiveCallType === 'video' ? (
                      <Video className="w-7 h-7" />
                    ) : (
                      <Phone className="w-7 h-7 fill-current" />
                    )}
                  </div>
                  <span className="text-xs text-emerald-400 font-extrabold group-hover:text-emerald-300 transition-colors">
                    {effectiveCallType === 'video' ? 'Répondre en Vidéo' : 'Répondre'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 2. CALLING / OUTGOING STATE */}
          {callStatus === 'calling' && (
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 w-full h-full">
              <div className="relative">
                <span className="absolute w-36 h-36 rounded-full bg-red-600/20 animate-ping" />
                <div className="w-28 h-28 rounded-full bg-linear-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-2xl shadow-red-600/30">
                  {targetName.slice(0, 2).toUpperCase()}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-white mb-1">{targetName}</h2>
                <p className="text-sm text-slate-400">Sonnerie chez le destinataire...</p>
              </div>

              {/* Local video preview if video call */}
              {effectiveCallType === 'video' && !isVideoOff && (
                <div className="w-48 h-32 rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-lg relative">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-2 text-[10px] text-white/80 bg-black/60 px-1.5 py-0.5 rounded font-mono">
                    Votre caméra
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. REJECTED STATE */}
          {callStatus === 'rejected' && (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center w-full h-full">
              <div className="w-20 h-20 rounded-full bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center text-2xl font-bold shadow-xl">
                <PhoneOff className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">{statusMessage || 'Appel non abouti'}</h2>
              <p className="text-xs text-slate-400">Fermeture automatique...</p>
            </div>
          )}

          {/* 4. CONNECTED VIDEO CALL */}
          {callStatus === 'connected' && effectiveCallType === 'video' && !isVideoOff && (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Stream Badge */}
              <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2 text-xs text-white shadow-md">
                <Video className="w-3.5 h-3.5 text-emerald-400" />
                <span>Flux Caméra HD Live (WebRTC)</span>
              </div>
            </div>
          )}

          {/* 5. CONNECTED AUDIO CALL */}
          {callStatus === 'connected' && (effectiveCallType === 'audio' || isVideoOff) && (
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 w-full h-full">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-linear-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white text-4xl font-extrabold shadow-2xl shadow-red-600/30">
                  {targetName.slice(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 right-2 p-2 bg-emerald-500 rounded-full text-white shadow-lg">
                  <Mic className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-white mb-1">{targetName}</h2>
                <p className="text-sm text-slate-300">Communication audio sécurisée active</p>
                <p className="text-xl font-mono font-bold text-red-400 mt-2">
                  {formatDuration(duration)}
                </p>
              </div>

              {/* Wave audio bands */}
              <div className="flex items-center gap-1.5 h-12">
                {[40, 70, 90, 60, 100, 75, 45, 85, 55, 30].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-linear-to-t from-red-500 to-rose-400 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.8s',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Control Bar (Available in calling or connected states) */}
        {callStatus !== 'incoming' && (
          <div className="p-4 sm:p-5 px-6 sm:px-8 border-t border-slate-800 bg-slate-900/95 flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
            {callStatus === 'connected' && (
              <>
                {/* Mute Mic */}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer shadow-sm ${
                    isMuted
                      ? 'bg-red-600 text-white border border-red-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title={isMuted ? 'Activer le micro' : 'Couper le micro'}
                >
                  {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                {/* Toggle Video */}
                <button
                  type="button"
                  onClick={handleToggleVideo}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer shadow-sm ${
                    isVideoOff
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                      : 'bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600/30'
                  }`}
                  title={isVideoOff ? 'Activer la caméra' : 'Couper la caméra'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                {/* 📸 Snapshot / Capture Photo Button (Saves to DB) */}
                {effectiveCallType === 'video' && !isVideoOff && (
                  <button
                    type="button"
                    onClick={handleTakeSnapshot}
                    className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 transition-all cursor-pointer shadow-sm flex items-center gap-2"
                    title="Prendre une photo et l'enregistrer dans la discussion"
                  >
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                    <span className="hidden sm:inline text-xs font-bold">Capture Photo</span>
                  </button>
                )}

                {/* Screen Share */}
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer shadow-sm ${
                    isScreenSharing
                      ? 'bg-blue-600 text-white border border-blue-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
                >
                  <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            {/* End / Hang Up Button */}
            <button
              type="button"
              onClick={handleCallEnded}
              className="px-6 py-3.5 sm:py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 sm:gap-3 shadow-lg shadow-red-600/40 hover:scale-105 transition-all cursor-pointer active:scale-95"
              title="Raccrocher"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              <span className="text-xs sm:text-sm font-bold">
                {callStatus === 'connected' ? 'Raccrocher' : 'Annuler'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
