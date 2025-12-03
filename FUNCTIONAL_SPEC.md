
# 📄 **FUNCTIONAL_SPEC.md**  
**E-Office System – Functional Specification Document**  
Version: 1.0  
Last Updated: 2025-11-18  
Author: ChatGPT (Generated for Anh Dăn)

---

# 1. Overview

This document defines **the functional requirements**, **modules**, **flows**, and **system behavior** of the **E-Office (Electronic Office / Document Management & Approval System)** intended for enterprise use.

The purpose is to provide developers (backend + frontend + mobile + AI assistant tools such as Cursor/Codex, GPT, etc.) with a clear, structured blueprint to implement the entire system step-by-step.

---

# 2. System Goals

The system enables:

- Management of **documents, templates, versions, metadata**
- Full **approval workflow** (multi-step, conditional)
- Handling **incoming** and **outgoing** documents
- Tracking **task deadlines**, **assignments**, and **notifications**
- Secure **permissions**, **audit logs**, and **digital signatures**
- Search, dashboard, reporting, and integration with external systems

---

# 3. Major Modules

1. User Management  
2. Organization Structure  
3. Roles & Permissions  
4. Master Data / System Configuration  
5. Document Management (Core)  
6. Approval Workflow Engine  
7. Incoming Documents  
8. Outgoing Documents / Proposals / Contracts  
9. Notifications & Reminders  
10. Search & Reporting  
11. Audit Logs  
12. Integrations (Digital Signing, Email, SSO, API)

---

# 4. Module Details

---

## 4.1. User Management

### Function: User Authentication
- Login with email/password (later SSO).
- Features:
  - Account activation/deactivation
  - Password reset via email
  - JWT/Session-based auth

### Function: User Account Management
- Fields:
  - FullName
  - Email
  - Phone
  - Position
  - Department
  - Roles
- Admin abilities:
  - Create, update, disable user
  - Reset password

---

## 4.2. Organization Structure

### Function: Department Hierarchy
- Multi-level structure: Company → Division → Department → Team
- Each user can belong to multiple departments
- Configurable "Line Manager" and "Default Approver"

### Function: Department Management
- CRUD for department tree
- Assign users to departments

---

## 4.3. Roles & Permissions

### Function: Role Definition
- Examples:
  - User
  - Manager
  - Document Officer (Văn thư)
  - Legal
  - Finance
  - Admin

### Function: Permission Types
- Document_Read
- Document_Edit
- Document_Delete
- Document_Approve
- Workflow_Configure
- System_Settings

### Function: Permission Assignment
- Assign role → permission
- Assign user → role

---

## 4.4. Master Data & System Configurations

### Document Types
- Incoming
- Outgoing
- Contract
- Proposal
- Internal Memo
- Decision
- Meeting Minutes

Fields:
- Code
- Name
- Description
- RequireNumbering (bool)
- RequireDigitalSigning (bool)

### External Organizations
- For incoming/outgoing docs
- Fields:
  - Name
  - Address
  - Contact Info
  - Category (Government, Supplier, Customer)

### Document Numbering Rule
- Format: `{AutoNumber}/{Unit}/{Year}`
- Per document type
- Auto-increment by year

---

# 5. Document Management (Core)

## 5.1. Create Document
Fields:
- Title
- DocumentTypeID
- Summary
- Department
- CreatorUserID
- Tags
- ConfidentialLevel (Normal / Confidential / Secret)
- PriorityLevel (Low / Normal / High)
- Status (Draft, Processing, Approved, Rejected, Completed)
- Attachments (multiple files)

## 5.2. File Upload & Versioning
- Every upload creates a new version:
  - VersionNumber (1, 2, 3…)
  - UploadedBy
  - FilePath
  - Timestamp
- Ability to revert to previous version

## 5.3. Document Metadata
- EffectiveDate
- ExpirationDate
- IssuedDate
- ReceivedDate (incoming)
- SignedBy
- SignedDate

## 5.4. Document Permissions
Assign permissions per:
- User
- Role
- Department

Types:
- READ
- EDIT
- APPROVE
- SHARE
- DELETE

---

# 6. Approval Workflow Engine

## 6.1. Workflow Template
Fields:
- WorkflowName
- DocumentTypeID
- Steps[]

## 6.2. Workflow Step
Step fields:
- StepOrder
- ApproverType (User / Role / Department)
- ApproverID
- Conditions (e.g., Amount > 100M)
- DueDateRule (e.g., 2 days)

## 6.3. Submit for Approval
- Validate document is ready
- Assign workflow
- Set CurrentStep = 1
- Create approval tracking record
- Notify approver

## 6.4. Approval Actions
- Approve:
  - Move to next step
  - Log action
- Reject:
  - Set document status → Rejected
  - Return to creator
- RequestMoreInfo:
  - Status → NeedMoreInfo
  - Creator updates → resubmit

