# SPEC-3: Service Refactoring - Documents Service

## 📋 Overview
Refactor `documents.service.ts` (1103 lines) into smaller, focused services for better maintainability.

**Priority**: HIGH  
**Estimated Time**: 2 days  
**Impact**: Better code organization, easier testing, reduced complexity

---

## 🎯 Goals
- Split monolithic service into 4 focused services
- Reduce file size from 1103 lines to <300 lines each
- Improve testability
- Maintain backward compatibility

---

## 📝 Current Structure Problems

**File**: `backend/src/modules/documents/documents.service.ts` (1103 lines)

**Issues**:
1. Too many responsibilities (SRP violation)
2. Hard to test (complex dependencies)
3. Difficult to navigate and maintain
4. Workflow logic mixed with document logic

---

## 🏗️ New Architecture

### Service Split Strategy

```
documents.service.ts (1103 lines)
    ↓
    ↓ SPLIT INTO
    ↓
├── documents.service.ts (200 lines) - Core CRUD
├── document-creation.service.ts (300 lines) - Creation logic
├── document-workflow.service.ts (400 lines) - Workflow integration
└── document-access.service.ts (200 lines) - Permission checks
```

---

## 📝 Task Breakdown

### Task 3.1: Create DocumentAccessService (4 hours)

**File**: `backend/src/modules/documents/services/document-access.service.ts`

**Purpose**: Handle all permission and access control logic

**Methods**:
```typescript
class DocumentAccessService {
  // Check if user can view document
  async canView(user: User, document: Document): Promise<boolean>;
  
  // Check if user can edit document
  async canEdit(user: User, document: Document): Promise<boolean>;
  
  // Check if user can delete document
  async canDelete(user: User, document: Document): Promise<boolean>;
  
  // Filter documents based on user permissions
  async filterViewable(user: User, documents: Document[]): Promise<Document[]>;
  
  // Get document with permission check
  async getWithPermissionCheck(
    documentId: number,
    userId: number,
    tenantId: number
  ): Promise<Document>;
}
```

**Extracted From**: Lines 41-121 in current `documents.service.ts`

**Acceptance Criteria**:
- ✅ All permission logic centralized
- ✅ Can be used by other services
- ✅ Unit tests coverage >80%
- ✅ Integration tests with mock users

---

### Task 3.2: Create DocumentCreationService (6 hours)

**File**: `backend/src/modules/documents/services/document-creation.service.ts`

**Purpose**: Handle document creation, file upload, and initial setup

**Methods**:
```typescript
class DocumentCreationService {
  constructor(
    private documentsRepo: DocumentsRepository,
    private numberingService: NumberingService,
    private licenseService: LicenseService,
    private auditService: AuditService
  ) {}
  
  // Create document with file
  async create(input: CreateDocumentInput, context: CreateContext): Promise<Document>;
  
  // Handle file upload (base64 or path)
  private async processFile(input: FileInput): Promise<FileResult>;
  
  // Generate document number if required
  private async generateDocumentNumber(
    documentTypeId: number,
    tenantId: number
  ): Promise<{ number: string; ruleId: number }>;
  
  // Save attachments
  private async saveAttachments(
    documentId: number,
    attachments: Attachment[]
  ): Promise<void>;
  
  // Save CC emails
  private async saveCCEmails(
    documentId: number,
    emails: string[]
  ): Promise<void>;
}
```

**Extracted From**: Lines 123-688 in current `documents.service.ts`

**Key Logic**:
- File validation and storage
- Document type handling
- Auto-numbering
- Attachments and CC emails
- Audit logging

**Acceptance Criteria**:
- ✅ Clean separation of concerns
- ✅ No workflow logic (moved to DocumentWorkflowService)
- ✅ All file operations centralized
- ✅ Error handling for file upload failures

---

### Task 3.3: Create DocumentWorkflowService (8 hours)

**File**: `backend/src/modules/documents/services/document-workflow.service.ts`

**Purpose**: Handle all workflow and approval integration

**Methods**:
```typescript
class DocumentWorkflowService {
  constructor(
    private workflowsService: WorkflowsService,
    private signRequestsService: SignRequestsService,
    private signersRepository: SignersRepository
  ) {}
  
  // Initialize workflow for document
  async initializeWorkflow(
    document: Document,
    workflowConfig: WorkflowConfig
  ): Promise<WorkflowInstance>;
  
  // Create approvals from workflow
  async createApprovals(
    document: Document,
    workflow: Workflow
  ): Promise<DocumentApproval[]>;
  
  // Create signers from workflow
  async createSigners(
    signRequest: SignRequest,
    workflow: Workflow,
    hasApprovals: boolean
  ): Promise<Signer[]>;
  
  // Create customized workflow
  async createCustomizedWorkflow(
    baseWorkflowId: number,
    steps: CustomStep[],
    documentId: number,
    context: Context
  ): Promise<Workflow>;
  
  // Determine signer status based on approvals
  private determineSignerStatus(
    hasApprovals: boolean,
    isFirstSigner: boolean
  ): SignerStatus;
}
```

