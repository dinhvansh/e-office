import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ok } from '../../core/utils/response';
import { ApiError } from '../../core/errors/api-error';
import { signRequestFieldValuesService } from '../signRequests/signRequestFieldValues.service';
import { signersService } from '../signers/signers.service';
import { pdfSigningService } from './pdfSigning.service';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const sendOtpSchema = z.object({
  email: z.string().email(),
});

const submitSignatureSchema = z.object({
  otp: z.string().min(6).max(6),
  signature_data: z.string().optional(), // Base64 image (optional if using field_values)
  signature_type: z.enum(['drawn', 'uploaded', 'typed', 'certificate']).optional(),
  field_values: z.array(
    z.object({
      field_id: z.number(),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    })
  ).optional().default([]), // Optional, default to empty array
});

export class PublicSignController {
  /**
   * Get signing page data by token
   * GET /public/sign/:token
   */
  getSigningPage = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    // Find signer by token
    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
      include: {
        sign_request: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                original_file_name: true,
                file_path: true,
              },
            },
          },
        },
      },
    });

    if (!signer) {
      throw ApiError.notFound('Invalid signing link');
    }

    // Check if already signed
    if (signer.status === 'signed' || signer.status === 'completed') {
      res.json(
        ok({
          already_signed: true,
          signed_at: signer.signed_at,
          message: 'You have already signed this document',
          signer: {
            id: signer.id,
            name: signer.name,
            email: signer.email,
            role: signer.role,
            status: signer.status,
          },
          sign_request: {
            id: signer.sign_request.id,
            title: signer.sign_request.title,
            message: signer.sign_request.message,
            deadline: signer.sign_request.deadline,
            created_at: signer.sign_request.created_at,
          },
          document: {
            ...signer.sign_request.document,
            created_at: signer.sign_request.created_at,
          },
        })
      );
      return;
    }

    // Get fields assigned to this signer with values
    const fields = await signRequestFieldValuesService.getSignerFieldsWithValues(signer.id);

    // Get all signers for this sign request
    const allSigners = await prisma.signers.findMany({
      where: { sign_request_id: signer.sign_request_id },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        signed_at: true,
        role: true,
        signing_order: true,
      },
      orderBy: { signing_order: 'asc' },
    });

    // Mock activities (in real app, you'd have an audit log table)
    const activities = [
      {
        id: 1,
        user_name: signer.sign_request.document?.title || 'System',
        action: 'đã gửi tài liệu',
        timestamp: signer.sign_request.created_at?.toISOString() || new Date().toISOString(),
      },
    ];

    // Add signed activities
    allSigners.forEach((s) => {
      if (s.signed_at) {
        activities.push({
          id: activities.length + 1,
          user_name: s.name || s.email || 'Unknown',
          action: 'đã ký tài liệu',
          timestamp: s.signed_at.toISOString(),
        });
      }
    });

    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(
      ok({
        signer: {
          id: signer.id,
          name: signer.name,
          email: signer.email,
          role: signer.role,
          status: signer.status,
        },
        sign_request: {
          id: signer.sign_request.id,
          title: signer.sign_request.title,
          message: signer.sign_request.message,
          deadline: signer.sign_request.deadline,
          created_at: signer.sign_request.created_at,
        },
        document: {
          ...signer.sign_request.document,
          created_at: signer.sign_request.created_at,
        },
        fields,
        signers: allSigners,
        activities,
        already_signed: false,
      })
    );
  };

  /**
   * Get document file for viewing
   * GET /public/sign/:token/document
   */
  getDocument = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    // Find signer by token
    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
      include: {
        sign_request: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!signer) {
      throw ApiError.notFound('Invalid signing link');
    }

    const document = signer.sign_request.document;
    const filePath = path.resolve(document.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('Document file not found');
    }

    // Stream the file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.original_file_name || 'document.pdf'}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  };

  /**
   * Send OTP to signer's email
   * POST /public/sign/:token/send-otp
   */
  sendOtp = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const body = sendOtpSchema.parse(req.body);

    // Find signer by token
    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
      include: {
        sign_request: true,
      },
    });

    if (!signer) {
      throw ApiError.notFound('Invalid signing link');
    }

    // Verify email matches
    if (signer.email !== body.email) {
      throw ApiError.badRequest('Email does not match');
    }

    // Send OTP (reuse existing service)
    const otp = await signersService.sendOtp(signer.id, signer.sign_request.tenant_id);

    const payload: Record<string, unknown> = { otp_sent: true };
    if (process.env.NODE_ENV !== "production") {
      payload.debug_otp = otp;
      console.log(`🔑 DEBUG OTP for ${body.email}: ${otp}`);
    }

    res.json(ok(payload));
  };

  /**
   * Download signed PDF with all signatures
   * GET /public/sign/:token/download-signed
   */
  downloadSignedPdf = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    // Find signer by token
    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
      include: {
        sign_request: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!signer) {
      throw ApiError.notFound('Invalid signing link');
    }

    // Check if signer has signed
    if (signer.status !== 'signed' && signer.status !== 'completed') {
      throw ApiError.badRequest('You must sign the document first');
    }

    // Generate signed PDF
    const pdfBuffer = await pdfSigningService.generateSignedPdf(signer.sign_request_id);

    // Send PDF as download
    const filename = `${signer.sign_request.document.original_file_name || 'document'}_signed.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  };

  /**
   * Submit signature with field values
   * POST /public/sign/:token/sign
   */
  submitSignature = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    
    console.log('📥 Submit signature request:', {
      token: token.substring(0, 10) + '...',
      body: {
        otp: req.body.otp?.substring(0, 2) + '****',
        signature_data_length: req.body.signature_data?.length || 0,
        signature_type: req.body.signature_type,
        field_values_count: req.body.field_values?.length || 0,
        field_values: req.body.field_values,
      }
    });
    
    try {
      const body = submitSignatureSchema.parse(req.body);
      console.log('✅ Validation passed');
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError);
      throw validationError;
    }
    
    const body = submitSignatureSchema.parse(req.body);

    // Find signer by token
    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
      include: {
        sign_request: true,
      },
    });

    if (!signer) {
      throw ApiError.notFound('Invalid signing link');
    }

    // Check if already signed
    if (signer.status === 'completed' || signer.status === 'signed') {
      console.log('❌ Already signed:', signer.status);
      throw ApiError.badRequest('You have already signed this document');
    }
    console.log('✅ Signer status OK:', signer.status);

    // ✨ NEW: Check signing order for sequential workflow
    if (signer.sign_request.workflow_type === 'sequential') {
      console.log('🔍 Checking sequential signing order...');
      
      // Get all signers ordered by signing_order
      const allSigners = await prisma.signers.findMany({
        where: { sign_request_id: signer.sign_request_id },
        orderBy: { signing_order: 'asc' }
      });

      // Find previous signers (lower order)
      const previousSigners = allSigners.filter(s => 
        (s.signing_order || 0) < (signer.signing_order || 0)
      );

      // Check if all previous signers have signed
      const allPreviousSigned = previousSigners.every(s => 
        s.status === 'completed' || s.status === 'signed'
      );

      if (!allPreviousSigned) {
        const pendingSigners = previousSigners.filter(s => 
          s.status !== 'completed' && s.status !== 'signed'
        );
        
        console.log('❌ Cannot sign yet. Waiting for:', pendingSigners.map(s => ({
          name: s.name,
          order: s.signing_order,
          status: s.status
        })));

        throw ApiError.badRequest(
          `Vui lòng đợi người ký trước hoàn thành. ` +
          `Đang chờ: ${pendingSigners.map(s => s.name || s.email).join(', ')}`
        );
      }

      console.log('✅ All previous signers completed. Can proceed.');
    }

    // Verify OTP (inline verification)
    console.log('🔍 OTP verification:', {
      hasOtp: !!signer.otp,
      hasExpiry: !!signer.otp_expire,
      expiry: signer.otp_expire,
      now: new Date(),
      isExpired: signer.otp_expire ? signer.otp_expire < new Date() : 'no expiry'
    });
    
    if (!signer.otp || !signer.otp_expire) {
      console.log('❌ OTP not issued');
      throw ApiError.badRequest('OTP not issued');
    }
    if (signer.otp_expire < new Date()) {
      console.log('❌ OTP expired');
      throw ApiError.badRequest('OTP expired');
    }
    const bcrypt = require('bcryptjs');
    const isValidOtp = await bcrypt.compare(body.otp, signer.otp);
    console.log('🔍 OTP comparison result:', isValidOtp);
    if (!isValidOtp) {
      console.log('❌ Invalid OTP');
      throw ApiError.badRequest('Invalid OTP');
    }
    console.log('✅ OTP verified successfully');

    // Save field values (if provided)
    if (body.field_values && body.field_values.length > 0) {
      console.log('💾 Saving field values:', body.field_values);
      await signRequestFieldValuesService.saveFieldValues(signer.id, body.field_values as Array<{field_id: number; value: any}>);

      // Validate all required fields are filled
      console.log('🔍 Validating required fields...');
      const allFieldsFilled = await signRequestFieldValuesService.validateRequiredFields(signer.id);
      console.log('🔍 All fields filled:', allFieldsFilled);
      if (!allFieldsFilled) {
        console.log('❌ Not all required fields filled');
        throw ApiError.badRequest('Please fill all required fields');
      }
    }

    // Mark as signed
    console.log('💾 Updating signer status to completed...');
    await prisma.signers.update({
      where: { id: signer.id },
      data: {
        status: 'signed', // Use 'signed' status (will be treated as completed in checks)
        signed_at: new Date(),
        signature_data: body.signature_data,
        signature_type: body.signature_type,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
        otp: null,
        otp_expire: null,
      },
    });
    console.log('✅ Signer marked as signed');

    // Check if all signers have signed
    console.log('🔍 Checking if all signers completed...');
    const allSigners = await prisma.signers.findMany({
      where: { sign_request_id: signer.sign_request_id },
      orderBy: { signing_order: 'asc' }
    });

    console.log('📊 Signers status:', allSigners.map(s => ({
      name: s.name,
      order: s.signing_order,
      status: s.status
    })));

    // Consider both 'completed' and 'signed' as done
    const allSigned = allSigners.every((s) => s.status === 'completed' || s.status === 'signed');
    const signedCount = allSigners.filter(s => s.status === 'completed' || s.status === 'signed').length;

    console.log(`📊 Progress: ${signedCount}/${allSigners.length} signed`);

    if (allSigned) {
      console.log('✅ All signers completed! Updating statuses...');
      // Update sign request status
      await prisma.sign_requests.update({
        where: { id: signer.sign_request_id },
        data: { status: 'completed' },
      });

      // Update document status
      await prisma.documents.update({
        where: { id: signer.sign_request.document_id },
        data: { status: 'completed' },
      });
      console.log('✅ Sign request and document marked as completed');
    } else {
      console.log('⏳ Not all signed yet, updating to in_progress...');
      // Update to in_progress
      await prisma.sign_requests.update({
        where: { id: signer.sign_request_id },
        data: { status: 'in_progress' },
      });
      console.log('✅ Sign request marked as in_progress');
      
      // TODO: Send email to next signer in sequential workflow
      if (signer.sign_request.workflow_type === 'sequential') {
        const nextSigner = allSigners.find(s => 
          (s.status === 'pending' || s.status === 'otp_sent') && 
          s.signing_order > (signer.signing_order || 0)
        );
        if (nextSigner) {
          console.log(`📧 TODO: Send email to next signer: ${nextSigner.name} (${nextSigner.email})`);
          // Email notification will be implemented later
        }
      }
    }

    res.json(
      ok({
        signed: true,
        all_signed: allSigned,
        message: 'Document signed successfully',
      })
    );
  };
}

export const publicSignController = new PublicSignController();
