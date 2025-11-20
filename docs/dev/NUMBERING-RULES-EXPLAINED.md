# 🔢 Numbering Rules - Giải thích chi tiết

**Date**: 2025-11-20

---

## 📖 Numbering Rules là gì?

**Numbering Rules** = Quy tắc đánh số tự động cho văn bản

Trong hệ thống E-Office, mỗi loại văn bản cần có số văn bản riêng theo quy định:
- Công văn đến: `001/CV-ĐẾN/2025`
- Công văn đi: `001/CV-ĐI/2025`
- Hợp đồng: `HD-001/2025`
- Quyết định: `QD/2025/001`

---

## 🎯 Mục đích

1. **Tự động hóa**: Không cần nhập số văn bản thủ công
2. **Chuẩn hóa**: Tất cả văn bản cùng loại có format giống nhau
3. **Tránh trùng**: Hệ thống tự động tăng số, không bao giờ trùng
4. **Quản lý**: Dễ dàng tìm kiếm và theo dõi văn bản

---

## 🔧 Cách hoạt động

### 1. Pattern (Mẫu)
Admin cấu hình pattern cho mỗi loại văn bản:

```
{AUTO}/{TYPE}/{YEAR}
```

### 2. Tokens (Biến)
- `{AUTO}` = Số tự động tăng: 001, 002, 003...
- `{YEAR}` = Năm hiện tại: 2025
- `{MONTH}` = Tháng: 01, 02, 03...
- `{DEPT}` = Mã phòng ban: IT, HR, FIN...
- `{TYPE}` = Mã loại văn bản: CV, HD, QD...

### 3. Ví dụ

**Pattern**: `{AUTO}/{TYPE}/{YEAR}`

**Kết quả**:
- Văn bản 1: `001/CV/2025`
- Văn bản 2: `002/CV/2025`
- Văn bản 3: `003/CV/2025`

**Pattern**: `{TYPE}-{AUTO}/{YEAR}`

**Kết quả**:
- Hợp đồng 1: `HD-001/2025`
- Hợp đồng 2: `HD-002/2025`

### 4. Yearly Reset
Nếu bật "Reset hàng năm":
- 2025: `001/CV/2025`, `002/CV/2025`
- 2026: `001/CV/2026`, `002/CV/2026` (bắt đầu lại từ 001)

---

## ✅ Hiện trạng trong hệ thống

### Backend (100% HOÀN THÀNH)

**Database**:
```prisma
model numbering_rules {
  id                Int       @id
  tenant_id         Int
  document_type_id  Int
  pattern           String    // "{AUTO}/{TYPE}/{YEAR}"
  reset_yearly      Boolean   // true/false
  last_number       Int       // 5 (số cuối cùng đã dùng)
  last_reset_year   Int?      // 2025
  is_active         Boolean
}
```

**API Endpoints**:
- ✅ `GET /api/v1/numbering-rules` - Lấy tất cả rules
- ✅ `GET /api/v1/numbering-rules/:documentTypeId` - Lấy rule theo loại văn bản
- ✅ `POST /api/v1/numbering-rules` - Tạo rule mới
- ✅ `PUT /api/v1/numbering-rules/:id` - Cập nhật rule
- ✅ `POST /api/v1/numbering-rules/generate` - Generate số mới
- ✅ `POST /api/v1/numbering-rules/preview` - Preview số (không lưu)

**Service**:
- ✅ Parse pattern với tokens
- ✅ Auto-increment last_number
- ✅ Yearly reset logic
- ✅ Transaction-safe (không bị trùng số)

### Frontend (0% - CHƯA CÓ UI)

**Hiện tại**:
- ❌ Không có trang quản lý numbering rules
- ❌ Không có UI để configure pattern
- ❌ Không có pattern builder
- ❌ Không có preview function

**Cách dùng hiện tại**:
- Phải dùng API trực tiếp (Postman, REST Client)
- Hoặc config qua seed script
- Hoặc insert trực tiếp vào database

