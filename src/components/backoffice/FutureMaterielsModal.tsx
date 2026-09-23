import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Camera,
  Barcode,
  FileText,
  Receipt,
  Image as ImageIcon,
  Lock,
  Eye,
  Check,
  RefreshCw,
  Sparkles,
  Upload,
  ArrowRight,
  Package,
  Printer,
  Droplets,
  Maximize2
} from 'lucide-react';
import { itParkService } from '../../services/itParkService';
import {
  FutureMateriel,
  Materiel,
  GroupeMateriel,
  Fournisseur,
  Facture,
  Emplacement,
  Beneficiaire,
  StatutMateriel,
  Composant,
  CapaciteUnite,
  TauxUtilisationLiquide
} from '../../types/itPark';
import { FormAlert } from '../common/FormAlert';
import { CustomConfirmModal } from '../common/CustomConfirmModal';
import { BarcodeScannerCard } from './BarcodeScannerCard';
import {
  CameraPermissionPrompt,
  CameraPermissionDecision,
  getStoredCameraPermission,
  setStoredCameraPermission
} from './CameraPermissionPrompt';

// =========================================================================
// SOUS-COMPOSANT DE CAPTURE PHOTO (CAMÉRA OU FICHIER)
// =========================================================================

interface CameraOrFileInputProps {
  label: string;
  sublabel?: string;
  image: string;
  onChange: (base64: string, filename?: string) => void;
  onClear: () => void;
  onZoom: (src: string, title: string) => void;
  icon: React.ReactNode;
  isBarcode?: boolean;
}

