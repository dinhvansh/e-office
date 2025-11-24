# SPEC: Internal vs External Signing Flow

**Created**: 2025-11-24  
**Estimated Time**: 6-8 giờ  
**Priority**: High  
**Status**: Spec - Ready for Implementation

---

## 📋 Overview

Phân biệt rõ ràng giữa **Phê duyệt** (Approval), **Ký duyệt nội bộ** (Internal Signing), và **Ký external** (External Signing).

## 🎯 Business Requirements

### Định nghĩa

1. **Phê duyệt** (Approval)
   - Người xem và đồng ý với nội dung văn bản
   - **KHÔNG** ký điện tử lên văn bản
   - Chỉ approve/reject trong hệ thống
   - Ví dụ: Trưởng phòng, Giám đốc review và approve

2. **Ký duyệt nội bộ** (Internal Signing)
   - Người ký điện tử (vẽ chữ ký) lên văn bản
   - Là nhân viên nội bộ (có tài khoản trong hệ thống)
   - Ký trong dashboard (không dùng public link)
   - Ví dụ: Giám đốc ký, Kế toán trưởng ký

3. **Ký external** (External Signing)
   - Khách hàng, đối tác bên ngoài
   - Không có tài khoản trong hệ thống
   - Dùng public link + OTP
   - Ví dụ: Khách hàng ký hợp đồng

### Flow đầy đủ

```
1. Upload document
   ↓
2. APPROVAL PHASE (Phê duyệt)
   - Bước 1: Trưởng phòng approve ✅
   - Bước 2: Giám đốc approve ✅
   - Status: pending_approval → approved
   ↓
3. SIGNING PHASE (Ký điện tử - Theo thứ tự tùy chỉnh)
   - Signer 1 (Order 1): Giám đốc (Internal) ký trong dashboard
   - Signer 2 (Order 2): Khách hàng (External) ký qua link
   - Signer 3 (Order 3): Kế toán (Internal) ký trong dashboard
   - Signer 4 (Order 4): Đối tác (External) ký qua link
   - Status: approved → pending_signature → in_progress
   ↓
4. Tất cả đã ký → Status: completed (Khóa tài liệu)
```

### Thứ tự ký linh hoạt

**Nguyên tắc**:
- Tất cả signers (internal + external) đều có `signing_order`
- Thứ tự ký được sắp xếp theo `signing_order` (1, 2, 3, 4...)
- Có thể xen kẽ internal và external bất kỳ
- Người có order nhỏ hơn phải ký trước

**Ví dụ**:

**Case 1: Internal trước, External sau**
```
Order 1: Giám đốc (Internal)
Order 2: Kế toán (Internal)
Order 3: Khách hàng (External)
Order 4: Đối tác (External)
```

**Case 2: External trước, Internal sau**
```
Order 1: Khách hàng (External)
Order 2: Đối tác (External)
Order 3: Giám đốc (Internal)
Order 4: Kế toán (Internal)
```

**Case 3: Xen kẽ**
```
Order 1: Giám đốc (Internal)
Order 2: Khách hàng (External)
Order 3: Kế toán (Internal)
Order 4: Đối tác (External)
```

**Case 4: Ký song song (cùng order)**
```
Order 1: Giám đốc (Internal) + Khách hàng (External) - Ký song song
Order 2: Kế toán (Internal) + Đối tác (External) - Ký song song
```

---

## 🗄️ Database Changes

### 1. Add `signer_type` to `signers` table

```sql
ALTER TABLE signers ADD COLUMN signer_type VARCHAR(20) DEFAULT 'external';
-- Values: 'internal' | 'external'

-- Add index
CREATE INDEX idx_signers_type ON signers(signer_type);
```

**Migration**: `backend/prisma/migrations/xxx_add_signer_type.sql`

### 2. Add `user_id` to `signers` table (for internal signers)

```sql
ALTER TABLE signers ADD COLUMN user_id INTEGER NULL;
ALTER TABLE signers ADD CONSTRAINT fk_signers_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_signers_user_id ON signers(user_id);
```

