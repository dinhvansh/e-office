import { Router } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { publicSignController } from './publicSign.controller';

export const publicSignRouter = Router();

// Public routes (no auth required)
publicSignRouter.get('/:token', asyncHandler(publicSignController.getSigningPage));
publicSignRouter.get('/:token/document', asyncHandler(publicSignController.getDocument));
publicSignRouter.get('/:token/download-signed', asyncHandler(publicSignController.downloadSignedPdf));
publicSignRouter.post('/:token/send-otp', asyncHandler(publicSignController.sendOtp));
publicSignRouter.post('/:token/sign', asyncHandler(publicSignController.submitSignature));
