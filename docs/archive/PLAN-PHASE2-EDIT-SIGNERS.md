# Phase 2: Edit Signers in Editor - Implementation Plan

## 🎯 Goal
Cho phép user thêm/xóa/sửa người ký trong editor khi sign request ở trạng thái draft.

## 📋 Implementation Steps

### 1. Backend API (1 hour)

#### A. Add Signer Endpoint
```typescript
// POST /api/v1/sign-requests/:id/signers
addSigner = async (req: Request, res: Response): Promise<void> => {
  const signRequestId = idSchema.parse(req.params.id);
  const signerData = signerSchema.parse(req.body);
  
  // Check if draft
  const signRequest = await signRequestsService.getSignRequestById(signRequestId, req.auth!.tenantId);
  if (signRequest.status !== 'draft') {
    return res.status(400).json({ error: 'Không thể sửa. Đã gửi đi.' });
  }
  
  // Add signer
  const signer = await signRequestsService.addSignerToRequest(
    signRequestId,
    signerData,
    req.auth!.tenantId
  );
  
  res.json(ok({ signer }));
};
```

#### B. Remove Signer Endpoint
```typescript
// DELETE /api/v1/sign-requests/:id/signers/:signerId
removeSigner = async (req: Request, res: Response): Promise<void> => {
  const signRequestId = idSchema.parse(req.params.id);
  const signerId = idSchema.parse(req.params.signerId);
  
  // Check if draft
  const signRequest = await signRequestsService.getSignRequestById(signRequestId, req.auth!.tenantId);
  if (signRequest.status !== 'draft') {
    return res.status(400).json({ error: 'Không thể sửa. Đã gửi đi.' });
  }
  
  // Check minimum signers
  const signers = await signRequestsService.getSigners(signRequestId);
  if (signers.length <= 1) {
    return res.status(400).json({ error: 'Phải có ít nhất 1 người ký' });
  }
  
  // Remove signer and reassign fields
  await signRequestsService.removeSignerFromRequest(
    signRequestId,
    signerId,
    req.auth!.tenantId
  );
  
  res.json(ok({ removed: true }));
};
```

#### C. Update Signer Endpoint
```typescript
// PUT /api/v1/sign-requests/:id/signers/:signerId
updateSigner = async (req: Request, res: Response): Promise<void> => {
  const signRequestId = idSchema.parse(req.params.id);
  const signerId = idSchema.parse(req.params.signerId);
  const updates = signerSchema.partial().parse(req.body);
  
  // Check if draft
  const signRequest = await signRequestsService.getSignRequestById(signRequestId, req.auth!.tenantId);
  if (signRequest.status !== 'draft') {
    return res.status(400).json({ error: 'Không thể sửa. Đã gửi đi.' });
  }
  
  // Update signer
  const signer = await signRequestsService.updateSigner(
    signerId,
    updates,
    req.auth!.tenantId
  );
  
  res.json(ok({ signer }));
};
```

#### D. Service Methods
```typescript
// signRequests.service.ts

async addSignerToRequest(signRequestId: number, signerData: any, tenantId: number) {
  // Get current signers count
  const signers = await this.getSigners(signRequestId);
  const nextOrder = signers.length + 1;
  
  // Check if internal user
  const user = await prisma.users.findFirst({
    where: { tenant_id: tenantId, email: signerData.email, status: 'active' }
  });
  
  // Create signer
  return await prisma.signers.create({
    data: {
      sign_request_id: signRequestId,
      email: signerData.email,
      name: signerData.name,
      role: signerData.role || 'Người ký',
      signing_order: nextOrder,
      status: 'pending',
      is_internal: !!user,
      user_id: user?.id || null,
    }
  });
}

async removeSignerFromRequest(signRequestId: number, signerId: number, tenantId: number) {
  // Remove fields assigned to this signer
  await prisma.sign_request_fields.deleteMany({
    where: { assigned_signer_id: signerId }
  });
  
  // Delete signer
  await prisma.signers.delete({
    where: { id: signerId }
  });
  
  // Reorder remaining signers
  const remainingSigners = await prisma.signers.findMany({
    where: { sign_request_id: signRequestId },
    orderBy: { signing_order: 'asc' }
  });
  
  for (let i = 0; i < remainingSigners.length; i++) {
    await prisma.signers.update({
      where: { id: remainingSigners[i].id },
      data: { signing_order: i + 1 }
    });
  }
}

async updateSigner(signerId: number, updates: any, tenantId: number) {
  return await prisma.signers.update({
    where: { id: signerId },
    data: updates
  });
}
```