**Extracted From**: Lines 245-687 in current `documents.service.ts`

**Key Logic**:
- Workflow instance creation
- Approval creation (sequential logic)
- Signer creation (sequential signing)
- Customized workflow generation
- Status determination

**Acceptance Criteria**:
- ✅ All workflow logic isolated
- ✅ Sequential approval/signing logic correct
- ✅ Integration tests with real workflows
- ✅ Handles all 4 workflow modes (strict, flexible, ad-hoc, custom)

---

### Task 3.4: Refactor Core DocumentsService (4 hours)

**File**: `backend/src/modules/documents/documents.service.ts`

**New Responsibilities**: Orchestration and core CRUD only

**Methods**:
```typescript
class DocumentsService {
  constructor(
    private creationService: DocumentCreationService,
    private workflowService: DocumentWorkflowService,
    private accessService: DocumentAccessService,
    private repository: DocumentsRepository
  ) {}
  
  // List documents (with permission filter)
  async listDocuments(
    tenantId: number,
    userId?: number,
    options?: ListOptions
  ): Promise<Document[]> {
    const docs = await this.repository.listByTenant(tenantId, options);
    
    if (userId) {
      const user = await this.getUser(userId);
      return this.accessService.filterViewable(user, docs);
    }
    
    return docs;
  }
  
  // Get document (with permission check)
  async getDocument(
    documentId: number,
    tenantId: number,
    userId?: number
  ): Promise<Document> {
    if (userId) {
      return this.accessService.getWithPermissionCheck(
        documentId,
        userId,
        tenantId
      );
    }
    
    return this.repository.findById(documentId, tenantId);
  }
  
  // Create document (orchestrate creation + workflow)
  async createDocument(
    input: CreateDocumentInput,
    tenantId: number,
    ownerId: number,
    meta?: RequestMeta
  ): Promise<Document> {
    // Delegate to creation service
    const document = await this.creationService.create(input, {
      tenantId,
      ownerId,
      ...meta
    });
    
    // Initialize workflow if needed
    if (input.workflowId || input.customizedSteps) {
      await this.workflowService.initializeWorkflow(document, {
        workflowId: input.workflowId,
        customizedSteps: input.customizedSteps,
        tenantId,
        ownerId
      });
    }
    
    return document;
  }
  
  // Update document
  async updateDocument(
    documentId: number,
    data: UpdateData,
    userId: number,
    tenantId: number
  ): Promise<Document>;
  
  // Delete document (with permission check)
  async deleteDocument(
    documentId: number,
    tenantId: number,
    userId?: number
  ): Promise<void>;
}
```

**File Size**: ~200 lines (reduced from 1103)

**Acceptance Criteria**:
- ✅ Clean orchestration pattern
- ✅ Dependencies injected
- ✅ All tests passing
- ✅ API contracts unchanged

---

### Task 3.5: Update Controllers and Routes (2 hours)

**File**: `backend/src/modules/documents/documents.controller.ts`

**Changes**: Minimal - service interface remains the same

**Verification**:
- All existing API tests pass
- No breaking changes
- Performance maintained or improved

---

## 🧪 Testing Strategy

### Unit Tests (Each Service)
```typescript
// document-access.service.test.ts
describe('DocumentAccessService', () => {
  it('should allow owner to view document');
  it('should deny access for non-owner with visibility=private');
  it('should allow department members for department visibility');
});

// document-creation.service.test.ts
describe('DocumentCreationService', () => {
  it('should create document with valid file');
  it('should generate document number for type with numbering');
  it('should save attachments correctly');
});

// document-workflow.service.test.ts
describe('DocumentWorkflowService', () => {
  it('should create sequential approvals');
  it('should create signers with correct status');
  it('should handle customized workflows');
});
```

### Integration Tests
```typescript
describe('Document Creation Flow (Integration)', () => {
  it('should create document with workflow and approvals');
  it('should create document with customized workflow');
  it('should handle workflow-less documents');
});
```

---

## 📊 Success Metrics

- **File Sizes**: 1103 → ~200 lines each (4 files)
- **Test Coverage**: 60% → 85%
- **Cyclomatic Complexity**: 45 → <10 per file
- **Maintainability Index**: 40 → 75+

---

## 🚀 Migration Plan

### Phase 1: Create New Services (Week 1)
1. Create `document-access.service.ts`
2. Create `document-creation.service.ts`
3. Create `document-workflow.service.ts`
4. Write unit tests for each

### Phase 2: Refactor Core Service (Week 1)
1. Update `documents.service.ts` to use new services
2. Update dependency injection
3. Run integration tests

### Phase 3: Cleanup (Week 2)
1. Remove old commented code
2. Update documentation
3. Deploy and monitor

---

## 🔄 Rollback Plan

If issues arise:
1. Revert to previous `documents.service.ts`
2. All new services are additive (safe to leave)
3. No database changes required

---

## 📚 Documentation Updates

- Update architecture diagram
- Document service responsibilities
- Update API documentation
- Create developer guide for service pattern
