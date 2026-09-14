import { Router } from 'express';
import { 
  login, 
  refreshToken, 
  logout, 
  getMe, 
  getAuthConfig, 
  getActiveRoles,
  changePassword,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  updateProfile,
} from '../controllers/authController';
import { verifyToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';

const router = Router();

router.get('/config', getAuthConfig);
router.get('/active-roles', getActiveRoles);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

// Profile management & photo routes
router.put('/profile', verifyToken, updateProfile);
router.post('/profile', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);
router.post('/request-otp', authRateLimiter, requestPasswordResetOtp);
router.post('/reset-password-otp', authRateLimiter, resetPasswordWithOtp);

export default router;