const CameraOrFileInput: React.FC<CameraOrFileInputProps> = ({
  label,
  sublabel,
  image,
  onChange,
  onClear,
  onZoom,
  icon,
  isBarcode,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermanentPermission, setHasPermanentPermission] = useState(() => getStoredCameraPermission());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Détection smartphone / tablette ou contexte non-sécurisé HTTP
  const isMobileOrInsecure = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
    const hasMedia = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    const isInsecure = typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isMobile || !hasMedia || isInsecure;
  };

  // Synchroniser état d'autorisation mémorisée
  useEffect(() => {
    setHasPermanentPermission(getStoredCameraPermission());
  }, [isCameraActive, showPermissionPrompt]);

  // Arrêter le flux caméra proprement lors du démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleCameraClick = () => {
    setCameraError(null);

    // Sur smartphone ou en HTTP sans HTTPS (où les navigateurs bloquent getUserMedia),
    // déclencher directement l'appareil photo natif du téléphone via capture="environment"
    if (isMobileOrInsecure()) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
        return;
      }
    }

    if (getStoredCameraPermission()) {
      startCamera();
    } else {
      setShowPermissionPrompt(true);
    }
  };

  const handlePermissionDecision = (decision: CameraPermissionDecision) => {
    setShowPermissionPrompt(false);
    if (decision === 'always') {
      setStoredCameraPermission('always');
      setHasPermanentPermission(true);
      startCamera();
    } else if (decision === 'once') {
      startCamera();
    } else {
      // Annulation : aucun message d'erreur, utilisateur continue librement
    }
  };

  const handleResetPermission = () => {
    setStoredCameraPermission('reset');
    setHasPermanentPermission(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Déclenchement automatique de l'appareil photo natif du smartphone
        if (cameraInputRef.current) {
          cameraInputRef.current.click();
          return;
        }
        setCameraError("La caméra en direct nécessite HTTPS. Utilisez l'appareil photo natif.");
        return;
      }

      let stream: MediaStream | null = null;

      // 1. Tenter d'abord la caméra arrière (recommandée sur mobile/tablette)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
      } catch {
        // 2. Tenter avec facingMode 'environment' simple
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
          });
        } catch {
          // 3. Tenter avec la caméra avant
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' },
              audio: false
            });
          } catch {
            // 4. Si échec (notamment sur PC de bureau ou laptop sans caméra arrière), utiliser toute webcam disponible
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
              });
            } catch (fallbackErr: any) {
              throw fallbackErr;
            }
          }
        }
      }

      if (!stream) {
        throw new Error("Impossible d'initialiser le flux vidéo.");
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Connecter la vidéo avec les attributs nécessaires pour mobiles / iOS Safari
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          videoRef.current.play().catch(err => {
            console.warn("Erreur lecture vidéo:", err);
          });
        }
      }, 50);
    } catch (err: any) {
      console.warn("Erreur accès caméra:", err);
      setIsCameraActive(false);

      if (err?.name === 'NotAllowedError' || String(err).includes('Permission') || err?.name === 'SecurityError') {
        setCameraError("Autorisation caméra refusée ou restreinte par le navigateur (requiert HTTPS). Vous pouvez utiliser l'appareil photo du téléphone :");
      } else if (err?.name === 'NotFoundError') {
        setCameraError("Aucune caméra ou webcam détectée sur cet appareil.");
      } else {
        setCameraError("Impossible d'activer le flux vidéo direct. Vous pouvez ouvrir l'appareil photo du téléphone :");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onChange(dataUrl, `camera_${isBarcode ? 'barcode' : 'photo'}_${Date.now()}.jpg`);
    }
    stopCamera();
  };

  // Traitement d'une photo prise avec l'appareil photo natif du téléphone
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onChange(base64, `camera_${isBarcode ? 'barcode' : 'photo'}_${Date.now()}.jpg`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onChange(base64, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`p-3.5 rounded-2xl border transition-all ${
      image
        ? 'bg-emerald-50/40 border-emerald-200'
        : isCameraActive
          ? 'bg-cyan-50/50 border-cyan-300'
          : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      {/* Hidden file input : strictement pour importer un fichier image depuis la galerie */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden camera input : déclenchement direct de l'appareil photo du smartphone */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeCameraCapture}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${image ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-gray-900">{label}</h4>
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
            {sublabel && <p className="text-[10px] text-gray-500">{sublabel}</p>}
          </div>
        </div>

        {image && !isCameraActive && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <Check className="w-3 h-3" /> Photo prête
          </span>
        )}
      </div>

      {/* Message d'autorisation Caméra (Une fois pour toute / Cette fois seulement / Annuler) */}
      {showPermissionPrompt && !isCameraActive && (
        <div className="mb-2.5">
          <CameraPermissionPrompt
            title={label}
            onDecision={handlePermissionDecision}
          />
        </div>
      )}

      {/* Mode Caméra en cours */}
      {isCameraActive && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center mb-2 shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Viseur visuel pour scanner ou cadrer */}
          <div className="absolute inset-4 border-2 border-white/60 border-dashed rounded-lg pointer-events-none flex items-center justify-center">
            {isBarcode && (
              <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-xs font-mono">
                Cadrez l'étiquette code-barres
              </span>
            )}
          </div>

          {/* Contrôles caméra */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 px-4">
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs font-semibold rounded-lg backdrop-blur-xs cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transform active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Prendre la photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Message d'erreur de la Caméra */}
      {cameraError && (
        <div className="p-3 mb-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-2 shadow-2xs">
          <div className="flex items-start gap-2">
            <Camera className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed flex-1">{cameraError}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                cameraInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs active:scale-97 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Ouvrir l'appareil photo du téléphone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                startCamera();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Réessayer le flux</span>
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

      {/* Aperçu de l'image capturée / importée */}
      {image && !isCameraActive ? (
        <div className="space-y-2">
          <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
            <img
              src={image}
              alt={label}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onZoom(image, label)}
                className="p-1.5 bg-white text-gray-800 rounded-lg shadow-md hover:bg-gray-100 cursor-pointer"
                title="Agrandir"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClear}
                className="p-1.5 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 cursor-pointer"
                title="Supprimer cette photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => onZoom(image, label)}
              className="text-cyan-700 hover:text-cyan-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Agrandir</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCameraClick}
                className="px-2 py-1 text-[11px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Reprendre par caméra"
              >
                <Camera className="w-3 h-3 text-cyan-600" />
                <span>Caméra</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 text-[11px] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium inline-flex items-center gap-1 cursor-pointer"
                title="Remplacer par fichier"
              >
                <Upload className="w-3 h-3 text-blue-600" />
                <span>Fichier</span>
              </button>
              <button
                type="button"
                onClick={onClear}
                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : !isCameraActive ? (
        /* Choix : Bouton Caméra OU Bouton Fichier */
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={handleCameraClick}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Camera className="w-4 h-4 text-cyan-600" />
            <span>Caméra</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Upload className="w-4 h-4 text-gray-600" />
            <span>Fichier</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

// =========================================================================
// MODALE PRINCIPALE FUTUR MATÉRIEL
// =========================================================================

interface FutureMaterielsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMaterielCreated?: (newMat: Materiel) => void;
}

export const FutureMaterielsModal: React.FC<FutureMaterielsModalProps> = ({
  isOpen,
  onClose,
  onMaterielCreated
}) => {
  // Données globales
  const [futureMateriels, setFutureMateriels] = useState<FutureMateriel[]>(itParkService.getFutureMateriels());
  const [materiels, setMateriels] = useState<Materiel[]>(itParkService.getMateriels());
  const [groupes, setGroupes] = useState<GroupeMateriel[]>(itParkService.getGroupesMateriel());
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(itParkService.getFournisseurs());
  const [factures, setFactures] = useState<Facture[]>(itParkService.getFactures());
  const [emplacements, setEmplacements] = useState<Emplacement[]>(itParkService.getEmplacements());
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>(itParkService.getBeneficiaires());

  // Navigation dans la modale : 'list' | 'form' | 'details' | 'transform'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details' | 'transform'>('list');

  // Filtres liste
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'En attente' | 'Validé en matériel'>('all');

  // Alertes générales
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // État du formulaire d'ajout Futur Matériel (SIMPLIFIÉ : 4 images + 1 seul barcode auto)
  const [imageMateriel, setImageMateriel] = useState<string>('');
  const [imageFicheMateriel, setImageFicheMateriel] = useState<string>('');
  const [imageFacture, setImageFacture] = useState<string>('');
  const [imageBarcode, setImageBarcode] = useState<string>('');
  const [barcodeAuto, setBarcodeAuto] = useState<string>('');
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [isSavingFuture, setIsSavingFuture] = useState(false);

  // État pour les détails
  const [selectedFutureForDetails, setSelectedFutureForDetails] = useState<FutureMateriel | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; title: string } | null>(null);

  // =========================================================================
  // ÉTAT TRANSFORMATION EN MATÉRIEL (SPLIT VIEW : GAUCHE = APERÇU, DROITE = NOUVEAU MATÉRIEL)
  // =========================================================================
  const [futureToTransform, setFutureToTransform] = useState<FutureMateriel | null>(null);
  const [transformAlert, setTransformAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [isSavingTransform, setIsSavingTransform] = useState(false);

  // Formulaire exact de Nouveau Matériel
  const [matForm, setMatForm] = useState<{
    ref_immo: string;
    designation: string;
    codeSerie: string;
    id_GroupeMateriel: string;
    statut: StatutMateriel;
    qte: number;
    montantHT: number;
    garantie: string;
    id_Fournisseur: string;
    id_Facture: string;
    typeAffectation: 'non_affecte' | 'emplacement' | 'personnel';
    id_Emplacement: string;
    id_Beneficiaire: string;
    isImprimante: boolean;
    dateMiseEnService: string;
  }>({
    ref_immo: '',
    designation: '',
    codeSerie: '',
    id_GroupeMateriel: '',
    statut: 'En stock',
    qte: 1,
    montantHT: 0,
    garantie: '24 mois',
    id_Fournisseur: '',
    id_Facture: '',
    typeAffectation: 'non_affecte',
    id_Emplacement: '',
    id_Beneficiaire: '',
    isImprimante: false,
    dateMiseEnService: new Date().toISOString().split('T')[0],
  });

  // Gestion des liquides d'écriture pour la transformation
  const [formComposants, setFormComposants] = useState<Array<{
    nom: string;
    couleur: string;
    capaciteType: 'litrage' | 'grammage';
    capaciteValeur: number;
    capaciteUnite: CapaciteUnite;
    utilisation: TauxUtilisationLiquide;
  }>>([]);

  // Création rapide inline d'un groupe de matériel
  const [isCreatingQuickGroup, setIsCreatingQuickGroup] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');
  const [quickGroupCodeSerie, setQuickGroupCodeSerie] = useState(true);
  const [isSavingQuickGroup, setIsSavingQuickGroup] = useState(false);

  // Modale de confirmation
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    type?: 'danger' | 'warning' | 'info';
    message?: string;
    impacts?: string[];
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => Promise<void>;
  }>({ isOpen: false, title: '' });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Synchronisation avec itParkService
  useEffect(() => {
    const unsub = itParkService.subscribe(() => {
      setFutureMateriels(itParkService.getFutureMateriels());
      setMateriels(itParkService.getMateriels());
      setGroupes(itParkService.getGroupesMateriel());
      setFournisseurs(itParkService.getFournisseurs());
      setFactures(itParkService.getFactures());
      setEmplacements(itParkService.getEmplacements());
      setBeneficiaires(itParkService.getBeneficiaires());
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  // =========================================================================
  // GESTION DU CODE-BARRES UNIQUE AUTOMATIQUE
  // =========================================================================

  const handleBarcodeChange = (detectedCode: string, imageBase64?: string) => {
    if (imageBase64) {
      setImageBarcode(imageBase64);
    }
    setBarcodeAuto(detectedCode.trim());
    setIsScanningBarcode(false);
  };

  const handleClearBarcode = () => {
    setImageBarcode('');
    setBarcodeAuto('');
  };

  // =========================================================================
  // ENREGISTREMENT DU FUTUR MATÉRIEL (SIMPLIFIÉ)
  // =========================================================================

  const handleOpenAddForm = () => {
    setImageMateriel('');
    setImageFicheMateriel('');
    setImageFacture('');
    setImageBarcode('');
    setBarcodeAuto('');
    setModalAlert(null);
    setViewMode('form');
  };

  const handleSaveFutureMateriel = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalAlert(null);

    // VALIDATION : "puisque les images optionnel donc il faut au moin un seul remplit dans le formulaire de future materiel"
    const hasAtLeastOne = !!(imageMateriel || imageFicheMateriel || imageFacture || imageBarcode || barcodeAuto);
    if (!hasAtLeastOne) {
      setModalAlert({
        type: 'warning',
        message: 'Veuillez fournir au moins une photo (matériel, fiche, facture ou code-barres) pour enregistrer ce futur matériel.'
      });
      return;
    }

    setIsSavingFuture(true);
    try {
      const payload: Partial<FutureMateriel> = {
        imageMateriel,
        imageFicheMateriel,
        imageFacture,
        imageBarcode,
        barcode: barcodeAuto.trim(),
        barcode1: barcodeAuto.trim(),
        codeSeriePropose: barcodeAuto.trim(),
        designation: barcodeAuto ? `Futur Matériel (${barcodeAuto})` : 'Futur Matériel par images',
        statut: 'En attente',
        dateCreation: new Date().toISOString().split('T')[0],
      };

      const res = await itParkService.saveFutureMateriel(payload);
      if (!res.success) {
        setModalAlert({
          type: 'error',
          message: res.message || "Erreur lors de l'enregistrement du futur matériel."
        });
        setIsSavingFuture(false);
        return;
      }

      setViewMode('list');
      setModalAlert({
        type: 'success',
        message: 'Nouveau futur matériel enregistré avec succès dans la base.'
      });
    } catch (err: any) {
      setModalAlert({
        type: 'error',
        message: err.message || "Erreur serveur lors de l'enregistrement."
      });
    } finally {
      setIsSavingFuture(false);
    }
  };

  // =========================================================================
  // TRANSFORMATION EN MATÉRIEL (SPLIT-VIEW)
  // =========================================================================

  const handleOpenTransform = (future: FutureMateriel) => {
    setFutureToTransform(future);
    setTransformAlert(null);

    const defaultGroup = groupes[0]?.id || '';
    const initialSerial = (future.barcode || future.barcode1 || future.codeSeriePropose || '').trim();

    setMatForm({
      ref_immo: '',
      designation: future.designation && !future.designation.includes('Futur Matériel') ? future.designation : '',
      codeSerie: initialSerial, // Pré-remplissage automatique avec le barcode auto extrait
      id_GroupeMateriel: defaultGroup,
      statut: 'En stock',
      qte: 1,
      montantHT: 0,
      garantie: '24 mois',
      id_Fournisseur: '',
      id_Facture: '',
      typeAffectation: 'non_affecte',
      id_Emplacement: '',
      id_Beneficiaire: '',
      isImprimante: false,
      dateMiseEnService: new Date().toISOString().split('T')[0],
    });
    setFormComposants([]);
    setIsCreatingQuickGroup(false);
    setViewMode('transform');
  };

  const handleSaveQuickGroup = async () => {
    if (!quickGroupName.trim()) return;
    setIsSavingQuickGroup(true);
    try {
      const res = await itParkService.saveGroupeMateriel({
        Groupe: quickGroupName.trim(),
        codeSerieObligatoire: quickGroupCodeSerie,
      });
      if (res.success && res.data) {
        setMatForm(prev => ({ ...prev, id_GroupeMateriel: res.data!.id }));
        setIsCreatingQuickGroup(false);
        setQuickGroupName('');
      } else {
        alert(res.message || "Erreur lors de la création du groupe.");
      }
    } catch (err: any) {
      alert(err.message || "Erreur serveur");
    } finally {
      setIsSavingQuickGroup(false);
    }
  };

  const handleAddLiquide = () => {
    if (formComposants.length >= 4) return;
    const defaultColors = ['Noir', 'Cyan', 'Magenta', 'Jaune'];
    const nextColor = defaultColors[formComposants.length] || 'Noir';
    setFormComposants(prev => [
      ...prev,
      {
        nom: `Cartouche ${nextColor}`,
        couleur: nextColor,
        capaciteType: 'litrage',
        capaciteValeur: 50,
        capaciteUnite: 'cl',
        utilisation: '0%',
      }
    ]);
  };

  const handleRemoveLiquide = (index: number) => {
    setFormComposants(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Validation et enregistrement de la transformation :
   * "lors de clique sur enregistrer le syteme verieife si le code serie existe deja dans la base on affiche produit existe deja (code serie existe dans les materiels ) si il n'existe pas c'est bon si non bloque par alert"
   */
  const handleConfirmTransform = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransformAlert(null);

    const serial = (matForm.codeSerie || '').trim();

    // 1. Contrôle d'obligation du code série selon le groupe
    const curGroup = groupes.find(g => g.id === matForm.id_GroupeMateriel);
    if (curGroup?.codeSerieObligatoire && !serial) {
      setTransformAlert({
        type: 'warning',
        message: `Le numéro de série est obligatoire pour le groupe "${curGroup.Groupe}".`
      });
      return;
    }

    // 2. VÉRIFICATION STRICTE : EST-CE QUE LE CODE SÉRIE EXISTE DÉJÀ DANS LA BASE DES MATÉRIELS ?
    if (serial) {
      const existingMatInParc = materiels.find(
        m => (m.codeSerie || '').trim().toLowerCase() === serial.toLowerCase()
      );

      if (existingMatInParc) {
        // BLOQUÉ PAR ALERTE ROUGE
        setTransformAlert({
          type: 'error',
          message: `Ce produit existe déjà ! Le code série "${serial}" existe déjà dans les matériels (Matériel: "${existingMatInParc.designation || existingMatInParc.reference}").`
        });
        return;
      }
    }

    // 3. Contrôles généraux
    if (!matForm.designation.trim()) {
      setTransformAlert({
        type: 'warning',
        message: 'Veuillez saisir une désignation pour le matériel.'
      });
      return;
    }

    if (!matForm.id_GroupeMateriel) {
      setTransformAlert({
        type: 'warning',
        message: 'Veuillez sélectionner un groupe de matériel.'
      });
      return;
    }

    setIsSavingTransform(true);
    try {
      // Générer une référence unique propre
      const cleanRef = 'MAT-' + Math.floor(100000 + Math.random() * 900000);

      // Résoudre affectation
      let finalEmplacement = matForm.id_Emplacement;
      let finalBeneficiaire = matForm.id_Beneficiaire;
      let finalStatut = matForm.statut;

      if (matForm.typeAffectation === 'non_affecte') {
        finalEmplacement = '';
        finalBeneficiaire = '';
        finalStatut = 'En stock';
      } else if (matForm.typeAffectation === 'personnel') {
        finalEmplacement = '';
      }

      const newMatPayload: Materiel = {
        id: `mat-${Date.now()}`,
        reference: cleanRef,
        ref_immo: matForm.ref_immo.trim(),
        designation: matForm.designation.trim(),
        codeSerie: serial,
        id_GroupeMateriel: matForm.id_GroupeMateriel,
        statut: finalStatut,
        qte: Number(matForm.qte) || 1,
        montantHT: Number(matForm.montantHT) || 0,
        valeurPlafond: Number(matForm.montantHT) || 0,
        garantie: matForm.garantie.trim() || '24 mois',
        dateEntree: matForm.dateMiseEnService,
        dateMiseEnService: matForm.dateMiseEnService,
        id_Fournisseur: matForm.id_Fournisseur,
        id_Facture: matForm.id_Facture,
        id_Emplacement: finalEmplacement,
        id_Beneficiaire: finalBeneficiaire,
        image: futureToTransform?.imageMateriel || '',
        isImprimante: matForm.isImprimante,
      };

      // Sauvegarde du nouveau matériel
      const resSaveMat = await itParkService.saveMateriel(newMatPayload);
      if (!resSaveMat.success) {
        setTransformAlert({
          type: 'error',
          message: resSaveMat.message || "Erreur lors de la création du matériel."
        });
        setIsSavingTransform(false);
        return;
      }

      // Sauvegarder les composants d'imprimante si applicable
      if (matForm.isImprimante && formComposants.length > 0) {
        for (const comp of formComposants) {
          const compPayload: Partial<Composant> = {
            REF_composant: `LIQ-${cleanRef}-${comp.couleur.toUpperCase()}`,
            nom: comp.nom,
            couleur: comp.couleur,
            capaciteType: comp.capaciteType,
            capaciteValeur: comp.capaciteValeur,
            capaciteUnite: comp.capaciteUnite,
            utilisation: comp.utilisation,
            id_Materiel: cleanRef,
            refMateriel: cleanRef,
          };
          await itParkService.saveComposant(compPayload);
        }
      }

      // Mettre à jour le statut du futur matériel
      if (futureToTransform) {
        await itParkService.saveFutureMateriel({
          id: futureToTransform.id,
          statut: 'Validé en matériel',
          id_MaterielCree: newMatPayload.id,
        });
      }

      onMaterielCreated?.(newMatPayload);
      setViewMode('list');
      setModalAlert({
        type: 'success',
        message: `Le matériel "${newMatPayload.designation}" (Code Série: ${newMatPayload.codeSerie || 'N/A'}) a été créé avec succès et intégré au parc informatique !`
      });
    } catch (err: any) {
      setTransformAlert({
        type: 'error',
        message: err.message || "Erreur inattendue lors de la transformation."
      });
    } finally {
      setIsSavingTransform(false);
    }
  };

  // =========================================================================
  // LES DEUX BOUTONS SUPPRIMER
  // =========================================================================

  /**
   * Helper pour savoir si un futur matériel existe déjà dans la table des matériels
   */
  const findExistingMaterielInParc = (future: FutureMateriel): Materiel | undefined => {
    const serial = (future.barcode || future.barcode1 || future.codeSeriePropose || '').trim().toLowerCase();
    if (serial) {
      const match = materiels.find(m => (m.codeSerie || '').trim().toLowerCase() === serial);
      if (match) return match;
    }
    if (future.id_MaterielCree) {
      const match = materiels.find(m => m.id === future.id_MaterielCree);
      if (match) return match;
    }
    return undefined;
  };

  /**
   * BOUTON 1 : "Supprimer de la table matériel"
   * S'affiche UNIQUEMENT SI le futur matériel existe dans la table des matériels.
   * Permet de supprimer ce matériel de la table materiel.
   */
  const handleDeleteFromMaterielsTable = (future: FutureMateriel, linkedMat: Materiel) => {
    setConfirmConfig({
      isOpen: true,
      title: "Supprimer de la table des matériels",
      subtitle: `Matériel: ${linkedMat.designation} (S/N: ${linkedMat.codeSerie || 'N/A'})`,
      type: "danger",
      message: `Êtes-vous sûr de vouloir supprimer définitivement le matériel "${linkedMat.designation}" de la table des matériels du parc informatique ?`,
      impacts: [
        "Ce matériel sera définitivement retiré de l'inventaire du parc actif.",
        "Le stock disponible sera automatiquement réajusté.",
        "Le futur matériel repassera au statut 'En attente' pour pouvoir être réutilisé ou corrigé."
      ],
      confirmText: "Supprimer du parc matériel",
      cancelText: "Annuler",
      onConfirm: async () => {
        setIsConfirmLoading(true);
        try {
          if (linkedMat.codeSerie) {
            await itParkService.deleteMaterielBySerial(linkedMat.codeSerie);
          } else {
            await itParkService.deleteMateriel(linkedMat.id);
          }

          // Remettre le futur matériel en attente
          await itParkService.saveFutureMateriel({
            id: future.id,
            statut: 'En attente',
            id_MaterielCree: '',
          });

          setModalAlert({
            type: 'success',
            message: `Le matériel "${linkedMat.designation}" a été supprimé de la table des matériels.`
          });
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setModalAlert({
            type: 'error',
            message: err.message || "Erreur lors de la suppression."
          });
        } finally {
          setIsConfirmLoading(false);
        }
      }
    });
  };

  /**
   * BOUTON 2 : "Supprimer nouveau futur matériel"
   * Permet de supprimer ce futur matériel de la liste des futurs matériels (corriger erreur, supprimer brouillon...)
   */
  const handleDeleteFutureMateriel = (future: FutureMateriel) => {
    setConfirmConfig({
      isOpen: true,
      title: "Supprimer le futur matériel",
      subtitle: `Futur Matériel ID: ${future.id}`,
      type: "warning",
      message: `Voulez-vous supprimer cette fiche de futur matériel (pré-inventaire) ? Cette action est utile pour corriger une erreur de saisie.`,
      impacts: [
        "Cette fiche et ses photos de pré-inventaire seront effacées.",
        "La table des matériels existants ne sera pas modifiée."
      ],
      confirmText: "Supprimer futur matériel",
      cancelText: "Conserver",
      onConfirm: async () => {
        setIsConfirmLoading(true);
        try {
          await itParkService.deleteFutureMateriel(future.id);
          setModalAlert({
            type: 'success',
            message: "Le futur matériel a été supprimé avec succès."
          });
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          if (viewMode === 'details') setViewMode('list');
        } catch (err: any) {
          setModalAlert({
            type: 'error',
            message: err.message || "Erreur lors de la suppression."
          });
        } finally {
          setIsConfirmLoading(false);
        }
      }
    });
  };

  // Filtrage des futurs matériels
  const filteredFutureMateriels = futureMateriels.filter(item => {
    if (statusFilter !== 'all' && item.statut !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const bCode = (item.barcode || item.barcode1 || '').toLowerCase();
      const des = (item.designation || '').toLowerCase();
      return bCode.includes(q) || des.includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col w-full my-auto transition-all ${
        viewMode === 'transform' ? 'max-w-7xl max-h-[94vh]' : 'max-w-5xl max-h-[92vh]'
      }`}>

        {/* =========================================================================
            HEADER DE LA MODALE
        ========================================================================= */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-900 to-cyan-950 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  {viewMode === 'list' && 'Pré-inventaire par images & Barcode'}
                  {viewMode === 'form' && 'Nouveau futur matériel (Photos & Barcode auto)'}
                  {viewMode === 'details' && 'Détails du futur matériel'}
                  {viewMode === 'transform' && 'Transformation en Matériel actif (Split-View)'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                  {futureMateriels.length} enregistré(s)
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                {viewMode === 'list' && 'Consultez les futurs matériels, vérifiez leur existence et transformez-les en matériels.'}
                {viewMode === 'form' && 'Prenez ou téléversez les photos (Caméra ou Fichier) ; le code-barres est extrait automatiquement.'}
                {viewMode === 'details' && 'Visualisez les 4 photos agrandies et le code-barres extrait.'}
                {viewMode === 'transform' && 'Comparez les photos à gauche et complétez la fiche matériel à droite avec vérification stricte de série.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode !== 'list' && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  setModalAlert(null);
                  setTransformAlert(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                ← Retour à la liste
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerte générale */}
        {modalAlert && (
          <div className="px-6 pt-4 shrink-0">
            <FormAlert
              type={modalAlert.type}
              message={modalAlert.message}
              onClose={() => setModalAlert(null)}
            />
          </div>
        )}

        {/* =========================================================================
            VUE 1 : LISTE DES FUTURS MATÉRIELS (MODE 'list')
        ========================================================================= */}
        {viewMode === 'list' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Barre d'outils et recherche */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher par barcode, S/N ou nom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-black focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer focus:ring-2 focus:ring-black focus:outline-none"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="En attente">En attente ({futureMateriels.filter(f => f.statut === 'En attente').length})</option>
                  <option value="Validé en matériel">Validé en matériel ({futureMateriels.filter(f => f.statut === 'Validé en matériel').length})</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleOpenAddForm}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Futur Matériel</span>
              </button>
            </div>

            {/* Liste sous forme de cartes structurées */}
            {filteredFutureMateriels.length === 0 ? (
              <div className="text-center py-16 px-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-700 mx-auto flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Aucun futur matériel trouvé</h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? "Aucun résultat ne correspond à vos filtres de recherche."
                    : "Vous n'avez pas encore enregistré de matériel en pré-inventaire. Cliquez sur le bouton ci-dessous pour capturer ou importer les photos et le code-barres."}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center gap-2 bg-[#0c1017] hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un futur matériel</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFutureMateriels.map(item => {
                  const existingMatInParc = findExistingMaterielInParc(item);
                  const barcodeValue = item.barcode || item.barcode1 || item.codeSeriePropose || '';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        item.statut === 'Validé en matériel'
                          ? 'bg-slate-50/80 border-slate-200'
                          : existingMatInParc
                            ? 'bg-amber-50/30 border-amber-200'
                            : 'bg-white border-gray-200 hover:border-cyan-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* En-tête de la carte */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-bold">
                              ID: {item.id.slice(-6)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.statut === 'Validé en matériel'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {item.statut}
                            </span>
                          </div>

                          <span className="text-[10px] text-gray-400 font-medium">
                            {item.dateCreation}
                          </span>
                        </div>

                        {/* Rangée des 4 miniatures d'images */}
                        <div className="grid grid-cols-4 gap-1.5 mb-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                          {/* 1. Matériel */}
                          <div
                            onClick={() => item.imageMateriel && setZoomedImage({ src: item.imageMateriel, title: 'Photo du Matériel' })}
                            className={`aspect-square rounded-lg overflow-hidden border flex items-center justify-center text-[10px] text-center p-1 cursor-pointer transition-transform hover:scale-105 ${
                              item.imageMateriel ? 'border-cyan-300 bg-white' : 'border-dashed border-gray-300 bg-gray-100 text-gray-400'
                            }`}
                            title="Photo Matériel"
                          >
                            {item.imageMateriel ? (
                              <img src={item.imageMateriel} alt="Matériel" className="w-full h-full object-cover" />
                            ) : (
                              <span>Matériel</span>
                            )}
                          </div>

                          {/* 2. Fiche */}
                          <div
                            onClick={() => item.imageFicheMateriel && setZoomedImage({ src: item.imageFicheMateriel, title: 'Fiche Matériel' })}
                            className={`aspect-square rounded-lg overflow-hidden border flex items-center justify-center text-[10px] text-center p-1 cursor-pointer transition-transform hover:scale-105 ${
                              item.imageFicheMateriel ? 'border-cyan-300 bg-white' : 'border-dashed border-gray-300 bg-gray-100 text-gray-400'
                            }`}
                            title="Fiche Matériel"
                          >
                            {item.imageFicheMateriel ? (
                              <img src={item.imageFicheMateriel} alt="Fiche" className="w-full h-full object-cover" />
                            ) : (
                              <span>Fiche</span>
                            )}
                          </div>

                          {/* 3. Facture */}
                          <div
                            onClick={() => item.imageFacture && setZoomedImage({ src: item.imageFacture, title: 'Facture' })}
                            className={`aspect-square rounded-lg overflow-hidden border flex items-center justify-center text-[10px] text-center p-1 cursor-pointer transition-transform hover:scale-105 ${
                              item.imageFacture ? 'border-cyan-300 bg-white' : 'border-dashed border-gray-300 bg-gray-100 text-gray-400'
                            }`}
                            title="Facture"
                          >
                            {item.imageFacture ? (
                              <img src={item.imageFacture} alt="Facture" className="w-full h-full object-cover" />
                            ) : (
                              <span>Facture</span>
                            )}
                          </div>

                          {/* 4. Barcode */}
                          <div
                            onClick={() => item.imageBarcode && setZoomedImage({ src: item.imageBarcode, title: 'Code-barres' })}
                            className={`aspect-square rounded-lg overflow-hidden border flex items-center justify-center text-[10px] text-center p-1 cursor-pointer transition-transform hover:scale-105 ${
                              item.imageBarcode ? 'border-cyan-300 bg-white' : 'border-dashed border-gray-300 bg-gray-100 text-gray-400'
                            }`}
                            title="Code-barres"
                          >
                            {item.imageBarcode ? (
                              <img src={item.imageBarcode} alt="Barcode" className="w-full h-full object-cover" />
                            ) : (
                              <span>Barcode</span>
                            )}
                          </div>
                        </div>

                        {/* Barcode auto extrait */}
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Barcode className="w-4 h-4 text-cyan-600 shrink-0" />
                            <div>
                              <span className="text-[10px] font-semibold text-gray-500 block">Code-barres auto :</span>
                              <span className="text-xs font-mono font-bold text-gray-900">
                                {barcodeValue || 'Aucun code détecté'}
                              </span>
                            </div>
                          </div>

                          {barcodeValue && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Auto
                            </span>
                          )}
                        </div>

                        {/* Statut d'existence dans les matériels */}
                        {existingMatInParc && (
                          <div className="p-2.5 mb-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs flex items-start gap-2">
                            <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-900">Existe dans la table des matériels</p>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Associé à : <strong>{existingMatInParc.designation}</strong> (Réf: {existingMatInParc.reference} - S/N: {existingMatInParc.codeSerie || 'N/A'}).
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Barre d'actions sous chaque carte */}
                      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        {/* Bouton Détails */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFutureForDetails(item);
                            setViewMode('details');
                          }}
                          className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                          <span>Détails</span>
                        </button>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* BOUTON 1 : "Supprimer de la table matériel" (S'affiche UNIQUEMENT SI le futur matériel existe dans matériel) */}
                          {existingMatInParc && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFromMaterielsTable(item, existingMatInParc)}
                              className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                              title="Supprimer ce matériel de la table des matériels du parc"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Supprimer de la table matériel</span>
                            </button>
                          )}

                          {/* BOUTON 2 : "Supprimer futur matériel" (utile pour corriger une erreur) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteFutureMateriel(item)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                            title="Supprimer ce futur matériel de la liste"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer futur matériel</span>
                          </button>

                          {/* BOUTON "Transformer en matériel" :
                              "le boutton transformer en materiel n'existe pas que si le formulaire d'ajout cet futur materiel deja remplit (existe dans la base )" */}
                          {item.statut !== 'Validé en matériel' && (
                            <button
                              type="button"
                              onClick={() => handleOpenTransform(item)}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transform active:scale-95 transition-all"
                            >
                              <span>Transformer en matériel</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VUE 2 : FORMULAIRE SIMPLIFIÉ D'AJOUT FUTUR MATÉRIEL (MODE 'form')
        ========================================================================= */}
        {viewMode === 'form' && (
          <form onSubmit={handleSaveFutureMateriel} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-cyan-50/60 border border-cyan-200 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-cyan-100 text-cyan-800 rounded-xl shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs text-cyan-950">
                <h4 className="font-bold text-sm text-cyan-900 mb-0.5">Pré-inventaire par images & Barcode</h4>
                <p className="text-cyan-800 leading-relaxed">
                  Pour chaque photo, choisissez entre <strong>Caméra</strong> ou <strong>Fichier</strong>. Les photos sont optionnelles, mais <strong>au moins une photo</strong> est requise pour enregistrer ce futur matériel. L'image de code-barres alimente automatiquement l'unique champ de barcode ci-dessous.
                </p>
              </div>
            </div>

            {/* 1. LES 4 IMAGES AVEC CHOIX CAMÉRA OU FICHIER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo 1 : Photo Matériel */}
              <CameraOrFileInput
                label="1. Photo du Matériel"
                sublabel="Prise de vue globale ou étiquette façade"
                image={imageMateriel}
                onChange={(base64) => setImageMateriel(base64)}
                onClear={() => setImageMateriel('')}
                onZoom={(src, title) => setZoomedImage({ src, title })}
                icon={<Camera className="w-4 h-4" />}
              />

              {/* Photo 2 : Fiche Matériel */}
              <CameraOrFileInput
                label="2. Fiche Matériel"
                sublabel="Contient la référence constructeur ou fiche technique"
                image={imageFicheMateriel}
                onChange={(base64) => setImageFicheMateriel(base64)}
                onClear={() => setImageFicheMateriel('')}
                onZoom={(src, title) => setZoomedImage({ src, title })}
                icon={<FileText className="w-4 h-4" />}
              />

              {/* Photo 3 : Image Facture */}
              <CameraOrFileInput
                label="3. Image Facture / Bon de livraison"
                sublabel="Preuve d'achat, bon de réception ou garantie"
                image={imageFacture}
                onChange={(base64) => setImageFacture(base64)}
                onClear={() => setImageFacture('')}
                onZoom={(src, title) => setZoomedImage({ src, title })}
                icon={<Receipt className="w-4 h-4" />}
              />

              {/* Photo 4 : Détecteur Dédié Code-barres (Caméra Spécifique ou Fichier / Photo) */}
              <BarcodeScannerCard
                image={imageBarcode}
                barcode={barcodeAuto}
                onBarcodeChange={(code, img) => handleBarcodeChange(code, img)}
                onClear={handleClearBarcode}
                onZoom={(src, title) => setZoomedImage({ src, title })}
              />
            </div>

            {/* 2. APRÈS LES IMAGES : UN SEUL CHAMP DE BARCODE AUTO LIÉ À L'IMAGE BARCODE */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-cyan-600" />
                  <span>Code-barres extrait automatiquement (Lié à la détection)</span>
                </label>
                <div className="flex items-center gap-2">
                  {barcodeAuto && (
                    <button
                      type="button"
                      onClick={() => {
                        const newCode = prompt("Corriger ou ajuster le code-barres :", barcodeAuto);
                        if (newCode !== null && newCode.trim()) {
                          setBarcodeAuto(newCode.trim());
                        }
                      }}
                      className="text-[11px] font-bold text-cyan-700 hover:text-cyan-800 underline cursor-pointer"
                    >
                      Ajuster le code
                    </button>
                  )}
                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-gray-400" />
                    Lecture seule
                  </span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={barcodeAuto}
                  placeholder={isScanningBarcode ? "Détection automatique du code-barres en cours..." : "En attente du scan caméra ou de l'image de code-barres..."}
                  className="w-full pl-3.5 pr-28 py-3 bg-gray-100/90 border border-gray-300 rounded-xl font-mono text-sm text-gray-900 cursor-not-allowed select-none focus:outline-none"
                />

                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isScanningBarcode && (
                    <RefreshCw className="w-4 h-4 text-cyan-600 animate-spin" />
                  )}
                  {barcodeAuto && !isScanningBarcode && (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Détecté
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-500">
                Ce champ est protégé en écriture directe. Il est alimenté automatiquement par le scanner caméra ou par l'analyse locale de l'image de code-barres.
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSavingFuture}
                className="px-6 py-2.5 rounded-xl text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSavingFuture ? 'Enregistrement...' : 'Enregistrer le futur matériel'}
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            VUE 3 : DÉTAILS DU FUTUR MATÉRIEL (MODE 'details')
        ========================================================================= */}
        {viewMode === 'details' && selectedFutureForDetails && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 font-bold mr-2">
                  ID: {selectedFutureForDetails.id}
                </span>
                <span className="text-xs font-bold text-gray-900">
                  Ajouté le {selectedFutureForDetails.dateCreation}
                </span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                selectedFutureForDetails.statut === 'Validé en matériel'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {selectedFutureForDetails.statut}
              </span>
            </div>

            {/* 4 Photos en grand format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <h5 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-600" />
                  <span>Photo du Matériel</span>
                </h5>
                <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border border-gray-200 flex items-center justify-center">
                  {selectedFutureForDetails.imageMateriel ? (
                    <img
                      src={selectedFutureForDetails.imageMateriel}
                      alt="Matériel"
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setZoomedImage({ src: selectedFutureForDetails.imageMateriel!, title: 'Photo du Matériel' })}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Aucune photo fournie</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <h5 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Fiche Matériel</span>
                </h5>
                <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border border-gray-200 flex items-center justify-center">
                  {selectedFutureForDetails.imageFicheMateriel ? (
                    <img
                      src={selectedFutureForDetails.imageFicheMateriel}
                      alt="Fiche"
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setZoomedImage({ src: selectedFutureForDetails.imageFicheMateriel!, title: 'Fiche Matériel' })}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Aucune fiche fournie</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <h5 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Facture / Bon d'achat</span>
                </h5>
                <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border border-gray-200 flex items-center justify-center">
                  {selectedFutureForDetails.imageFacture ? (
                    <img
                      src={selectedFutureForDetails.imageFacture}
                      alt="Facture"
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setZoomedImage({ src: selectedFutureForDetails.imageFacture!, title: 'Facture' })}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Aucune facture fournie</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <h5 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-purple-600" />
                  <span>Image Code-barres</span>
                </h5>
                <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border border-gray-200 flex items-center justify-center">
                  {selectedFutureForDetails.imageBarcode ? (
                    <img
                      src={selectedFutureForDetails.imageBarcode}
                      alt="Barcode"
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setZoomedImage({ src: selectedFutureForDetails.imageBarcode!, title: 'Image Code-barres' })}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Aucune image code-barres</span>
                  )}
                </div>
              </div>
            </div>

            {/* Code-barres extrait */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 block">Code-barres automatique :</span>
                <span className="text-sm font-mono font-black text-gray-900">
                  {selectedFutureForDetails.barcode || selectedFutureForDetails.barcode1 || 'Non renseigné'}
                </span>
              </div>

              {selectedFutureForDetails.statut !== 'Validé en matériel' && (
                <button
                  type="button"
                  onClick={() => handleOpenTransform(selectedFutureForDetails)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Transformer en matériel</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            VUE 4 : TRANSFORMATION EN MATÉRIEL (SPLIT VIEW SÉPARÉE EN DEUX)
        ========================================================================= */}
        {viewMode === 'transform' && futureToTransform && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* -------------------------------------------------------------
                COLONNE GAUCHE (50%) : APERÇU DU FUTUR MATÉRIEL (IMAGES & BARCODE)
            -------------------------------------------------------------- */}
            <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-cyan-600" />
                    <span>Aperçu du futur matériel</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Images et code-barres capturés lors du pré-inventaire.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-gray-200 text-gray-700 font-bold">
                  {futureToTransform.dateCreation}
                </span>
              </div>

              {/* Code-barres extrait mis en avant */}
              <div className="p-3.5 bg-cyan-50/80 border border-cyan-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-100 text-cyan-800 rounded-xl">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">
                      Code-barres / Série Détecté
                    </span>
                    <span className="text-sm font-mono font-black text-cyan-950">
                      {futureToTransform.barcode || futureToTransform.barcode1 || 'Aucun code'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-cyan-200 text-cyan-900 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Auto
                </span>
              </div>

              {/* Grille des 4 images avec zoom */}
              <div className="grid grid-cols-2 gap-3">
                {/* 1. Matériel */}
                <div className="p-2.5 bg-white rounded-2xl border border-gray-200 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-cyan-600" /> Photo Matériel
                  </span>
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border flex items-center justify-center group relative">
                    {futureToTransform.imageMateriel ? (
                      <>
                        <img src={futureToTransform.imageMateriel} alt="Matériel" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ src: futureToTransform.imageMateriel!, title: 'Photo du Matériel' })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400">Non renseignée</span>
                    )}
                  </div>
                </div>

                {/* 2. Fiche */}
                <div className="p-2.5 bg-white rounded-2xl border border-gray-200 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-blue-600" /> Fiche Matériel
                  </span>
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border flex items-center justify-center group relative">
                    {futureToTransform.imageFicheMateriel ? (
                      <>
                        <img src={futureToTransform.imageFicheMateriel} alt="Fiche" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ src: futureToTransform.imageFicheMateriel!, title: 'Fiche Matériel' })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400">Non renseignée</span>
                    )}
                  </div>
                </div>

                {/* 3. Facture */}
                <div className="p-2.5 bg-white rounded-2xl border border-gray-200 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-emerald-600" /> Image Facture
                  </span>
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border flex items-center justify-center group relative">
                    {futureToTransform.imageFacture ? (
                      <>
                        <img src={futureToTransform.imageFacture} alt="Facture" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ src: futureToTransform.imageFacture!, title: 'Facture' })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400">Non renseignée</span>
                    )}
                  </div>
                </div>

                {/* 4. Code-barres */}
                <div className="p-2.5 bg-white rounded-2xl border border-gray-200 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <Barcode className="w-3 h-3 text-purple-600" /> Image Code-barres
                  </span>
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border flex items-center justify-center group relative">
                    {futureToTransform.imageBarcode ? (
                      <>
                        <img src={futureToTransform.imageBarcode} alt="Barcode" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ src: futureToTransform.imageBarcode!, title: 'Image Code-barres' })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400">Non renseignée</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                COLONNE DROITE (50%) : FORMULAIRE EXACT "AJOUTER UN NOUVEAU MATÉRIEL"
            -------------------------------------------------------------- */}
            <form onSubmit={handleConfirmTransform} className="w-full md:w-1/2 p-6 overflow-y-auto space-y-4 bg-white flex flex-col justify-between">
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-gray-900">
                      Fiche Nouveau Matériel
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Remplissez les détails du matériel à intégrer à l'inventaire du parc.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Nouveau Matériel
                  </span>
                </div>

                {/* Alerte locale de transformation (notamment si code série existe déjà) */}
                {transformAlert && (
                  <FormAlert
                    type={transformAlert.type}
                    message={transformAlert.message}
                    onClose={() => setTransformAlert(null)}
                  />
                )}

                {/* Réf Immo & Désignation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-xs text-gray-700 mb-1 flex items-center justify-between">
                      <span>Réf Immo (Optionnel)</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">ERP externe</span>
                    </label>
                    <input
                      type="text"
                      value={matForm.ref_immo}
                      onChange={(e) => setMatForm({ ...matForm, ref_immo: e.target.value })}
                      placeholder="ex: IMM-2025-0042"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-gray-700 mb-1">
                      Désignation <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={matForm.designation}
                      onChange={(e) => setMatForm({ ...matForm, designation: e.target.value })}
                      placeholder="ex: MacBook Pro 16 M3 Max"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                {/* Groupe Matériel & Numéro de Série */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-xs text-gray-700">Groupe Matériel</label>
                      <button
                        type="button"
                        onClick={() => setIsCreatingQuickGroup(!isCreatingQuickGroup)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        {isCreatingQuickGroup ? 'Annuler' : '+ Nouveau groupe'}
                      </button>
                    </div>

                    <select
                      value={isCreatingQuickGroup ? '__custom_new__' : matForm.id_GroupeMateriel}
                      onChange={(e) => {
                        if (e.target.value === '__custom_new__') {
                          setIsCreatingQuickGroup(true);
                        } else {
                          setIsCreatingQuickGroup(false);
                          const selectedG = groupes.find(g => g.id === e.target.value);
                          const isPrn = selectedG ? ((selectedG.Groupe || (selectedG as any).nom || '').toLowerCase().includes('imprim')) : false;
                          setMatForm(prev => ({
                            ...prev,
                            id_GroupeMateriel: e.target.value,
                            isImprimante: isPrn ? true : prev.isImprimante,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-xs text-gray-900 focus:bg-white cursor-pointer"
                    >
                      {groupes.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.Groupe} {g.codeSerieObligatoire ? '(Code série requis)' : ''}
                        </option>
                      ))}
                      <option value="__custom_new__" className="text-blue-600 font-bold bg-blue-50">
                        + Autre (Créer un nouveau groupe)...
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-xs text-gray-700 mb-1 flex items-center justify-between">
                      <span>Numéro de Série (Pré-rempli auto)</span>
                      {(() => {
                        const curGroup = groupes.find(g => g.id === matForm.id_GroupeMateriel);
                        return curGroup?.codeSerieObligatoire ? (
                          <span className="text-[10px] text-amber-700 font-bold">(*) Requis pour ce groupe</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">(Optionnel)</span>
                        );
                      })()}
                    </label>
                    <input
                      type="text"
                      value={matForm.codeSerie}
                      onChange={(e) => setMatForm({ ...matForm, codeSerie: e.target.value })}
                      placeholder="ex: SN-HP-998822"
                      className="w-full px-3 py-2 bg-cyan-50/40 border border-cyan-300 rounded-xl font-mono text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Inline création de groupe */}
                {isCreatingQuickGroup && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                      <span>Créer un nouveau Groupe de Matériel</span>
                      <button type="button" onClick={() => setIsCreatingQuickGroup(false)}>
                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom du groupe..."
                        value={quickGroupName}
                        onChange={(e) => setQuickGroupName(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-blue-900 font-medium">
                        <input
                          type="checkbox"
                          checked={quickGroupCodeSerie}
                          onChange={(e) => setQuickGroupCodeSerie(e.target.checked)}
                          className="rounded text-blue-600 w-3.5 h-3.5"
                        />
                        <span>Code série requis</span>
                      </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveQuickGroup}
                        disabled={isSavingQuickGroup || !quickGroupName.trim()}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        {isSavingQuickGroup ? 'Création...' : 'Créer et sélectionner'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Statut, Qté, Montant HT, Garantie */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-bold text-xs text-gray-700 mb-1">Statut</label>
                    <select
                      value={matForm.statut}
                      onChange={(e) => setMatForm({ ...matForm, statut: e.target.value as StatutMateriel })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="En stock">En stock</option>
                      <option value="En service">En service</option>
                      <option value="En panne">En panne</option>
                      <option value="Hors service">Hors service</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-gray-700 mb-1">Quantité</label>
                    <input
                      type="number"
                      min={1}
                      value={matForm.qte}
                      onChange={(e) => setMatForm({ ...matForm, qte: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-gray-700 mb-1">Montant HT (TND)</label>
                    <input
                      type="number"
                      value={matForm.montantHT}
                      onChange={(e) => setMatForm({ ...matForm, montantHT: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-gray-700 mb-1">Garantie</label>
                    <input
                      type="text"
                      value={matForm.garantie}
                      onChange={(e) => setMatForm({ ...matForm, garantie: e.target.value })}
                      placeholder="ex: 24 mois"
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Fournisseur et Facture */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-xs text-gray-700 mb-1">Fournisseur</label>
                    <select
                      value={matForm.id_Fournisseur}
                      onChange={(e) => setMatForm({ ...matForm, id_Fournisseur: e.target.value, id_Facture: '' })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <option value="">-- Sélectionnez un fournisseur --</option>
                      {fournisseurs.map(f => (
                        <option key={f.id} value={f.id}>{f.Fournisseur}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-gray-700 mb-1">Facture d'achat</label>
                    <select
                      disabled={!matForm.id_Fournisseur}
                      value={matForm.id_Facture}
                      onChange={(e) => setMatForm({ ...matForm, id_Facture: e.target.value })}
                      className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono ${
                        !matForm.id_Fournisseur ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <option value="">-- Aucune facture --</option>
                      {factures
                        .filter(inv => inv.id_Fournisseur === matForm.id_Fournisseur)
                        .map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.factureFrs} ({inv.dateAcquisition}) - {inv.montantHT} TND
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Type d'affectation */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                  <div>
                    <label className="font-bold text-xs text-gray-800 mb-1 block">Type d'affectation</label>
                    <select
                      value={matForm.typeAffectation}
                      onChange={(e) => setMatForm({ ...matForm, typeAffectation: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 cursor-pointer"
                    >
                      <option value="non_affecte">Pas affecté (En stock / Réserve)</option>
                      <option value="emplacement">Avec emplacement (Attribué à un bureau / local)</option>
                      <option value="personnel">Personnel (Attribué directement à un collaborateur)</option>
                    </select>
                  </div>

                  {matForm.typeAffectation === 'personnel' && (
                    <div>
                      <label className="block font-bold text-xs text-gray-700 mb-1">Bénéficiaire (Personnel)</label>
                      <select
                        value={matForm.id_Beneficiaire}
                        onChange={(e) => setMatForm({ ...matForm, id_Beneficiaire: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        <option value="">-- Sélectionnez un collaborateur --</option>
                        {beneficiaires.map(b => (
                          <option key={b.id} value={b.id}>👤 {b.beneficiaire} ({b.role})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {matForm.typeAffectation === 'emplacement' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-xs text-gray-700 mb-1">Emplacement</label>
                        <select
                          value={matForm.id_Emplacement}
                          onChange={(e) => setMatForm({ ...matForm, id_Emplacement: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          <option value="">-- Sélectionnez un emplacement --</option>
                          {emplacements.map(e => (
                            <option key={e.id} value={e.id}>{e.emplacement1} - {e.emplacement2}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-xs text-gray-700 mb-1">Bénéficiaire (Optionnel)</label>
                        <select
                          value={matForm.id_Beneficiaire}
                          onChange={(e) => setMatForm({ ...matForm, id_Beneficiaire: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          <option value="">-- Aucun bénéficiaire (En réserve sur place) --</option>
                          {beneficiaires
                            .filter(b => !matForm.id_Emplacement || b.id_Emplacement === matForm.id_Emplacement)
                            .map(b => (
                              <option key={b.id} value={b.id}>👤 {b.beneficiaire} ({b.role})</option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Est-ce une imprimante ? */}
                <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200/90 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Printer className="w-5 h-5 text-purple-600 shrink-0" />
                    <div>
                      <label htmlFor="chk-is-imprimante" className="font-bold text-xs text-gray-900 cursor-pointer block">
                        Est-ce que c'est une imprimante ?
                      </label>
                      <p className="text-[10px] text-gray-500">
                        Active la gestion de ses consommables / liquides d'écriture.
                      </p>
                    </div>
                  </div>

                  <input
                    id="chk-is-imprimante"
                    type="checkbox"
                    checked={matForm.isImprimante}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setMatForm(prev => ({ ...prev, isImprimante: checked }));
                      if (!checked) setFormComposants([]);
                      else if (formComposants.length === 0) handleAddLiquide();
                    }}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                </div>

                {/* Section liquides d'écriture si imprimante */}
                {matForm.isImprimante && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-purple-600" />
                        <span>Liquides d'écriture ({formComposants.length}/4)</span>
                      </span>
                      {formComposants.length < 4 && (
                        <button
                          type="button"
                          onClick={handleAddLiquide}
                          className="px-2.5 py-1 text-[11px] font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 rounded-lg cursor-pointer"
                        >
                          + Ajouter liquide
                        </button>
                      )}
                    </div>

                    {formComposants.map((comp, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-xl border border-gray-200 grid grid-cols-3 gap-2 items-center text-xs">
                        <input
                          type="text"
                          value={comp.nom}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormComposants(prev => prev.map((c, i) => i === idx ? { ...c, nom: val } : c));
                          }}
                          placeholder="Nom cartouche..."
                          className="px-2 py-1 border rounded-lg text-xs"
                        />
                        <select
                          value={comp.couleur}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormComposants(prev => prev.map((c, i) => i === idx ? { ...c, couleur: val } : c));
                          }}
                          className="px-2 py-1 border rounded-lg text-xs"
                        >
                          <option value="Noir">Noir</option>
                          <option value="Cyan">Cyan</option>
                          <option value="Magenta">Magenta</option>
                          <option value="Jaune">Jaune</option>
                        </select>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveLiquide(idx)}
                            className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Barre de validation formulaire transformation */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSavingTransform}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSavingTransform ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Vérification & Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Enregistrer et Valider le Matériel</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            MODALE ZOOM IMAGE PLEIN ÉCRAN
        ========================================================================= */}
        {zoomedImage && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center">
              <div className="w-full px-4 py-3 bg-gray-900 text-white flex items-center justify-between text-xs font-bold">
                <span>{zoomedImage.title}</span>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img
                src={zoomedImage.src}
                alt={zoomedImage.title}
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            MODALE CONFIRMATION PERSONNALISÉE
        ========================================================================= */}
        <CustomConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          subtitle={confirmConfig.subtitle}
          type={confirmConfig.type}
          message={confirmConfig.message}
          impacts={confirmConfig.impacts}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          isLoading={isConfirmLoading}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />

      </div>
    </div>
  );
};
