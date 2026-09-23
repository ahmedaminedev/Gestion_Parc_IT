/**
 * Service de décodage et scanning de code-barres 100% local, sécurisé et ultra-performant.
 * Basé sur le moteur standard industriel ZXing (@zxing/library) combiné avec
 * l'accélération matérielle BarcodeDetector (quand disponible).
 *
 * Supporte : Code-128, Code-39, Code-93, EAN-13, EAN-8, QR Code, UPC-A, UPC-E, ITF, Codabar, Data Matrix.
 * Optimisé spécifiquement pour :
 * - Détection ultra-rapide sur flux vidéo en direct (1D et 2D, plein écran et zone de visée)
 * - Traitement des codes dégradés, rayés, hachurés ou faiblement contrastés (filtres morphologiques)
 * - Décodage de photos prises par smartphone à toute orientation (0°, 90°, 270°)
 * - Fonctionnement hors-ligne et intranet sans aucune requête cloud externe.
 */

import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';

export interface BarcodeDetectionResult {
  text: string;
  format?: string;
}

// Formats supportés pour l'inventaire et les équipements informatiques
export const SUPPORTED_BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
];

// Configuration standard des indices de décodage ZXing
export function getStandardZXingHints(): Map<DecodeHintType, any> {
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_BARCODE_FORMATS);
  return hints;
}

/**
 * Instance globale réutilisable du lecteur multi-format ZXing
 */
let cachedZXingReader: MultiFormatReader | null = null;
export function getZXingReader(): MultiFormatReader {
  if (!cachedZXingReader) {
    cachedZXingReader = new MultiFormatReader();
    cachedZXingReader.setHints(getStandardZXingHints());
  }
  return cachedZXingReader;
}

/**
 * Noms conviviaux pour les formats de code-barres
 */
export function formatBarcodeFormatName(format: BarcodeFormat | string): string {
  if (typeof format === 'number') {
    switch (format) {
      case BarcodeFormat.CODE_128:
        return 'Code 128';
      case BarcodeFormat.CODE_39:
        return 'Code 39';
      case BarcodeFormat.CODE_93:
        return 'Code 93';
      case BarcodeFormat.EAN_13:
        return 'EAN-13';
      case BarcodeFormat.EAN_8:
        return 'EAN-8';
      case BarcodeFormat.QR_CODE:
        return 'QR Code';
      case BarcodeFormat.UPC_A:
        return 'UPC-A';
      case BarcodeFormat.UPC_E:
        return 'UPC-E';
      case BarcodeFormat.DATA_MATRIX:
        return 'Data Matrix';
      case BarcodeFormat.ITF:
        return 'ITF';
      case BarcodeFormat.CODABAR:
        return 'Codabar';
      default:
        return 'Code-barres';
    }
  }
  return String(format || 'Code-barres');
}

/**
 * Formats pour l'API BarcodeDetector native (W3C)
 */
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
 * Instance réutilisable du BarcodeDetector natif
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
 * Tente de décoder un code-barres via BarcodeDetector natif hardware
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
  } catch {
    // Ignorer les erreurs d'analyse de frame
  }
  return null;
}

/**
 * Décode un canvas via le moteur ZXing haute précision
 */
export function decodeCanvasWithZXing(canvas: HTMLCanvasElement): BarcodeDetectionResult | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) return null;

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const len = imgData.width * imgData.height;
    const luminances = new Uint8ClampedArray(len);
    const d = imgData.data;

    for (let i = 0; i < len; i++) {
      const offset = i * 4;
      luminances[i] = (d[offset] * 77 + d[offset + 1] * 150 + d[offset + 2] * 29) >> 8;
    }

    const lumSource = new RGBLuminanceSource(luminances, imgData.width, imgData.height);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(lumSource));

    const reader = getZXingReader();
    const result = reader.decode(binaryBitmap);

    if (result && result.getText()) {
      const text = result.getText().trim();
      if (text.length > 0) {
        return {
          text,
          format: formatBarcodeFormatName(result.getBarcodeFormat()),
        };
      }
    }
  } catch {
    // NotFoundException, FormatException, ChecksumException
  }
  return null;
}

/**
 * DÉCODAGE EN TEMPS RÉEL SUR LE FLUX VIDÉO
 * Exécuté de manière optimisée sur le flux vidéo de la caméra
 */
