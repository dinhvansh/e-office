# Test Signing Order UI

## 🎯 Mục đích
Kiểm tra xem UI quản lý thứ tự ký có hiển thị và hoạt động đúng không

## 📋 Các bước test

### 1. Hard Refresh Browser
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```
**Lý do**: Clear browser cache để load code mới nhất

### 2. Navigate to Documents Page
```
http://localhost:3000/documents
```

### 3. Upload Document
- Click "Chọn file"
- Chọn file PDF bất kỳ
- File sẽ hiển thị với tên và kích thước

### 4. Chọn Loại Văn Bản (QUAN TRỌNG!)
**Chọn 1 trong 4 loại sau** (có digital signing):
- ✅ **Công văn đi** (CV_DI)
- ✅ **Hợp đồng** (HOP_DONG)  
- ✅ **Quyết định** (QUYET_DINH)
- ✅ **Báo cáo** (BAO_CAO)

**KHÔNG chọn** (không có digital signing):
- ❌ Công văn đến
- ❌ Thông báo
- ❌ Biên bản
- ❌ Đề xuất

### 5. Kiểm tra Indicator
Sau khi chọn loại văn bản có digital signing, phải thấy:
```
✍️ Loại văn bản này yêu cầu chữ ký số
```
(Màu tím, border tím)

### 6. Scroll xuống - Tìm Section "Người ký bên ngoài"
Phải thấy section màu tím với:
- Header: "✍️ Người ký bên ngoài (External Signers)"
- 2 buttons: "Thêm người ký" và "Thêm tổ chức"

### 7. Click "Thêm người ký"
Sẽ xuất hiện form với các field:
- Email *
- Họ tên *
- **🔢 Thứ tự ký *** (FIELD NÀY PHẢI CÓ!)

### 8. Kiểm tra Field "Thứ tự ký"
**Phải thấy**:
- Label: "🔢 Thứ tự ký *" (màu tím, bold)
- Input: border tím, placeholder "1, 2, 3..."
- Hint text: "💡 Số nhỏ ký trước. Cùng số = ký song song"

### 9. Test Thay Đổi Thứ Tự
- Thêm 3 người ký
- Người 1: order = 1
- Người 2: order = 2  
- Người 3: order = 3
- Thử đổi: Người 2 → order = 1
- Người 1 → order = 2

### 10. Upload và Verify
- Click "Tải lên"
- Sau khi upload thành công
- Vào editor hoặc check database
- Verify thứ tự ký đã được lưu đúng

## ✅ Acceptance Criteria

1. ✅ Indicator "yêu cầu chữ ký số" hiển thị khi chọn đúng document type
2. ✅ SignersSection hiển thị (màu tím)
3. ✅ Field "🔢 Thứ tự ký *" hiển thị với:
   - Label bold màu tím
   - Border tím
   - Placeholder "1, 2, 3..."
   - Hint text "💡 Số nhỏ ký trước..."
4. ✅ Có thể thay đổi số thứ tự
5. ✅ Thứ tự được lưu vào database

## 🐛 Troubleshooting

### Không thấy SignersSection?
- ✅ Check: Đã chọn đúng document type? (Công văn đi, Hợp đồng, Quyết định, Báo cáo)
- ✅ Check: Đã hard refresh browser? (Ctrl+Shift+R)
- ✅ Check: Frontend server đang chạy? (npm run dev)

### Không thấy field "Thứ tự ký"?
- ✅ Check: Đã click "Thêm người ký"?
- ✅ Check: Scroll xuống đủ chưa?
- ✅ Check: Browser console có error không? (F12)

### Field "Thứ tự ký" không có màu tím?
- ✅ Check: Đã hard refresh? (Ctrl+Shift+R)
- ✅ Check: File SignersSection.tsx đã được save?
- ✅ Check: Frontend đã rebuild? (npm run dev auto-rebuild)

## 📸 Screenshots Expected

### 1. Document Type Indicator
```
┌─────────────────────────────────────────┐
│ ✍️ Loại văn bản này yêu cầu chữ ký số   │
└─────────────────────────────────────────┘
(Màu tím, border tím)
```

### 2. SignersSection
```
┌─────────────────────────────────────────────────┐
│ ✍️ Người ký bên ngoài (External Signers)       │
│ [Thêm người ký] [Thêm tổ chức]                 │
├─────────────────────────────────────────────────┤
│ Người ký #1                                     │
│ Email: [________________]  Họ tên: [_________]  │
│ 🔢 Thứ tự ký *: [1]                            │
│ 💡 Số nhỏ ký trước. Cùng số = ký song song     │
└─────────────────────────────────────────────────┘
```

## 🎯 Expected Result
User có thể dễ dàng:
1. Thấy document type nào cần chữ ký số
2. Thấy section người ký bên ngoài
3. Thấy và hiểu field "Thứ tự ký"
4. Thay đổi thứ tự ký dễ dàng
5. Upload thành công với thứ tự đã set
