import type { MessageShape } from "../../types";
import { approvals as vi } from "../vi/approvals";

export const approvals = {
  "approvals.status.pending": "Pending",
  "approvals.status.waiting": "Waiting",
  "approvals.status.approved": "Approved",
  "approvals.status.rejected": "Rejected",
  "approvals.status.cancelled": "Cancelled",
  "approvals.status.requestInfo": "More information requested",
  "approvals.metrics.total": "Total",
  "approvals.filters.title": "Filters",
  "approvals.filters.search": "Search",
  "approvals.filters.searchPlaceholder": "Code or document name...",
  "approvals.filters.status": "Status",
  "approvals.filters.allStatuses": "All statuses",
  "approvals.filters.documentType": "Document type",
  "approvals.filters.allDocumentTypes": "All types",
  "approvals.filters.creator": "Creator",
  "approvals.filters.creatorPlaceholder": "Name or email...",
  "approvals.filters.sort": "Sort by",
  "approvals.filters.newest": "Newest",
  "approvals.filters.oldest": "Oldest",
  "approvals.filters.documentNumberAsc": "Document code A-Z",
  "approvals.filters.documentNumberDesc": "Document code Z-A",
} satisfies MessageShape<typeof vi>;
