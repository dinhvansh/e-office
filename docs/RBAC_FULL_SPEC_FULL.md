# 1. Giới thiệu (Introduction)
1.1 Mục đích của tài liệu

Tài liệu này định nghĩa Role-Based Access Control (RBAC) cho nền tảng:

Digital Document Management System (DMS)

Multi-Step eSignature & Approval Workflow

Multi-Tenant SaaS/On-Premise Hybrid Architecture

Mục tiêu là:

Đảm bảo bảo mật và tách biệt dữ liệu

Phân quyền mạnh – đa chiều – linh hoạt – mở rộng

Phù hợp với yêu cầu Enterprise, Chính phủ, Tập đoàn

Hỗ trợ multi-department và multi-step workflow

Cung cấp chuẩn để backend, frontend, QA cùng follow thống nhất

1.2 Phạm vi

Tài liệu mô tả:

Các lớp phân quyền

Kiến trúc dữ liệu RBAC

Permission model

Document-level security

Workflow-step-level authorization

Quy trình kiểm tra quyền

UI Permission & Menu Visibility

Audit & Logging

Caching & Performance

API Authorization Rules

Best Practices & Anti-patterns

1.3 Các đối tượng sử dụng tài liệu

Tài liệu hướng đến:

Backend developers

Frontend developers

QA/Testers

Security team

DevOps team

Solution Architects

Product Owners

# 2. Tổng quan RBAC trong hệ thống DMS + eSign

Không giống RBAC cơ bản (user – role – permission), RBAC của hệ thống này gồm 6 lớp phân quyền theo chiều dọc, 3 lớp theo chiều ngang, và 1 lớp dynamic theo workflow.

6 lớp phân quyền (vertical layers)

Tenant Isolation

Role → Permissions

Permission Enforcement

Department Hierarchy

Document Instance Permissions

Workflow Step Authorization

3 lớp phân quyền theo chiều ngang (horizontal scopes)

Global Scope – permission theo module

Department Scope – theo phòng ban

Instance Scope – theo từng document

Dynamic Scope

Quyền phụ thuộc trạng thái hiện tại của workflow step.

# 3. Entity Model (RBAC Data Structure)

Dưới đây là mô hình dữ liệu chuẩn:

TENANT
 ├── USERS
 │     ├── USER_ROLES
 │     │      └── ROLES
 │     │            └── ROLE_PERMISSIONS
 │     │                     └── PERMISSIONS
 │     └── USER_DEPARTMENTS
 │                 └── DEPARTMENTS
 │
 ├── DOCUMENTS
 │     ├── DOCUMENT_PERMISSIONS
 │     ├── DOCUMENT_VERSIONS
 │     └── DOCUMENT_APPROVALS
 │
 ├── WORKFLOWS
 │     └── WORKFLOW_STEPS
 │
 └── AUDIT_LOGS


Tất cả bảng đều có tenant_id để đảm bảo tách biệt dữ liệu.

# 4. Tenant-Level Security (Layer 1)
4.1 Khái niệm

Multi-tenant nghĩa là:

mỗi công ty/khách hàng = một tenant

dữ liệu giữa tenants hoàn toàn tách biệt

4.2 Quy tắc bảo mật

User chỉ thấy dữ liệu tenant của mình

Mọi API phải có tenant_id từ JWT, không bao giờ lấy từ query

Không được join cross-tenant

Không được log dữ liệu tenant khác

4.3 Kiểm tra tenant trong mọi API
if (user.tenant_id !== resource.tenant_id) deny();

# 5. Role-Based Access Control (Layer 2)
5.1 Cấu trúc Role

Role thuộc từng tenant:

tenant A có roles khác tenant B

mỗi role có nhiều permissions

Ví dụ role:

Role	Ý nghĩa
ADMIN	toàn quyền
MANAGER	quản lý phòng ban
APPROVER	duyệt tài liệu
SIGNER	ký tài liệu
VIEWER	xem tài liệu
5.2 Quan hệ dữ liệu
USER ←→ USER_ROLES ←→ ROLES

5.3 Luật gán role

User có nhiều role

Role có thể đánh dấu is_system

Chỉ có Admin được gán role cho người khác

