# Workflow Refactor Plan Checklist (Create -> Approval -> Signing)

## 1) Product/Business Flow
- [x] Xac dinh flow muc tieu: Draft -> Editor -> Config signer/workflow/fields -> Submit -> Approval (neu can) -> Signing -> Completed.
- [x] Chuan hoa trang thai luong backend bang `flow_state` + `next_action`.
- [x] Dong bo hien thi FE theo `flow_state` de tranh sai lech logic.
- [x] Chot UX wizard tao tai lieu + prompt huong dan theo tung buoc.

## 2) Architecture/Code Quality
- [x] Tach logic send request theo helper state machine trong service.
- [x] Bo unreachable branch va bo auto-transition sai thoi diem.
- [x] Bo sung guard: khong cho send khi khong co signer.
- [x] Bo sung validation input cho departments/positions/external-orgs/webhooks.
- [ ] Tiep tuc cleanup encoding text tieng Viet bi loi trong mot so UI strings.

## 3) Data/API Contract
- [x] Them contract flow hint:
  - `flow_state`
  - `next_action`
  - `flow_counters`
- [x] Ap dung cho API send + read (`getSignRequest`, `getMySignRequests`).
- [x] Ban hanh API response guideline chung (success/error envelope) trong docs.

## 4) Security/Permission
- [x] Fix map role FE de admin thuc su co quyen (`permissions.ts`).
- [x] Tu dong init DB + RBAC seed khi docker up de moi may co du role/quyen.
- [x] Bo sung regression test cho authorization matrix (admin/manager/user/viewer).

## 5) Ops/DevEx
- [x] Fix backend build qua `prebuild: prisma generate`.
- [x] Docker auto-init DB/seed + tai lieu huong dan.
- [x] Them CI target: build + smoke e2e.

## 6) E2E Test Plan
### Smoke (bat buoc)
- [x] Build backend/frontend thanh cong.
- [x] Docker compose up --build thanh cong.
- [x] Playwright UI login + documents page load.
- [x] API smoke: create document + create sign request.

### Business Flow E2E (uu tien cao)
- [x] Tao document draft.
- [x] Cau hinh signer + field trong editor.
- [x] Submit request.
- [x] Nhanh A: can approval -> pending approval.
- [x] Approve xong -> pending signatures.
- [x] Sign hoan tat -> completed.
- [x] Verify signed artifact/download + audit events.

## 7) Rollout Priority
- High now:
  - Dong bo flow_state FE/BE
  - Guard/validation critical
  - Docker reproducibility
- Medium next:
  - UI text cleanup + wizard UX
  - Authorization regression suite
- Low later:
  - CI quality gates day du (lint/typecheck/e2e matrix)
