# Workflow Assignee Refactor Plan

## Context

Current workflow steps use legacy assignee types tied to:

- `user`
- `role`
- `department`
- `manager`

This causes ambiguity:

- `role` represents software permissions, not business responsibility.
- `department` currently resolves to department manager only, which is not obvious in the UI.
- approval and signing behave differently for `role`, which is hard to explain to users.

The target model replaces this with clearer business-oriented assignee rules:

- `Người dùng cụ thể`
- `Trưởng phòng ban`
- `Chức danh trong phòng ban`
- `Quản lý trực tiếp`

Each workflow step also needs an explicit completion rule:

- `Một người bất kỳ`
- `Tất cả`
- `Tối thiểu N người`

## Goals

- Remove ambiguity from workflow configuration.
- Separate system permissions from business approval/signing routing.
- Support both approval and signing with the same assignment model.
- Preserve compatibility with existing workflows during rollout.

## Current Status

### Completed

- Schema and compatibility layer for:
  - `assignee_type`
  - `assignee_user_id`
  - `assignee_department_id`
  - `assignee_position_id`
  - `completion_mode`
  - `min_required`
- Backend create/update validation for new workflow step payloads
- Normalization from legacy fields to the new internal assignee model
- Approval resolution for:
  - `specific_user`
  - `department_manager`
  - `position_in_department`
  - `direct_manager`
- Approval completion logic for:
  - `any_one`
  - `all`
  - `min_n`
- Workflow clone/copy paths updated to preserve new assignee/completion fields
- Workflow UI now creates steps with only:
  - `Người dùng cụ thể`
  - `Trưởng phòng ban`
  - `Chức danh trong phòng ban`
  - `Quản lý trực tiếp`
- Workflow UI now supports completion modes:
  - `Một người bất kỳ`
  - `Tất cả`
  - `Tối thiểu N người`
- Legacy `role` warning added in workflow step management UI
- Docker smoke/E2E passed for:
  - `position_in_department + any_one` on approval flow
  - approval records are generated for multiple matched users
  - first approver can complete the step and move document into signing phase

### Partial / Remaining

- Prisma migration file is not finalized yet.
  - Local Prisma engine still fails on `migrate dev` / `db push`, so local DB columns were provisioned manually for development.
- Signer completion with grouped internal signers has code support started, but still needs broader E2E coverage.
- Workflow step edit flow still needs a full pass for legacy + new data combinations.
- Broader automated coverage is still missing for:
  - `department_manager`
  - `direct_manager`
  - `min_n`
  - signer-group completion cases

### Latest Docker E2E Results

- `specific_user + all`: passed
- `department_manager + all`: passed
- `direct_manager + all`: passed
- `position_in_department + any_one`: passed
- `position_in_department + min_n (2)`: passed

### Still Not Covered End-to-End

- `position_in_department + all`
- signer-group workflow steps with:
  - `any_one`
  - `all`
  - `min_n`
- negative/error-path cases:
  - missing department manager
  - missing direct manager
  - no active users for selected position in department
  - `min_required` greater than resolved user count

## Target Model

### Assignee Types

- `specific_user`
  - Resolve exactly one internal user.
- `department_manager`
  - Resolve the manager of the selected department.
- `position_in_department`
  - Resolve all active users holding the selected position in the selected department.
- `direct_manager`
  - Resolve the direct manager of the document owner / request creator.

### Completion Modes

- `any_one`
  - Step completes when any resolved participant approves/signs.
- `all`
  - Step completes when all resolved participants approve/sign.
- `min_n`
  - Step completes when at least `min_required` resolved participants approve/sign.

## Implementation Phases

### Phase 0: Freeze Current State

- [x] Push current working code to Git
- [x] Confirm branch and remote are up to date
- [x] Record reference commit for safe rollback

Reference commit:

- `5cc3a34` `Add webhook API tokens and improve mobile/document watermark UX`

### Phase 1: Schema and Backend Compatibility Layer

- [ ] Review current Prisma schema for workflow steps, approvals, signers, positions, departments, and users
- [ ] Add new workflow step fields without removing legacy fields:
  - [ ] `assignee_type`
  - [ ] `assignee_user_id`
  - [ ] `assignee_department_id`
  - [ ] `assignee_position_id`
  - [ ] `completion_mode`
  - [ ] `min_required`
- [ ] Keep existing fields temporarily for backward compatibility:
  - [ ] `approver_type`
  - [ ] `approver_id`
- [ ] Add migration
- [ ] Update create/update workflow step backend validation
- [ ] Normalize old and new payload formats into one internal model
- [ ] Ensure old workflows continue to run

### Phase 2: Resolution Engine