#### E. Routes
```typescript
// signRequests.routes.ts
router.post('/:id/signers', authGuard, signRequestsController.addSigner);
router.delete('/:id/signers/:signerId', authGuard, signRequestsController.removeSigner);
router.put('/:id/signers/:signerId', authGuard, signRequestsController.updateSigner);
```

### 2. Frontend UI (1 hour)

#### A. Manage Signers Dialog Component
```typescript
// components/sign-requests/ManageSignersDialog.tsx

interface ManageSignersDialogProps {
  signRequestId: number;
  signers: Signer[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ManageSignersDialog({ ... }: ManageSignersDialogProps) {
  const [localSigners, setLocalSigners] = useState(signers);
  
  const addSignerMutation = useMutation({
    mutationFn: async (signer: { email: string; name: string }) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers`, {
        method: 'POST',
        body: JSON.stringify(signer),
      });
    },
    onSuccess: () => {
      toast.success('Đã thêm người ký');
      onUpdate();
    },
  });
  
  const removeSignerMutation = useMutation({
    mutationFn: async (signerId: number) => {
      return fetchJson(`/sign-requests/${signRequestId}/signers/${signerId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Đã xóa người ký');
      onUpdate();
    },
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quản lý người ký</DialogTitle>
        </DialogHeader>
        
        {/* List current signers */}
        <div className="space-y-2">
          {localSigners.map((signer, index) => (
            <div key={signer.id} className="flex items-center gap-3 p-3 border rounded">
              <span className="font-medium">#{index + 1}</span>
              <div className="flex-1">
                <div className="font-medium">{signer.name}</div>
                <div className="text-sm text-gray-500">{signer.email}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSignerMutation.mutate(signer.id)}
                disabled={localSigners.length === 1}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        
        {/* Add new signer form */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Thêm người ký mới</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Email" />
            <Input placeholder="Họ tên" />
          </div>
          <Button className="mt-3" onClick={() => {/* add logic */}}>
            + Thêm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### B. Integrate into Editor
```typescript
// editor/page.tsx

const [showManageSigners, setShowManageSigners] = useState(false);

// In sidebar
<Button
  size="sm"
  variant="outline"
  onClick={() => setShowManageSigners(true)}
  className="w-full"
  disabled={!isDraft}
>
  <Users className="w-4 h-4 mr-2" />
  Quản lý người ký
</Button>

<ManageSignersDialog
  signRequestId={signRequestId}
  signers={signers}
  isOpen={showManageSigners}
  onClose={() => setShowManageSigners(false)}
  onUpdate={() => {
    queryClient.invalidateQueries(['sign-request-editor', signRequestId]);
  }}
/>
```

## 📊 Estimated Time
- Backend: 1 hour
- Frontend: 1 hour
- Testing: 30 mins
- **Total: 2.5 hours**

## ✅ Acceptance Criteria
- [ ] Can add signer when draft
- [ ] Can remove signer when draft (min 1)
- [ ] Can update signer info when draft
- [ ] Cannot edit when sent
- [ ] Fields reassigned when signer removed
- [ ] Signing order auto-updated
- [ ] Real-time UI update

## 🔜 Next Session
Start with backend API implementation, then frontend UI.