---

## 🎨 UI cần làm (Task 1.11)

### Trang: `/document-types/[id]/numbering`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Cấu hình đánh số - Công văn đến        │
├─────────────────────────────────────────┤
│                                         │
│ Pattern Builder:                        │
│ ┌─────────────────────────────────────┐ │
│ │ {AUTO} / {TYPE} / {YEAR}            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Available Tokens:                       │
│ [+{AUTO}] [+{YEAR}] [+{MONTH}]         │
│ [+{DEPT}] [+{TYPE}]                    │
│                                         │
│ Preview:                                │
│ ┌─────────────────────────────────────┐ │
│ │ 001/CV/2025                         │ │
│ │ 002/CV/2025                         │ │
│ │ 003/CV/2025                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ☑ Reset hàng năm                       │
│                                         │
│ [Lưu cấu hình]                         │
└─────────────────────────────────────────┘
```

**Features**:
1. Pattern input với syntax highlighting
2. Token buttons để insert vào pattern
3. Preview real-time (3-5 số mẫu)
4. Reset yearly checkbox
5. Validation (pattern phải có {AUTO})
6. Save button

---

## 📊 So sánh: Có UI vs Không có UI

### Không có UI (hiện tại):
```bash
# Admin phải dùng API
POST /api/v1/numbering-rules
{
  "document_type_id": 1,
  "pattern": "{AUTO}/{TYPE}/{YEAR}",
  "reset_yearly": true
}
```

**Nhược điểm**:
- ❌ Khó dùng cho non-technical admin
- ❌ Dễ sai format pattern
- ❌ Không thấy preview
- ❌ Phải nhớ token syntax

### Có UI (cần làm):
```
1. Vào /document-types
2. Click "Cấu hình đánh số" trên loại văn bản
3. Click token buttons để build pattern
4. Xem preview ngay lập tức
5. Click "Lưu"
```

**Ưu điểm**:
- ✅ Dễ dùng, trực quan
- ✅ Không cần biết API
- ✅ Preview trước khi lưu
- ✅ Validation tự động

---

## 🤔 Có cần làm UI không?

### Trường hợp CẦN UI:
- ✅ Admin không biết code
- ✅ Cần thay đổi pattern thường xuyên
- ✅ Nhiều loại văn bản (>5 types)
- ✅ Muốn hệ thống hoàn chỉnh

### Trường hợp KHÔNG CẦN UI (tạm thời):
- ✅ Admin biết dùng API
- ✅ Pattern ít khi thay đổi
- ✅ Ít loại văn bản (<5 types)
- ✅ Ưu tiên tiến độ Phase 2

---

## 💡 Kết luận

**Backend**: ✅ 100% hoàn chỉnh, hoạt động tốt

**Frontend**: ❌ 0% - Chưa có UI

**Tác động**:
- Hệ thống vẫn hoạt động (auto-numbering works)
- Admin có thể config qua API
- Nhưng không user-friendly

**Quyết định**:
- **Nếu ưu tiên UX**: Làm UI (~1.5 giờ)
- **Nếu ưu tiên tiến độ**: Bỏ qua, làm sau

---

## 📝 Test hiện tại

Bạn có thể test numbering rules qua API:

```http
### 1. Tạo numbering rule
POST http://localhost:3001/api/v1/numbering-rules
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "document_type_id": 1,
  "pattern": "{AUTO}/{TYPE}/{YEAR}",
  "reset_yearly": true
}

### 2. Preview số
POST http://localhost:3001/api/v1/numbering-rules/preview
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "pattern": "{AUTO}/{TYPE}/{YEAR}",
  "document_type_id": 1,
  "current_number": 5
}

### 3. Generate số thật
POST http://localhost:3001/api/v1/numbering-rules/generate
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "document_type_id": 1
}
```

**Kết quả**: Hệ thống tự động generate số theo pattern đã config!

---

**Tóm lại**: Backend đã xong, chỉ thiếu UI để admin dễ dùng hơn. 😊
