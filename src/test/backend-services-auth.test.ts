import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken, AuthRequest } from '../../Backend/middleware/auth';
import jwt from 'jsonwebtoken';
import { env } from '../../Backend/config/env';

describe('Backend Auth Middleware Tests', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('verifyToken', () => {
    it('returns 401 if no Authorization header is present', () => {
      verifyToken(req as AuthRequest, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_TOKEN' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token does not start with Bearer ', () => {
      req.headers['authorization'] = 'Basic 12345';
      verifyToken(req as AuthRequest, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_TOKEN' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token verification fails with invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token-123';
      verifyToken(req as AuthRequest, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('accepts valid JWT token and populates req.user', () => {
      const payload = {
        id: 'user123',
        email: 'admin@omoda-jaecoo.tn',
        role: 'ADMIN',
        beneficiaire: 'Administrateur Test',
      };
      const token = jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
      req.headers['authorization'] = `Bearer ${token}`;

      verifyToken(req as AuthRequest, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user123');
      expect(req.user.email).toBe('admin@omoda-jaecoo.tn');
    });
  });
});
