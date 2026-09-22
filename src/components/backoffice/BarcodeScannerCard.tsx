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
  SwitchCamera
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import {
  SUPPORTED_BARCODE_FORMATS,
  decodeBarcodeFromImage,
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

  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-live-scanner-viewport';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchroniser état d'autorisation mémorisée
  useEffect(() => {
    setHasPermanentPermission(getStoredCameraPermission());
  }, [isLiveScanning, showPermissionPrompt]);

  // Nettoyage de la caméra en cas de démontage
  useEffect(() => {
    return () => {
      stopLiveScanner();
    };
  }, []);

  // Lister les caméras disponibles quand l'utilisateur veut scanner
  const fetchAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Préférer la caméra arrière (back/environment) sur smartphone
        const backCam = devices.find(
          d => d.label.toLowerCase().includes('back') ||
               d.label.toLowerCase().includes('rear') ||
               d.label.toLowerCase().includes('arrière') ||
               d.label.toLowerCase().includes('environment')
        );
        setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        return backCam ? backCam.id : devices[0].id;
      }
    } catch (err) {
      console.warn('Erreur énumération caméras:', err);
    }
    return null;
  };

  /**
   * Démarrer le scanner vidéo en direct spécifique au code-barres
   */
  const startLiveScanner = async (targetCamId?: string) => {
    setCameraError(null);
    setIsLiveScanning(true);

    try {
      const camId = targetCamId || (await fetchAvailableCameras());

      // Attendre que le conteneur DOM soit monté
      await new Promise(r => setTimeout(r, 120));

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: SUPPORTED_BARCODE_FORMATS,
        verbose: false,
      });
      scannerInstanceRef.current = scanner;

      const scanConfig: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Zone de cadrage rectangulaire optimale pour les codes-barres 1D et 2D
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const width = Math.floor(minDim * 0.85);
          const height = Math.floor(minDim * 0.45);
          return { width: Math.max(width, 240), height: Math.max(height, 120) };
        },
        aspectRatio: 1.777778, // 16:9
      };

      // Spécification de la caméra : par ID spécifique ou facingMode
      const cameraConfig = camId
        ? camId
        : { facingMode: { ideal: 'environment' } };

      await scanner.start(
        cameraConfig,
        scanConfig,
        async (decodedText, decodedResult) => {
          // SUCCÈS DÉTECTION CODE-BARRES EN DIRECT !
          playBarcodeBeep();
          const cleanCode = decodedText.trim();
          setDetectionFormat(decodedResult.result?.format?.formatName || 'Code-barres');

          // Capture d'un snapshot de la caméra pour archiver l'image de la preuve
          let snapshotDataUrl: string | undefined;
          try {
            const videoElem = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
            if (videoElem) {
              const canvas = document.createElement('canvas');
              canvas.width = videoElem.videoWidth || 640;
              canvas.height = videoElem.videoHeight || 480;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
                snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              }
            }
          } catch {
            // Optionnel
          }

          // Arrêt du scanner
          await stopLiveScanner();

          // Envoi au parent
          onBarcodeChange(cleanCode, snapshotDataUrl);
        },
        () => {
          // Scan continu en cours, pas d'erreur critique
        }
      );
    } catch (err: any) {
      console.warn('Erreur démarrage scanner live:', err);
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission') || err?.name === 'SecurityError') {
        setCameraError("Autorisation caméra refusée. Cliquez sur l'icône de cadenas ou caméra dans la barre d'adresse pour autoriser l'accès, puis réessayez.");
      } else if (err?.name === 'OverconstrainedError') {
        let msg = "La caméra demandée n'est pas disponible. Tentative avec la webcam par défaut...";
        // Tentative de secours automatique
        try {
          if (scannerInstanceRef.current) {
            await scannerInstanceRef.current.start(
              { facingMode: 'user' },
              { fps: 10 },
              (text) => {
                playBarcodeBeep();
                stopLiveScanner();
                onBarcodeChange(text.trim());
              },
              () => {}
            );
            return;
          }
        } catch {
          msg = "Aucune caméra compatible trouvée.";
        }
        setCameraError(msg);
      } else if (err?.name === 'NotFoundError') {
        setCameraError("Aucun capteur caméra détecté sur cet appareil.");
      } else {
        setCameraError("Impossible de démarrer le scanner caméra. Vérifiez qu'aucune autre application n'utilise la caméra.");
      }
      await stopLiveScanner();
    }
  };

  /**
   * Arrêt propre du scanner vidéo
   */
  const stopLiveScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
        scannerInstanceRef.current.clear();
      } catch (err) {
        console.warn('Erreur lors de l’arrêt du scanner:', err);
      }
      scannerInstanceRef.current = null;
    }
    setIsLiveScanning(false);
  };

  /**
   * Clic sur le bouton Caméra (Vérifie d'abord l'autorisation utilisateur)
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
    } else {
      // Annulation : aucun message d'erreur, l'utilisateur continue librement
    }
  };

  const handleResetPermission = () => {
    setStoredCameraPermission('reset');
    setHasPermanentPermission(false);
  };

  /**
   * Changer de caméra si plusieurs disponibles
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
   * Traitement d'une photo / fichier sélectionné (PC ou Smartphone)
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

    // Lecture base64 pour affichage immédiat
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;

      // Décodage local sécurisé du code-barres contenu dans l'image
      try {
        const decoded = await decodeBarcodeFromImage(file);
        if (decoded && decoded.text) {
          playBarcodeBeep();
          setDetectionFormat(decoded.format || 'Code-barres');
          onBarcodeChange(decoded.text, base64);
        } else {
          // Aucun code-barres n'a pu être lu automatiquement
          // On conserve tout de même l'image pour que l'utilisateur n'ait pas à la re-sélectionner
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
      {/* Input de fichier caché : strictement pour importer une photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
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
              <span>4. Image Code-barres (Détecteur Dédié)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-normal border border-blue-200">
                100% Local & Sécurisé
              </span>
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-gray-500">
                Scannez en direct ou chargez une photo (PC / Smartphone)
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

      {/* Message d'autorisation Caméra (3 choix : Une fois pour toute / Cette fois seulement / Annuler) */}
      {showPermissionPrompt && !isLiveScanning && (
        <div className="mb-3">
          <CameraPermissionPrompt
            title="Image Code-barres"
            onDecision={handlePermissionDecision}
          />
        </div>
      )}

      {/* =========================================================================
          MODE SCANNER EN DIRECT (CAMÉRA SPÉCIFIQUE CODE-BARRES)
      ========================================================================= */}
      {isLiveScanning && (
        <div className="relative rounded-xl overflow-hidden bg-black mb-3 border-2 border-cyan-400 shadow-md">
          {/* Viewport pour html5-qrcode */}
          <div id={scannerContainerId} className="w-full min-h-[260px] bg-black" />

          {/* Guide visuel laser animé au centre */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            <div className="relative w-4/5 max-w-[280px] h-28 border-2 border-cyan-400 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center">
              {/* Ligne laser rouge animée */}
              <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
              <span className="text-[10px] font-mono text-cyan-200 bg-black/70 px-2 py-0.5 rounded backdrop-blur-xs">
                Placez le code-barres dans ce cadre
              </span>
            </div>
          </div>

          {/* Barre d'outils du scanner */}
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-between px-3 pointer-events-auto">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="px-2.5 py-1.5 bg-black/70 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center gap-1 backdrop-blur-xs cursor-pointer"
                title="Changer de caméra"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Changer</span>
              </button>
            )}

            <div className="ml-auto">
              <button
                type="button"
                onClick={stopLiveScanner}
                className="px-3 py-1.5 bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Arrêter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Traitement en cours d'un fichier */}
      {isDecodingFile && (
        <div className="p-3 mb-2 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center gap-2 text-xs text-cyan-800 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-600" />
          <span className="font-semibold">Décodage du code-barres par le moteur local...</span>
        </div>
      )}

      {/* Message d'information / aide caméra code-barres */}
      {cameraError && (
        <div className="p-3 mb-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-2 shadow-2xs">
          <div className="flex items-start gap-2">
            <Barcode className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed flex-1">{cameraError}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                startLiveScanner();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réessayer la caméra</span>
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
        /* Boutons d'action initiaux : Caméra ou Fichier */
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={handleCameraClick}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100 text-cyan-800 text-xs font-bold cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-98"
          >
            <Camera className="w-4 h-4 text-cyan-700" />
            <span>Caméra (Scanner)</span>
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

      {/* Saisie ou correction manuelle si le code n'est pas lisible */}
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
