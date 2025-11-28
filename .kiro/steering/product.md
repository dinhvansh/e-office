# Product Overview

## E-Office - Enterprise Document Management & Approval System

E-Office is an enterprise-grade document management and approval workflow system with multi-tenant support, designed for Vietnamese organizations.

### Core Capabilities

**Document Management**
- Multi-tenant document storage with granular RBAC (27 permissions)
- 8 document types with auto-numbering (pattern-based: `{type}-{seq}-{year}`)
- Document versioning, tags, and permissions
- Department-based visibility control

**Approval Workflows**
- Multi-step approval flows with configurable steps
- 4 approver types: User, Role, Department, Manager
- Sequential and parallel approval modes
- Approve/Reject/Request Info actions

**Digital Signing**
- Internal signers (authenticated users) and external signers (email + OTP)
- Sequential and parallel signing modes
- PDF field placement with drag-and-drop
- Email notifications via multiple providers (Gmail, Outlook, SendGrid, AWS SES, Mailgun)

**Security & Compliance**
- JWT-based authentication with bcrypt password hashing
- Role-based access control (RBAC) with granular permissions
- Tenant data isolation
- Audit logging for all actions
- Offline license validation

### Current Status

**Phase 1 (Complete)**: Document types, auto-numbering, external organizations, tags, permissions, versions  
**Phase 2 (90%)**: Workflow engine, approval flows, step management, workflow selection  
**Phase 3-7 (Planned)**: Incoming/outgoing documents, contract management, advanced search, dashboards, real-time notifications

### Key Users

- **Administrators**: System configuration, user management, workflow templates
- **Department Managers**: Document approval, team oversight
- **Regular Users**: Document creation, submission for approval, signing
- **External Partners**: Document signing via email invitation
