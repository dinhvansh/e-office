# Signature Feature - Development Plan

## Tổng quan

Phát triển tính năng chữ ký điện tử cho người dùng tại `/profile?tab=signature`

## Yêu cầu chức năng

### 1. Upload chữ ký từ file
- ✅ UI đã có sẵn
- ⏳ Backend API để upload
- ⏳ Lưu vào database (users table)
- ⏳ Preview sau khi upload

### 2. Vẽ chữ ký trực tiếp
- ⏳ Canvas component với signature_pad
- ⏳ Nút Clear để vẽ lại
- ⏳ Nút Save để lưu
- ⏳ Convert canvas to image

### 3. Quản lý chữ ký
- ⏳ Hiển thị chữ ký hiện tại
- ⏳ Xóa chữ ký
- ⏳ Thay đổi chữ ký

### 4. Sử dụng chữ ký
- ⏳ Tự động sử dụng khi ký tài liệu
- ⏳ Hiển thị trong PDF đã ký

## Database Schema

### Cần thêm vào bảng `users`:
```sql
ALTER TABLE users ADD COLUMN signature_image_path VARCHAR(500);
ALTER TABLE users ADD COLUMN signature_updated_at TIMESTAMP;
```

Hoặc tạo bảng riêng:
```sql
CREATE TABLE user_signatures (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signature_type VARCHAR(20) NOT NULL, -- 'upload' or 'drawn'
  image_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, is_active) -- Only one active signature per user
);
```

## Backend API Endpoints

### 1. Upload Signature
```
POST /api/v1/users/me/signature/upload
Content-Type: multipart/form-data

Body:
- file: image file (PNG, JPG)

Response:
{
  "success": true,
  "data": {
    "signature_path": "/storage/signatures/user-123.png",
    "updated_at": "2025-11-30T..."
  }
}
```

### 2. Save Drawn Signature
```
POST /api/v1/users/me/signature/draw
Content-Type: application/json

Body:
{
  "image_base64": "data:image/png;base64,..."
}

Response:
{
  "success": true,
  "data": {
    "signature_path": "/storage/signatures/user-123.png",
    "updated_at": "2025-11-30T..."
  }
}
```

### 3. Get Current Signature
```
GET /api/v1/users/me/signature

Response:
{
  "success": true,
  "data": {
    "signature_path": "/storage/signatures/user-123.png",
    "signature_url": "http://localhost:4000/api/v1/users/me/signature/view",
    "updated_at": "2025-11-30T..."
  }
}
```

### 4. View Signature Image
```
GET /api/v1/users/me/signature/view

Response: Image file (PNG)
```

### 5. Delete Signature
```
DELETE /api/v1/users/me/signature

Response:
{
  "success": true,
  "message": "Signature deleted"
}
```

## Frontend Components

### 1. SignatureUpload Component
```typescript
// frontend/components/profile/SignatureUpload.tsx
- File input
- Preview image
- Upload button
- Delete button
```

### 2. SignatureCanvas Component
```typescript
// frontend/components/profile/SignatureCanvas.tsx
- Canvas with signature_pad library
- Clear button
- Save button
- Color picker (optional)
- Line width selector (optional)
```

### 3. SignatureManager Component
```typescript
// frontend/components/profile/SignatureManager.tsx
- Tabs: Upload | Draw
- Current signature display
- Switch between methods
```

## Implementation Steps

### Phase 1: Database & Backend (30 mins)
1. ✅ Create migration for signature fields
2. ✅ Create signature storage directory
3. ✅ Implement upload endpoint
4. ✅ Implement save drawn endpoint
5. ✅ Implement get/view/delete endpoints

### Phase 2: Frontend Components (45 mins)
1. ✅ Install signature_pad library
2. ✅ Create SignatureCanvas component
3. ✅ Create SignatureUpload component
4. ✅ Create SignatureManager component
5. ✅ Integrate into profile page

### Phase 3: Integration (15 mins)
1. ✅ Connect frontend to backend APIs
2. ✅ Test upload flow
3. ✅ Test draw flow
4. ✅ Test delete flow

### Phase 4: Use in Signing (30 mins)
1. ✅ Auto-load user signature when signing
2. ✅ Display in PDF generation
3. ✅ Update signing UI

## Libraries Needed

### Frontend:
```bash
npm install signature_pad
npm install @types/signature_pad --save-dev
```

### Backend:
- multer (already installed)
- sharp (for image processing - optional)

## File Structure

```
backend/
├── src/
│   └── modules/
│       └── users/
│           ├── signature.controller.ts
│           ├── signature.service.ts
│           ├── signature.routes.ts
│           └── users.routes.ts (add signature routes)
├── storage/
│   └── signatures/
│       └── {tenant_id}/
│           └── user-{user_id}.png

frontend/
├── components/
│   └── profile/
│       ├── SignatureCanvas.tsx
│       ├── SignatureUpload.tsx
│       └── SignatureManager.tsx
└── app/
    └── (dashboard)/
        └── profile/
            └── page.tsx (update)
```

## Security Considerations

1. **File Validation**:
   - Only allow image files (PNG, JPG)
   - Max file size: 1MB
   - Validate image dimensions

2. **Storage**:
   - Store in tenant-specific folders
   - Use user ID in filename
   - Prevent directory traversal

3. **Access Control**:
   - Users can only access their own signature
   - Require authentication for all endpoints

4. **Image Processing**:
   - Resize to standard dimensions (300x100)
   - Convert to PNG with transparency
   - Remove EXIF data

## Testing

### Manual Testing:
1. Upload signature image
2. Draw signature on canvas
3. View signature preview
4. Delete signature
5. Use signature when signing document

### Test Cases:
- Upload valid image
- Upload invalid file type
- Upload oversized file
- Draw and save signature
- Clear and redraw
- Delete signature
- View signature after upload

## Future Enhancements

1. **Multiple Signatures**:
   - Allow users to have multiple signatures
   - Select which one to use when signing

2. **Signature Styles**:
   - Different pen colors
   - Different line widths
   - Different fonts for typed signatures

3. **Typed Signature**:
   - Type name and convert to signature style
   - Multiple font options

4. **Signature History**:
   - Keep history of all signatures
   - Audit trail of signature changes

## Estimated Time

- **Phase 1 (Backend)**: 30 minutes
- **Phase 2 (Frontend)**: 45 minutes
- **Phase 3 (Integration)**: 15 minutes
- **Phase 4 (Use in Signing)**: 30 minutes
- **Total**: ~2 hours

## Priority

**Medium** - Nice to have but not critical for MVP

## Status

🟡 **Planning** - Waiting for approval to start implementation

---

**Created**: 30/11/2025
**Last Updated**: 30/11/2025
