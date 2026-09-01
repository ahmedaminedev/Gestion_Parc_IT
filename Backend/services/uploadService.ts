import fs from 'fs';
import path from 'path';

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
      return '';
    }

    let ext = matches[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';

    const rawData = matches[2];
    const buffer = Buffer.from(rawData, 'base64');

    const safeUserId = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');

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

    console.log(`[UPLOAD 📸] Image de profil sauvegardée sur le disque: ${filePath}`);

    // Return the URL path that is statically served by Express & proxied by Vite
    return `/uploads/avatars/${fileName}`;
  } catch (err) {
    console.error('[UPLOAD ⚠️] Erreur lors de la sauvegarde de l\'avatar:', err);
    // In case of filesystem error, return the base64 string as fallback so image is not lost
    return base64Str;
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
