import fs from 'fs';
import path from 'path';

// Allowed MIME types and strict magic byte signatures
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo maximum

/**
 * Validates magic bytes (true file signature) to prevent malicious executables/scripts
 * masked as images. SVG is strictly forbidden to prevent stored XSS attacks.
 */
function isValidImageBuffer(buffer: Buffer, ext: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if ((ext === 'jpg' || ext === 'jpeg') && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
  if (ext === 'png' && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true;
  }

  // GIF: 47 49 46 38 ('GIF8')
  if (ext === 'gif' && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true;
  }

  // WEBP: RIFF....WEBP
  if (ext === 'webp' && buffer.length >= 12) {
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

// Get or create avatars upload folder
export function getAvatarsDir(): string {
  // Support both running from project root or inside Backend folder
  const candidate1 = path.join(process.cwd(), 'Backend', 'uploads', 'avatars');
  const candidate2 = path.join(process.cwd(), 'uploads', 'avatars');
  
  const targetDir = fs.existsSync(path.join(process.cwd(), 'Backend')) ? candidate1 : candidate2;
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

/**
 * Saves a base64 image data-url string as a physical file on disk in Backend/uploads/avatars/
 * Returns the public relative URL: "/uploads/avatars/avatar_<userId>_<timestamp>.<ext>"
 */
export function saveAvatarBase64(base64Str: string, userId: string): string {
  if (!base64Str || typeof base64Str !== 'string') return '';
  
  // If it's already an HTTP URL or local /uploads URL, keep it
  if (!base64Str.startsWith('data:image/')) {
    return base64Str;
  }

  try {
    const avatarsDir = getAvatarsDir();

    // Parse mime type and extension
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      console.warn('[UPLOAD ⚠️] Format Base64 invalide');
      return '';
    }

    let ext = matches[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';

    // RÈGLE OWASP : Bloquer strictement les SVG (vecteur de scripts XSS)
    if (ext === 'svg' || ext === 'svg+xml') {
      console.warn('[SECURITY 🛡️] Téléversement SVG rejeté : risque de script XSS.');
      return '';
    }

    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      console.warn(`[SECURITY 🛡️] Type d'image non autorisé : ${ext}`);
      return '';
    }

    const rawData = matches[2];
    const buffer = Buffer.from(rawData, 'base64');

    // Vérification de la taille maximale (5 Mo)
    if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
      console.warn(`[SECURITY 🛡️] Fichier trop volumineux (${Math.round(buffer.length / 1024)} Ko, max 5 Mo).`);
      return '';
    }

    // Vérification de la signature binaire (Magic Bytes)
    if (!isValidImageBuffer(buffer, ext)) {
      console.warn(`[SECURITY 🛡️] Échec de validation des Magic Bytes pour l'extension ${ext}. Fichier suspect rejeté.`);
      return '';
    }

    // Protection anti-Path Traversal (nettoyage strict de l'identifiant)
    const safeUserId = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);

    // Clean up any previous avatar files for this user
    try {
      const files = fs.readdirSync(avatarsDir);
      const userPrefix = `avatar_${safeUserId}_`;
      for (const file of files) {
        if (file.startsWith(userPrefix)) {
          try {
            fs.unlinkSync(path.join(avatarsDir, file));
          } catch (_) {}
        }
      }
    } catch (_) {}

    const fileName = `avatar_${safeUserId}_${Date.now()}.${ext}`;
    const filePath = path.join(avatarsDir, fileName);

    fs.writeFileSync(filePath, buffer);

    console.log(`[UPLOAD 📸] Image de profil sécurisée sauvegardée: ${filePath}`);

    // Return the URL path that is statically served by Express & proxied by Vite
    return `/uploads/avatars/${fileName}`;
  } catch (err) {
    console.error('[UPLOAD ⚠️] Erreur lors de la sauvegarde de l\'avatar:', err);
    return '';
  }
}

/**
 * Removes user avatar file from disk if it was stored locally
 */
export function deleteAvatarFile(photoUrl?: string) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/avatars/')) return;
  try {
    const fileName = path.basename(photoUrl);
    const avatarsDir = getAvatarsDir();
    const filePath = path.join(avatarsDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[UPLOAD 🗑️] Ancien fichier avatar supprimé: ${filePath}`);
    }
  } catch (err) {
    // Ignore deletion error
  }
}