# 6. Permission-Level Control (Layer 3)
6.1 Cấu trúc Permission

Permission = Resource + Action

Ví dụ:

Resource	Action	Permission
document	create	document_create
document	view	document_view
document	edit	document_edit
user	manage	user_manage
workflow	manage	workflow_manage
6.2 Ánh xạ Role – Permission
ROLES ←→ ROLE_PERMISSIONS ←→ PERMISSIONS

6.3 Quy tắc thực thi

User có quyền nếu:

Permission ∈ Union(permissions of all roles of user)

# 7. Department Hierarchy Control (Layer 4)

Phòng ban có cấu trúc:

DEPARTMENT
 ├── children
 └── parent

7.1 Quy tắc quyền theo phòng ban

User thuộc phòng ban A:

xem được tài liệu phòng ban A

xem được tài liệu phòng ban con

Manager có thêm quyền override

7.2 Quy tắc Manager

Roles:

DEPARTMENT_MANAGER

HEAD_OF_DEPARTMENT

Được phép:

duyệt/approve tài liệu trong phòng ban

xem tất cả tài liệu trong department tree

# 8. Document Instance-Level Permission (Layer 5)
8.1 Document Permission Types

Một document có thể grant quyền theo 3 loại subject:

subject_type	subject_id	Điều khiển
USER	user_id	quyền cá nhân
ROLE	role_id	quyền theo vai
DEPARTMENT	dept_id	quyền theo phòng ban
8.2 Permission Flags
Field	Ý nghĩa
can_read	đọc
can_edit	sửa
can_delete	xóa
can_share	chia sẻ
can_approve	duyệt
can_sign	ký
8.3 Rule dung hòa quyền

Quyền cuối cùng = Union của:

Role permissions

Department access

Document instance permissions

Workflow step permission

# 9. Workflow-Step Permission (Layer 6)
9.1 Cấu trúc Workflow
WORKFLOW
 └── WORKFLOW_STEPS (step_order)
       └── approver_type (USER/ROLE/DEPARTMENT)
       └── approver_id

9.2 Quy tắc kiểm tra step ký/duyệt

User chỉ ký được nếu:

if workflow.current_step.approver_type == USER &&
   workflow.current_step.approver_id == user.id:
       allow


Hoặc:

ROLE match

DEPARTMENT match

9.3 Các trạng thái step

PENDING

SKIPPED

APPROVED

REJECTED

SIGNED

ESCALATED

# 10. RBAC Evaluation Pipeline (Quan trọng nhất)

Đây là pipeline 6 lớp chạy theo thứ tự:

10.1 Full Flow
CHECK 1 — Tenant Isolation
CHECK 2 — System Admin Bypass
CHECK 3 — Role Permission
CHECK 4 — Department Access
CHECK 5 — Document Instance Permission
CHECK 6 — Workflow Step Authorization
CHECK 7 — Final Decision → ALLOW or DENY

10.2 Diễn giải chi tiết
1️⃣ Tenant Check

Nếu khác tenant → DENY ngay lập tức

2️⃣ System Admin Bypass

ROLE.ADMIN = toàn quyền

3️⃣ Global Role Permission

Dựa trên role_permissions

4️⃣ Department Access

Nếu document.department_id nằm trong user.departments

5️⃣ Instance Permissions

Được phép nếu instance share

6️⃣ Workflow Step

Nếu document ở step user được ký/dduyệt

# 11. Frontend RBAC – UI Permission Control
11.1 Quy tắc quan trọng nhất
UI != Backend Permission

UI phải ẩn/hiện dựa trên permission
Backend vẫn phải kiểm tra lại (zero-trust)

11.2 Menu configuration
const MENU = [
  { text: "Dashboard", permission: "dashboard_view", href: "/dashboard" },
  { text: "Documents", permission: "document_view", href: "/documents" },
  { text: "Workflows", permission: "workflow_manage", href: "/admin/workflows" },
  { text: "Users", permission: "user_manage", href: "/admin/users" }
];


Rendering:

{MENU.filter(m => hasPermission(m.permission)).map(renderMenu)}

11.3 Button visibility
<Can permission="document_edit">
  <Button>Edit</Button>
