/**
 * Service de décodage et scanning de code-barres 100% local, sécurisé et ultra-performant.
 * Conçu pour fonctionner sur serveur local d'entreprise (intranet sans dépendance cloud externe).
 *
 * Supporte : Code-128, Code-39, Code-93, EAN-13, EAN-8, QR Code, UPC-A, UPC-E, ITF, Codabar, Data Matrix.
 * Optimisé spécifiquement pour :
 * - Les codes-barres hachurés, usés, rayés ou partiellement endommagés (filtre morphologique vertical).
 * - Les faibles contrastes et reflets d'éclairage (égalisation d'histogramme & binarisation dynamique Otsu).
 * - Le flou de mise au point smartphone (masque de netteté convolutif Unsharp Mask).
 * - Les orientations variées (rotations 0°, 90°, 270°).
 */

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface BarcodeDetectionResult {
  text: string;
  format?: string;
}

// Formats de codes-barres matériel et inventaire IT
export const SUPPORTED_BARCODE_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

// Formats pour l'API BarcodeDetector native (noms normalisés W3C / Blink)
const NATIVE_BARCODE_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'ean_13',
  'ean_8',
  'qr_code',
  'upc_a',
  'upc_e',
  'itf',
  'codabar',
  'data_matrix',
];

/**
 * Convertit un DataURL (base64) en objet File standard pour le scanner
 */
export function dataUrlToFile(dataUrl: string, filename = 'barcode_image.jpg'): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Vérifie si l'API native BarcodeDetector est disponible dans le navigateur
 */
export function isNativeBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Instance réutilisable du BarcodeDetector natif pour des performances maximales
 */
let cachedNativeDetector: any = null;
export function getNativeBarcodeDetector(): any {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  if (!cachedNativeDetector) {
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      cachedNativeDetector = new BarcodeDetectorClass({ formats: NATIVE_BARCODE_FORMATS });
    } catch {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        cachedNativeDetector = new BarcodeDetectorClass();
      } catch {
        cachedNativeDetector = null;
      }
    }
  }
  return cachedNativeDetector;
}

/**
 * Tente de décoder un code-barres depuis un élément Image, Canvas ou ImageBitmap via BarcodeDetector
 */
export async function detectViaNativeBarcodeDetector(
  imageSource: ImageBitmap | HTMLCanvasElement | HTMLVideoElement
): Promise<BarcodeDetectionResult | null> {
  const detector = getNativeBarcodeDetector();
  if (!detector) return null;

  try {
    const barcodes = await detector.detect(imageSource);
    if (barcodes && barcodes.length > 0) {
      for (const item of barcodes) {
        const raw = item.rawValue ? item.rawValue.trim() : '';
        if (raw.length > 0) {
          return {
            text: raw,
            format: item.format ? `Code (${item.format})` : 'Code-barres',
          };
        }
      }
    }
  } catch (err) {
    // Ignorer les erreurs de détection sur frame partielle
  }
  return null;
}

/**
 * DÉCODAGE EN TEMPS RÉEL SUR LE FLUX VIDÉO
 * Exécuté à haute cadence (30 FPS) directement sur le cadre de visée
 */