## 6.5. Approval History
Each action logged with:
- UserID
- Step
- Action (Approve / Reject / RequestInfo)
- Comment
- Timestamp

---

# 7. Incoming Documents (Văn bản đến)

## 7.1. Register Incoming Document
Fields:
- IncomingNumber (auto)
- OriginalNumber
- IssueDate
- ReceivedDate
- IssuedBy (external org)
- Summary
- Attachments
- UrgencyLevel
- ConfidentialLevel

## 7.2. Assignment
- Main handling department
- Supporting departments
- Assigned users

## 7.3. Incoming Document Status
- Received
- Assigned
- Processing
- Responded
- Closed

---

# 8. Outgoing Documents

## 8.1. Drafting Outgoing Document
Additional fields:
- RecipientOrganization
- DeliveryMethod (Email / Postal / Direct)
- SignedMethod (Hand-sign / Digital)

## 8.2. Document Numbering
- Auto-generate document number based on configured rule
- Lock modification after number assignment

## 8.3. Contract Management
Additional fields:
- ContractNumber
- ContractValue
- Partner
- ValidFrom / ValidTo
- ContractType

---

# 9. Notifications & Reminder System

## 9.1. Internal Notification Types
- Document assigned to you
- Document waiting for approval
- Document rejected
- Workflow overdue
- New version uploaded

## 9.2. Reminder Logic
- Cron job (daily)
- If CurrentStep.DueDate exceeded → send overdue alert

---

# 10. Search & Reporting

## 10.1. Search Filters
Search by:
- Title
- Document Number
- Document Type
- Creator
- Department
- Tag
- Date range
- Workflow status
- External organization
- Urgency/Confidential level

## 10.2. Reporting Dashboards
KPIs:
- Documents by status
- Documents by department
- Number of overdue workflows
- Incoming vs outgoing count
- Contract expiration warnings

---

# 11. Audit Logs

## 11.1. Logged Events
- Login/Logout
- Document creation
- Metadata update
- Permission changes
- File uploads
- Approval actions
- Search queries (optional)

## 11.2. Log Fields
- UserID
- Action
- TargetType (Document/User/Workflow)
- TargetID
- Timestamp
- IP Address
- Device info (optional)

---

# 12. Integrations

## 12.1. Digital Signature Integration
- Send PDF file + metadata
- Receive signed file callback
- Store signed document version

## 12.2. Email Integration
- Send outgoing documents via email
- Email templates per department

## 12.3. SSO (Future)
- OAuth2 / SAML / LDAP

## 12.4. Public API
Expose:
- Create document
- Upload attachment
- Trigger approval
- Query document status

---

# 13. Non-Functional Requirements

## Security
- Role-based access control + object-level permissions
- Encrypt file storage (optional)
- Secure JWT tokens
- Audit trail immutable storage

## Performance
- Large file handling
- Full-text search index
- Workflow scaling for 1,000+ users

## UI/UX
- Dashboard home page
- Clean, modern UI using React + Tailwind (suggest)
- Mobile-friendly layout

## Scalability
- Stateless backend
- Object storage for files
- Workflow engine modular for multiple document types

---

# 14. Database Entities (High-Level ERD in Text)

### User  
### Role  
### Permission  
### UserRole  
### Department  
### UserDepartment  
### Document  
### DocumentVersion  
### DocumentMetadata  
### DocumentPermission  
### Workflow  
### WorkflowStep  
### DocumentApproval  
### IncomingDocument  
### OutgoingDocument  
### ExternalOrganization  
### Notification  
### SystemLog  
### NumberingRule  

*(Dev team can expand into detailed ERD later.)*

---

# 15. Development Roadmap (MVP → Full)

### **Phase 1 (MVP – Core):**
- User/Role/Dept
- Document Management
- Workflow Engine (simple linear)
- Notifications
- Basic Search

### **Phase 2:**
- Incoming/Outgoing docs
- Document numbering
- Contract module

### **Phase 3:**
- Digital signing integration
- Dashboard + reporting
- Advanced permissions
- Multi-condition workflows

---

# 16. Appendix

Optional specifications:
- API endpoints list  
- UI wireframes  
- Sample workflow definitions  
- Sample documents  
- Integration mock APIs  

---

# 17. Deployment Models (SaaS + On-Premise)

The system supports two deployment modes:

## 17.1 SaaS (Multi-Tenant Cloud)
- Shared backend, shared database
- Tenants separated via tenant_id
- Subscription plans and billing
- Auto scaling & monitoring
- API rate limiting per tenant
- Tenant onboarding wizard

## 17.2 On-Premise (Self-Hosted)
- Single-tenant isolated deployment
- Local database and file storage
- Offline license activation
- LDAP/AD integration optional
- CLI updater and backup tools
- Full admin control by customer
# ✔ Ready to use

Place this file in the repository root or under `/docs/FUNCTIONAL_SPEC.md` so that AI coding assistants (Cursor, Codex, GPT, etc.) can read and understand the overall system design.
