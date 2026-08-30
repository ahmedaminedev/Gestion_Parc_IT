import React, { useState, useEffect, useRef } from 'react';
import { Square, Trash2, Send, Play, Pause, RefreshCw } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioDataUrl: string, durationSec: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([20, 40, 60, 30, 70, 50, 90, 40, 20]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio API for live waveform visualization
      const AudioCtx = window.AudioContext || (window as any).AudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Pick 9 representative bands
        const newLevels = Array.from({ length: 9 }, (_, i) => {
          const val = dataArray[i * 2] || 0;
          return Math.max(15, Math.min(95, (val / 255) * 100));
        });
        setAudioLevels(newLevels);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start audio recording:', err);
      alert('Impossible d\'accéder au microphone. Veuillez vérifier les permissions de votre navigateur.');
      onCancel();
    }
  };

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopRecordingCleanup();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (!audioBlob) {
      handleStopRecording();
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      onSendVoice(base64Audio, recordingTime || 1);
    };
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPlayingPreview(false);
    }

    if (previewAudioRef.current) {
      if (isPlayingPreview) {
        previewAudioRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        previewAudioRef.current.play();
        setIsPlayingPreview(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-red-50/90 border border-red-200 rounded-2xl px-4 py-2.5 animate-in fade-in duration-200 shadow-xs">
      {/* Delete / Cancel */}
      <button
        type="button"
        onClick={onCancel}
        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-100/60 transition-colors cursor-pointer"
        title="Annuler l'enregistrement"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Pulsing Recording Indicator */}
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-600 animate-ping' : 'bg-slate-400'}`} />
        <span className="font-mono text-sm font-bold text-red-700 min-w-[48px]">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Live Waveform Bars */}
      <div className="flex-1 flex items-center justify-center gap-1.5 h-8 px-4">
        {isRecording ? (
          audioLevels.map((lvl, idx) => (
            <span
              key={idx}
              className="w-1.5 bg-linear-to-t from-red-600 to-rose-400 rounded-full transition-all duration-75"
              style={{ height: `${lvl}%` }}
            />
          ))
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Enregistrement prêt</span>
            {audioUrl && (
              <button
                type="button"
                onClick={togglePreviewPlay}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer shadow-xs"
              >
                {isPlayingPreview ? <Pause className="w-3.5 h-3.5 text-red-600" /> : <Play className="w-3.5 h-3.5 text-red-600" />}
                <span className="font-semibold">{isPlayingPreview ? 'Pause' : 'Écouter'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-xs"
            title="Arrêter et réécouter"
          >
            <Square className="w-4 h-4 fill-current text-red-600" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAudioBlob(null);
              setAudioUrl(null);
              startRecording();
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
            title="Réenregistrer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-red-600/20 transition-all cursor-pointer"
          title="Envoyer le message vocal"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Envoyer</span>
        </button>
      </div>
    </div>
  );
};
