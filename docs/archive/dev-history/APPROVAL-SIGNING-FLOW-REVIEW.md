# 📋 REVIEW: LUỒNG PHÊ DUYỆT VÀ KÝ

## 🎯 Tổng Quan

Hệ thống có 2 luồng chính:
1. **Luồng Phê Duyệt (Approval Flow)** - Người phê duyệt nội bộ
2. **Luồng Ký (Signing Flow)** - Người ký (nội bộ + bên ngoài)

---

## 📊 So Sánh: Phê Duyệt vs Ký

| Tiêu chí | Phê Duyệt (Approval) | Ký (Signing) |
|----------|---------------------|--------------|
| **Mục đích** | Xét duyệt, chấp thuận tài liệu | Ký tên, xác nhận cam kết |
| **Người tham gia** | Chỉ nội bộ (internal users) | Nội bộ + Bên ngoài (external) |
| **Cần đăng nhập?** | ✅ Có (internal users) | ✅ Nội bộ: Có<br>❌ Bên ngoài: Không (ký qua email/OTP) |
| **Database table** | `document_approvals` | `signers` |
| **Workflow** | Theo workflow steps | Theo signing_order |
| **Thứ tự** | Sequential (tuần tự) | Sequential hoặc Parallel |
| **Hành động** | Approve / Reject / Request Info | Sign (ký tên) |
| **Khi nào?** | Trước khi gửi ký | Sau khi phê duyệt xong |

---

## 🔄 Luồng Hoạt Động

### 1️⃣ **Tạo Document**

```
User tạo document → Chọn Document Type
                  ↓
    Document Type có require_approval?
                  ↓
            ┌─────┴─────┐
           YES          NO
            ↓            ↓
    Tạo Workflow    Không cần
    Instance        phê duyệt
            ↓
    Tạo Approvals
    (document_approvals)
```

### 2️⃣ **Luồng Phê Duyệt (Nếu có)**

```
Document Status: pending_approval
         ↓
Step 1: Approver 1 phê duyệt
         ↓
    Approved?
    ┌────┴────┐
   YES       NO
    ↓         ↓
Step 2    Rejected
Approver 2  → End
    ↓
All Approved
    ↓
Status: approved
```

**Chi tiết Approval:**
- **Table**: `document_approvals`
- **Fields quan trọng**:
  - `workflow_step_id`: Step nào trong workflow
  - `approver_user_id`: User ID của người phê duyệt
  - `action`: 'pending' | 'approved' | 'rejected' | 'request_info'
  - `acted_at`: Thời gian phê duyệt
  - `signature_data`: Chữ ký số (nếu có)

### 3️⃣ **Luồng Ký (Sau khi phê duyệt xong)**

```
Document Status: approved
         ↓
Tạo Sign Request
         ↓
Tạo Signers (internal + external)
         ↓
Gửi email/notification
         ↓
┌────────────────────────┐
│  Internal Signers      │  External Signers
│  (Đăng nhập hệ thống)  │  (Ký qua email/OTP)
└────────────────────────┘
         ↓
Signing Order #1 ký
         ↓
Signing Order #2 ký
         ↓
...
         ↓
All Signed
         ↓
Status: completed
```

**Chi tiết Signing:**
- **Table**: `signers`
- **Fields quan trọng**:
  - `sign_request_id`: Thuộc sign request nào
  - `user_id`: User ID (nếu là internal signer)
  - `email`, `name`: Thông tin người ký
  - `signing_order`: Thứ tự ký (1, 2, 3...)
  - `is_internal`: true = nội bộ, false = bên ngoài
  - `status`: 'pending' | 'otp_sent' | 'signed'
  - `signed_at`: Thời gian ký
  - `signature_data`: Dữ liệu chữ ký

---

## 🎨 Phân Biệt Trong UI

### **Người Phê Duyệt (Approvers)**
- 🔵 **Màu xanh dương** (blue)
- ✅ Icon: Check mark
- Hiển thị trong: Workflow steps
- Chỉ có trong workflow
- Không thể thêm manual (phải theo workflow)

