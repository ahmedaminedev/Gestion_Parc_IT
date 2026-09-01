import { describe, it, expect } from 'vitest';
import { getAvatarsDir, saveAvatarBase64, deleteAvatarFile } from '../../Backend/services/uploadService';
import { isSmtpConfigured, getSmtpConfigSummary } from '../../Backend/services/mailService';

describe('Backend Services: Upload and Mail Tests', () => {
  describe('Upload Service', () => {
    it('getAvatarsDir returns directory path and creates it', () => {
      const dir = getAvatarsDir();
      expect(typeof dir).toBe('string');
      expect(dir.includes('avatars')).toBe(true);
    });

    it('saveAvatarBase64 handles non-base64 input gracefully', () => {
      expect(saveAvatarBase64('', 'user1')).toBe('');
      expect(saveAvatarBase64('https://example.com/photo.jpg', 'user1')).toBe('https://example.com/photo.jpg');
      expect(saveAvatarBase64('/uploads/avatars/existing.jpg', 'user1')).toBe('/uploads/avatars/existing.jpg');
    });

    it('saveAvatarBase64 saves valid base64 image and returns relative path', () => {
      // 1x1 transparent png
      const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = saveAvatarBase64(base64Png, 'test-user-unit');
      expect(result.startsWith('/uploads/avatars/avatar_test-user-unit_')).toBe(true);
      expect(result.endsWith('.png')).toBe(true);

      // Clean up
      deleteAvatarFile(result);
    });

    it('deleteAvatarFile gracefully handles invalid paths', () => {
      expect(() => deleteAvatarFile('')).not.toThrow();
      expect(() => deleteAvatarFile('https://example.com/photo.jpg')).not.toThrow();
    });
  });

  describe('Mail Service Configuration', () => {
    it('isSmtpConfigured returns boolean status', () => {
      const configured = isSmtpConfigured();
      expect(typeof configured).toBe('boolean');
    });

    it('getSmtpConfigSummary provides connection details', () => {
      const summary = getSmtpConfigSummary();
      expect(summary).toBeDefined();
      expect(typeof summary.configured).toBe('boolean');
      expect(typeof summary.host).toBe('string');
      expect(typeof summary.port).toBe('number');
      expect(typeof summary.mode).toBe('string');
    });
  });
});