</Can>

11.4 Route protection
if (!hasPermissionForRoute) return <Error403 />

# 12. Backend Authorization Middleware
function authorize(action) {
  return async (req, res, next) => {
    const user = req.user;
    const doc = await prisma.document.findUnique();

    if (!sameTenant(user, doc)) return deny();
    if (isAdmin(user)) return next();
    if (!rolePermission(user, action)) return deny();
    if (departmentAccess(user, doc)) return next();
    if (instancePermission(user, doc, action)) return next();
    if (workflowStepPermission(user, doc, action)) return next();

    return deny();
  }
}

# 13. Audit Requirements

Audit log phải:

bất biến (immutable)

có IP, User-Agent

có timestamp

có event_type

log mọi thay đổi permission

log mọi action trên document

log các step workflow

# 14. Performance & Caching
14.1 Cache các cấu trúc sau:

user roles

permissions

department tree

workflow steps

document permissions

Redis recommended.

# 15. Anti-patterns cần tránh

❌ Để UI show menu rồi API trả 403
❌ Hardcode role thay vì permission
❌ Chỉ phân quyền backend, không phân quyền giao diện
❌ Không chạy sign/approve trong transaction
❌ Cho phép admin sửa audit logs (KHÔNG ĐƯỢC)
❌ Cho phép overwrite file version (KHÔNG ĐƯỢC)

# 16. Kết luận

RBAC của hệ thống này được thiết kế ở mức:

Enterprise-grade

Multi-layer

Multi-tenant

Workflow-aware

Instance-level security

Frontend + Backend unified authorization

Phù hợp để triển khai cho:

Doanh nghiệp lớn

Cơ quan nhà nước

Tập đoàn đa chi nhánh

SaaS nhiều khách hàng

🎨 UI AUTHORIZATION LAYER – FULL SPEC (Dùng cho Next.js 14 + React 18 + TailwindCSS)
(Chương bổ sung – Enterprise Frontend Permission Control)
1. Mục tiêu

Quy định rõ UI hiển thị phụ thuộc 100% vào Permission.

Nếu user không có quyền → không thấy component, không thấy menu, không thấy button.

UI phải sync chặt với RBAC backend → tránh user đoán link hoặc inspect HTML.

Cho phép hiển thị linh hoạt theo:

Role

Permission

Department

Document Instance Permission

Workflow Step

2. Quy tắc Vàng (Golden Rules)
Rule #1 — UI không bao giờ tự suy đoán.

UI chỉ hiển thị dựa trên permission string từ backend.

Rule #2 — UI phải ẩn tuyệt đối (no-render)

Không dùng disabled, phải remove khỏi DOM:

❌ Sai:

<button disabled>Edit</button>


✔ Đúng:

{can("document_edit") && <button>Edit</button>}

Rule #3 — UI phải có central hook
const { can, canAny, canAll } = usePermission();

3. Core Hook: usePermission()
Mục đích

Lấy permission từ backend

Cache bằng Zustand/React Query

Cung cấp API kiểm tra quyền

Cho phép kiểm tra nhiều loại permission

Ví dụ Implementation
export function usePermission() {
  const permissions = useUserStore((s) => s.permissions);

  function can(p) {
    return permissions?.includes(p);
  }

  function canAny(list = []) {
    return list.some(p => permissions.includes(p));
  }

  function canAll(list = []) {
    return list.every(p => permissions.includes(p));
  }

  return { can, canAny, canAll };
}

4. Phân quyền MENU (Menu Visibility Control)
Cấu hình MENU
export const MENU = [
  {
    label: "Dashboard",
    href: "/dashboard",
    permission: "dashboard_view"
  },
  {
    label: "Documents",
    href: "/documents",
    permission: "document_view"
  },
  {
    label: "Workflows",
    href: "/workflows",
    permission: "workflow_manage"
  },
  {
    label: "Users",
    href: "/admin/users",
    permission: "user_manage"
  }
];

Render Menu
{MENU.filter(item => can(item.permission)).map(item =>
  <SidebarItem key={item.href} {...item} />
)}


User không có quyền → menu không xuất hiện, không click được.

5. Phân quyền BUTTON / ACTION