### 3. Update Prisma Schema

```prisma
model signers {
  id              Int       @id @default(autoincrement())
  sign_request_id Int
  email           String
  name            String
  role            String?
  signer_type     String    @default("external") // 'internal' | 'external'
  user_id         Int?      // Link to internal user
  signing_order   Int?
  status          String    @default("pending")
  signed_at       DateTime?
  signature_data  String?   @db.Text
  signature_type  String?
  signing_token   String?   @unique
  otp             String?
  otp_expire      DateTime?
  ip_address      String?
  user_agent      String?
  position_data   Json?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  sign_request    sign_requests @relation(fields: [sign_request_id], references: [id], onDelete: Cascade)
  user            users?        @relation(fields: [user_id], references: [id], onDelete: SetNull)

  @@index([sign_request_id])
  @@index([signer_type])
  @@index([user_id])
}
```

### 4. Document statuses (Simplified)

Statuses:
- `draft`, `pending_approval`, `approved`, `pending_signature`, `in_progress`, `completed`, `rejected`, `cancelled`

**Note**: Không cần tách `pending_internal_signature` và `pending_external_signature` vì thứ tự ký linh hoạt. Chỉ dùng:
- `pending_signature` - Chưa ai ký
- `in_progress` - Đang có người ký
- `completed` - Tất cả đã ký

---

## 🔧 Backend Implementation

### Phase 1: Database & Models (1 giờ)

#### 1.1 Prisma Migration
```bash
npx prisma migrate dev --name add_signer_type_and_user_id
npx prisma generate
```

#### 1.2 Update SignersService

**File**: `backend/src/modules/signers/signers.service.ts`

```typescript
async createSigner(data: {
  sign_request_id: number;
  email: string;
  name: string;
  role?: string;
  signing_order?: number;
  signer_type: 'internal' | 'external';
  user_id?: number; // For internal signers
}) {
  // Validate: if signer_type = 'internal', user_id must be provided
  if (data.signer_type === 'internal' && !data.user_id) {
    throw new Error('user_id required for internal signers');
  }

  // Validate: if signer_type = 'internal', email must match user email
  if (data.signer_type === 'internal' && data.user_id) {
    const user = await prisma.users.findUnique({
      where: { id: data.user_id }
    });
    if (user && user.email !== data.email) {
      throw new Error('Email must match user email for internal signers');
    }
  }

  return await signersRepository.create(data);
}
```

### Phase 2: Internal Signing API (2 giờ)

#### 2.1 New API Endpoints

**File**: `backend/src/modules/signers/signers.routes.ts`

```typescript
// Get my signing tasks (internal signers only)
router.get('/my-signing-tasks', authGuard, asyncHandler(controller.getMySigningTasks));

// Sign document as internal user
router.post('/:id/sign-internal', authGuard, asyncHandler(controller.signInternal));
```

#### 2.2 SignersController

**File**: `backend/src/modules/signers/signers.controller.ts`

```typescript
/**
 * Get signing tasks for current user (internal signers)
 * GET /api/v1/signers/my-signing-tasks
 */
getMySigningTasks = async (req: Request, res: Response): Promise<void> => {
  const userId = req.auth!.userId;
  const tenantId = req.auth!.tenantId;

  const tasks = await signersService.getMySigningTasks(userId, tenantId);
  res.json(ok({ signing_tasks: tasks }));
};

/**
 * Sign document as internal user
 * POST /api/v1/signers/:id/sign-internal
 */
signInternal = async (req: Request, res: Response): Promise<void> => {
  const signerId = idSchema.parse(req.params.id);
  const userId = req.auth!.userId;
  const tenantId = req.auth!.tenantId;
  
  const body = z.object({
    signature_data: z.string(),
    signature_type: z.enum(['drawn', 'uploaded', 'typed', 'certificate']),
    comment: z.string().optional()
  }).parse(req.body);

  const result = await signersService.signInternal(
    signerId,
    userId,
    tenantId,
    body.signature_data,
    body.signature_type,
    body.comment
  );

  res.json(ok(result));
};
```

