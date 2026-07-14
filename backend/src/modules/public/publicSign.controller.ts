import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { ok } from "../../core/utils/response";
import { ApiError } from "../../core/errors/api-error";
import { FieldValueInput, signRequestFieldValuesService } from "../signRequests/signRequestFieldValues.service";
import { signersService } from "../signers/signers.service";
import { storageService } from "../../core/storage/storage.service";
import { prisma } from "../../config/prisma";
import { createSigningSession, getSigningSessionErrorCode, isSigningSessionValid, PUBLIC_SIGNING_COOKIE_PATH, SIGNING_SESSION_COOKIE, SIGNING_SESSION_TTL_SECONDS } from "./signingSession.service";
import { publicSigningCommandService } from "./publicSigningCommand.service";
import { buildPreOtpSigningMetadata, buildVerifiedSigningMetadata } from "./publicSigning.response";

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, segment) => {
    const [name, ...parts] = segment.trim().split("=");
    if (name) cookies[name] = decodeURIComponent(parts.join("="));
    return cookies;
  }, {});
};

const hasSigningSession = (req: Request, signerId: number, signRequestId: number, otpFingerprint: string | null): boolean => {
  const session = parseCookies(req.headers.cookie)[SIGNING_SESSION_COOKIE];
  return isSigningSessionValid(session, signerId, signRequestId, otpFingerprint);
};

const requireSigningSession = (req: Request, signerId: number, signRequestId: number, otpFingerprint: string | null): void => {
  const session = parseCookies(req.headers.cookie)[SIGNING_SESSION_COOKIE];
  if (!isSigningSessionValid(session, signerId, signRequestId, otpFingerprint)) {
    throw ApiError.unauthorized("OTP verification is required", getSigningSessionErrorCode(session));
  }
};

const sendOtpSchema = z.object({
  email: z.string().email(),
});

const submitSignatureSchema = z.object({
  otp: z.string().min(6).max(6),
  signature_data: z.string().optional(),
  signature_type: z.enum(["drawn", "uploaded", "typed", "certificate"]).optional(),
  field_values: z
    .array(
      z.object({
        field_id: z.number(),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      }),
    )
    .optional()
    .default([]),
});

export class PublicSignController {
  getSigningPage = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

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
              },
            },
          },
        },
      },
    });

    if (!signer) {
      throw ApiError.notFound("Invalid signing link");
    }

    if (!hasSigningSession(req, signer.id, signer.sign_request_id, signer.otp)) {
      res.json(ok(buildPreOtpSigningMetadata({ signer, signRequest: signer.sign_request })));
      return;
    }

    if (signer.status === "signed" || signer.status === "completed") {
      res.json(
        ok({
          already_signed: true,
          signed_at: signer.signed_at,
          message: "You have already signed this document",
          ...buildVerifiedSigningMetadata({ signer, signRequest: signer.sign_request }),
        }),
      );
      return;
    }

    const fields = await signRequestFieldValuesService.getSignerFieldsWithValues(signer.id);

    res.json(
      ok({
        ...buildVerifiedSigningMetadata({ signer, signRequest: signer.sign_request }),
        fields,
        already_signed: false,
      }),
    );
  };

  getDocument = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
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
      throw ApiError.notFound("Invalid signing link");
    }

    if (["signed", "completed", "cancelled", "rejected", "expired"].includes(signer.status || "")) {
      throw ApiError.forbidden("Signing session has been consumed", "SIGNING_SESSION_INVALID");
    }

    const document = signer.sign_request.document;
    requireSigningSession(req, signer.id, signer.sign_request_id, signer.otp);
    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = await storageService.get(document.file_path);
    } catch {
      throw ApiError.notFound("Document file not found");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.original_file_name || "document.pdf"}"`,
    );
    res.send(Buffer.from(pdfBuffer));
  };

  sendOtp = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const body = sendOtpSchema.parse(req.body);

    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
      include: {
        sign_request: true,
      },
    });

    if (!signer) {
      throw ApiError.notFound("Invalid signing link");
    }
    if (signer.email !== body.email) {
      throw ApiError.badRequest("Email does not match");
    }

    await signersService.sendOtp(signer.id, signer.sign_request.tenant_id);
    res.json(ok({ otp_sent: true }));
  };

  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const { otp } = z.object({ otp: z.string().length(6) }).parse(req.body);
    const normalizedOtp = otp.trim();

    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
    });

    if (!signer) {
      throw ApiError.notFound("Invalid signing link", "INVALID_TOKEN");
    }
    if (!signer.otp) {
      throw ApiError.badRequest("OTP not issued. Please request OTP first.", "OTP_NOT_ISSUED");
    }
    if (signer.otp_expire && new Date() > signer.otp_expire) {
      throw ApiError.badRequest("OTP expired. Please request a new OTP.", "OTP_EXPIRED");
    }

    const isValid = await bcrypt.compare(normalizedOtp, signer.otp);
    if (!isValid) {
      throw ApiError.badRequest("Invalid OTP. Please check your email.", "OTP_INVALID");
    }

    const signingSession = createSigningSession(signer.id, signer.sign_request_id, signer.otp);
    res.setHeader(
      "Set-Cookie",
      `${SIGNING_SESSION_COOKIE}=${encodeURIComponent(signingSession)}; HttpOnly; Path=${PUBLIC_SIGNING_COOKIE_PATH}; SameSite=Lax; Max-Age=${SIGNING_SESSION_TTL_SECONDS}`,
    );
    res.json(ok({ verified: true, message: "OTP verified successfully" }));
  };

  downloadSignedPdf = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
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
      throw ApiError.notFound("Invalid signing link");
    }

    const document = signer.sign_request.document;
    if (!document.signed_file_path) {
      throw ApiError.conflict("Signed PDF is still being generated", "SIGNED_ARTIFACT_NOT_READY");
    }

    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = await storageService.get(document.signed_file_path);
    } catch {
      throw ApiError.notFound("Signed PDF file not found");
    }

    const filename = `${document.document_number || document.original_file_name || "document"}_signed.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.byteLength);
    res.send(Buffer.from(pdfBuffer));
  };

  submitSignature = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const body = submitSignatureSchema.parse(req.body);
    const signingSession = parseCookies(req.headers.cookie)[SIGNING_SESSION_COOKIE];
    const result = await publicSigningCommandService.submit({
      invitationToken: token,
      signingSession,
      otp: body.otp,
      signatureData: body.signature_data,
      signatureType: body.signature_type,
      fieldValues: body.field_values as FieldValueInput[],
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    res.json(ok({
      signed: true,
      all_signed: result.allSigned,
      message: "Document signed successfully",
    }));
  };

}

export const publicSignController = new PublicSignController();
