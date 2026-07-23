# Start Here

Tài liệu này dành cho người mới vào repo.

## 1. Repo này là gì

Đây là monorepo cho hệ thống:

- quản lý tài liệu
- phê duyệt nội bộ
- ký điện tử

Stack chính:

- frontend: Next.js
- backend: Express + Prisma
- DB: PostgreSQL
- cache/queue nhẹ: Redis
- license server: Express riêng

## 2. Muốn chạy nhanh nhất

### Docker

```bash
DEMO_ADMIN_PASSWORD='replace-with-a-unique-password' ./install.sh demo
```

Xem `INSTALL-DEMO.md` cho môi trường thử nghiệm và
`INSTALL-PRODUCTION.md` cho dữ liệu cần lưu giữ. Không chạy `prisma db push`
trên database staging hoặc production.

### URL

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`
- license server: optional profile; xem `docs/docker/README.md`

### Login mẫu

- `admin@acme.local` with the unique value supplied through `DEMO_ADMIN_PASSWORD`

## 3. Flow cần hiểu trước khi sửa code

### Tạo tài liệu ký

`/sign-requests/create` chỉ tạo nháp.

Nó không nên tự động chạy approval ngay.

### Editor

`/sign-requests/:id/editor` dùng để:

- thêm signer
- đặt field ký
- lưu nháp

### Gửi quy trình

Khi bấm gửi:

- có approval: chạy duyệt trước
- không có approval: vào pha ký ngay

### Phân biệt bước duyệt và bước ký

- workflow chỉ có `approver` thì không tạo signer
- muốn workflow sinh signer, step phải có `participant_role = signer`

## 4. File nên đọc đầu tiên

- `README.md`
- `FUNCTIONAL_SPEC.md`
- `backend/src/modules/documents/documents.service.ts`
- `backend/src/modules/signRequests/signRequests.service.ts`
- `backend/src/modules/approvals/approvals.service.ts`
- `frontend/app/(dashboard)/sign-requests/create/page.tsx`
- `frontend/app/(dashboard)/sign-requests/[id]/editor/page.tsx`
- `frontend/app/(dashboard)/my-tasks/page.tsx`

## 5. Những thứ đã được dọn

- file workflow backup/broken trong frontend
- PDF test output và backup JSON bị track trong repo
- docs chính được viết lại để bám theo code hiện tại

## 6. Tài liệu tham khảo

- `docs/dev`
- `docs/specs`

Các tài liệu này hỗ trợ phát triển và thiết kế; source code và tài liệu chính vẫn là nguồn sự thật.
