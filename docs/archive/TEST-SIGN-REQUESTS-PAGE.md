# Test Checklist: Sign Requests Page

## 🧪 Backend API Testing

### Test 1: Get All Sign Requests
```bash
node backend/scripts/test-my-sign-requests.js
```
**Expected**: ✅ Returns all sign requests for logged-in user

### Test 2: Filter by Status
- [ ] Filter by "pending" - Returns only pending requests
- [ ] Filter by "completed" - Returns only completed requests
- [ ] Filter by "rejected" - Returns only rejected requests
- [ ] Filter by "all" - Returns all requests

### Test 3: Progress Calculation
- [ ] Progress percentage is accurate (signed/total * 100)
- [ ] Signed count is correct
- [ ] Rejected count is correct
- [ ] Pending count is correct

## 🎨 Frontend UI Testing

### Test 4: Page Load
1. Login to dashboard
2. Navigate to "Quy trình ký" menu
3. **Expected**: Page loads with sign requests table

### Test 5: Filter Tabs
- [ ] Click "Tất cả" - Shows all requests
- [ ] Click "Chờ ký" - Shows only pending
- [ ] Click "Đã hoàn thành" - Shows only completed
- [ ] Click "Đã từ chối" - Shows only rejected
- [ ] Tab counts are accurate

### Test 6: Search Functionality
- [ ] Search by document name - Filters correctly
- [ ] Search by document number - Filters correctly
- [ ] Clear search - Shows all results
- [ ] Case-insensitive search works

### Test 7: Table Display
- [ ] Mã yêu cầu column shows document number or ID
- [ ] Tên tài liệu column shows title or filename
- [ ] Người tạo column shows owner name or email
- [ ] Ngày tạo column shows formatted date (DD/MM/YYYY)
- [ ] Tiến độ column shows progress bar + count (2/3)
- [ ] Trạng thái column shows colored badge
- [ ] Hành động column shows "Xem" button

### Test 8: Progress Bar Colors
- [ ] Green: 100% complete
- [ ] Yellow: 1-99% complete
- [ ] Red: Has rejections
- [ ] Gray: Cancelled

### Test 9: Status Badges
- [ ] "Đã hoàn thành" - Green badge
- [ ] "Chờ ký" - Yellow badge
- [ ] "Đã từ chối" - Red badge
- [ ] "Đã hủy" - Gray badge
- [ ] "Nháp" - Secondary badge

### Test 10: Navigation
- [ ] Click "Xem" button - Navigates to document detail page
- [ ] URL is correct: `/documents/{id}`
- [ ] Document detail page loads

### Test 11: Responsive Design
- [ ] Desktop view - Table displays correctly
- [ ] Tablet view - Table scrolls horizontally
- [ ] Mobile view - Table scrolls horizontally
- [ ] No layout breaks

### Test 12: Empty States
- [ ] No sign requests - Shows "Chưa có yêu cầu ký nào"
- [ ] Search no results - Shows "Không tìm thấy yêu cầu ký nào"
- [ ] Loading state - Shows "Đang tải..."

## 🔒 Security Testing

### Test 13: Authorization
- [ ] User only sees their own sign requests (owner_id = user_id)
- [ ] Cannot see other users' sign requests
- [ ] Admin sees only their own requests (not all)

### Test 14: Tenant Isolation
- [ ] Sign requests filtered by tenant_id
- [ ] Cannot access other tenants' data

## 📊 Performance Testing

### Test 15: Large Dataset
- [ ] Page loads quickly with 50+ sign requests
- [ ] Search is responsive
- [ ] Filter tabs switch quickly
- [ ] No lag when scrolling table

## ✅ Acceptance Criteria

All tests must pass before marking as complete:
- [ ] Backend API returns correct data
- [ ] Frontend displays all information
- [ ] Filters work correctly
- [ ] Search works correctly
- [ ] Progress bars display accurately
- [ ] Status badges show correct colors
- [ ] Navigation works
- [ ] Responsive on all devices
- [ ] No TypeScript errors
- [ ] No console errors

## 🎯 Test Credentials

**Admin User**:
- Email: `admin@acme.local`
- Password: `password123`

**Test Data**:
- 49 total sign requests
- 5 pending
- 1 completed
- 1 in progress
- 42 draft

## 📝 Notes

- Test with different users to verify owner filtering
- Test with different screen sizes
- Check browser console for errors
- Verify all links work correctly
- Test keyboard navigation (Tab, Enter)

---

**Status**: Ready for Testing  
**Priority**: High  
**Estimated Time**: 30 minutes