#### 2.3 SignersService

**File**: `backend/src/modules/signers/signers.service.ts`

```typescript
/**
 * Get signing tasks for internal user
 */
async getMySigningTasks(userId: number, tenantId: number) {
  return await prisma.signers.findMany({
    where: {
      user_id: userId,
      signer_type: 'internal',
      status: 'pending',
      sign_request: {
        tenant_id: tenantId,
        status: {
          in: ['pending', 'in_progress']
        }
      }
    },
    include: {
      sign_request: {
        include: {
          document: {
            select: {
              id: true,
              title: true,
              document_number: true,
              file_path: true,
              original_file_name: true
            }
          },
          signers: {
            orderBy: { signing_order: 'asc' }
          }
        }
      }
    },
    orderBy: { created_at: 'asc' }
  });
}

/**
 * Sign document as internal user
 */
async signInternal(
  signerId: number,
  userId: number,
  tenantId: number,
  signatureData: string,
  signatureType: string,
  comment?: string
) {
  // Get signer
  const signer = await prisma.signers.findUnique({
    where: { id: signerId },
    include: {
      sign_request: {
        include: {
          document: true,
          signers: {
            orderBy: { signing_order: 'asc' }
          }
        }
      }
    }
  });

  if (!signer) {
    throw ApiError.notFound('Signer not found');
  }

  // Verify: signer belongs to user
  if (signer.user_id !== userId) {
    throw ApiError.forbidden('Not your signing task');
  }

  // Verify: signer is internal
  if (signer.signer_type !== 'internal') {
    throw ApiError.badRequest('Use public signing link for external signers');
  }

  // Verify: tenant
  if (signer.sign_request.document.tenant_id !== tenantId) {
    throw ApiError.forbidden('Access denied');
  }

  // Verify: not already signed
  if (signer.status === 'signed' || signer.status === 'completed') {
    throw ApiError.badRequest('Already signed');
  }

  // Update signer
  await prisma.signers.update({
    where: { id: signerId },
    data: {
      status: 'signed',
      signed_at: new Date(),
      signature_data: signatureData,
      signature_type: signatureType
    }
  });

  // Check signing progress based on signing_order
  const allSigners = signer.sign_request.signers.sort((a, b) => 
    (a.signing_order || 0) - (b.signing_order || 0)
  );
  
  const allSigned = allSigners.every(s => 
    s.status === 'signed' || s.status === 'completed'
  );

  if (allSigned) {
    // All signers completed → Mark as completed
    await prisma.sign_requests.update({
      where: { id: signer.sign_request_id },
      data: { status: 'completed' }
    });

    await prisma.documents.update({
      where: { id: signer.sign_request.document_id },
      data: { status: 'completed' }
    });

    return {
      message: 'Document completed!',
      status: 'completed'
    };
  } else {
    // Check if next signer(s) should be notified
    const currentOrder = signer.signing_order || 0;
    const nextSigners = allSigners.filter(s => 
      s.signing_order === currentOrder + 1 && 
      s.status === 'pending'
    );

    // Notify next signers
    if (nextSigners.length > 0) {
      for (const nextSigner of nextSigners) {
        if (nextSigner.signer_type === 'external') {
          // Send public link to external signer
          await this.sendSigningLinkToExternal(nextSigner.id);
        } else {
          // Send notification to internal signer
          await this.notifyInternalSigner(nextSigner.id);
        }
      }
    }

    // Update status to in_progress
    await prisma.sign_requests.update({
      where: { id: signer.sign_request_id },
      data: { status: 'in_progress' }
    });

    return {
      message: 'Signed! Waiting for next signer(s)...',
      status: 'in_progress',
      next_signers: nextSigners.map(s => ({
        name: s.name,
        type: s.signer_type,
        order: s.signing_order
      }))
    };
  }
}

/**
 * Check if signer can sign now (based on signing_order)
 */
async canSignNow(signerId: number): Promise<{ canSign: boolean; reason?: string }> {
  const signer = await prisma.signers.findUnique({
    where: { id: signerId },
    include: {
      sign_request: {
        include: {
          signers: {
            orderBy: { signing_order: 'asc' }
          }
        }
      }
    }
  });

  if (!signer) {
    return { canSign: false, reason: 'Signer not found' };
  }

  const currentOrder = signer.signing_order || 0;
  const allSigners = signer.sign_request.signers;

  // Check if all previous signers have signed
  const previousSigners = allSigners.filter(s => 
    (s.signing_order || 0) < currentOrder
  );

  const allPreviousSigned = previousSigners.every(s => 
    s.status === 'signed' || s.status === 'completed'
  );

  if (!allPreviousSigned) {
    const pendingPrevious = previousSigners.filter(s => 
      s.status !== 'signed' && s.status !== 'completed'
    );
    return {
      canSign: false,
      reason: `Vui lòng chờ người ký trước hoàn thành: ${pendingPrevious.map(s => s.name).join(', ')}`
    };
  }

  return { canSign: true };
}

/**
 * Send signing link to external signer
 */
private async sendSigningLinkToExternal(signerId: number) {
  const signer = await prisma.signers.findUnique({
    where: { id: signerId },
    include: {
      sign_request: {
        include: {
          document: true
        }
      }
    }
  });

  if (!signer) return;

  // Generate token if not exists
  if (!signer.signing_token) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.signers.update({
      where: { id: signerId },
      data: { signing_token: token }
    });
    signer.signing_token = token;
  }

  // TODO: Send email with signing link
  const signingUrl = `${process.env.FRONTEND_URL}/sign/${signer.signing_token}`;
  console.log(`📧 Send signing link to ${signer.email}: ${signingUrl}`);
}

/**
 * Notify internal signer
 */
private async notifyInternalSigner(signerId: number) {
  const signer = await prisma.signers.findUnique({
    where: { id: signerId },
    include: {
      user: true,
      sign_request: {
        include: {
          document: true
        }
      }
    }
  });

  if (!signer || !signer.user) return;

  // TODO: Send email notification
  const dashboardUrl = `${process.env.FRONTEND_URL}/my-signing-tasks`;
  console.log(`📧 Notify internal signer ${signer.user.email}: ${dashboardUrl}`);
}
```

