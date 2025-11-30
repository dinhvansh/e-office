# Cập Nhật: Tự Động Hiển Thị Progressive PDF

## Vấn Đề
Trang document flow (`/documents/[id]/flow`) chỉ hiển thị PDF đã ký khi tài liệu hoàn thành (`status = 'completed'`). Khi có người ký mới, người dùng không thấy PDF cập nhật.

## Giải Pháp

### 1. Hiển Thị Progressive PDF ✅

**Trước:**
```typescript
// Chỉ hiển thị signed PDF khi completed
const useSignedFile = flowData?.document?.signed_file_path && 
                     flowData?.document?.status === 'completed';
```

**Sau:**
```typescript
// Hiển thị signed PDF ngay khi có (progressive hoặc completed)
const hasSignedFile = flowData?.document?.signed_file_path;
const endpoint = hasSignedFile ? 'view-signed' : 'view';
```

**Kết quả:**
- ✅ Hiển thị PDF với chữ ký ngay khi có người ký
- ✅ Hiển thị watermark "CHƯA HOÀN THÀNH" khi đang ký
- ✅ Hiển thị PDF hoàn thành với audit trail khi ký xong

### 2. Tự Động Refresh ✅

**Thêm auto-refresh:**
```typescript
refetchInterval: (data) => {
  const status = data?.document?.status;
  if (status === 'in_progress' || status === 'pending') {
    return 10000; // Refresh mỗi 10 giây
  }
  return false; // Dừng khi hoàn thành
}
```

**Kết quả:**
- ✅ Tự động cập nhật mỗi 10 giây khi tài liệu đang xử lý
- ✅ Dừng auto-refresh khi hoàn thành hoặc bị từ chối
- ✅ Refresh khi người dùng quay lại tab

### 3. UI Improvements ✅

**Thêm các chỉ báo:**

1. **Badge "Tự động cập nhật"**
   - Hiển thị khi tài liệu đang xử lý
   - Có animation pulse để thu hút sự chú ý

2. **Nút Refresh thủ công**
   - Icon RefreshCw với animation spin khi đang load
   - Cho phép người dùng refresh ngay lập tức

3. **Thông tin trạng thái PDF**
   - Hiển thị "Có PDF đang ký" hoặc "Có PDF hoàn thành"
   - Màu xanh để dễ nhận biết

4. **Tên file download**
   - `{document_number}-dang-ky.pdf` - Khi đang ký
   - `{document_number}-hoan-thanh.pdf` - Khi hoàn thành

## Luồng Hoạt Động

### Khi Có Người Ký Mới

1. **Backend** tạo progressive PDF với chữ ký mới
2. **Database** cập nhật `signed_file_path`
3. **Frontend** tự động refresh sau 10 giây (hoặc người dùng bấm nút refresh)
4. **PDF Viewer** load file mới từ `signed_file_path`
5. **Người dùng** thấy PDF cập nhật với chữ ký mới + watermark

### Khi Ký Xong

1. **Backend** tạo PDF cuối cùng với audit trail, không có watermark
2. **Database** cập nhật `status = 'completed'`
3. **Frontend** refresh và dừng auto-refresh
4. **PDF Viewer** hiển thị PDF hoàn thành
5. **Badge** "Tự động cập nhật" biến mất

## Test Case

### Test 1: Xem Progressive PDF
1. Mở tài liệu 030/2025: http://localhost:3000/documents/82/flow
2. ✅ Thấy PDF với 2 chữ ký
3. ✅ Thấy watermark "CHƯA HOÀN THÀNH"
4. ✅ Thấy badge "Tự động cập nhật"
5. ✅ Thấy text "Có PDF đang ký"

### Test 2: Auto Refresh
1. Để trang mở
2. Người thứ 3 ký tài liệu
3. ✅ Sau 10 giây, trang tự động cập nhật
4. ✅ PDF hiển thị 3 chữ ký
5. ✅ Không còn watermark
6. ✅ Badge "Tự động cập nhật" biến mất
7. ✅ Text đổi thành "Có PDF hoàn thành"

### Test 3: Manual Refresh
1. Mở tài liệu đang ký
2. Bấm nút refresh (icon RefreshCw)
3. ✅ Icon quay (spin animation)
4. ✅ Dữ liệu cập nhật ngay lập tức
5. ✅ PDF reload với dữ liệu mới nhất

### Test 4: Download
1. Bấm nút "Tải xuống"
2. ✅ File tải về có tên đúng:
   - `030-2025-dang-ky.pdf` (nếu đang ký)
   - `030-2025-hoan-thanh.pdf` (nếu hoàn thành)
3. ✅ File chứa progressive PDF hoặc final PDF

## Files Modified

1. ✅ `frontend/app/(dashboard)/documents/[id]/flow/page.tsx`
   - Thêm auto-refresh logic
   - Cập nhật PDF display logic
   - Thêm UI indicators
   - Thêm manual refresh button

## Technical Details

### Auto-Refresh Strategy
- **Interval**: 10 giây (có thể điều chỉnh)
- **Condition**: Chỉ khi `status = 'in_progress'` hoặc `'pending'`
- **Stop**: Tự động dừng khi `status = 'completed'` hoặc `'rejected'`
- **Window Focus**: Refresh khi người dùng quay lại tab

### PDF Display Priority
1. Nếu có `signed_file_path` → Hiển thị progressive/signed PDF
2. Nếu không → Hiển thị original PDF

### Performance
- ✅ Không refresh khi không cần thiết (completed/rejected)
- ✅ Sử dụng React Query cache để tránh duplicate requests
- ✅ Chỉ reload PDF khi `signed_file_path` thay đổi

## Benefits

1. **Real-time Updates**: Người dùng thấy tiến độ ký ngay lập tức
2. **Better UX**: Không cần refresh trang thủ công
3. **Transparency**: Thấy rõ ai đã ký, ai chưa ký
4. **Progressive Disclosure**: Thấy PDF cập nhật từng bước
5. **Watermark**: Phân biệt rõ tài liệu đang ký vs hoàn thành

## Summary

✅ **Trang document flow giờ đây:**
- Tự động hiển thị progressive PDF khi có người ký mới
- Tự động refresh mỗi 10 giây khi tài liệu đang xử lý
- Có nút refresh thủ công cho người dùng
- Hiển thị các indicator rõ ràng về trạng thái
- Download file với tên phù hợp với trạng thái

**Người dùng không cần làm gì**, trang sẽ tự động cập nhật và hiển thị PDF mới nhất! 🎉
