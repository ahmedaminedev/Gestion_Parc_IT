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
} from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.get('/config', getAuthConfig);
router.get('/active-roles', getActiveRoles);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

// Profile password management routes
router.post('/change-password', verifyToken, changePassword);
router.post('/request-otp', requestPasswordResetOtp);
router.post('/reset-password-otp', resetPasswordWithOtp);

export default router;

