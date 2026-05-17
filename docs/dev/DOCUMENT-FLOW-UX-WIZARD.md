# Document Flow UX Wizard (Draft -> Approval -> Signing)

## Wizard Steps
1. Create Draft
- Input: file, title, document type.
- Output: document in `draft`, optional sign request draft.

2. Configure Workflow
- If document type requires approval:
  - show default workflow
  - allow override only when policy allows.
- Validate approver availability before submit.

3. Configure Signers
- Add internal/external signers.
- Enforce at least one signer if digital signing is required.
- Show clear signer order and turn-taking mode.

4. Configure Fields
- Require at least one required signature field mapped to signer.
- Block submit when required fields are unassigned.

5. Review & Submit
- Show summary:
  - approval required?
  - signer count/order
  - field count
  - final destination (`AWAITING_APPROVAL` or `AWAITING_SIGNATURES`)

## Mandatory UI States
- `loading`: skeletons for list/editor data.
- `empty`: no signer/no fields/no approval records.
- `error`: actionable messages with retry CTA.
- `success`: explicit flow transition message after submit/approve/sign.
- `disabled`: lock editor actions when flow leaves `DRAFT`.

## Copy Guidelines
- Use one primary action per step.
- Use action verbs matching `next_action`.
- Prefer short, state-specific messages:
  - `Đã gửi duyệt. Tài liệu đang chờ phê duyệt.`
  - `Đã gửi ký thành công.`
  - `Luồng đã hoàn tất.`
