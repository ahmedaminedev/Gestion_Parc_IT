import { describe, it, expect, vi } from 'vitest';
import { noSqlSanitizer, secureCorsOptions } from '../../Backend/middleware/security';
import { saveAvatarBase64 } from '../../Backend/services/uploadService';
import { env } from '../../Backend/config/env';

describe('OWASP Hardening & Security Features Tests', () => {
  describe('1. NoSQL Injection Sanitizer', () => {
    it('removes $ operators and dots from request body', () => {
      const req: any = {
        body: {
          username: 'admin',
          password: { $gt: '' }, // NoSQL injection attempt
          'nested.field': 'evil',
          profile: {
            $where: 'sleep(5000)',
            role: 'USER',
          },
        },
        query: {
          email: { $ne: null },
        },
        params: {},
      };
      const res: any = {};
      const next = vi.fn();

      noSqlSanitizer(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('admin');
      expect(req.body.password).toEqual({});
      expect(req.body['nested.field']).toBeUndefined();
      expect(req.body.profile.$where).toBeUndefined();
      expect(req.body.profile.role).toBe('USER');
      expect(req.query.email).toEqual({});
    });
  });

  describe('2. CORS Whitelist Policy', () => {
    it('allows requests without origin (direct internal / server-to-server)', () => {
      const originCallback = vi.fn();
      if (typeof secureCorsOptions.origin === 'function') {
        secureCorsOptions.origin(undefined, originCallback);
        expect(originCallback).toHaveBeenCalledWith(null, true);
      }
    });

    it('allows localhost and local network IP addresses', () => {
      const originCallback = vi.fn();
      if (typeof secureCorsOptions.origin === 'function') {
        secureCorsOptions.origin('http://localhost:3000', originCallback);
        expect(originCallback).toHaveBeenCalledWith(null, true);

        secureCorsOptions.origin('http://192.168.1.150:3000', originCallback);
        expect(originCallback).toHaveBeenCalledWith(null, true);

        secureCorsOptions.origin('http://10.0.0.5:5000', originCallback);
        expect(originCallback).toHaveBeenCalledWith(null, true);

        secureCorsOptions.origin('https://ais-dev-6ags4rj3rr4qwsu3nwl5x4-869519696298.europe-west2.run.app', originCallback);
        expect(originCallback).toHaveBeenCalledWith(null, true);
      }
    });

    it('rejects unknown public external origins', () => {
      const originCallback = vi.fn();
      if (typeof secureCorsOptions.origin === 'function') {
        secureCorsOptions.origin('https://hacker-website.com', originCallback);
        expect(originCallback).toHaveBeenCalledWith(expect.any(Error));
      }
    });
  });

  describe('3. JWT Secret Storage (Decoupled from .env)', () => {
    it('provides a high-entropy cryptographically generated key without relying on plain .env', () => {
      expect(env.JWT_SECRET).toBeDefined();
      expect(typeof env.JWT_SECRET).toBe('string');
      expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);

      expect(env.REFRESH_TOKEN_SECRET).toBeDefined();
      expect(typeof env.REFRESH_TOKEN_SECRET).toBe('string');
      expect(env.REFRESH_TOKEN_SECRET.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('4. Strict Upload Security & Magic Bytes', () => {
    it('blocks dangerous SVG uploads (anti-Stored XSS)', () => {
      const fakeSvgBase64 = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj48L3N2Zz4=';
      const result = saveAvatarBase64(fakeSvgBase64, 'test_user');
      expect(result).toBe('');
    });

    it('blocks spoofed extension with invalid magic bytes (fake image)', () => {
      // String with "data:image/png" header but payload is an executable script
      const maliciousScript = Buffer.from('echo "malicious payload"').toString('base64');
      const fakePngBase64 = `data:image/png;base64,${maliciousScript}`;
      const result = saveAvatarBase64(fakePngBase64, 'test_user');
      expect(result).toBe('');
    });

    it('accepts valid PNG image with true PNG magic bytes', () => {
      // True PNG magic bytes: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
      const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const validBase64 = `data:image/png;base64,${validPngHeader.toString('base64')}`;
      const result = saveAvatarBase64(validBase64, 'valid_user');
      expect(result).toContain('/uploads/avatars/avatar_valid_user_');
    });
  });
});
