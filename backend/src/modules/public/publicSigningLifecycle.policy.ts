import { ApiError } from "../../core/errors/api-error";

type SigningContext = {
  status: string | null;
  signing_token?: string | null;
  sign_request: {
    status: string | null;
    deadline?: Date | null;
    archived_at?: Date | null;
    document?: { status: string | null; archived_at?: Date | null } | null;
  };
};

const closedRequestStatuses = new Set(["cancelled", "archived", "completed", "rejected", "artifact_failed", "generating_artifact"]);
const closedSignerStatuses = new Set(["signed", "completed", "cancelled", "rejected", "expired"]);

export function assertPublicSigningActionable(context: SigningContext): void {
  if (!context.signing_token) {
    throw ApiError.notFound("Invalid signing link", "INVALID_SIGNING_LINK");
  }
  if (context.sign_request.archived_at || context.sign_request.document?.archived_at) {
    throw ApiError.badRequest("Signing request is no longer active", "SIGNING_REQUEST_ARCHIVED");
  }
  if (closedRequestStatuses.has(String(context.sign_request.status || "").toLowerCase()) ||
      closedRequestStatuses.has(String(context.sign_request.document?.status || "").toLowerCase()) ||
      closedSignerStatuses.has(String(context.status || "").toLowerCase())) {
    throw ApiError.badRequest("Signing request is no longer active", "SIGNING_REQUEST_EXPIRED");
  }
  if (context.sign_request.deadline && context.sign_request.deadline.getTime() <= Date.now()) {
    throw ApiError.badRequest("Signing request has expired", "SIGNING_REQUEST_EXPIRED");
  }
}