### Phase 3: Auto-detect Signer Type (1 giờ)

#### 3.1 Update AddRecipientsDialog - Signing Order Management

**File**: `frontend/components/sign-requests/AddRecipientsDialog.tsx`

Add signer type selection + drag-and-drop reordering:

```typescript
const [signers, setSigners] = useState([
  { id: 1, email: '', name: '', signer_type: 'internal', user_id: null, signing_order: 1 },
]);

// Drag and drop to reorder
const handleDragEnd = (result) => {
  if (!result.destination) return;
  
  const items = Array.from(signers);
  const [reorderedItem] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, reorderedItem);
  
  // Update signing_order
  const reordered = items.map((item, index) => ({
    ...item,
    signing_order: index + 1
  }));
  
  setSigners(reordered);
};

return (
  <DragDropContext onDragEnd={handleDragEnd}>
    <Droppable droppableId="signers">
      {(provided) => (
        <div {...provided.droppableProps} ref={provided.innerRef}>
          {signers.map((signer, index) => (
            <Draggable key={signer.id} draggableId={String(signer.id)} index={index}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className="flex items-center gap-4 p-4 border rounded mb-2"
                >
                  {/* Drag handle */}
                  <div className="cursor-move">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Order number */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                    {signer.signing_order}
                  </div>

                  {/* Signer type */}
                  <Select 
                    value={signer.signer_type} 
                    onChange={(e) => updateSigner(signer.id, 'signer_type', e.target.value)}
                    className="w-32"
                  >
                    <option value="internal">🏢 Nội bộ</option>
                    <option value="external">🌐 Bên ngoài</option>
                  </Select>

                  {/* Internal: User selector */}
                  {signer.signer_type === 'internal' && (
                    <Select 
                      value={signer.user_id} 
                      onChange={(e) => {
                        const userId = parseInt(e.target.value);
                        const user = users.find(u => u.id === userId);
                        updateSigner(signer.id, 'user_id', userId);
                        updateSigner(signer.id, 'email', user?.email);
                        updateSigner(signer.id, 'name', user?.full_name);
                      }}
                      className="flex-1"
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </option>
                      ))}
                    </Select>
                  )}

                  {/* External: Email + Name input */}
                  {signer.signer_type === 'external' && (
                    <>
                      <Input
                        placeholder="Email"
                        value={signer.email}
                        onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Họ tên"
                        value={signer.name}
                        onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                        className="flex-1"
                      />
                    </>
                  )}

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSigner(signer.id)}
                    disabled={signers.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </DragDropContext>
);
```

