import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";

export class WorkflowCancellationService {
  constructor(private readonly database = prisma) {}

  async cancel(input: { documentId: number; tenantId: number; userId: number; reason?: string }): Promise<void> {
    const document = await this.database.documents.findFirst({ where: { id: input.documentId, tenant_id: input.tenantId }, select: { id: true, status: true, sign_request_id: true } });
    if (!document) throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    if (["archived", "cancelled", "completed"].includes(document.status || "")) throw ApiError.badRequest("Document cannot be cancelled", "DOCUMENT_CANCEL_DENIED");
    await this.database.$transaction(async (tx) => {
      await tx.documents.update({ where: { id: document.id }, data: { status: "cancelled" } });
      if (document.sign_request_id) {
        await tx.sign_requests.update({ where: { id: document.sign_request_id }, data: { status: "cancelled", cancellation_reason: input.reason || "Cancelled", cancelled_at: new Date(), cancelled_by: input.userId } });
        await tx.signers.updateMany({ where: { sign_request_id: document.sign_request_id, status: { in: ["draft", "pending", "waiting_approval", "waiting_signing", "otp_sent"] } }, data: { status: "cancelled", otp: null, otp_expire: null, signing_token: null } });
      }
      const runs = await tx.workflow_instances.findMany({ where: { document_id: document.id, status: "in_progress" }, select: { id: true } });
      const runIds = runs.map((run) => run.id);
      if (runIds.length) {
        // Preserve completed/rejected approval history; actions are rejected by the closed run guard.
        await tx.workflow_instances.updateMany({ where: { id: { in: runIds } }, data: { status: "cancelled", completed_at: new Date(), current_step_id: null } });
      }
      await tx.audit_logs.create({ data: { document_id: document.id, event: "document.cancelled", user_id: input.userId, ip: null, ua: JSON.stringify({ previous_status: document.status, status: "cancelled", reason: input.reason || null }) } });
    });
  }
}
export const workflowCancellationService = new WorkflowCancellationService();
