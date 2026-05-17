import { Router } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { publicSignController } from './publicSign.controller';
import { publicOtpLimiter, strictLimiter } from '../../middleware/rate-limiter';

export const publicSignRouter = Router();

// Public routes (no auth required)
publicSignRouter.get('/:token', asyncHandler(publicSignController.getSigningPage));
publicSignRouter.get('/:token/document', asyncHandler(publicSignController.getDocument));
publicSignRouter.get('/:token/download-signed', asyncHandler(publicSignController.downloadSignedPdf));
publicSignRouter.post('/:token/send-otp', publicOtpLimiter, asyncHandler(publicSignController.sendOtp));
publicSignRouter.post('/:token/verify-otp', publicOtpLimiter, asyncHandler(publicSignController.verifyOtp));
publicSignRouter.post('/:token/sign', strictLimiter, asyncHandler(publicSignController.submitSignature));