### **Người Ký Nội Bộ (Internal Signers)**
- 🟣 **Màu tím** (purple)
- 👤 Icon: User
- Hiển thị trong: InternalSignersSelector
- Có thể load từ workflow hoặc thêm manual (flexible mode)
- Cần đăng nhập để ký

### **Người Ký Bên Ngoài (External Signers)**
- 🟠 **Màu cam/vàng** (orange/amber)
- 🌐 Icon: Globe hoặc Building
- Hiển thị trong: SignersSection
- Luôn thêm manual
- Ký qua email/OTP, không cần đăng nhập

---

## 📝 Workflow Modes

### **1. No Approval Mode**
```
Document Type: require_approval = false
                     ↓
            Không có approvals
                     ↓
            Chỉ có signers
```

### **2. Strict Mode**
```
Document Type: 
  - require_approval = true
  - allow_workflow_override = false
                     ↓
        Workflow cố định (không sửa được)
                     ↓
        Approvals theo workflow steps
                     ↓
        Internal signers từ workflow (nếu có)
```

### **3. Flexible Mode**
```
Document Type:
  - require_approval = true
  - allow_workflow_override = true
                     ↓
        Có thể chọn workflow khác
                     ↓
        Có thể customize approvers
                     ↓
        Có thể thêm/sửa internal signers
```

### **4. Adhoc Mode**
```
Document Type:
  - require_approval = true
  - default_workflow_id = null
                     ↓
        Tạo workflow tùy chỉnh cho document này
                     ↓
        Thêm approvers manual
                     ↓
        Thêm signers manual
```

---

## 🔧 Code Implementation

### **Backend: Tạo Approvals**

File: `backend/src/modules/documents/documents.service.ts`

```typescript
// ✅ Tạo approvals cho TẤT CẢ workflow steps
for (const step of workflow.steps) {
  let approverUserId = null;
  
  // Xác định approver dựa trên step type
  if (step.approver_type === 'user') {
    approverUserId = step.approver_id;
  } else if (step.approver_type === 'role') {
    // Tìm user có role này
    const userRole = await prisma.user_roles.findFirst({
      where: { role_id: step.approver_id }
    });
    approverUserId = userRole?.user_id;
  } else if (step.approver_type === 'department') {
    // Nếu không có approver_id, lấy department của owner
    let deptId = step.approver_id || owner.department_id;
    const dept = await prisma.departments.findUnique({
      where: { id: deptId }
    });
    approverUserId = dept?.manager_id;
  } else if (step.approver_type === 'manager') {
    approverUserId = owner.manager_id;
  }
  
  // Tạo approval record
  if (approverUserId) {
    await prisma.document_approvals.create({
      data: {
        document_id: document.id,
        workflow_id: workflow.id,
        workflow_step_id: step.id,
        approver_user_id: approverUserId,
        action: 'pending',
        due_date: calculateDueDate(step.due_in_days)
      }
    });
  }
}
```

### **Backend: Tạo Signers**

File: `backend/src/modules/documents/documents.service.ts`

```typescript
// Tạo signers từ input
if (input.signers && input.signers.length > 0) {
  for (const signerInput of input.signers) {
    await prisma.signers.create({
      data: {
        sign_request_id: signRequest.id,
        user_id: signerInput.user_id || null, // Nếu là internal
        email: signerInput.email,
        name: signerInput.name,
        signing_order: signerInput.order,
        is_internal: !!signerInput.user_id, // true nếu có user_id
        status: 'pending'
      }
    });
  }
}
```

### **Frontend: InternalSignersSelector**

File: `frontend/components/documents/InternalSignersSelector.tsx`

```typescript
interface InternalSigner {
  user_id: number;      // ✅ Link to users table
  name: string;
  email: string;
  signing_order: number; // ✅ Thứ tự ký
  role: 'signer' | 'approver'; // ❌ Không dùng nữa (chỉ UI)
}

// Props
interface Props {
  signers: InternalSigner[];
  onChange: (signers: InternalSigner[]) => void;
  allowEdit?: boolean; // true = Flexible/Adhoc mode
}
```

### **Frontend: SignersSection (External)**