**Features**:
- ✅ Drag & drop để sắp xếp thứ tự
- ✅ Số thứ tự hiển thị rõ ràng (1, 2, 3...)
- ✅ Icon phân biệt internal (🏢) vs external (🌐)
- ✅ Auto-fill email/name khi chọn internal user
- ✅ Manual input cho external signers

#### 3.2 Auto-detect based on email

```typescript
// Check if email belongs to internal user
const user = await prisma.users.findFirst({
  where: { 
    email: signerEmail,
    tenant_id: tenantId
  }
});

const signerType = user ? 'internal' : 'external';
const userId = user?.id;
```

---

## 🎨 Frontend Implementation

### Phase 4: My Signing Tasks Page (2 giờ)

#### 4.1 Create Page

**File**: `frontend/app/(dashboard)/my-signing-tasks/page.tsx`

```typescript
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { SignatureModal } from '@/components/signature/SignatureModal';
import { PDFViewer } from '@/components/pdf/PDFViewer';

export default function MySigningTasksPage() {
  const { fetchJson } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-signing-tasks'],
    queryFn: async () => {
      const res = await fetchJson('/signers/my-signing-tasks');
      return res.signing_tasks;
    }
  });

  const signMutation = useMutation({
    mutationFn: async ({ signerId, signatureData, signatureType }) => {
      return await fetchJson(`/signers/${signerId}/sign-internal`, {
        method: 'POST',
        body: JSON.stringify({ signature_data: signatureData, signature_type: signatureType })
      });
    },
    onSuccess: () => {
      toast.success('Ký thành công!');
      queryClient.invalidateQueries(['my-signing-tasks']);
      setShowSignatureModal(false);
      setSelectedTask(null);
    }
  });

  return (
    <div>
      <PageHeader
        icon={PenTool}
        title="Tài liệu chờ ký"
        description="Danh sách tài liệu cần ký điện tử của bạn"
      />

      {/* Task List */}
      <div className="grid gap-4">
        {tasks?.map(task => (
          <Card key={task.id}>
            <CardContent>
              <h3>{task.sign_request.document.title}</h3>
              <p>Số: {task.sign_request.document.document_number}</p>
              <p>Thứ tự ký: {task.signing_order}</p>
              <Button onClick={() => {
                setSelectedTask(task);
                setShowSignatureModal(true);
              }}>
                Ký ngay
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signature Modal */}
      {showSignatureModal && selectedTask && (
        <Dialog open onClose={() => setShowSignatureModal(false)}>
          <PDFViewer 
            documentId={selectedTask.sign_request.document.id}
          />
          <SignatureModal
            onSave={(signatureData, signatureType) => {
              signMutation.mutate({
                signerId: selectedTask.id,
                signatureData,
                signatureType
              });
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
```

#### 4.2 Add to Sidebar

**File**: `frontend/constants/sidebarItems.ts`

```typescript
{
  label: 'Tài liệu chờ ký',
  href: '/my-signing-tasks',
  icon: PenTool,
  iconColor: 'text-orange-600',
  requiredRoles: ['Admin', 'Manager', 'User']
}
```

