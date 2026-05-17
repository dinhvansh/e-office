import { Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { ok } from "../../core/utils/response";
import { ApiError } from "../../core/errors/api-error";
import { signRequestFieldValuesService } from "../signRequests/signRequestFieldValues.service";
import { signersService } from "../signers/signers.service";
import { pdfGenerationService } from "../signRequests/pdfGeneration.service";
import { notificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/notifications.types";

const prisma = new PrismaClient();

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
                file_path: true,
              },
            },
          },
        },
      },
    });

    if (!signer) {
      throw ApiError.notFound("Invalid signing link");
    }

    if (signer.status === "signed" || signer.status === "completed") {
      res.json(
        ok({
          already_signed: true,
          signed_at: signer.signed_at,
          message: "You have already signed this document",
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
        }),
      );
      return;
    }

    const fields = await signRequestFieldValuesService.getSignerFieldsWithValues(signer.id);

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
      orderBy: { signing_order: "asc" },
    });

    const activities = [
      {
        id: 1,
        user_name: signer.sign_request.document?.title || "System",
        action: "sent document",
        timestamp: signer.sign_request.created_at?.toISOString() || new Date().toISOString(),
      },
    ];

    allSigners.forEach((s) => {
      if (s.signed_at) {
        activities.push({
          id: activities.length + 1,
          user_name: s.name || s.email || "Unknown",
          action: "signed document",
          timestamp: s.signed_at.toISOString(),
        });
      }
    });

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

    const document = signer.sign_request.document;
    const filePath = path.resolve(document.file_path);
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound("Document file not found");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.original_file_name || "document.pdf"}"`,
    );
    fs.createReadStream(filePath).pipe(res);
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

    const bcrypt = require("bcrypt");
    const isValid = await bcrypt.compare(otp, signer.otp);
    if (!isValid) {
      throw ApiError.badRequest("Invalid OTP. Please check your email.", "INVALID_OTP");
    }

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
      const allSigners = await prisma.signers.findMany({
        where: { sign_request_id: signer.sign_request_id },
      });
      const allSigned = allSigners.every((s) => s.status === "signed" || s.status === "completed");
      if (!allSigned) {
        throw ApiError.badRequest("Document signing is not complete yet");
      }
      const signedFilePath = await pdfGenerationService.generateSignedPdf(signer.sign_request_id);
      await prisma.documents.update({
        where: { id: document.id },
        data: { signed_file_path: signedFilePath },
      });
      document.signed_file_path = signedFilePath;
    }

    const filePath = path.resolve(__dirname, "../../../", document.signed_file_path);
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound("Signed PDF file not found");
    }

    const pdfBuffer = fs.readFileSync(filePath);
    const filename = `${document.document_number || document.original_file_name || "document"}_signed.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  };

  submitSignature = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const body = submitSignatureSchema.parse(req.body);

    const signer = await prisma.signers.findUnique({
      where: { signing_token: token },
      include: { sign_request: true },
    });
    if (!signer) {
      throw ApiError.notFound("Invalid signing link");
    }
    if (signer.status === "completed" || signer.status === "signed") {
      throw ApiError.badRequest("You have already signed this document");
    }

    if (signer.sign_request.workflow_type === "sequential") {
      const allSigners = await prisma.signers.findMany({
        where: { sign_request_id: signer.sign_request_id },
        orderBy: { signing_order: "asc" },
      });
      const previousSigners = allSigners.filter(
        (s) => (s.signing_order || 0) < (signer.signing_order || 0),
      );
      const allPreviousSigned = previousSigners.every(
        (s) => s.status === "completed" || s.status === "signed",
      );
      if (!allPreviousSigned) {
        const pending = previousSigners
          .filter((s) => s.status !== "completed" && s.status !== "signed")
          .map((s) => s.name || s.email)
          .join(", ");
        throw ApiError.badRequest(`Please wait for previous signer(s): ${pending}`);
      }
    }

    if (!signer.otp || !signer.otp_expire) {
      throw ApiError.badRequest("OTP not issued");
    }
    if (signer.otp_expire < new Date()) {
      throw ApiError.badRequest("OTP expired");
    }

    const bcrypt = require("bcryptjs");
    const isValidOtp = await bcrypt.compare(body.otp, signer.otp);
    if (!isValidOtp) {
      throw ApiError.badRequest("Invalid OTP");
    }

    if (body.field_values && body.field_values.length > 0) {
      await signRequestFieldValuesService.saveFieldValues(
        signer.id,
        body.field_values as Array<{ field_id: number; value: any }>,
      );
      const allFieldsFilled = await signRequestFieldValuesService.validateRequiredFields(signer.id);
      if (!allFieldsFilled) {
        throw ApiError.badRequest("Please fill all required fields");
      }
    }

    await prisma.signers.update({
      where: { id: signer.id },
      data: {
        status: "signed",
        signed_at: new Date(),
        signature_data: body.signature_data,
        signature_type: body.signature_type,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers["user-agent"],
        otp: null,
        otp_expire: null,
      },
    });

    const allSigners = await prisma.signers.findMany({
      where: { sign_request_id: signer.sign_request_id },
      orderBy: { signing_order: "asc" },
    });
    const allSigned = allSigners.every((s) => s.status === "completed" || s.status === "signed");

    if (allSigned) {
      await prisma.sign_requests.update({
        where: { id: signer.sign_request_id },
        data: { status: "completed" },
      });
      try {
        const signedFilePath = await pdfGenerationService.generateSignedPdf(signer.sign_request_id);
        await prisma.documents.update({
          where: { id: signer.sign_request.document_id },
          data: { status: "completed", signed_file_path: signedFilePath },
        });
      } catch (error) {
        console.error("Failed to generate signed PDF:", error);
        await prisma.documents.update({
          where: { id: signer.sign_request.document_id },
          data: { status: "completed" },
        });
      }

      const document = await prisma.documents.findUnique({
        where: { id: signer.sign_request.document_id },
        include: { owner: true },
      });
      if (document?.owner) {
        notificationsService
          .createNotification({
            tenantId: document.tenant_id,
            userId: document.owner.id,
            type: NotificationType.SIGN_COMPLETED,
            title: "Ky hoan tat",
            message: `Tai lieu "${document.title || "Untitled"}" da duoc ky hoan tat`,
            link: `/documents/${document.id}`,
          })
          .catch((err) => console.error("Failed to create notification:", err));
      }
    } else {
      await prisma.sign_requests.update({
        where: { id: signer.sign_request_id },
        data: { status: "in_progress" },
      });

      const waitingSigners = allSigners.filter((s) => s.status === "waiting_signing");
      if (waitingSigners.length > 0) {
        const nextSigner = waitingSigners.sort(
          (a, b) => (a.signing_order || 0) - (b.signing_order || 0),
        )[0];

        await prisma.signers.update({
          where: { id: nextSigner.id },
          data: { status: "pending" },
        });

        if (nextSigner.is_internal && nextSigner.user_id) {
          try {
            const document = await prisma.documents.findUnique({
              where: { id: signer.sign_request.document_id },
            });
            await notificationsService.createNotification({
              tenantId: document?.tenant_id || 0,
              userId: nextSigner.user_id,
              type: NotificationType.SIGN_REQUEST,
              title: "Den luot ban ky tai lieu",
              message: `Tai lieu "${signer.sign_request.title || "Untitled"}" dang cho ban ky`,
              link: `/sign-requests/${signer.sign_request_id}/internal-sign`,
            });
          } catch (error) {
            console.error("Failed to send in-app notification:", error);
          }
        } else if (!nextSigner.is_internal && nextSigner.signing_token) {
          const { emailService } = await import("../../modules/common/email.service");
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
          const signUrl = `${frontendUrl}/sign/${nextSigner.signing_token}`;
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const bcrypt = require("bcrypt");
          const otpHash = await bcrypt.hash(otp, 10);
          const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

          await prisma.signers.update({
            where: { id: nextSigner.id },
            data: { otp: otpHash, otp_expire: otpExpire, status: "otp_sent" },
          });

          try {
            await emailService.sendSignRequestWithOTP({
              recipientEmail: nextSigner.email,
              recipientName: nextSigner.name,
              documentTitle: signer.sign_request.title || "Document",
              senderName: "System",
              message: "Den luot ban ky. Nguoi ky truoc da hoan thanh.",
              signUrl,
              otp,
              expiryMinutes: 10,
            });
          } catch (error) {
            console.error(`Failed to send email to ${nextSigner.email}:`, error);
          }
        }
      }
    }

    res.json(
      ok({
        signed: true,
        all_signed: allSigned,
        message: "Document signed successfully",
      }),
    );
  };
}

export const publicSignController = new PublicSignController();
