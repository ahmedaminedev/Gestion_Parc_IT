import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video, X, RotateCcw, Check, Square, SwitchCamera } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (dataUrl: string, type: 'image' | 'video', durationSec?: number) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onSendMedia,
}) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      alert('Impossible d\'activer la caméra. Veuillez vérifier les permissions de votre navigateur.');
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      try {
        stream.getTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
      } catch (e) {}
      setStream(null);
    }
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        try {
          const s = videoRef.current.srcObject as MediaStream;
          s.getTracks().forEach((t) => {
            t.enabled = false;
            t.stop();
          });
        } catch (e) {}
      }
      videoRef.current.srcObject = null;
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecordingVideo(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(photoData);
  };

  const startVideoRecording = () => {
    if (!stream) return;
    videoChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        videoChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };

    recorder.start(100);
    setIsRecordingVideo(true);
    setVideoTimer(0);

    timerIntervalRef.current = setInterval(() => {
      setVideoTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleConfirmSend = () => {
    if (mode === 'photo' && capturedPhoto) {
      onSendMedia(capturedPhoto, 'image');
      onClose();
    } else if (mode === 'video' && videoBlob) {
      const reader = new FileReader();
      reader.readAsDataURL(videoBlob);
      reader.onloadend = () => {
        const base64Video = reader.result as string;
        onSendMedia(base64Video, 'video', videoTimer || 1);
        onClose();
      };
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setRecordedVideoUrl(null);
    setVideoBlob(null);
    setVideoTimer(0);
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-900 font-extrabold text-base">Caméra & Médias</h3>
              <p className="text-xs text-slate-500 font-medium">Prenez une photo ou enregistrez une vidéo explicative</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode switch */}
            {!capturedPhoto && !recordedVideoUrl && (
              <div className="flex bg-slate-200/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('photo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'photo' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('video')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'video' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Vidéo</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Stage */}
        <div className="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
          {capturedPhoto ? (
            <img src={capturedPhoto} alt="Capture" className="w-full h-full object-contain" />
          ) : recordedVideoUrl ? (
            <video src={recordedVideoUrl} controls autoPlay className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Recording indicator */}
              {isRecordingVideo && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>REC {Math.floor(videoTimer / 60)}:{(videoTimer % 60).toString().padStart(2, '0')}</span>
                </div>
              )}

              {/* Flip camera */}
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                className="absolute top-4 right-4 p-2.5 bg-slate-900/70 text-white rounded-full hover:bg-slate-800 backdrop-blur-sm transition-all cursor-pointer shadow-md"
                title="Changer de caméra"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-center gap-4">
          {capturedPhoto || recordedVideoUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reprendre</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-red-600/30 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Valider et Envoyer</span>
              </button>
            </>
          ) : (
            <>
              {mode === 'photo' ? (
                <button
                  type="button"
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-600/30 hover:scale-105 transition-all cursor-pointer"
                  title="Prendre la photo"
                >
                  <Camera className="w-7 h-7" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                  className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-xl transition-all cursor-pointer ${
                    isRecordingVideo
                      ? 'bg-slate-900 text-red-500 hover:bg-black'
                      : 'bg-red-600 text-white hover:scale-105 shadow-red-600/30'
                  }`}
                  title={isRecordingVideo ? 'Arrêter la vidéo' : 'Enregistrer la vidéo'}
                >
                  {isRecordingVideo ? (
                    <Square className="w-6 h-6 fill-current" />
                  ) : (
                    <Video className="w-7 h-7" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
