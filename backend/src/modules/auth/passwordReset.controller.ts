import { Request, Response } from 'express';
import { passwordResetService } from './passwordReset.service';
import { z } from 'zod';

// Validation schemas
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required')
});

export class PasswordResetController {
  // POST /auth/forgot-password
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const result = await passwordResetService.requestPasswordReset(email);

      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      if (error.message.includes('Too many reset requests')) {
        return res.status(429).json({ error: error.message });
      }

      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }

  // GET /auth/verify-reset-token/:token
  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const result = await passwordResetService.verifyResetToken(token);

      res.json(result);
    } catch (error: any) {
      console.error('Verify token error:', error);
      res.status(500).json({ error: 'Failed to verify token' });
    }
  }

  // POST /auth/reset-password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);

      const result = await passwordResetService.resetPassword(token, password);

      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      if (error.message.includes('Invalid or expired')) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes('Password must')) {
        return res.status(400).json({ error: error.message });
      }

      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
}

export const passwordResetController = new PasswordResetController();
