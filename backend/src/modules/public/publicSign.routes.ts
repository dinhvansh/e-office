import { Router } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { publicSignController } from './publicSign.controller';
import { publicSendOtpLimiter, publicVerifyOtpLimiter, strictLimiter } from '../../middleware/rate-limiter';

export const publicSignRouter = Router();

// Public routes (no auth required)
publicSignRouter.get('/:token', asyncHandler(publicSignController.getSigningPage));
publicSignRouter.get('/:token/document', asyncHandler(publicSignController.getDocument));
publicSignRouter.get('/:token/download-signed', asyncHandler(publicSignController.downloadSignedPdf));
publicSignRouter.post('/:token/send-otp', publicSendOtpLimiter, asyncHandler(publicSignController.sendOtp));
publicSignRouter.post('/:token/verify-otp', publicVerifyOtpLimiter, asyncHandler(publicSignController.verifyOtp));
publicSignRouter.post('/:token/sign', strictLimiter, asyncHandler(publicSignController.submitSignature));
