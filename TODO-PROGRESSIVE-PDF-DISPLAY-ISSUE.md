# TODO: Progressive PDF Display Issue

## Vấn Đề Hiện Tại

Trang document flow vẫn hiển thị file PDF cũ thay vì progressive PDF mới nhất sau khi có người ký.

## Đã Làm ✅

### 1. Progressive PDF Generation - Backend
- ✅ Tạo function `generateProgressivePdf()` trong `pdfGeneration.service.ts`
- ✅ Thêm gọi progressive PDF trong `signInternal()` - Internal signing
- ✅ Thêm gọi progressive PDF trong `sign()` - External signing (OTP)
- ✅ Progressive PDF có watermark "CHƯA HOÀN THÀNH" khi chưa xong
- ✅ Progressive PDF có audit trail khi hoàn thành

### 2. Fix Document 030/2025
- ✅ Chạy script `fix-progressive-pdf-030.js` để tạo PDF cho document 030
- ✅ File được tạo: `storage\1\signing_1764434873201_82.pdf` (160KB)
- ✅ Database đã cập nhật `signed_file_path`

### 3. Frontend Auto-Refresh
- ✅ Thêm auto-refresh mỗi 10 giây khi `status = 'in_progress'`
- ✅ Thêm nút refresh thủ công
- ✅ Thêm UI indicators (badge "Tự động cập nhật")

### 4. Cache Busting
- ✅ Thêm timestamp vào URL: `?t={timestamp}`
- ✅ Thêm cache control headers trong frontend fetch
- ✅ Thêm cache control headers trong backend response

## Vấn Đề Còn Lại ❌

### Hiện Tượng
- Frontend vẫn hiển thị file PDF cũ
- Mặc dù đã có timestamp trong URL
- Mặc dù đã có cache control headers

### Nguyên Nhân Có Thể

#### 1. Database Chưa Cập Nhật
```javascript
// Kiểm tra xem signed_file_path trong DB có đúng không
const document = await prisma.documents.findUnique({
  where: { id: 82 },
  select: { signed_file_path: true }
});
console.log('signed_file_path:', document.signed_file_path);
```

**Cần kiểm tra:**
- ❓ `signed_file_path` có trỏ đến file mới nhất không?
- ❓ Có bị trỏ đến file cũ không?

#### 2. Backend Đọc Sai File
```javascript
// Backend đọc file từ signed_file_path
const filePath = path.resolve(process.cwd(), document.signed_file_path);
console.log('Reading file:', filePath);
console.log('File exists:', fs.existsSync(filePath));
```

**Cần kiểm tra:**
- ❓ Backend có đọc đúng file path không?
- ❓ File có tồn tại không?
- ❓ File có phải là file mới nhất không?

#### 3. Progressive PDF Không Được Gọi
```javascript
// Kiểm tra xem progressive PDF có được tạo sau mỗi lần ký không
// Xem backend logs khi có người ký
```

**Cần kiểm tra:**
- ❓ Có log `[Progressive PDF] Starting for sign request...` không?
- ❓ Có log `[Progressive PDF] Completed: ...` không?
- ❓ Có error trong quá trình tạo PDF không?

#### 4. React Query Cache
```javascript
// React Query có thể cache response cũ
// Cần invalidate cache khi có update
```

**Cần kiểm tra:**
- ❓ React Query có cache response không?
- ❓ Cache có được invalidate khi refetch không?

## Cách Debug

### Bước 1: Kiểm Tra Database
```bash
cd backend
node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); (async()=>{const doc = await prisma.documents.findUnique({where:{id:82},select:{signed_file_path:true,status:true}}); console.log('Document 82:', doc)})().then(()=>process.exit())"
```

**Kỳ vọng:**
- `signed_file_path` = `storage\1\signing_1764434873201_82.pdf` (hoặc file mới hơn)
- `status` = `in_progress`

### Bước 2: Kiểm Tra File Tồn Tại
```bash
cd backend
Test-Path "storage\1\signing_1764434873201_82.pdf"
```

**Kỳ vọng:**
- Trả về `True`

### Bước 3: Kiểm Tra Backend Logs
```bash
# Mở backend logs
# Tìm dòng "[Progressive PDF]" hoặc "[Internal Signing]" hoặc "[Signers Service]"
```

**Kỳ vọng:**
- Thấy log tạo PDF sau mỗi lần ký
- Không có error

### Bước 4: Kiểm Tra Network Request
```
1. Mở DevTools → Network tab
2. Refresh trang document flow
3. Tìm request đến /documents/82/view-signed
4. Xem response
```

**Kỳ vọng:**
- Request có timestamp: `?t=...`
- Response headers có `Cache-Control: no-cache`
- Response trả về file mới (check file size)

