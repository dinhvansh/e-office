import type { MessageShape } from "../../types";
import { workflow as vi } from "../vi/workflow";

export const workflow = {
  "workflow.approvalMode.label": "Approval mode",
  "workflow.approvalMode.sequential": "Sequential approval",
  "workflow.approvalMode.parallel": "Parallel approval",
  "workflow.approvalMode.sequentialDescription": "Approvers act one step at a time in the configured order.",
  "workflow.approvalMode.parallelDescription": "All approvers are asked to act at the same time. The workflow continues only after everyone approves.",
  "workflow.approvalMode.sequentialPreview": "Steps are activated one at a time in order.",
  "workflow.approvalMode.parallelPreview": "All approval steps are activated at the same time.",
  "workflow.preview.loading": "Loading workflow...",
  "workflow.preview.title": "Approval workflow",
  "workflow.preview.steps": "{count} steps",
  "workflow.preview.missingApprover": "Approver information is unavailable",
  "workflow.preview.approverType.user": "User",
  "workflow.preview.approverType.role": "Role",
  "workflow.preview.approverType.department": "Department",
  "workflow.preview.approverType.manager": "Manager",
  "workflow.preview.dueInDays": "{count} days",
  "workflow.preview.parallelMarker": "Concurrent",
} satisfies MessageShape<typeof vi>;