---

## 🧪 Testing

### Test Cases

#### Test 1: Internal Only (Sequential)
```
Signers:
  Order 1: Giám đốc (Internal)
  Order 2: Kế toán (Internal)

Flow:
  1. Upload → Approval → Approved
  2. Giám đốc sees task in "Tài liệu chờ ký"
  3. Giám đốc signs → Status: in_progress
  4. Kế toán sees task
  5. Kế toán signs → Status: completed
  6. No external links sent
```

#### Test 2: External Only (Sequential)
```
Signers:
  Order 1: Khách hàng A (External)
  Order 2: Khách hàng B (External)

Flow:
  1. Upload → Approval → Approved
  2. Public link sent to Khách hàng A
  3. Khách hàng A signs → Status: in_progress
  4. Public link sent to Khách hàng B
  5. Khách hàng B signs → Status: completed
```

#### Test 3: Internal First, Then External
```
Signers:
  Order 1: Giám đốc (Internal)
  Order 2: Kế toán (Internal)
  Order 3: Khách hàng (External)

Flow:
  1. Upload → Approval → Approved
  2. Giám đốc signs (dashboard)
  3. Kế toán signs (dashboard)
  4. After Kế toán signs → Public link sent to Khách hàng
  5. Khách hàng signs (public link)
  6. Status: completed
```

#### Test 4: External First, Then Internal
```
Signers:
  Order 1: Khách hàng (External)
  Order 2: Giám đốc (Internal)
  Order 3: Kế toán (Internal)

Flow:
  1. Upload → Approval → Approved
  2. Public link sent to Khách hàng
  3. Khách hàng signs
  4. Giám đốc sees task in dashboard
  5. Giám đốc signs
  6. Kế toán signs
  7. Status: completed
```

#### Test 5: Mixed Order (Xen kẽ)
```
Signers:
  Order 1: Giám đốc (Internal)
  Order 2: Khách hàng A (External)
  Order 3: Kế toán (Internal)
  Order 4: Khách hàng B (External)

Flow:
  1. Giám đốc signs (dashboard)
  2. Link sent to Khách hàng A
  3. Khách hàng A signs (public link)
  4. Kế toán signs (dashboard)
  5. Link sent to Khách hàng B
  6. Khách hàng B signs (public link)
  7. Status: completed
```

#### Test 6: Parallel Signing (Same Order)
```
Signers:
  Order 1: Giám đốc (Internal) + Khách hàng A (External)
  Order 2: Kế toán (Internal) + Khách hàng B (External)

Flow:
  1. Giám đốc và Khách hàng A có thể ký song song
  2. Sau khi cả 2 ký xong → Order 2 được mở
  3. Kế toán và Khách hàng B ký song song
  4. Status: completed
```

#### Test 7: Signing Order Validation
```
Test:
  - Signer Order 2 tries to sign before Order 1
  - Expected: Error "Vui lòng chờ người ký trước hoàn thành"
  
Test:
  - Signer Order 1 signs
  - Signer Order 3 tries to sign (Order 2 not signed yet)
  - Expected: Error "Vui lòng chờ người ký trước hoàn thành"
```

---

## 📊 Success Criteria

- [ ] Database migration successful
- [ ] Internal signers can see tasks
- [ ] Internal signers can sign in dashboard
- [ ] External signers receive public links only after internal signing complete
- [ ] Document status transitions correctly
- [ ] Progress bar updates correctly
- [ ] No TypeScript errors
- [ ] All tests passing

---

## 🔜 Future Enhancements

1. **Batch Signing**: Sign multiple documents at once
2. **Signing Reminders**: Email reminders for pending tasks
3. **Signing History**: View all documents signed by user
4. **Signing Analytics**: Dashboard with signing metrics

---

**Estimated Total Time**: 6-8 giờ
- Phase 1: Database (1h)
- Phase 2: Backend API (2h)
- Phase 3: Auto-detect (1h)
- Phase 4: Frontend (2h)
- Testing: (1-2h)
