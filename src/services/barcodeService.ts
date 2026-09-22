/**
 * Service de décodage et scanning de code-barres 100% local, sécurisé et offline.
 * Conçu pour fonctionner sur serveur local d'entreprise (intranet anti-piratage sans dépendance cloud externe).
 * Supporte : Code-128, Code-39, EAN-13, EAN-8, QR Code, UPC-A, UPC-E, ITF, etc.
 * Compatible PC, Mac, Téléphones (Android / iOS) et Tablettes.
 */

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface BarcodeDetectionResult {
  text: string;
  format?: string;
}

// Liste des formats supportés pour le matériel informatique et l'inventaire
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
 * Tente de décoder un code-barres depuis un fichier image, blob ou base64
 * 1. Tente d'abord l'API native du navigateur `window.BarcodeDetector` (très rapide et haute précision sur Chrome/Android/Edge)
 * 2. Bascule de manière transparente sur `Html5Qrcode` (moteur local ZXing)
 */
export async function decodeBarcodeFromImage(
  imageSource: File | Blob | string
): Promise<BarcodeDetectionResult | null> {
  let file: File;
  if (typeof imageSource === 'string') {
    file = dataUrlToFile(imageSource);
  } else if (imageSource instanceof File) {
    file = imageSource;
  } else {
    file = new File([imageSource], 'barcode_image.jpg', { type: imageSource.type || 'image/jpeg' });
  }

  // 1. Essai avec l'API BarcodeDetector native (si disponible dans le navigateur)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorClass();
      const imageBitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(imageBitmap);
      if (barcodes && barcodes.length > 0) {
        const found = barcodes[0];
        if (found.rawValue && found.rawValue.trim()) {
          return {
            text: found.rawValue.trim(),
            format: found.format || 'Barcode',
          };
        }
      }
    } catch (nativeErr) {
      console.warn('[BarcodeService] BarcodeDetector natif indisponible ou échoué, passage à Html5Qrcode:', nativeErr);
    }
  }

  // 2. Décodage via Html5Qrcode (ZXing local in-browser)
  const tempElementId = `barcode-temp-canvas-${Date.now()}`;
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

    const decodedText = await html5QrCode.scanFile(file, /* showImage */ false);
    if (decodedText && decodedText.trim()) {
      return {
        text: decodedText.trim(),
        format: 'Code-barres détecté',
      };
    }
  } catch (err: any) {
    // Si scan direct échoue, tenter après pré-traitement du contraste via canvas
    try {
      const preprocessedFile = await preprocessImageForBarcode(file);
      if (preprocessedFile && html5QrCode) {
        const retryDecoded = await html5QrCode.scanFile(preprocessedFile, false);
        if (retryDecoded && retryDecoded.trim()) {
          return {
            text: retryDecoded.trim(),
            format: 'Code-barres (contraste optimisé)',
          };
        }
      }
    } catch {
      // Échec silencieux
    }
    return null;
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

/**
 * Optimise les niveaux de gris et le contraste d'une image pour faciliter la lecture des codes-barres 1D (Code 128 / EAN)
 */
async function preprocessImageForBarcode(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;

      // Niveaux de gris + augmentation de contraste binaire doux
      for (let i = 0; i < d.length; i += 4) {
        const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const contrast = v < 128 ? Math.max(0, v - 30) : Math.min(255, v + 30);
        d[i] = contrast;
        d[i + 1] = contrast;
        d[i + 2] = contrast;
      }
      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null);
          resolve(new File([blob], 'preprocessed.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9
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
 * Bip sonore local via Web Audio API (aucun appel serveur externe) pour confirmer la lecture d'un code-barres
 */
export function playBarcodeBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime); // Fréquence aiguë classique d'un pistolet douchette de code-barres
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);

    // Vibration sur mobile si supportée
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(80);
    }
  } catch {
    // Ignorer si bloqué par l'environnement
  }
}