Ví dụ nút Edit Document:

<Can permission="document_edit">
  <Button>Edit Document</Button>
</Can>


Hoặc inline:

{can("document_edit") && <Button>Edit />}

6. Phân quyền ROUTE
Next.js Middleware
export function middleware(req) {
  const permission = extractPermission(req);

  if (!permission.includes("document_view"))
      return NextResponse.redirect("/403");
}

Route-level guard
if (!can("document_view")) return <Error403 />;

7. Phân quyền COMPONENT

Mini component Can để bọc UI:

export function Can({ permission, children }) {
  const { can } = usePermission();
  if (!can(permission)) return null;
  return <>{children}</>;
}

8. Phân quyền THEO DOCUMENT INSTANCE

Ví dụ Document có:

can_read

can_edit

can_sign

can_share

UI load instance permission từ API:

{docPermission.can_edit && <Button>Edit</Button>}
{docPermission.can_share && <Button>Share</Button>}

9. Phân quyền THEO WORKFLOW STEP

Nếu user là approver của step hiện tại:

{canSignStep && (
  <Button color="blue">Sign This Document</Button>
)}


Logic:

const canSignStep = 
   workflow.current.approver_type === "USER" && 
   workflow.current.approver_id === user.id


Hoặc ROLE:

if (workflow.current.approver_type === "ROLE")
  can("workflow_approve")

10. Anti-patterns (Cấm làm)

❌ Hiện UI rồi bị 403 khi gọi API
❌ Render nút nhưng để disabled
❌ Ẩn menu bằng CSS (display: none)
❌ Hardcode role thay vì permission
❌ Chỉ check permission ở client → Quá nguy hiểm
❌ Tách Permission UI và Backend → mismatch

⚠️ UI phải → Backend SAME LOGIC SAME VALUE SAME STRING

11. Checklist cho Frontend Developer trước khi merge
Checklist	Done
Menu được ẩn hoàn toàn	✔
Button/action được ẩn hoàn toàn	✔
Chặn route	✔
Chặn API backend	✔
Permission string đúng với backend	✔
Không hardcode role	✔
Không kiểm tra bằng user.role	✔

17.1. Mục tiêu

Hệ thống hỗ trợ:

SaaS Cloud

On-Premise Self-Hosted

Do đó, cần cơ chế bảo vệ code + bảo vệ license để tránh:

bị copy mã nguồn

bị chạy crack

bị clone máy chủ

bị bỏ qua hạn mức tài liệu

17.2. Yêu cầu bắt buộc đối với On-Premise
A. Không bao giờ cung cấp source code Raw

Tránh xuất các folder:

/backend/src

/frontend/src

file .ts, .js, .map

B. Backend phải đóng gói thành BINARY hoặc RUNTIME

Khuyến nghị:

Công nghệ	Mục đích	Ghi chú
pkg	Build Node → binary	Khó dịch ngược
nexe	Node binary	Hỗ trợ Linux tốt
Docker (runtime only)	Không chứa source	Không để file map
17.3. License Enforcement (Bắt buộc)
17.3.1 License Server (online hoặc offline)

Backend khi khởi chạy:

Lấy:

license_key

hardware_id

Gửi lên License Server

Nhận về:

validity

expiration

quota (docs, users, storage)

feature flags

17.3.2 Offline Activation (Enterprise)

Flow:

Tạo file request:
request.json (hardware_id, tenant, version)

Server tạo file:
license.sig (RSA-2048 ký)

Backend verify bằng public key tích hợp

17.3.3 Cấu trúc bảng license
model license {
  id             Int      @id @default(autoincrement())
  tenant_id      Int
  license_key    String?
  expire_date    DateTime?
  limit_user     Int?       // số user tối đa
  limit_docs     Int?       // tổng số doc
  limit_docs_month Int?     // số tài liệu / tháng
  limit_sign_month Int?     // số ký / tháng
  limit_storage_mb Int?     // giới hạn dung lượng
  signature      String?     // RSA signature
  license_type   String?     // SaaS | OnPrem | Offline
  hardware_id    String?
}

17.4. Hardware Lock

Hardware ID bao gồm:

CPU ID

MAC Address