export async function detectBarcodeRealtime(
  video: HTMLVideoElement,
  frameCanvas: HTMLCanvasElement,
  cropRatio = { x: 0.05, y: 0.15, width: 0.90, height: 0.70 }
): Promise<BarcodeDetectionResult | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // 1. D'abord tester avec le détecteur matériel natif si disponible sur la vidéo directe
  if (isNativeBarcodeDetectorSupported()) {
    try {
      const nativeFast = await detectViaNativeBarcodeDetector(video);
      if (nativeFast) return nativeFast;
    } catch {
      // Poursuivre
    }
  }

  // 2. Préparation du canvas de recadrage ciblé (Zone de visée)
  const cropX = Math.floor(vw * cropRatio.x);
  const cropY = Math.floor(vh * cropRatio.y);
  const cropW = Math.max(40, Math.floor(vw * cropRatio.width));
  const cropH = Math.max(40, Math.floor(vh * cropRatio.height));

  frameCanvas.width = cropW;
  frameCanvas.height = cropH;
  const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // 3. Décodage ZXing sur la zone de visée cadrée
  const zxingCropResult = decodeCanvasWithZXing(frameCanvas);
  if (zxingCropResult) {
    return zxingCropResult;
  }

  // 4. Si non trouvé dans le cadre, tester sur l'image globale (redimensionnée pour rapidité)
  // Cela permet de capter instantanément le code même si l'utilisateur ne l'a pas centré parfaitement
  try {
    const scale = Math.min(1, 800 / Math.max(vw, vh));
    const fullW = Math.round(vw * scale);
    const fullH = Math.round(vh * scale);
    frameCanvas.width = fullW;
    frameCanvas.height = fullH;
    ctx.drawImage(video, 0, 0, vw, vh, 0, 0, fullW, fullH);

    const zxingFullResult = decodeCanvasWithZXing(frameCanvas);
    if (zxingFullResult) {
      return zxingFullResult;
    }
  } catch {
    // Ignorer
  }

  // 5. Passe d'amélioration de contraste pour codes sombres ou hachurés
  try {
    const imgData = ctx.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
    const d = imgData.data;

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
      const stretched = Math.min(255, Math.max(0, Math.floor(((lum - minLum) / range) * 255)));
      const val = stretched < 125 ? 0 : 255;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);

    const enhancedResult = decodeCanvasWithZXing(frameCanvas);
    if (enhancedResult) {
      return {
        text: enhancedResult.text,
        format: `${enhancedResult.format} (Haute Précision)`,
      };
    }
  } catch {
    // Ignorer
  }

  return null;
}

/**
 * DÉCODAGE MULTI-PASSES POUR FICHIERS / PHOTOS (Exhaustif & Anti-Hachures)
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
    } catch {
      // Poursuivre
    }
  }

  // PASSE 2 : Décodage ZXing direct depuis un élément Image
  try {
    const directRes = await decodeImageElementWithZXing(file);
    if (directRes) return directRes;
  } catch {
    // Poursuivre
  }

  // PASSE 3 : Amélioration de netteté + contraste dynamique (Unsharp Mask)
  try {
    const sharpenedFile = await createEnhancedBarcodeFile(file, 'sharpen');
    if (sharpenedFile) {
      const sharpRes = await decodeImageElementWithZXing(sharpenedFile);
      if (sharpRes) {
        return { text: sharpRes.text, format: `${sharpRes.format} (Netteté optimisée)` };
      }
    }
  } catch {
    // Poursuivre
  }

  // PASSE 4 : Réparation spécifique code-barres hachuré / rayé
  try {
    const repairedFile = await createEnhancedBarcodeFile(file, 'repair_scratches');
    if (repairedFile) {
      const repRes = await decodeImageElementWithZXing(repairedFile);
      if (repRes) {
        return { text: repRes.text, format: `${repRes.format} (Barres restaurées)` };
      }
    }
  } catch {
    // Poursuivre
  }

  // PASSE 5 : Rotation 90° (Pour codes verticaux ou photos inclinées)
  try {
    const rotated90 = await createEnhancedBarcodeFile(file, 'rotate_90');
    if (rotated90) {
      const rotRes = await decodeImageElementWithZXing(rotated90);
      if (rotRes) {
        return { text: rotRes.text, format: `${rotRes.format} (Orientation 90°)` };
      }
    }
  } catch {
    // Poursuivre
  }

  // PASSE 6 : Rotation 270°
  try {
    const rotated270 = await createEnhancedBarcodeFile(file, 'rotate_270');
    if (rotated270) {
      const rotRes = await decodeImageElementWithZXing(rotated270);
      if (rotRes) {
        return { text: rotRes.text, format: `${rotRes.format} (Orientation 270°)` };
      }
    }
  } catch {
    // Échec de détection
  }

  return null;
}

/**
 * Décode un fichier image via ZXing BrowserMultiFormatReader
 */
async function decodeImageElementWithZXing(file: File): Promise<BarcodeDetectionResult | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const res = decodeCanvasWithZXing(canvas);
      resolve(res);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
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
            sharp = Math.floor(((sharp - minLum) / lumRange) * 255);
            sharp = sharp < 120 ? Math.max(0, sharp - 40) : Math.min(255, sharp + 40);

            const idx = (row + x) * 4;
            d[idx] = sharp;
            d[idx + 1] = sharp;
            d[idx + 2] = sharp;
          }
        }
      } else if (mode === 'repair_scratches') {
        const binarized = new Uint8Array(actualW * actualH);
        const threshold = minLum + lumRange * 0.45;

        for (let i = 0; i < gray.length; i++) {
          binarized[i] = gray[i] < threshold ? 0 : 255;
        }

        for (let y = 2; y < actualH - 2; y++) {
          const row = y * actualW;
          for (let x = 0; x < actualW; x++) {
            const idx = (row + x) * 4;
            let val = binarized[row + x];
            if (val === 255) {
              const top1 = binarized[(y - 1) * actualW + x] === 0;
              const top2 = binarized[(y - 2) * actualW + x] === 0;
              const bot1 = binarized[(y + 1) * actualW + x] === 0;
              const bot2 = binarized[(y + 2) * actualW + x] === 0;

              if ((top1 || top2) && (bot1 || bot2)) {
                val = 0;
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
      osc.frequency.setValueAtTime(1950, ctx.currentTime);
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