### Bước 5: Kiểm Tra React Query
```javascript
// Trong browser console
// Xem React Query cache
window.__REACT_QUERY_DEVTOOLS__
```

## Giải Pháp Tạm Thời

### Option 1: Force Reload Component
```typescript
// Thêm key vào SimplePDFViewer để force remount
<SimplePDFViewer 
  key={flowData?.document?.signed_file_path} 
  pdfUrl={pdfUrl} 
/>
```

### Option 2: Invalidate React Query Cache
```typescript
// Sau khi refetch, invalidate cache
const queryClient = useQueryClient();
queryClient.invalidateQueries(['document-flow', documentId]);
```

### Option 3: Bypass Cache Hoàn Toàn
```typescript
// Thêm random string thay vì timestamp
const cacheBuster = `?t=${Date.now()}&r=${Math.random()}`;
```

## Next Steps

1. **Kiểm tra database** xem `signed_file_path` có đúng không
2. **Kiểm tra backend logs** xem progressive PDF có được tạo không
3. **Kiểm tra network request** xem response trả về file gì
4. **Test với document mới** để xem progressive PDF có hoạt động không
5. **Nếu vẫn lỗi**, cần debug sâu hơn vào React Query cache

## Files Liên Quan

### Backend
- `backend/src/modules/signRequests/pdfGeneration.service.ts` - Generate PDF
- `backend/src/modules/signRequests/signRequests.service.ts` - Internal signing
- `backend/src/modules/signers/signers.service.ts` - External signing
- `backend/src/modules/documents/documents.controller.ts` - View endpoint
- `backend/src/modules/documents/documents.service.ts` - Get file path

### Frontend
- `frontend/app/(dashboard)/documents/[id]/flow/page.tsx` - Document flow page
- `frontend/components/pdf/SimplePDFViewer.tsx` - PDF viewer

### Scripts
- `backend/scripts/fix-progressive-pdf-030.js` - Fix script cho doc 030
- `backend/scripts/check-document-030.js` - Check script

## Tài Liệu Tham Khảo

- `PROGRESSIVE-PDF-FIX-030.md` - Fix cho document 030
- `DOCUMENT-FLOW-AUTO-REFRESH.md` - Auto-refresh feature
- `FIX-PDF-CACHE-ISSUE.md` - Cache busting solution
- `docs/dev/ANALYSIS-PROGRESSIVE-PDF-GENERATION.md` - Analysis ban đầu

## Debug Results ✅

### Database Check
```
Document 82:
{
  "id": 82,
  "document_number": "030/2025",
  "signed_file_path": "storage\\1\\signing_1764434873201_82.pdf",
  "status": "in_progress",
  "created_at": "2025-11-29T15:42:54.597Z"
}

File check:
  Path: storage\1\signing_1764434873201_82.pdf
  Exists: true
  Size: 160.04 KB
  Modified: 2025-11-29T16:47:53.202Z
```

✅ **Database đúng** - `signed_file_path` trỏ đến file mới  
✅ **File tồn tại** - File có size 160KB  
✅ **File mới** - Modified time là 16:47 (sau khi fix)

### Vấn Đề Thực Sự

Vì database và file đều đúng, vấn đề có thể là:

1. **React Query Cache** - Frontend cache response cũ
2. **PDF.js Cache** - PDF viewer cache file cũ
3. **Browser Cache** - Mặc dù đã có cache control headers

## Giải Pháp Cuối Cùng

### Option 1: Force Remount PDF Viewer (KHUYẾN NGHỊ)
```typescript
// Thêm key để force remount khi signed_file_path thay đổi
<SimplePDFViewer 
  key={flowData?.document?.signed_file_path || pdfUrl} 
  pdfUrl={pdfUrl} 
/>
```

### Option 2: Clear PDF.js Cache
```typescript
// Trong SimplePDFViewer, cleanup PDF document khi unmount
useEffect(() => {
  return () => {
    if (pdf) {
      pdf.cleanup();
      pdf.destroy();
    }
  };
}, [pdf]);
```

### Option 3: Invalidate React Query Cache
```typescript
// Sau khi refetch, invalidate toàn bộ cache
const queryClient = useQueryClient();
useEffect(() => {
  if (flowData?.document?.signed_file_path) {
    queryClient.invalidateQueries(['document-flow']);
  }
}, [flowData?.document?.signed_file_path]);
```

## Status

🟡 **ĐÃ XÁC ĐỊNH NGUYÊN NHÂN** - Backend đúng, vấn đề ở frontend cache

**Next Step**: Implement Option 1 (force remount) để fix

---

**Ghi chú**: Database và backend hoạt động đúng. Progressive PDF được tạo và lưu đúng. Vấn đề là frontend cache không được clear khi có file mới.
