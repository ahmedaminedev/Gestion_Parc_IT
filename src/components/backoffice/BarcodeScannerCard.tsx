import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Barcode,
  Check,
  X,
  RefreshCw,
  Maximize2,
  Trash2,
  SwitchCamera,
  Zap
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import {
  SUPPORTED_BARCODE_FORMATS,
  decodeBarcodeFromImage,
  detectBarcodeRealtime,
  playBarcodeBeep
} from '../../services/barcodeService';
import {
  CameraPermissionPrompt,
  CameraPermissionDecision,
  getStoredCameraPermission,
  setStoredCameraPermission
} from './CameraPermissionPrompt';

interface BarcodeScannerCardProps {
  image: string;
  barcode: string;
  onBarcodeChange: (code: string, imageBase64?: string) => void;
  onClear: () => void;
  onZoom: (src: string, title: string) => void;
}

export const BarcodeScannerCard: React.FC<BarcodeScannerCardProps> = ({
  image,
  barcode,
  onBarcodeChange,
  onClear,
  onZoom,
}) => {
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [detectionFormat, setDetectionFormat] = useState<string | null>(null);
  const [manualOverrideOpen, setManualOverrideOpen] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [hasPermanentPermission, setHasPermanentPermission] = useState(() => getStoredCameraPermission());

  // Contrôles spécifiques au cadre de visée de code-barres
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scanSucceeded, setScanSucceeded] = useState(false);

  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-live-scanner-viewport';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Vérification de la disponibilité du flux média
  const hasGetUserMedia = () => {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
  };

  // Synchroniser état d'autorisation mémorisée
  useEffect(() => {
    setHasPermanentPermission(getStoredCameraPermission());
  }, [isLiveScanning, showPermissionPrompt]);

  // Initialisation du canvas d'analyse temps réel
  useEffect(() => {
    if (!frameCanvasRef.current) {
      frameCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Nettoyage complet au démontage
  useEffect(() => {
    return () => {
      stopLiveScanner();
    };
  }, []);

  // Lister les caméras disponibles
  const fetchAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCam = devices.find(
          d => d.label.toLowerCase().includes('back') ||
               d.label.toLowerCase().includes('rear') ||
               d.label.toLowerCase().includes('arrière') ||
               d.label.toLowerCase().includes('environment')
        );
        const chosenId = backCam ? backCam.id : devices[0].id;
        setSelectedCameraId(chosenId);
        return chosenId;
      }
    } catch (err) {
      console.warn('[BarcodeScannerCard] Énumération caméras non disponible:', err);
    }
    return null;
  };

  /**
   * Succès de détection commun (déclenché par le moteur temps réel ou Html5Qrcode)
   */
  const handleScanSuccess = async (decodedText: string, formatName?: string) => {
    if (!isScanningRef.current) return;
    isScanningRef.current = false;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    setScanSucceeded(true);
    playBarcodeBeep();

    const cleanCode = decodedText.trim();
    setDetectionFormat(formatName || 'Code-barres détecté');

    // Capture d'un snapshot haute qualité pour la preuve du matériel
    let snapshotDataUrl: string | undefined;
    try {
      const videoElem = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      if (videoElem && videoElem.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElem.videoWidth;
        canvas.height = videoElem.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
          snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        }
      }
    } catch {
      // Snapshot optionnel
    }

    // Animation de confirmation verte de 200ms dans le cadre
    setTimeout(async () => {
      await stopLiveScanner();
      setScanSucceeded(false);
      onBarcodeChange(cleanCode, snapshotDataUrl);
    }, 220);
  };

  /**
   * Boucle d'analyse temps réel 30 FPS sur la zone du cadre de visée
   * (Capte instantanément les codes hachurés, inclinés ou rayés grâce aux filtres morphologiques)
   */
  const startRealtimeFrameWorker = () => {
    let lastCheck = 0;
    const loop = (timestamp: number) => {
      if (!isScanningRef.current) return;

      // Traitement cadencé toutes les 60ms pour un équilibre parfait fluidité / batterie
      if (timestamp - lastCheck > 60) {
        lastCheck = timestamp;
        const videoElem = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
        if (videoElem && videoElem.readyState >= 2 && videoElem.videoWidth > 0 && frameCanvasRef.current) {
          detectBarcodeRealtime(videoElem, frameCanvasRef.current)
            .then((res) => {
              if (res && res.text && isScanningRef.current) {
                handleScanSuccess(res.text, res.format);
              }
            })
            .catch(() => {
              // Continuer la boucle sans interruption
            });
        }
      }

      if (isScanningRef.current) {
        animFrameIdRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  /**
   * Démarrer le scanner vidéo direct dans le cadre de visée
   */
  const startLiveScanner = async (targetCamId?: string) => {
    setCameraError(null);
    setScanSucceeded(false);
    setTorchOn(false);
    setZoomLevel(1);

    if (!hasGetUserMedia()) {
      // Si le navigateur ne dispose pas de getUserMedia (ex: contexte HTTP strict)
      if (cameraCaptureInputRef.current) {
        cameraCaptureInputRef.current.click();
        return;
      }
      setCameraError("Le scanner direct nécessite un contexte sécurisé (HTTPS). Vous pouvez photographier le code-barres.");
      return;
    }

    setIsLiveScanning(true);
    isScanningRef.current = true;

    try {
      // Attendre que le conteneur soit dans le DOM
      await new Promise(r => setTimeout(r, 100));

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: SUPPORTED_BARCODE_FORMATS,
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        } as any,
      });
      scannerInstanceRef.current = scanner;

      // Configuration du scan axée sur la performance
      const scanConfig: Html5QrcodeCameraScanConfig = {
        fps: 25,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Cadre rectangulaire dédié aux codes-barres 1D et 2D (ratio ~ 2.5:1)
          const width = Math.min(Math.floor(viewfinderWidth * 0.88), 340);
          const height = Math.min(Math.floor(viewfinderHeight * 0.46), 140);
          return { width: Math.max(width, 220), height: Math.max(height, 90) };
        },
        aspectRatio: 1.777778,
      };

      // Spécification de la caméra avec contraintes HD 1080p et autofocus continu
      const cameraConstraints: MediaTrackConstraints = {
        facingMode: targetCamId ? undefined : { ideal: 'environment' },
        width: { min: 1280, ideal: 1920 },
        height: { min: 720, ideal: 1080 },
        // @ts-ignore
        focusMode: 'continuous',
        // @ts-ignore
        advanced: [{ focusMode: 'continuous' }]
      };

      const cameraParam = targetCamId || (selectedCameraId ? selectedCameraId : cameraConstraints);

      try {
        await scanner.start(
          cameraParam,
          scanConfig,
          (decodedText, decodedResult) => {
            handleScanSuccess(decodedText, decodedResult?.result?.format?.formatName);
          },
          () => {}
        );
      } catch (firstErr) {
        console.warn('[BarcodeScannerCard] Premier essai start caméra échoué, essai direct facingMode:', firstErr);
        // Fallback sans contraintes avancées
        await scanner.start(
          { facingMode: 'environment' },
          scanConfig,
          (decodedText, decodedResult) => {
            handleScanSuccess(decodedText, decodedResult?.result?.format?.formatName);
          },
          () => {}
        );
      }

      // Démarrage simultané de la boucle d'analyse de trames temps réel
      startRealtimeFrameWorker();

      // Charger les caméras disponibles pour permettre le basculement
      fetchAvailableCameras();

    } catch (err: any) {
      console.warn('[BarcodeScannerCard] Erreur démarrage scanner live:', err);
      await stopLiveScanner();

      if (err?.name === 'NotAllowedError' || String(err).includes('Permission') || err?.name === 'SecurityError') {
        setCameraError("Autorisation caméra refusée ou restreinte. Vous pouvez photographier le code-barres avec le bouton ci-dessous :");
      } else if (err?.name === 'NotFoundError') {
        setCameraError("Aucun capteur caméra détecté sur cet appareil.");
      } else {
        setCameraError("Impossible d'activer le flux vidéo direct. Vous pouvez photographier le code-barres directement :");
      }
    }
  };

  /**
   * Arrêt propre du scanner
   */
  const stopLiveScanner = async () => {
    isScanningRef.current = false;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        scannerInstanceRef.current.clear();
      } catch (err) {
        console.warn('[BarcodeScannerCard] Erreur arrêt scanner:', err);
      }
      scannerInstanceRef.current = null;
    }

    setIsLiveScanning(false);
    setTorchOn(false);
  };

  /**
   * Bascule Torche / Lampe Flash
   */
  const toggleTorch = async () => {
    try {
      const videoElem = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      const stream = videoElem?.srcObject as MediaStream;
      const track = stream?.getVideoTracks?.()[0];
      if (track) {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }] as any
        });
        setTorchOn(nextState);
      }
    } catch (e) {
      console.warn('[BarcodeScannerCard] Torche non supportée sur cet appareil:', e);
    }
  };

  /**
   * Bascule Zoom (1x / 2x) pour faciliter la mise au point sur codes fins
   */
  const toggleZoom = async () => {
    try {
      const videoElem = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      const stream = videoElem?.srcObject as MediaStream;
      const track = stream?.getVideoTracks?.()[0];
      if (track) {
        const nextZoom = zoomLevel === 1 ? 2 : 1;
        await track.applyConstraints({
          advanced: [{ zoom: nextZoom }] as any
        });
        setZoomLevel(nextZoom);
      } else {
        setZoomLevel(zoomLevel === 1 ? 2 : 1);
      }
    } catch (e) {
      setZoomLevel(zoomLevel === 1 ? 2 : 1);
    }
  };

  /**
   * Clic sur le bouton Scanner : ouvre le cadre de visée dans la carte
   */
  const handleCameraClick = () => {
    setCameraError(null);

    if (getStoredCameraPermission()) {
      startLiveScanner();
    } else {
      setShowPermissionPrompt(true);
    }
  };

  /**
   * Décision de l'utilisateur sur l'autorisation
   */
  const handlePermissionDecision = (decision: CameraPermissionDecision) => {
    setShowPermissionPrompt(false);
    if (decision === 'always') {
      setStoredCameraPermission('always');
      setHasPermanentPermission(true);
      startLiveScanner();
    } else if (decision === 'once') {
      startLiveScanner();
    }
  };

  const handleResetPermission = () => {
    setStoredCameraPermission('reset');
    setHasPermanentPermission(false);
  };

  /**
   * Changer de caméra
   */
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].id;
    setSelectedCameraId(nextCamId);

    await stopLiveScanner();
    startLiveScanner(nextCamId);
  };

  /**
   * Traitement d'une photo / fichier sélectionné (avec moteur multi-passes anti-hachures)
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
      return;
    }

    setIsDecodingFile(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;

      try {
        const decoded = await decodeBarcodeFromImage(file);
        if (decoded && decoded.text) {
          playBarcodeBeep();
          setDetectionFormat(decoded.format || 'Code-barres');
          onBarcodeChange(decoded.text, base64);
        } else {
          onBarcodeChange(barcode || '', base64);
          setCameraError("Aucun code-barres n'a été reconnu sur cette photo. Cadrez de plus près ou saisissez le code manuellement ci-dessous.");
        }
      } catch (err: any) {
        onBarcodeChange(barcode || '', base64);
        setCameraError("Erreur lors de l'analyse de l'image. Vous pouvez saisir le code manuellement.");
      } finally {
        setIsDecodingFile(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      id="barcode-scanner-card"
      className={`p-3.5 rounded-2xl border transition-all ${
        barcode
          ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
          : isLiveScanning
            ? 'bg-cyan-50/60 border-cyan-400 ring-2 ring-cyan-200'
            : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Styles injectés pour contraindre le conteneur vidéo Html5Qrcode à la taille exacte du cadre */}
      <style>{`
        #${scannerContainerId} {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          overflow: hidden !important;
        }
        #${scannerContainerId} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 0.875rem !important;
        }
        #${scannerContainerId}__scan_region {
          width: 100% !important;
          height: 100% !important;
        }
        #${scannerContainerId}__dashboard_section,
        #${scannerContainerId}__header_message,
        #${scannerContainerId}__scan_region img {
          display: none !important;
        }
        @keyframes laserSweepAnim {
          0% { top: 12%; opacity: 0.75; }
          50% { top: 86%; opacity: 1; }
          100% { top: 12%; opacity: 0.75; }
        }
      `}</style>

      {/* Input de fichier pour importer une photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Input caméra natif de secours */}
      <input
        ref={cameraCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* En-tête de la carte */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${barcode ? 'bg-emerald-100 text-emerald-800' : 'bg-cyan-100 text-cyan-800'}`}>
            <Barcode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <span>4. Image Code-barres (Cadre Dédié)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-normal border border-blue-200">
                100% Local & Sécurisé
              </span>
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-gray-500">
                Cadre de visée optimisé pour codes-barres 1D/2D et hachurés
              </p>
              {hasPermanentPermission && (
                <span className="text-[10px] text-cyan-700 font-medium">
                  • Caméra autorisée (
                  <button
                    type="button"
                    onClick={handleResetPermission}
                    className="underline hover:text-cyan-900 cursor-pointer"
                    title="Réinitialiser pour redemander l'autorisation"
                  >
                    Réinitialiser
                  </button>
                  )
                </span>
              )}
            </div>
          </div>
        </div>

        {barcode && !isLiveScanning && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <Check className="w-3 h-3" /> Code Détecté
          </span>
        )}
      </div>

      {/* Message d'autorisation Caméra */}
      {showPermissionPrompt && !isLiveScanning && (
        <div className="mb-3">
          <CameraPermissionPrompt
            title="Image Code-barres"
            onDecision={handlePermissionDecision}
          />
        </div>
      )}

      {/* =========================================================================
          MODE SCANNER EN DIRECT : CADRE DE BARCODE COMPACT ET ULTRA-PRÉCIS
      ========================================================================= */}
      {isLiveScanning && (
        <div className="relative w-full h-[270px] sm:h-[290px] rounded-2xl overflow-hidden bg-slate-950 border-2 border-cyan-500 shadow-xl mb-3 flex items-center justify-center select-none">
          {/* Conteneur vidéo Html5Qrcode restreint à la boîte */}
          <div id={scannerContainerId} />

          {/* Masque sombre et CADRE DE BARCODE central ciblé */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Voile d'ombrage périphérique pour focaliser l'attention */}
            <div className="absolute inset-0 bg-slate-950/45" />

            {/* LE CADRE DE VISÉE BARCODE DÉDIÉ */}
            <div
              className={`relative z-10 w-[86%] max-w-[310px] h-[110px] sm:h-[120px] rounded-xl transition-all duration-200 flex flex-col items-center justify-center ${
                scanSucceeded
                  ? 'border-4 border-emerald-400 bg-emerald-500/25 shadow-[0_0_35px_rgba(16,185,129,0.95)] scale-102'
                  : 'border-2 border-cyan-400/90 shadow-[0_0_22px_rgba(6,182,212,0.45)]'
              }`}
            >
              {/* 4 coins de guidage haute visibilité */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

              {/* Laser rouge de balayage animé */}
              {!scanSucceeded && (
                <div
                  className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-red-500 via-rose-300 to-red-500 shadow-[0_0_12px_#ef4444]"
                  style={{ animation: 'laserSweepAnim 1.9s ease-in-out infinite' }}
                />
              )}

              {/* Ligne médiane de repère */}
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[1px] bg-cyan-300/25 pointer-events-none" />

              {/* Badge d'état dans le cadre */}
              <div className="relative z-20 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-xs border border-cyan-500/30 text-[10px] font-mono text-cyan-200 flex items-center gap-1.5 shadow-md">
                {scanSucceeded ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Code capté !
                  </span>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Placez le code-barres dans ce cadre</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Barre d'outils supérieure dans le cadre */}
          <div className="absolute top-2.5 inset-x-3 flex items-center justify-between pointer-events-auto z-20">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-black/70 backdrop-blur-xs rounded-lg text-[10px] font-bold text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Scan IA 1080p
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Bouton Torche / Flash */}
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-1.5 rounded-lg text-xs font-semibold backdrop-blur-xs cursor-pointer transition-all ${
                  torchOn ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_#f59e0b]' : 'bg-black/70 hover:bg-black text-white'
                }`}
                title={torchOn ? 'Éteindre la torche' : 'Allumer la torche (recommandé pour éclairer les barres)'}
              >
                <Zap className="w-3.5 h-3.5" />
              </button>

              {/* Bouton Zoom */}
              <button
                type="button"
                onClick={toggleZoom}
                className="px-2 py-1 bg-black/70 hover:bg-black text-white text-[11px] font-bold rounded-lg backdrop-blur-xs cursor-pointer border border-white/10"
                title="Basculer le zoom"
              >
                {zoomLevel}x
              </button>

              {/* Bouton Switch caméra */}
              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="p-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-lg backdrop-blur-xs cursor-pointer border border-white/10"
                  title="Changer de caméra"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              )}

              {/* Bouton Fermer */}
              <button
                type="button"
                onClick={stopLiveScanner}
                className="p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg shadow-md cursor-pointer"
                title="Arrêter le scanner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pied du cadre : conseil de performance */}
          <div className="absolute bottom-2 inset-x-3 flex items-center justify-center pointer-events-none z-20">
            <span className="text-[10px] text-slate-300 bg-black/70 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
              Autofocus continu • Détection ultra-rapide anti-rayures
            </span>
          </div>
        </div>
      )}

      {/* Traitement en cours d'un fichier */}
      {isDecodingFile && (
        <div className="p-3 mb-2 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center gap-2 text-xs text-cyan-800 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-600" />
          <span className="font-semibold">Moteur haute performance : analyse multi-passes en cours...</span>
        </div>
      )}

      {/* Message d'aide / erreur */}
      {cameraError && (
        <div className="p-3 mb-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-2 shadow-2xs">
          <div className="flex items-start gap-2">
            <Camera className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{cameraError}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-amber-200/60">
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                cameraCaptureInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs active:scale-97 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photographier avec le téléphone</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                startLiveScanner();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réessayer le cadre</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                setManualOverrideOpen(true);
                setManualCodeInput(barcode || '');
              }}
              className="px-2.5 py-1 text-cyan-800 hover:text-cyan-900 underline text-xs font-semibold cursor-pointer"
            >
              Saisie manuelle
            </button>

            <button
              type="button"
              onClick={() => setCameraError(null)}
              className="px-2 py-1 text-gray-600 hover:bg-amber-100 rounded-lg text-xs ml-auto cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Aperçu de la photo de code-barres capturée / téléversée */}
      {image && !isLiveScanning ? (
        <div className="space-y-2">
          <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
            <img
              src={image}
              alt="Photo du code-barres"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onZoom(image, 'Image Code-barres')}
                className="p-1.5 bg-white text-gray-800 rounded-lg shadow-md hover:bg-gray-100 cursor-pointer"
                title="Agrandir"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onZoom(image, 'Image Code-barres')}
                className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" /> Agrandir
              </button>
              {detectionFormat && (
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-mono">
                  {detectionFormat}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCameraClick}
                className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-cyan-50 hover:text-cyan-700 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-cyan-50 hover:text-cyan-700 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Fichier</span>
              </button>
              <button
                type="button"
                onClick={onClear}
                className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                title="Supprimer la photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : !isLiveScanning && (
        /* Boutons d'action initiaux : Scanner (Cadre) ou Fichier */
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={handleCameraClick}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100 text-cyan-800 text-xs font-bold cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-98"
          >
            <Camera className="w-4 h-4 text-cyan-700" />
            <span>Cadre Scanner (Direct)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-98"
          >
            <Upload className="w-4 h-4 text-gray-600" />
            <span>Fichier / Photo</span>
          </button>
        </div>
      )}

      {/* Saisie ou correction manuelle si le code est très effacé */}
      {manualOverrideOpen && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
          <label className="text-[11px] font-bold text-gray-700 block">
            Correction manuelle du code-barres :
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualCodeInput}
              onChange={(e) => setManualCodeInput(e.target.value)}
              placeholder="Ex: SN847291039"
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="button"
              onClick={() => {
                if (manualCodeInput.trim()) {
                  onBarcodeChange(manualCodeInput.trim());
                  setManualOverrideOpen(false);
                }
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Valider
            </button>
            <button
              type="button"
              onClick={() => setManualOverrideOpen(false)}
              className="px-2 py-1.5 text-gray-500 hover:bg-gray-200 text-xs rounded-lg cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