Disk Serial

Hostname

Tạo hash:

hwid = SHA256(cpu + mac + disk)

17.5. Module quan trọng phải bảo vệ bằng Native Addon hoặc WASM

Các logic quan trọng:

Generate document number

Verify digital signature

OTP validation

Check license status

File hashing (SHA256)

Watermark / timestamp

Tất cả convert sang:

.wasm

hoặc .node (Native addon)

→ Không thể xem code.

17.6. License Enforcement Middleware

Áp dụng cho mọi API nhạy cảm:

authorizeLicense("document_create", tenant_id)

📦 CHƯƠNG 18 — SAAS QUOTA SYSTEM (QUẢN LÝ GIỚI HẠN SỬ DỤNG)
18.1. Mục tiêu

Trong SaaS, mỗi tenant cần giới hạn:

số user

số tài liệu tạo

số chữ ký thực hiện

dung lượng file lưu trữ

số workflow kích hoạt

Nếu không sẽ:

không tính tiền được

tenant free xài vô hạn

phá hỏng kiến trúc chi phí

18.2. Bảng Cấu Trúc: tenant_usage
Prisma Model
model tenant_usage {
  id             Int       @id @default(autoincrement())
  tenant_id      Int
  month          Int
  year           Int
  docs_created   Int       @default(0)
  docs_signed    Int       @default(0)
  storage_used   Int       @default(0) // MB
  updated_at     DateTime  @default(now())

  tenant tenants @relation(fields: [tenant_id], references: [id])
}

18.3. Trigger logic khi dùng tài nguyên
1️⃣ Khi tạo Document:
if usage.docs_created >= license.limit_docs_month:
    throw new Error("DOCUMENT_LIMIT_EXCEEDED")

2️⃣ Khi ký tài liệu:
if usage.docs_signed >= license.limit_sign_month:
    deny("SIGNATURE_LIMIT_EXCEEDED")

3️⃣ Khi upload file:
file_size_mb + storage_used > limit_storage_mb → BLOCK

4️⃣ Khi thêm user:
current_users >= license.limit_user → BLOCK

18.4. Quota Middleware
export async function enforceQuota(action, tenant_id) {
  const license = await getLicense(tenant_id);
  const usage   = await getUsageThisMonth(tenant_id);

  if (action === 'document_create') {
     if (usage.docs_created >= license.limit_docs_month)
         throw forbidden("DOC_LIMIT");
  }

  if (action === 'document_sign') {
     if (usage.docs_signed >= license.limit_sign_month)
         throw forbidden("SIGN_LIMIT");
  }
}

18.5. Quota Dashboard (Admin)
Hiển thị:
Resource	Used	Limit	Percent
Docs Created	X	Y	X/Y
Docs Signed	X	Y	X/Y
Storage	X MB	Y MB	X/Y
Active Users	X	Y	X/Y
18.6. Monthly Reset

Usage reset mỗi tháng:

docs_created → 0  
docs_signed → 0  


Nhưng tổng số tài liệu vẫn giữ lại (để audit).

18.7. Cache & Performance

Cache license + quota vào Redis:

key: QUOTA:{tenant}:{month}:{year}


Refresh mỗi 5 phút.

🎯 CHƯƠNG 19 — INTEGRATION RBAC + LICENSE + QUOTA

Khi kiểm tra quyền cho 1 hành động:

CHECK 1 — Tenant Isolation  
CHECK 2 — System Role  
CHECK 3 — Global Permission (RBAC)  
CHECK 4 — Department Access  
CHECK 5 — Document Instance Permission  
CHECK 6 — Workflow Step Permission  
CHECK 7 — License Permission  
CHECK 8 — Quota Limit  
→ ALLOW or DENY

🚨 CHƯƠNG 20 — ANTI-PATTERNS (KHÔNG ĐƯỢC PHẠM)

❌ Không check quota khi tạo document
❌ On-Premise giao source code đầy đủ
❌ License check ở frontend → quá nguy hiểm
❌ Không ràng buộc phần cứng
❌ Cho phép tắt license middleware bằng config
❌ Chỉ sử dụng obfuscation JS để bảo vệ code
❌ Không log lại việc vượt quota