- [ ] Create a single shared assignee resolution function for approvals and signers
- [ ] Implement `specific_user`
- [ ] Implement `department_manager`
- [ ] Implement `position_in_department`
- [ ] Implement `direct_manager`
- [ ] Filter resolved users to active users only
- [ ] Deduplicate resolved users
- [ ] Return precise errors for invalid routing:
  - [ ] department has no manager
  - [ ] position in department has no active users
  - [ ] owner has no direct manager

### Phase 3: Approval Completion Logic

- [ ] Refactor approval step completion logic to use `completion_mode`
- [ ] Implement `any_one`
  - [ ] first approver completes step
  - [ ] remaining pending approvals in same step are marked skipped / obsolete
- [ ] Implement `all`
  - [ ] preserve current behavior
- [ ] Implement `min_n`
  - [ ] count approved records in current step
  - [ ] complete step when threshold is reached
  - [ ] mark remaining pending approvals skipped / obsolete
- [ ] Verify transition to next step remains sequential

### Phase 4: Signing Resolution and Completion

- [ ] Reuse the same assignee resolution model for signer steps
- [ ] Resolve signer candidates from:
  - [ ] specific user
  - [ ] department manager
  - [ ] position in department
  - [ ] direct manager
- [ ] Decide signer step completion using the same `completion_mode`
- [ ] Ensure signer status transitions remain valid
- [ ] Ensure signed PDF generation still works with multiple signer candidates

### Phase 5: Workflow UI Refactor

- [ ] Remove `Vai trò` from workflow step UI
- [ ] Replace legacy selector with `Loại người xử lý`
- [ ] Add UI options:
  - [ ] `Người dùng cụ thể`
  - [ ] `Trưởng phòng ban`
  - [ ] `Chức danh trong phòng ban`
  - [ ] `Quản lý trực tiếp`
- [ ] Conditional fields:
  - [ ] user picker
  - [ ] department picker
  - [ ] department picker + position picker
- [ ] Add `Cách hoàn thành`
  - [ ] `Một người bất kỳ`
  - [ ] `Tất cả`
  - [ ] `Tối thiểu N người`
- [ ] Add numeric input for `N` when `min_n`
- [ ] Update workflow step preview text
- [ ] Update edit flow to load both legacy and new steps safely

### Phase 6: Legacy Migration UX

- [ ] Detect workflow steps still using legacy `role`
- [ ] Show clear admin warning on affected workflows
- [ ] Prevent creating new workflows with legacy `role`
- [ ] Offer admin checklist to re-save legacy workflows in new format
- [ ] Decide whether automatic mapping is allowed:
  - [ ] `user` -> `specific_user`
  - [ ] `department` -> `department_manager`
  - [ ] `manager` -> `direct_manager`
  - [ ] `role` -> manual review required

### Phase 7: Testing

- [ ] Unit / integration tests for assignee resolution
- [ ] Approval tests:
  - [ ] specific user + all
  - [ ] department manager + all
  - [ ] position in department + any_one
  - [ ] position in department + all
  - [ ] position in department + min_n
  - [ ] direct manager + all
- [ ] Signing tests:
  - [ ] same 4 assignee types
  - [ ] any_one
  - [ ] all
  - [ ] min_n
- [ ] Negative tests:
  - [ ] no manager
  - [ ] no matching users for position
  - [ ] min_n larger than matched user count
- [ ] UI tests for create/edit workflow step modal
- [ ] End-to-end smoke test in Docker

### Phase 8: Documentation

- [ ] Update internal business flow docs
- [ ] Update workflow configuration help text
- [ ] Document exact meaning of each assignee type
- [ ] Document completion modes with examples

## Technical Notes

### Recommended Defaults

- `specific_user` -> `all`
- `department_manager` -> `all`
- `position_in_department` -> `any_one`
- `direct_manager` -> `all`

### Validation Rules

- `specific_user`
  - requires `assignee_user_id`
- `department_manager`
  - requires `assignee_department_id`
- `position_in_department`
  - requires `assignee_department_id`
  - requires `assignee_position_id`
- `direct_manager`
  - requires no extra identifier
- `min_n`
  - requires `min_required >= 1`
  - requires `min_required <= resolved user count`

### Open Decisions

- [ ] What status should remaining approvals/signers receive after `any_one` or satisfied `min_n`?
  - candidate: `skipped`
- [ ] Should signer steps allow `all` and `min_n`, or should signing remain stricter than approval?
- [ ] Do we need a migration screen for admins, or is warning-only enough in v1?

## Immediate Next Task

Start with Phase 1:

- inspect Prisma schema
- identify current workflow step table fields
- add new assignee/completion fields with compatibility
- wire backend create/update payload parsing
