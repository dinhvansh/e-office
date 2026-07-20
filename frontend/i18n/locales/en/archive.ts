import type { MessageShape } from "../../types";
import { archive as vi } from "../vi/archive";

export const archive = {
  "archive.title": "Archive",
  "archive.description": "Archived documents",
  "archive.searchPlaceholder": "Search documents",
  "archive.emptyTitle": "Archive is empty",
  "archive.emptyDescription": "There are no archived documents.",
  "archive.previousStatus": "Previous status",
  "archive.archivedAt": "Archived at",
  "archive.request": "Signing request",
  "archive.restore.title": "Restore document",
  "archive.restore.description": "The document will return to Cancelled. Previous workflows, approvals, and signing sessions will not be reactivated.",
  "archive.restore.success": "Restored to Cancelled",
  "archive.restore.error": "Unable to restore the document",
  "archive.restore.target": "document",
} satisfies MessageShape<typeof vi>;
