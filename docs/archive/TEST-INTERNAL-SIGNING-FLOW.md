# 🧪 Test Luồng Ký Nội Bộ (Internal Signing Flow)

## 📊 Current Status

**Database**:
- ✅ 69 Documents
- ✅ 38 Sign Requests  
- ✅ 15 Approvals
- ✅ 17 Users

**Services Running**:
- ✅ Backend: http://localhost:4000
- ✅ Frontend: http://localhost:3000
- ✅ License Server: http://localhost:5000
- ✅ Database: PostgreSQL + Redis

---

## 🎯 Test Flow: Upload → Sign → Approve

### Step 1: Login
**URL**: http://localhost:3000

**Credentials**:
- Email: `admin@acme.local`
- Password: `password123`

---

### Step 2: Upload Document
1. Click "Tài liệu" in sidebar
2. Click "Tải lên tài liệu" button
3. Select a PDF file
4. Fill form:
   - Tiêu đề: "Hợp đồng test"
   - Loại tài liệu: Select any type
   - ✅ Check "Yêu cầu ký số"
5. Click "Tải lên"

**Expected**: Document uploaded, redirected to editor

---

### Step 3: Add Signature Fields
1. You should be on editor page: `/sign-requests/[id]/editor`
2. Select a signer from left sidebar
3. Click on PDF to add signature field
4. Add at least 1 signature field
5. Click "Lưu" (Save)

**Expected**: Fields saved successfully

---

### Step 4: Send for Signing
1. Go back to "Tài liệu" page
2. Find your document
3. Click "Gửi" button (Send icon)
4. Confirm send

**Expected**: 
- Document status → "pending"
- Sign request created
- Signing tokens generated

---

### Step 5: Get Signing URL
Run this command to get signing URL:

```bash
cd backend
node scripts/quick-test-guided.js
```

**Output**:
```
✅ Found sign request: XX
   Email: xxx@xxx.com
   Token: xxxxx
   OTP: 123456

🌐 Test URL:
   http://localhost:3000/sign/[token]
```

---

### Step 6: Sign Document (External Signer)
1. Copy the test URL
2. Open in browser (or incognito)
3. Enter email
4. Click "Gửi mã OTP"
5. Enter OTP (from script output)
6. Click "Bắt đầu" (Start Guided Mode)
7. Sign each field
8. Click "Hoàn tất ký"

**Expected**: 
- Thank you page shows
- Sidebar shows signer status
- Document status updates

---

### Step 7: Approve Document (Internal User)
1. Login as approver:
   - Email: `approver@acme.local`
   - Password: `password123`
2. Go to "Phê duyệt của tôi"
3. Find pending approval
4. Click to view detail
5. Click "Phê duyệt" (Approve)
6. Add signature (optional)
7. Add comment (optional)
8. Confirm

**Expected**:
- Approval status → "approved"
- Document moves to next step
- Email notification sent

---

## 🔍 Troubleshooting

### Issue: No documents in list
**Solution**: Upload a new document (Step 2)

### Issue: No approvals in "Phê duyệt của tôi"
**Reason**: Admin user is not an approver

**Solution**: 
1. Login as `approver@acme.local` / `password123`
2. Or assign approvals to admin:
```bash
cd backend
node scripts/reassign-all-approvals.js
```

### Issue: Cannot find signing URL
**Solution**: Run `node scripts/quick-test-guided.js`

### Issue: OTP expired
**Solution**: Run script again to get fresh OTP

### Issue: Backend not running
**Solution**: Check process logs:
```bash
getProcessOutput processId:5
```

---

## 📝 Quick Test Commands

```bash
# Check database
cd backend
node scripts/check-and-create-test-data.js

# Get signing URL + OTP
node scripts/quick-test-guided.js

# Check sign requests
node scripts/check-sign-requests-status.js

# Check approvals
node scripts/debug-my-pending.js

# Test approver login
node scripts/test-approver-login.js
```

---

## 🎯 Test Scenarios

### Scenario 1: Simple Signing (No Approval)
1. Upload document (no workflow)
2. Add fields
3. Send to signer
4. Signer signs
5. ✅ Complete

### Scenario 2: Signing + Approval
1. Upload document (with workflow)
2. Add fields
3. Send to signer
4. Signer signs
5. Approver approves
6. ✅ Complete

### Scenario 3: Multiple Signers
1. Upload document
2. Add fields for 3 signers
3. Send to all
4. Signer 1 signs
5. Signer 2 signs
6. Signer 3 signs
7. ✅ Complete

---

## 📊 Expected Results

### After Upload:
- Document in "Tài liệu" list
- Status: "draft"
- Sign request created

### After Send:
- Status: "pending"
- Signing tokens generated
- Signers can access via URL

### After Sign:
- Signer status: "completed"
- Thank you page shows
- Sidebar updates

### After Approve:
- Approval status: "approved"
- Document moves forward
- Email sent

---

## 🚀 Quick Start

**Fastest way to test**:

1. **Login**: http://localhost:3000
   - admin@acme.local / password123

2. **Upload**: Tài liệu → Tải lên → Select PDF → Upload

3. **Add Fields**: Click on PDF → Add signature field → Save

4. **Get URL**: 
   ```bash
   cd backend
   node scripts/quick-test-guided.js
   ```

5. **Sign**: Open URL → Enter OTP → Sign → Submit

6. **Done!** ✅

---

## 💡 Tips

- Use incognito window for external signer
- Keep backend logs open to see OTP
- Use `quick-test-guided.js` to get fresh OTP
- Check sidebar for real-time status
- Thank you page shows after signing

---

**Created**: 2025-11-24  
**Status**: ✅ Ready to test  
**Services**: All running
