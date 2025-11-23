# Verification Checklist - Guided Signing Flow

**Date**: November 23, 2025  
**Feature**: Guided Signing Flow + Digital Signature + Inline Recipients

## ✅ Pre-Testing Checklist

### 1. Environment Setup
- [ ] Node.js installed (v18+)
- [ ] Docker Desktop running
- [ ] PostgreSQL container running (port 5432)
- [ ] Redis container running (port 6379)
- [ ] All dependencies installed (`npm install` in backend, frontend, license-server)

### 2. Database Setup
- [ ] Database schema up to date (`npx prisma db push`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Sample data loaded (optional: `node scripts/restore-database.js sample-database-backup.json`)

### 3. Servers Running
- [ ] Backend API running (http://localhost:4000)
- [ ] Frontend running (http://localhost:3000)
- [ ] License server running (http://localhost:5000)
- [ ] No errors in console logs

### 4. Login Working
- [ ] Can access http://localhost:3000
- [ ] Can login with admin@acme.local / password123
- [ ] Dashboard loads correctly
- [ ] No console errors

---

## ✅ Feature Testing Checklist

### Part 1: Inline Recipients, CC & Attachments

#### Upload Form
- [ ] Navigate to Documents page
- [ ] Click "Upload Document" button
- [ ] Form shows all sections:
  - [ ] File upload
  - [ ] Document type dropdown
  - [ ] Digital signing checkbox
  - [ ] Signers section (when checked)
  - [ ] CC emails section
  - [ ] Attachments section

#### Signers Section
- [ ] Can toggle between Manual and External Org
- [ ] Manual mode:
  - [ ] Can add signer (email + name + order)
  - [ ] Can remove signer
  - [ ] Validation works (email format)
- [ ] External org mode:
  - [ ] Dropdown shows organizations
  - [ ] Auto-fills contact person and email
  - [ ] Shows org icon

#### CC Emails Section
- [ ] Can add email
- [ ] Email validation works
- [ ] Shows as badge
- [ ] Can remove email
- [ ] Enter key adds email

#### Attachments Section
- [ ] Can select files
- [ ] Shows file name and size
- [ ] Can remove file
- [ ] Max 5 files enforced
- [ ] Max 10MB per file enforced
- [ ] Total size displayed

#### Upload & Save
- [ ] Click "Upload" button
- [ ] Loading state shows
- [ ] Success toast appears
- [ ] Auto-redirects to sign editor (if digital signing)
- [ ] Data saved to database

---

### Part 2: Digital Signature

#### Signature Modal
- [ ] Modal opens when clicking "Ký tài liệu"
- [ ] Shows 3 tabs: Draw, Upload, Type
- [ ] Draw tab:
  - [ ] Canvas works
  - [ ] Can draw signature
  - [ ] Clear button works
  - [ ] Preview shows signature
- [ ] Upload tab:
  - [ ] Can select image file
  - [ ] Max 2MB enforced
  - [ ] Preview shows image
- [ ] Type tab:
  - [ ] Can type name
  - [ ] Generates signature
  - [ ] Preview shows generated signature
- [ ] Confirm button works
- [ ] Cancel button works

#### Public Signing Page
- [ ] Can access with signing token
- [ ] Shows document info
- [ ] Shows signer info
- [ ] Shows deadline
- [ ] PDF viewer loads
- [ ] Signature fields visible

#### OTP Flow
- [ ] Email field pre-filled
- [ ] "Gửi mã OTP" button works
- [ ] OTP sent toast appears
- [ ] OTP input appears
- [ ] Can enter 6-digit OTP
- [ ] Validation works

#### Signing Process
- [ ] Can click signature field
- [ ] Signature modal opens
- [ ] Can sign field
- [ ] Signature appears in field
- [ ] Can change signature
- [ ] "Hoàn tất ký" button enabled
- [ ] Submit works
- [ ] Success page shows

---

### Part 3: Guided Signing Flow

#### Start Guided Mode
- [ ] "Bắt đầu" button appears after OTP
- [ ] Button shows field count
- [ ] Gradient blue design
- [ ] Icon shows (Play)

#### Progress Header
- [ ] Header appears when guided mode starts
- [ ] Shows step counter (e.g., "Bước 2 / 5")
- [ ] Shows progress bar (0-100%)
- [ ] Progress bar animates
- [ ] Exit button works
- [ ] Sticky positioning (stays at top)

#### Field Highlighting
- [ ] Current field has:
  - [ ] Blue border (border-blue-600)
  - [ ] Blue background (bg-blue-100)
  - [ ] Pulse animation
  - [ ] Ring effect (ring-4 ring-blue-300)
  - [ ] Large shadow
  - [ ] Tooltip: "👉 Ký vào đây"
- [ ] Completed fields have:
  - [ ] Green border
  - [ ] Green background
  - [ ] Checkmark icon
- [ ] Disabled fields have:
  - [ ] Gray border
  - [ ] Gray background
  - [ ] 50% opacity
  - [ ] Not clickable
  - [ ] Tooltip: "⏳ Chờ đến lượt"

#### Auto-scroll
- [ ] Scrolls to first field on start
- [ ] Smooth scroll animation
- [ ] Centers field in viewport
- [ ] Pulse animation after scroll
- [ ] Scrolls to next field after signing

#### Progress Tracking
- [ ] Progress updates after each field
- [ ] Step counter increments
- [ ] Progress bar fills
- [ ] Completion badge updates (e.g., "2 / 5 hoàn thành")

#### Completion
- [ ] After last field:
  - [ ] Toast: "🎉 Đã ký xong tất cả!"
  - [ ] Guided mode exits
  - [ ] Progress header disappears
  - [ ] All fields show as completed
- [ ] "Hoàn tất ký" button enabled
- [ ] Can submit signatures

#### Exit Guided Mode
- [ ] Exit button works
- [ ] Guided mode exits
- [ ] Progress header disappears
- [ ] Fields return to normal state
- [ ] Can re-enter guided mode

---

## ✅ Integration Testing

### Complete Flow (End-to-End)
- [ ] 1. Login as admin
- [ ] 2. Upload document with digital signing
- [ ] 3. Add signers (manual + external org)
- [ ] 4. Add CC emails
- [ ] 5. Add attachments
- [ ] 6. Upload successful
- [ ] 7. Auto-redirect to editor
- [ ] 8. Add signature fields (3 fields)
- [ ] 9. Save fields
- [ ] 10. Send sign request
- [ ] 11. Get signing token
- [ ] 12. Open public signing page
- [ ] 13. Enter email
- [ ] 14. Send OTP
- [ ] 15. Enter OTP
- [ ] 16. Click "Bắt đầu"
- [ ] 17. Guided mode activates
- [ ] 18. Sign Field 1
- [ ] 19. Progress: 1 / 3 (33%)
- [ ] 20. Auto-scroll to Field 2
- [ ] 21. Sign Field 2
- [ ] 22. Progress: 2 / 3 (67%)
- [ ] 23. Auto-scroll to Field 3
- [ ] 24. Sign Field 3
- [ ] 25. Progress: 3 / 3 (100%)
- [ ] 26. Toast: "🎉 Đã ký xong tất cả!"
- [ ] 27. Guided mode exits
- [ ] 28. Click "Hoàn tất ký"
- [ ] 29. Submit successful
- [ ] 30. Success page shows

---

## ✅ Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Firefox Mobile

### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## ✅ Performance Testing

### Load Times
- [ ] Document upload < 2 seconds
- [ ] PDF viewer loads < 3 seconds
- [ ] Signature modal opens < 500ms
- [ ] Auto-scroll smooth (no lag)
- [ ] Progress updates instant

### Animations
- [ ] Pulse animation smooth
- [ ] Ring effect smooth
- [ ] Progress bar smooth
- [ ] Scroll animation smooth
- [ ] No jank or stuttering

---

## ✅ Error Handling

### Validation Errors
- [ ] Invalid email format
- [ ] Empty required fields
- [ ] File size too large
- [ ] Too many files
- [ ] Invalid OTP

### Network Errors
- [ ] Upload fails gracefully
- [ ] OTP send fails gracefully
- [ ] Submit fails gracefully
- [ ] Shows error toast
- [ ] Can retry

### Edge Cases
- [ ] No fields to sign
- [ ] Already signed
- [ ] Expired token
- [ ] Invalid token
- [ ] Network offline

---

## ✅ Security Testing

### Authentication
- [ ] Cannot access without token
- [ ] Token expires correctly
- [ ] OTP required
- [ ] OTP hashed in database

### Authorization
- [ ] Cannot sign other's documents
- [ ] Cannot access other tenant's data
- [ ] IP address logged
- [ ] User agent logged

### Data Validation
- [ ] Email validation
- [ ] File type validation
- [ ] File size validation
- [ ] OTP format validation

---

## ✅ Database Testing

### Data Integrity
- [ ] Signers saved correctly
- [ ] CC emails saved correctly
- [ ] Attachments saved correctly
- [ ] Signature data saved correctly
- [ ] IP and user agent saved
- [ ] Timestamps correct

### Relations
- [ ] Document → Signers
- [ ] Document → CC Emails
- [ ] Document → Attachments
- [ ] Signer → Signature Data
- [ ] All foreign keys valid

---

## ✅ Documentation Testing

### User Documentation
- [ ] Setup guide accurate
- [ ] Test scripts work
- [ ] Commands correct
- [ ] Screenshots up to date

### Developer Documentation
- [ ] API documentation accurate
- [ ] Component props documented
- [ ] Code comments clear
- [ ] Architecture diagrams accurate

---

## ✅ Automated Tests

### Test Scripts
- [ ] `test-inline-recipients-cc-attachments.js` passes
- [ ] `test-digital-signature.js` passes
- [ ] `test-guided-signing-flow.js` passes
- [ ] All 11 tests pass (100%)

### TypeScript
- [ ] No compilation errors
- [ ] No type errors
- [ ] All diagnostics pass

---

## 📊 Test Results Summary

### Features Tested
- [ ] Inline Recipients, CC & Attachments
- [ ] Digital Signature (3 methods)
- [ ] Guided Signing Flow
- [ ] Complete Integration

### Test Coverage
- [ ] Unit Tests: ___/___
- [ ] Integration Tests: ___/___
- [ ] Manual Tests: ___/___
- [ ] Overall: ___% pass rate

### Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Issues Fixed
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## ✅ Sign-off

### Developer
- [ ] All features implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Ready for user testing

**Signed**: ________________  
**Date**: ________________

### QA
- [ ] All tests executed
- [ ] All issues documented
- [ ] Critical bugs fixed
- [ ] Ready for production

**Signed**: ________________  
**Date**: ________________

### Product Owner
- [ ] Features meet requirements
- [ ] UX acceptable
- [ ] Ready for release

**Signed**: ________________  
**Date**: ________________

---

## 🎯 Next Steps

After completing this checklist:

1. **If all tests pass**:
   - [ ] Commit changes
   - [ ] Push to repository
   - [ ] Create release notes
   - [ ] Deploy to staging
   - [ ] User acceptance testing

2. **If issues found**:
   - [ ] Document all issues
   - [ ] Prioritize fixes
   - [ ] Fix critical bugs
   - [ ] Re-test
   - [ ] Update documentation

3. **User Testing**:
   - [ ] Recruit test users
   - [ ] Prepare test scenarios
   - [ ] Observe user behavior
   - [ ] Collect feedback
   - [ ] Iterate based on feedback

---

**Checklist Version**: 1.0  
**Last Updated**: November 23, 2025  
**Status**: Ready for Testing
