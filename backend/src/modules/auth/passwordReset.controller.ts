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

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';

export class PasswordResetController {
  // POST /auth/forgot-password
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const result = await passwordResetService.requestPasswordReset(email);

      res.json(result);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      if (errorMessage(error).includes('Too many reset requests')) {
        return res.status(429).json({ error: errorMessage(error) });
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }

      if (errorMessage(error).includes('Invalid or expired')) {
        return res.status(400).json({ error: errorMessage(error) });
      }

      if (errorMessage(error).includes('Password must')) {
        return res.status(400).json({ error: errorMessage(error) });
      }

      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
}

export const passwordResetController = new PasswordResetController();
