
# RBAC_FULL_SPEC.md
## Enterprise-Grade Role-Based Access Control Specification  
### For Multi-Tenant DMS + eSign Workflow System

---

# 1. Purpose
Tài liệu này mô tả đầy đủ hệ thống RBAC dùng cho:

- Document Management System (DMS)
- Multi-step eSignature Workflow (Approve/Sign)
- Multi-Tenant SaaS Platform
- High-security Enterprise Environment

RBAC bao gồm **6 tầng phân quyền**:

1. Tenant-level Isolation  
2. Role-based Access Control  
3. Permission-based Access Control  
4. Department-level Access  
5. Document Instance-level Permission  
6. Workflow-step-level Permission  

Và thêm **UI Permission Control** để điều khiển menu & nút.

---

# 2. RBAC Architecture Overview

RBAC trong hệ thống DMS/eSign này hoạt động theo chuỗi:

```
User → Roles → Permissions → Department Access → Document Permissions → Workflow Steps
```

---

# 3. Entity Diagram

```
users -- user_roles -- roles -- role_permissions -- permissions  
users -- user_departments -- departments  
documents -- document_permissions  
documents -- workflow -- workflow_steps -- document_approvals  
tenants -- all entities  
```

---

# 4. Layer 1 — Tenant Isolation

User chỉ truy cập dữ liệu có `tenant_id == user.tenant_id`.

---

# 5. Layer 2 — Role-Based Access Control (RBAC)

Quan hệ:

```
users ←→ user_roles ←→ roles
roles ←→ role_permissions ←→ permissions
```

Một user có thể có **nhiều role**.

---

# 6. Layer 3 — Permission-Based Access

Permission mô tả ACTION + RESOURCE:

| resource   | action   | permission code            |
|------------|----------|----------------------------|
| document   | view     | document_view              |
| document   | create   | document_create            |
| document   | edit     | document_edit              |
| document   | delete   | document_delete            |
| document   | sign     | document_sign              |
| workflow   | manage   | workflow_manage            |
| user       | manage   | user_manage                |
| department | manage   | department_manage          |

---

# 7. Layer 4 — Department-Based Access

User có thể thuộc nhiều phòng ban.  
Quyền truy cập theo document.department_id.

---

# 8. Layer 5 — Document Instance Permissions

Quyền chi tiết cho từng document:

```
document_permissions
  document_id
  subject_type (USER | ROLE | DEPARTMENT)
  subject_id
  can_read
  can_edit
  can_approve
  can_sign
  can_delete
```

---

# 9. Layer 6 — Workflow Step Permission

Workflow step quy định approver (USER / ROLE / DEPARTMENT).  
User chỉ có quyền ký/duyệt tại bước tương ứng.

---

# 10. RBAC Decision Flow

1. Tenant Check  
2. System Admin Bypass  
3. Role Permission Check  
4. Department Permission Check  
5. Document Instance Permission  
6. Workflow Step Check  
7. → If all fail → DENY  

---

# 11. UI Permission Control (Frontend RBAC)

UI phải **ẩn/hiện menu, nút, trang** theo permission.  
Menu example:

```
{ label: "Documents", href: "/documents", permission: "document_view" }
```

Hook:

```
const hasPermission = (p) => permissions.includes(p)
```

Component:

```
<Can permission="document_edit">
  <Button>Edit</Button>
</Can>
```

---

# 12. API Authorization Middleware (Backend)

```
authorize(action):
  checkTenant()
  if admin → allow
  checkRolePermission()
  checkDepartmentAccess()
  checkDocumentPermission()
  checkWorkflowStep()
  deny()
```

---

# 13. Audit Logging

Audit all actions: view, edit, sign, approve, reject, permission changes.

---

# 14. Conclusion

RBAC của hệ thống này:

- Bao 6 tầng bảo mật  
- Multi-tenant real  
- Workflow-aware  
- Instance-level control  
- UI-level permission  

Đạt chuẩn enterprise cho eSign + DMS.