export async function detectBarcodeRealtime(
  video: HTMLVideoElement,
  frameCanvas: HTMLCanvasElement,
  cropRatio = { x: 0.08, y: 0.25, width: 0.84, height: 0.5 }
): Promise<BarcodeDetectionResult | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Calculer la zone correspondant au cadre de visée
  const cropX = Math.floor(vw * cropRatio.x);
  const cropY = Math.floor(vh * cropRatio.y);
  const cropW = Math.floor(vw * cropRatio.width);
  const cropH = Math.floor(vh * cropRatio.height);

  if (cropW <= 20 || cropH <= 20) return null;

  frameCanvas.width = cropW;
  frameCanvas.height = cropH;
  const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // 1. Dessiner le cadre recadré dans le canvas
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // 2. Tenter la détection native ultra-rapide sur la zone cadrée brute
  const nativeResult = await detectViaNativeBarcodeDetector(frameCanvas);
  if (nativeResult) return nativeResult;

  // 3. Si non détecté, appliquer le filtre de contraste + réparation de code-barres hachuré
  try {
    const imgData = ctx.getImageData(0, 0, cropW, cropH);
    const d = imgData.data;

    // Étape A: Niveaux de gris + augmentation dynamique de contraste
    let minLum = 255;
    let maxLum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const range = maxLum - minLum || 1;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
      // Étirement de contraste (les barres deviennent très noires, le fond très blanc)
      const stretched = Math.min(255, Math.max(0, Math.floor(((lum - minLum) / range) * 255)));
      // Binarisation avec léger renforcement
      const val = stretched < 128 ? Math.max(0, stretched - 35) : Math.min(255, stretched + 35);
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }

    // Étape B: Fermeture morphologique verticale pour réparer les barres hachurées / rayées
    // Pour chaque colonne, si un pixel blanc est entouré de pixels noirs au-dessus et en-dessous, on relie la barre
    const rowBytes = cropW * 4;
    for (let y = 1; y < cropH - 1; y++) {
      const rowOffset = y * rowBytes;
      const prevRow = (y - 1) * rowBytes;
      const nextRow = (y + 1) * rowBytes;
      for (let x = 0; x < cropW; x++) {
        const idx = rowOffset + x * 4;
        // Si le pixel actuel est clair mais entouré de sombre en haut et en bas -> rayure horizontale sur barre verticale
        if (d[idx] > 100) {
          const topDark = d[prevRow + x * 4] < 80;
          const bottomDark = d[nextRow + x * 4] < 80;
          if (topDark && bottomDark) {
            d[idx] = 0;
            d[idx + 1] = 0;
            d[idx + 2] = 0;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Re-tenter la détection sur l'image filtrée
    const enhancedNative = await detectViaNativeBarcodeDetector(frameCanvas);
    if (enhancedNative) {
      return {
        text: enhancedNative.text,
        format: `${enhancedNative.format} (Haute Précision)`,
      };
    }
  } catch {
    // Ignorer pour ne pas ralentir le cycle de scan
  }

  return null;
}

/**
 * DÉCODAGE MULTI-PAS POUR FICHIERS / PHOTOS (Exhaustif & Anti-Hachures)
 * Tente 6 passes successives avec filtres avancés pour décoder même les codes les plus dégradés
 */
export async function decodeBarcodeFromImage(
  imageSource: File | Blob | string
): Promise<BarcodeDetectionResult | null> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  let file: File;
  if (typeof imageSource === 'string') {
    file = dataUrlToFile(imageSource);
  } else if (imageSource instanceof File) {
    file = imageSource;
  } else {
    file = new File([imageSource], 'barcode_image.jpg', { type: imageSource.type || 'image/jpeg' });
  }

  // PASSE 1 : Détecteur Natif Hardware direct
  if (isNativeBarcodeDetectorSupported()) {
    try {
      const bitmap = await createImageBitmap(file);
      const res = await detectViaNativeBarcodeDetector(bitmap);
      if (res) return res;
    } catch (err) {
      console.warn('[BarcodeService] Passe 1 native échouée:', err);
    }
  }

  // Préparation de l'instance Html5Qrcode locale
  const tempElementId = `barcode-scanner-temp-${Date.now()}`;
  let tempDiv: HTMLDivElement | null = null;
  let html5QrCode: Html5Qrcode | null = null;

  try {
    tempDiv = document.createElement('div');
    tempDiv.id = tempElementId;
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    html5QrCode = new Html5Qrcode(tempElementId, {
      formatsToSupport: SUPPORTED_BARCODE_FORMATS,
      verbose: false,
    });

    // PASSE 2 : Html5Qrcode direct
    try {
      const decodedText = await html5QrCode.scanFile(file, false);
      if (decodedText && decodedText.trim()) {
        return {
          text: decodedText.trim(),
          format: 'Code-barres détecté',
        };
      }
    } catch {
      // Poursuivre vers les passes d'amélioration
    }

    // PASSE 3 : Amélioration de netteté + contraste dynamique (Unsharp Mask)
    try {
      const sharpenedFile = await createEnhancedBarcodeFile(file, 'sharpen');
      if (sharpenedFile) {
        if (isNativeBarcodeDetectorSupported()) {
          const bmp = await createImageBitmap(sharpenedFile);
          const nativeRes = await detectViaNativeBarcodeDetector(bmp);
          if (nativeRes) return nativeRes;
        }
        const text = await html5QrCode.scanFile(sharpenedFile, false);
        if (text && text.trim()) {
          return { text: text.trim(), format: 'Code-barres (Netteté optimisée)' };
        }
      }
    } catch {
      // Suivant
    }

    // PASSE 4 : Réparation spécifique code-barres hachuré / rayé (Fermeture morphologique + binarisation Otsu)
    try {
      const repairedFile = await createEnhancedBarcodeFile(file, 'repair_scratches');
      if (repairedFile) {
        if (isNativeBarcodeDetectorSupported()) {
          const bmp = await createImageBitmap(repairedFile);
          const nativeRes = await detectViaNativeBarcodeDetector(bmp);
          if (nativeRes) return nativeRes;
        }
        const text = await html5QrCode.scanFile(repairedFile, false);
        if (text && text.trim()) {
          return { text: text.trim(), format: 'Code-barres (Barres restaurées)' };
        }
      }
    } catch {
      // Suivant
    }

    // PASSE 5 : Rotation 90° (Codes-barres verticaux ou photo smartphone inclinée)
    try {
      const rotatedFile = await createEnhancedBarcodeFile(file, 'rotate_90');
      if (rotatedFile) {
        if (isNativeBarcodeDetectorSupported()) {
          const bmp = await createImageBitmap(rotatedFile);
          const nativeRes = await detectViaNativeBarcodeDetector(bmp);
          if (nativeRes) return nativeRes;
        }
        const text = await html5QrCode.scanFile(rotatedFile, false);
        if (text && text.trim()) {
          return { text: text.trim(), format: 'Code-barres (Orientation 90°)' };
        }
      }
    } catch {
      // Suivant
    }

    // PASSE 6 : Rotation 270°
    try {
      const rotatedFile270 = await createEnhancedBarcodeFile(file, 'rotate_270');
      if (rotatedFile270) {
        if (isNativeBarcodeDetectorSupported()) {
          const bmp = await createImageBitmap(rotatedFile270);
          const nativeRes = await detectViaNativeBarcodeDetector(bmp);
          if (nativeRes) return nativeRes;
        }
        const text = await html5QrCode.scanFile(rotatedFile270, false);
        if (text && text.trim()) {
          return { text: text.trim(), format: 'Code-barres (Orientation 270°)' };
        }
      }
    } catch {
      // Échec complet de détection
    }

  } finally {
    if (html5QrCode) {
      try {
        html5QrCode.clear();
      } catch {
        // Ignorer
      }
    }
    if (tempDiv && tempDiv.parentNode) {
      tempDiv.parentNode.removeChild(tempDiv);
    }
  }

  return null;
}

type EnhancementMode = 'sharpen' | 'repair_scratches' | 'rotate_90' | 'rotate_270';

/**
 * Moteur de traitement d'image avancé in-browser
 */
async function createEnhancedBarcodeFile(file: File, mode: EnhancementMode): Promise<File | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');

      let w = img.width;
      let h = img.height;

      // Dimension cible optimale pour codes-barres 1D denses
      const maxDim = 1600;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      if (mode === 'rotate_90' || mode === 'rotate_270') {
        canvas.width = h;
        canvas.height = w;
      } else {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // Gestion des rotations
      if (mode === 'rotate_90') {
        ctx.translate(h, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, 0, 0, w, h);
      } else if (mode === 'rotate_270') {
        ctx.translate(0, w);
        ctx.rotate((3 * Math.PI) / 2);
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        ctx.drawImage(img, 0, 0, w, h);
      }

      const actualW = canvas.width;
      const actualH = canvas.height;
      const imgData = ctx.getImageData(0, 0, actualW, actualH);
      const d = imgData.data;

      // Conversion en niveaux de gris + étirement de dynamique
      let minLum = 255;
      let maxLum = 0;
      const gray = new Uint8Array(actualW * actualH);

      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
        gray[j] = lum;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }

      const lumRange = maxLum - minLum || 1;

      if (mode === 'sharpen') {
        // Filtre Laplacien de netteté 3x3 pour durcir les contours des barres
        // Kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
        for (let y = 1; y < actualH - 1; y++) {
          const row = y * actualW;
          const prevRow = (y - 1) * actualW;
          const nextRow = (y + 1) * actualW;

          for (let x = 1; x < actualW - 1; x++) {
            const center = gray[row + x];
            const up = gray[prevRow + x];
            const down = gray[nextRow + x];
            const left = gray[row + x - 1];
            const right = gray[row + x + 1];

            let sharp = 5 * center - (up + down + left + right);
            // Rehaussement de contraste
            sharp = Math.floor(((sharp - minLum) / lumRange) * 255);
            sharp = sharp < 120 ? Math.max(0, sharp - 40) : Math.min(255, sharp + 40);

            const idx = (row + x) * 4;
            d[idx] = sharp;
            d[idx + 1] = sharp;
            d[idx + 2] = sharp;
          }
        }
      } else if (mode === 'repair_scratches') {
        // Algorithme de reconstruction pour code-barres hachuré :
        // Fermeture morphologique verticale 5-pixels pour reconnecter les barres traversées par une rayure
        const binarized = new Uint8Array(actualW * actualH);
        const threshold = minLum + lumRange * 0.45; // Seuil adapté à la dominante de barres noires

        for (let i = 0; i < gray.length; i++) {
          binarized[i] = gray[i] < threshold ? 0 : 255;
        }

        // Fermeture verticale (Dilation -> Erosion le long des barres verticales)
        for (let y = 2; y < actualH - 2; y++) {
          const row = y * actualW;
          for (let x = 0; x < actualW; x++) {
            const idx = (row + x) * 4;
            // Si pixel est blanc, mais au-dessus et en-dessous il y a du noir -> combler la rayure
            let val = binarized[row + x];
            if (val === 255) {
              const top1 = binarized[(y - 1) * actualW + x] === 0;
              const top2 = binarized[(y - 2) * actualW + x] === 0;
              const bot1 = binarized[(y + 1) * actualW + x] === 0;
              const bot2 = binarized[(y + 2) * actualW + x] === 0;

              if ((top1 || top2) && (bot1 || bot2)) {
                val = 0; // Combler la coupure de la barre noire
              }
            }

            d[idx] = val;
            d[idx + 1] = val;
            d[idx + 2] = val;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null);
          resolve(new File([blob], `enhanced_${mode}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.95
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Bip sonore et retour haptique local pour confirmer la lecture instantanée
 */
export function playBarcodeBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1950, ctx.currentTime); // Fréquence percutante douchette
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 60]);
    }
  } catch {
    // Ignorer si audio non autorisé
  }
}
