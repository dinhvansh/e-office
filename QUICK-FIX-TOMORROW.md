# 🚀 Quick Fix Tomorrow - Approval History

## TL;DR
Backend cần restart để generate Prisma client mới, sau đó uncomment code approvals.

## 3 Steps to Fix

### 1️⃣ Stop & Generate (5 min)
```bash
# Stop backend (Ctrl+C)
cd backend
npx prisma generate
npm run dev
```

### 2️⃣ Uncomment Backend (1 min)
File: `backend/src/modules/signRequests/signRequests.repository.ts`

Tìm dòng:
```typescript
document: true
```

Đổi thành:
```typescript
document: {
  include: {
    document_approvals: {
      include: {
        approver: {
          select: { id: true, full_name: true, email: true, avatar_url: true }
        }
      },
      orderBy: { created_at: 'asc' }
    }
  }
}
```

### 3️⃣ Uncomment Frontend (2 min)
File: `frontend/app/(dashboard)/sign-requests/[id]/internal-sign/page.tsx`

Tìm dòng:
```typescript
approvals={[]}
```

Đổi thành:
```typescript
approvals={(data.sign_request.document.document_approvals || []).map(a => ({
  id: a.id,
  status: a.action || 'pending',
  comments: a.comment || null,
  approved_at: a.action === 'approved' ? a.acted_at : null,
  rejected_at: a.action === 'rejected' ? a.acted_at : null,
  approver: a.approver
}))}
```

## ✅ Done!
Test at: `http://localhost:3000/sign-requests/41/internal-sign`

---
See `TODO-APPROVAL-HISTORY-FEATURE.md` for details.
