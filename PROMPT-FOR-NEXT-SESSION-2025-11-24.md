# Prompt for Next Session - 2025-11-24

## ✅ Hoàn thành hôm nay (2025-11-23)

### 1. Inline Recipients, CC & Attachments ✅
- 3 components mới: SignersSection, CCEmailsSection, AttachmentsSection
- Database: 2 tables mới (document_cc_emails, document_attachments)
- Backend integration hoàn chỉnh
- Frontend integration với progressive disclosure
- 5/5 tests passed

### 2. UX Improvements ✅
- Progressive disclosure (chọn file → hiện form)
- 2 luồng phân biệt rõ ràng:
  - 📋 Phê duyệt nội bộ (Internal) - Phải đăng nhập
  - ✍️ Người ký bên ngoài (External) - Không cần đăng nhập
- External orgs dropdown hoạt động
- Thứ tự ký linh hoạt

## 🔜 Tasks cho session tiếp theo

### Priority 1: Digital Signature Implementation (12 hours)

**Goal**: Implement chức năng ký số cho cả nội bộ và bên ngoài

**Đọc chi tiết**: `docs/dev/DIGITAL-SIGNATURE-IMPLEMENTATION.md`

#### Phase 1: Signature Components (3 hours)
1. SignatureCanvas component (1 hour)
   - Wrapper cho signature_pad library
   - Draw, clear, export base64
   
2. SignatureModal component (1.5 hours)
   - 3 tabs: Draw, Upload, Type
   - Preview signature
   - Confirm/Cancel
   
3. Testing (30 mins)

#### Phase 2: External Signing Page (3 hours)
1. Public signing page `/sign/[token]` (2 hours)
   - Token verification
   - OTP verification
   - PDF viewer with fields
   - Click field → SignatureModal
   
2. Backend API (1 hour)
   - GET /public/sign/:token
   - POST /public/sign/:token/sign
   - Save signature_data

#### Phase 3: Internal Signing (2 hours)
1. Approval dialog enhancement (1 hour)
   - Add SignatureModal
   - Signature preview
   
2. Backend integration (1 hour)
   - Save signature with approval

#### Phase 4: Storage & Display (2 hours)
1. Signature storage (1 hour)
2. Display on PDF (1 hour)

#### Phase 5: Testing (2 hours)
1. End-to-end testing
2. UI/UX polish

### Priority 2: Signing Order Control (2-3 hours)

**Goal**: Cho phép chọn thứ tự giữa nội bộ và bên ngoài

**Đọc chi tiết**: `docs/dev/FEATURE-SIGNING-ORDER-CONTROL.md`

**Options**:
- Nội bộ trước (default)
- Bên ngoài trước
- Song song

## 📝 Quick Commands

### Start servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev

# Terminal 3: License Server
cd license-server
npm run dev
```

### Test
```bash
cd backend
node scripts/test-inline-recipients-cc-attachments.js
node scripts/test-external-orgs-api.js
```

## 🎯 Session Goals

**Main Goal**: Implement Digital Signature (MVP - 4 hours)
- SignatureCanvas component
- External signing page
- Basic storage
- Testing

**Stretch Goal**: Signing Order Control (2 hours)

**Total**: 6 hours

## 📚 References

- `docs/dev/DIGITAL-SIGNATURE-IMPLEMENTATION.md` - Full spec
- `docs/dev/FEATURE-SIGNING-ORDER-CONTROL.md` - Order control spec
- `docs/dev/FEATURE-INLINE-RECIPIENTS-CC-ATTACHMENTS-COMPLETE.md` - Today's work

## 💡 Notes

### Signature Storage Options
1. **Base64 in database** (Simple, quick)
2. **Image file in storage** (Better for large signatures)
3. **Hybrid** (Thumbnail in DB, full image in storage)

### Libraries Available
- `signature_pad` - Already installed
- Canvas API - Native browser
- File upload - Native HTML

### Security Checklist
- [ ] Token expires after use
- [ ] OTP verification
- [ ] Rate limiting
- [ ] Signature cannot be modified
- [ ] Audit log for all signatures

---

**Ready for tomorrow!** 🚀

