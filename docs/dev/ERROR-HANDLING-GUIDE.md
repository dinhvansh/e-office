# 📋 Error Handling Guide - Hướng dẫn xử lý lỗi

**Date**: 2025-11-20  
**Purpose**: Chuẩn hóa error messages trong toàn bộ hệ thống

---

## 🎯 Nguyên tắc vàng

### ❌ KHÔNG BAO GIỜ làm:
```typescript
throw new Error('Error');
throw new Error('Có lỗi xảy ra');
throw new Error('Something went wrong');
```

### ✅ LUÔN LUÔN làm:
```typescript
throwError('DEPARTMENT_CODE_DUPLICATE');
// → "Mã phòng ban đã tồn tại. Vui lòng chọn mã khác"

throwNotFound('USER_NOT_FOUND');
// → "Không tìm thấy người dùng"
```

---

## 📚 Cách sử dụng

### 1. Backend - Service Layer

```typescript
import { throwError, throwNotFound, throwForbidden } from '../../utils/errors';

export const departmentsService = {
  async createDepartment(tenantId: number, data: any) {
    // Check duplicate
    if (await isDuplicate(data.code)) {
      throwError('DEPARTMENT_CODE_DUPLICATE');
    }

    // Check not found
    if (!parent) {
      throwNotFound('DEPARTMENT_PARENT_NOT_FOUND');
    }

    // Check permission
    if (!hasPermission) {
      throwForbidden('AUTH_PERMISSION_DENIED');
    }
  }
};
```

### 2. Frontend - Error Handling

```typescript
const mutation = useMutation({
  mutationFn: (data) => fetchJson('/api', { method: 'POST', body: JSON.stringify(data) }),
  onError: (error: any) => {
    // Backend đã trả message tiếng Việt chi tiết
    const message = typeof error === 'string' ? error : error?.message || 'Có lỗi xảy ra';
    toast.error(message);
  },
});
```

---

## 📖 Danh sách Error Codes

### Department Errors
| Code | Message | HTTP Status |
|------|---------|-------------|
| `DEPARTMENT_NOT_FOUND` | Không tìm thấy phòng ban | 404 |
| `DEPARTMENT_CODE_DUPLICATE` | Mã phòng ban đã tồn tại. Vui lòng chọn mã khác | 400 |
| `DEPARTMENT_HAS_USERS` | Không thể xóa phòng ban đang có nhân viên | 400 |
| `DEPARTMENT_HAS_CHILDREN` | Không thể xóa phòng ban đang có phòng ban con | 400 |
| `DEPARTMENT_CIRCULAR_REFERENCE` | Phòng ban không thể là phòng ban cha của chính nó | 400 |
| `DEPARTMENT_PARENT_NOT_FOUND` | Không tìm thấy phòng ban cha | 404 |

### User Errors
| Code | Message | HTTP Status |
|------|---------|-------------|
| `USER_NOT_FOUND` | Không tìm thấy người dùng | 404 |
| `USER_EMAIL_DUPLICATE` | Email đã được sử dụng. Vui lòng chọn email khác | 400 |
| `USER_INVALID_PASSWORD` | Mật khẩu phải có ít nhất 6 ký tự | 400 |
| `USER_INVALID_EMAIL` | Email không hợp lệ | 400 |

### Role Errors
| Code | Message | HTTP Status |
|------|---------|-------------|
| `ROLE_NOT_FOUND` | Không tìm thấy vai trò | 404 |
| `ROLE_NAME_DUPLICATE` | Tên vai trò đã tồn tại. Vui lòng chọn tên khác | 400 |
| `ROLE_SYSTEM_CANNOT_DELETE` | Không thể xóa vai trò hệ thống | 400 |
| `ROLE_IN_USE` | Không thể xóa vai trò đang được sử dụng | 400 |

### Document Errors
| Code | Message | HTTP Status |
|------|---------|-------------|
| `DOCUMENT_NOT_FOUND` | Không tìm thấy tài liệu | 404 |
| `DOCUMENT_ACCESS_DENIED` | Bạn không có quyền truy cập tài liệu này | 403 |
| `DOCUMENT_FILE_TOO_LARGE` | Kích thước file vượt quá giới hạn cho phép | 400 |
| `DOCUMENT_INVALID_TYPE` | Loại file không được hỗ trợ | 400 |

### Auth Errors
| Code | Message | HTTP Status |
|------|---------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Email hoặc mật khẩu không đúng | 401 |
| `AUTH_TOKEN_EXPIRED` | Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại | 401 |
| `AUTH_TOKEN_INVALID` | Token không hợp lệ | 401 |
| `AUTH_PERMISSION_DENIED` | Bạn không có quyền thực hiện thao tác này | 403 |

---

## 🔧 Thêm Error Code mới

### Bước 1: Thêm vào `backend/src/utils/errors.ts`

```typescript
export const ErrorCodes = {
  // ... existing codes
  
  // Your new error
  YOUR_MODULE_ERROR_NAME: 'Message tiếng Việt chi tiết, dễ hiểu',
};
```

### Bước 2: Sử dụng trong service

```typescript
import { throwError } from '../../utils/errors';

if (condition) {
  throwError('YOUR_MODULE_ERROR_NAME');
}
```

### Bước 3: Frontend tự động nhận message

Không cần làm gì thêm! Frontend đã handle tự động.

---

## ✅ Checklist cho Developer

Trước khi merge code:

- [ ] Tất cả `throw new Error('...')` đã được thay bằng `throwError()`
- [ ] Không có message chung chung như "Có lỗi xảy ra"
- [ ] Tất cả error messages đều bằng tiếng Việt
- [ ] Error messages rõ ràng, hướng dẫn user làm gì tiếp theo
- [ ] HTTP status code đúng (400, 401, 403, 404, 500)

---

## 💡 Best Practices

### ✅ Good Examples

```typescript
// Chi tiết, rõ ràng
throwError('DEPARTMENT_CODE_DUPLICATE');
// → "Mã phòng ban đã tồn tại. Vui lòng chọn mã khác"

throwError('USER_EMAIL_DUPLICATE');
// → "Email đã được sử dụng. Vui lòng chọn email khác"

throwError('LICENSE_USER_LIMIT');
// → "Đã đạt giới hạn số lượng người dùng"
```

### ❌ Bad Examples

```typescript
// Chung chung, không rõ ràng
throw new Error('Error');
throw new Error('Invalid');
throw new Error('Failed');
throw new Error('Có lỗi xảy ra');
```

---

## 🎯 Lợi ích

1. **User Experience**: User biết chính xác lỗi gì, làm gì tiếp theo
2. **Debugging**: Developer dễ debug hơn với error code cụ thể
3. **Consistency**: Toàn bộ hệ thống dùng chung 1 chuẩn
4. **Maintainability**: Dễ maintain và mở rộng
5. **i18n Ready**: Dễ dàng thêm đa ngôn ngữ sau này

---

**Status**: ✅ Implemented  
**Last Updated**: 2025-11-20