File: `frontend/components/documents/SignersSection.tsx`

```typescript
interface Signer {
  id: string;
  type: 'manual' | 'external';
  email: string;
  name: string;
  order: number;        // ✅ Thứ tự ký
  externalOrgId?: number;
}
```

---

## 🎯 Thứ Tự Thực Hiện

### **Khi Tạo Document:**

1. ✅ **Tạo Document** → `documents` table
2. ✅ **Tạo Workflow Instance** (nếu có) → `workflow_instances` table
3. ✅ **Tạo Approvals** (cho TẤT CẢ steps) → `document_approvals` table
4. ✅ **Tạo Sign Request** → `sign_requests` table
5. ✅ **Tạo Signers** (internal + external) → `signers` table

### **Khi Phê Duyệt:**

1. User vào `/approvals` page
2. Click "Approve" trên document
3. Backend update `document_approvals.action = 'approved'`
4. Nếu là step cuối → Update `document.status = 'approved'`
5. Nếu chưa phải step cuối → Chuyển sang step tiếp theo

### **Khi Ký:**

1. **Internal Signer**: 
   - Đăng nhập → Vào `/sign-requests`
   - Click document → Vào editor
   - Đặt chữ ký → Submit
   
2. **External Signer**:
   - Nhận email với link
   - Click link → Nhập OTP
   - Vào editor → Đặt chữ ký → Submit

---

## ✅ Checklist Đã Hoàn Thành

- [x] Tạo approvals cho TẤT CẢ workflow steps (không chỉ step đầu)
- [x] Xử lý `approver_type = 'department'` với `approver_id = null`
- [x] Thêm input số thứ tự ký cho internal signers
- [x] Thêm input số thứ tự ký cho external signers
- [x] Fix API field mismatch (`order` vs `signing_order`)
- [x] Phân biệt rõ approvers vs signers trong UI

---

## 🚀 Cần Làm Tiếp

### **1. Logic Chuyển Từ Approval → Signing**

Hiện tại: Approvals và Signers được tạo cùng lúc khi tạo document.

**Cần sửa**: Signers chỉ được "activate" sau khi approvals xong.

```typescript
// Khi approval cuối cùng được approved
if (allApprovalsApproved) {
  // Update sign_request status
  await prisma.sign_requests.update({
    where: { id: signRequestId },
    data: { status: 'ready_to_sign' } // Hoặc 'pending'
  });
  
  // Gửi email cho signer đầu tiên
  const firstSigner = await prisma.signers.findFirst({
    where: { 
      sign_request_id: signRequestId,
      signing_order: 1
    }
  });
  
  await sendSigningEmail(firstSigner);
}
```

### **2. Validation Thứ Tự Ký**

Đảm bảo người ký phải ký theo đúng thứ tự:

```typescript
// Khi user cố gắng ký
const currentSigner = await prisma.signers.findUnique({
  where: { id: signerId }
});

// Check xem có người trước chưa ký không
const previousSigners = await prisma.signers.findMany({
  where: {
    sign_request_id: currentSigner.sign_request_id,
    signing_order: { lt: currentSigner.signing_order },
    status: { not: 'signed' }
  }
});

if (previousSigners.length > 0) {
  throw new Error('Vui lòng đợi người ký trước hoàn thành');
}
```

### **3. UI Hiển Thị Trạng Thái**

Cần hiển thị rõ:
- ✅ Approvals đã xong chưa?
- ✅ Đang ở step approval nào?
- ✅ Đang đến lượt ai ký?
- ✅ Ai đã ký, ai chưa ký?

---

## 📌 Tóm Tắt

**Phê Duyệt (Approval)**:
- Chỉ nội bộ
- Theo workflow steps
- Table: `document_approvals`
- Xảy ra TRƯỚC khi ký

**Ký (Signing)**:
- Nội bộ + Bên ngoài
- Theo signing_order
- Table: `signers`
- Xảy ra SAU khi phê duyệt xong

**Luồng đầy đủ**:
```
Tạo Document → Approvals (nội bộ) → Signers (nội bộ + bên ngoài) → Hoàn thành
```
