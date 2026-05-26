export const workflowAssigneeTypes = [
  "specific_user",
  "department_manager",
  "position_in_department",
  "direct_manager",
] as const;

export const workflowCompletionModes = ["any_one", "all", "min_n"] as const;

export type WorkflowAssigneeType = (typeof workflowAssigneeTypes)[number];
export type WorkflowCompletionMode = (typeof workflowCompletionModes)[number];

export type WorkflowStepAssignmentInput = {
  approver_type?: string;
  approver_id?: number;
  approver_user_id?: number;
  approver_role_id?: number;
  approver_department_id?: number;
  assignee_type?: WorkflowAssigneeType;
  assignee_user_id?: number;
  assignee_department_id?: number;
  assignee_position_id?: number;
  completion_mode?: WorkflowCompletionMode;
  min_required?: number;
};

export type NormalizedWorkflowStepAssignment = {
  approver_type: string;
  approver_id: number | null;
  assignee_type: WorkflowAssigneeType | null;
  assignee_user_id: number | null;
  assignee_department_id: number | null;
  assignee_position_id: number | null;
  completion_mode: WorkflowCompletionMode;
  min_required: number | null;
};

export function isWorkflowAssigneeType(value: unknown): value is WorkflowAssigneeType {
  return workflowAssigneeTypes.includes(String(value) as WorkflowAssigneeType);
}

export function isWorkflowCompletionMode(value: unknown): value is WorkflowCompletionMode {
  return workflowCompletionModes.includes(String(value) as WorkflowCompletionMode);
}

export function normalizeWorkflowStepAssignment(
  input: WorkflowStepAssignmentInput,
): NormalizedWorkflowStepAssignment {
  const assigneeType = resolveAssigneeType(input);
  const completionMode = isWorkflowCompletionMode(input.completion_mode) ? input.completion_mode : "all";
  const minRequired = completionMode === "min_n" && typeof input.min_required === "number" ? input.min_required : null;

  if (assigneeType === "specific_user") {
    const userId = input.assignee_user_id ?? input.approver_user_id ?? input.approver_id ?? null;
    return {
      approver_type: "user",
      approver_id: userId,
      assignee_type: assigneeType,
      assignee_user_id: userId,
      assignee_department_id: null,
      assignee_position_id: null,
      completion_mode: completionMode,
      min_required: minRequired,
    };
  }

  if (assigneeType === "department_manager") {
    const departmentId = input.assignee_department_id ?? input.approver_department_id ?? input.approver_id ?? null;
    return {
      approver_type: "department",
      approver_id: departmentId,
      assignee_type: assigneeType,
      assignee_user_id: null,
      assignee_department_id: departmentId,
      assignee_position_id: null,
      completion_mode: completionMode,
      min_required: minRequired,
    };
  }

  if (assigneeType === "position_in_department") {
    const departmentId = input.assignee_department_id ?? input.approver_department_id ?? null;
    const positionId = input.assignee_position_id ?? input.approver_id ?? null;
    return {
      approver_type: "position",
      approver_id: positionId,
      assignee_type: assigneeType,
      assignee_user_id: null,
      assignee_department_id: departmentId,
      assignee_position_id: positionId,
      completion_mode: completionMode,
      min_required: minRequired,
    };
  }

  return {
    approver_type: "manager",
    approver_id: null,
    assignee_type: "direct_manager",
    assignee_user_id: null,
    assignee_department_id: null,
    assignee_position_id: null,
    completion_mode: completionMode,
    min_required: minRequired,
  };
}

export function resolveAssigneeType(input: WorkflowStepAssignmentInput): WorkflowAssigneeType {
  if (isWorkflowAssigneeType(input.assignee_type)) {
    return input.assignee_type;
  }

  switch (input.approver_type) {
    case "user":
      return "specific_user";
    case "department":
      return "department_manager";
    case "position":
      return "position_in_department";
    case "manager":
      return "direct_manager";
    default:
      return "specific_user";
  }
}

export function getDefaultCompletionMode(assigneeType: WorkflowAssigneeType): WorkflowCompletionMode {
  switch (assigneeType) {
    case "position_in_department":
      return "any_one";
    default:
      return "all";
  }
}
