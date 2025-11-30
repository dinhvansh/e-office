# Fix: PDF Cache Issue - Hiển Thị File Cũ

## Vấn Đề

Khi có người ký mới, trang document flow vẫn hiển thị PDF cũ thay vì progressive PDF mới nhất. Nguyên nhân là **browser cache**.

## Nguyên Nhân

1. **Browser Cache**: Trình duyệt cache file PDF với cùng URL
2. **Không có Cache Busting**: URL không thay đổi khi file PDF cập nhật
3. **Backend không disable cache**: Server không gửi headers để disable cache

## Giải Pháp

### 1. Frontend - Thêm Cache Busting ✅

**File**: `frontend/app/(dashboard)/documents/[id]/flow/page.tsx`

**Thay đổi**:
```typescript
// Thêm timestamp vào URL để force reload
const timestamp = Date.now();
const cacheBuster = hasSignedFile ? `?t=${timestamp}` : '';
setPdfUrl(`${apiUrl}/documents/${documentId}/${endpoint}${cacheBuster}`);
```

**Kết quả**:
- URL thay đổi mỗi khi `signed_file_path` thay đổi
- Ví dụ: `/documents/82/view-signed?t=1764434873201`
- Browser không dùng cache vì URL khác

### 2. Frontend - Thêm Cache Control Headers ✅

**File**: `frontend/components/pdf/SimplePDFViewer.tsx`

**Thay đổi**:
```typescript
const response = await fetch(pdfUrl, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
```

**Kết quả**:
- Request luôn fetch file mới từ server
- Không dùng cached response

### 3. Backend - Disable Cache ✅

**File**: `backend/src/modules/documents/documents.controller.ts`

**Thay đổi**:
```typescript
// Trong viewSigned method
res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
res.setHeader('Pragma', 'no-cache');
res.setHeader('Expires', '0');
```

**Kết quả**:
- Server báo browser không cache file này
- Mỗi request đều trả về file mới nhất

## Cách Hoạt Động

### Luồng Cũ (Có Cache Issue)
```
1. User mở trang → Load PDF từ /documents/82/view-signed
2. Browser cache PDF này
3. Người mới ký → Backend tạo progressive PDF mới
4. User refresh → Browser dùng cached PDF (FILE CŨ) ❌
```

### Luồng Mới (Đã Fix)
```
1. User mở trang → Load PDF từ /documents/82/view-signed?t=1764434873201
2. Browser cache PDF này
3. Người mới ký → Backend tạo progressive PDF mới
4. Auto-refresh (10s) → URL mới: /documents/82/view-signed?t=1764435000000
5. Browser thấy URL khác → Fetch file mới từ server
6. Server trả về với headers no-cache
7. User thấy PDF MỚI với chữ ký mới ✅
```

## Cache Control Headers Giải Thích

| Header | Ý Nghĩa |
|--------|---------|
| `Cache-Control: no-cache` | Phải revalidate với server trước khi dùng cache |
| `Cache-Control: no-store` | Không lưu cache |
| `Cache-Control: must-revalidate` | Cache phải revalidate khi stale |
| `Pragma: no-cache` | HTTP/1.0 backward compatibility |
| `Expires: 0` | Cache đã hết hạn ngay lập tức |

## Test Case

### Test 1: Xem Progressive PDF Mới
1. Mở document 030: http://localhost:3000/documents/82/flow
2. Mở DevTools → Network tab
3. Xem request đến `/documents/82/view-signed?t=...`
4. ✅ Thấy timestamp trong URL
5. ✅ Response headers có `Cache-Control: no-cache`
6. ✅ PDF hiển thị đúng với 2 chữ ký

### Test 2: Auto Refresh Sau Khi Ký
1. Để trang mở
2. Người thứ 3 ký tài liệu
3. Đợi 10 giây (auto-refresh)
4. Xem Network tab
5. ✅ Request mới với timestamp mới
6. ✅ PDF cập nhật với 3 chữ ký
7. ✅ Không còn watermark

### Test 3: Manual Refresh
1. Bấm nút refresh (icon RefreshCw)
2. Xem Network tab
3. ✅ Request mới với timestamp mới
4. ✅ PDF reload ngay lập tức

### Test 4: Hard Refresh Browser
1. Bấm Ctrl+Shift+R (hard refresh)
2. ✅ PDF vẫn hiển thị đúng file mới nhất
3. ✅ Không bị stuck với cache cũ

## Files Modified

1. ✅ `frontend/app/(dashboard)/documents/[id]/flow/page.tsx`
   - Thêm timestamp cache busting
   - Update useEffect dependencies

2. ✅ `frontend/components/pdf/SimplePDFViewer.tsx`
   - Thêm cache control headers trong fetch

3. ✅ `backend/src/modules/documents/documents.controller.ts`
   - Thêm cache control headers trong response

## Technical Details

### Cache Busting Strategy
- **Method**: Query string với timestamp
- **Format**: `?t={timestamp}`
- **Trigger**: Khi `signed_file_path` thay đổi
- **Benefit**: Simple, effective, không cần thay đổi backend routing

### Why Timestamp?
- ✅ Unique cho mỗi lần file thay đổi
- ✅ Không cần track version number
- ✅ Tự động tăng theo thời gian
- ✅ Dễ debug (thấy rõ thời điểm request)

### Alternative Solutions (Không dùng)
1. **ETag**: Phức tạp, cần backend support
2. **Version Number**: Cần track version trong DB
3. **Random String**: Không có ý nghĩa, khó debug
4. **File Hash**: Tốn performance để tính hash

## Performance Impact

### Trước (Có Cache)
- ✅ Fast: Dùng cached file
- ❌ Wrong: Hiển thị file cũ

### Sau (No Cache)
- ⚠️ Slower: Mỗi lần đều fetch từ server
- ✅ Correct: Luôn hiển thị file mới nhất

**Trade-off**: Chấp nhận chậm hơn một chút để đảm bảo hiển thị đúng.

**Optimization**: 
- Auto-refresh chỉ khi `status = 'in_progress'`
- Dừng auto-refresh khi `status = 'completed'`
- Khi completed, có thể enable cache lại

## Future Improvements

### 1. Conditional Caching
```typescript
// Chỉ disable cache khi đang ký
if (document.status === 'in_progress') {
  res.setHeader('Cache-Control', 'no-cache');
} else {
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
}
```

### 2. ETag Support
```typescript
// Backend tính ETag từ file modification time
const stats = fs.statSync(filePath);
const etag = `"${stats.mtime.getTime()}"`;
res.setHeader('ETag', etag);
```

### 3. Service Worker
- Cache completed PDFs
- Invalidate cache khi có update
- Offline support

## Summary

✅ **Đã fix cache issue bằng 3 cách:**
1. Frontend: Thêm timestamp vào URL (cache busting)
2. Frontend: Thêm no-cache headers trong request
3. Backend: Thêm no-cache headers trong response

✅ **Kết quả:**
- Trang luôn hiển thị progressive PDF mới nhất
- Không bị stuck với cached file cũ
- Auto-refresh hoạt động đúng
- Manual refresh hoạt động đúng

**Bây giờ người dùng sẽ thấy PDF cập nhật ngay khi có người ký mới!** 🎉
