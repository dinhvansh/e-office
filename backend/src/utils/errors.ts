// Centralized Error Codes & Messages
export const ErrorCodes = {
  // Department Errors
  DEPARTMENT_NOT_FOUND: 'Không tìm thấy phòng ban',
  DEPARTMENT_CODE_DUPLICATE: 'Mã phòng ban đã tồn tại. Vui lòng chọn mã khác',
  DEPARTMENT_HAS_USERS: 'Không thể xóa phòng ban đang có nhân viên',
  DEPARTMENT_HAS_CHILDREN: 'Không thể xóa phòng ban đang có phòng ban con',
  DEPARTMENT_CIRCULAR_REFERENCE: 'Phòng ban không thể là phòng ban cha của chính nó',
  DEPARTMENT_PARENT_NOT_FOUND: 'Không tìm thấy phòng ban cha',

  // User Errors
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  USER_EMAIL_DUPLICATE: 'Email đã được sử dụng. Vui lòng chọn email khác',
  USER_INVALID_PASSWORD: 'Mật khẩu phải có ít nhất 6 ký tự',
  USER_INVALID_EMAIL: 'Email không hợp lệ',

  // Role Errors
  ROLE_NOT_FOUND: 'Không tìm thấy vai trò',
  ROLE_NAME_DUPLICATE: 'Tên vai trò đã tồn tại. Vui lòng chọn tên khác',
  ROLE_SYSTEM_CANNOT_DELETE: 'Không thể xóa vai trò hệ thống',
  ROLE_IN_USE: 'Không thể xóa vai trò đang được sử dụng',

  // Document Errors
  DOCUMENT_NOT_FOUND: 'Không tìm thấy tài liệu',
  DOCUMENT_ACCESS_DENIED: 'Bạn không có quyền truy cập tài liệu này',
  DOCUMENT_FILE_TOO_LARGE: 'Kích thước file vượt quá giới hạn cho phép',
  DOCUMENT_INVALID_TYPE: 'Loại file không được hỗ trợ',

  // Document Type Errors
  DOCUMENT_TYPE_NOT_FOUND: 'Không tìm thấy loại văn bản',
  DOCUMENT_TYPE_CODE_DUPLICATE: 'Mã loại văn bản đã tồn tại. Vui lòng chọn mã khác',
  DOCUMENT_TYPE_IN_USE: 'Không thể xóa loại văn bản đang được sử dụng',

  // External Org Errors
  EXTERNAL_ORG_NOT_FOUND: 'Không tìm thấy tổ chức',
  EXTERNAL_ORG_CODE_DUPLICATE: 'Mã tổ chức đã tồn tại. Vui lòng chọn mã khác',

  // Auth Errors
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  AUTH_TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
  AUTH_TOKEN_INVALID: 'Token không hợp lệ',
  AUTH_PERMISSION_DENIED: 'Bạn không có quyền thực hiện thao tác này',

  // License Errors
  LICENSE_EXPIRED: 'License đã hết hạn',
  LICENSE_INVALID: 'License không hợp lệ',
  LICENSE_USER_LIMIT: 'Đã đạt giới hạn số lượng người dùng',
  LICENSE_DOCUMENT_LIMIT: 'Đã đạt giới hạn số lượng tài liệu',

  // Validation Errors
  VALIDATION_REQUIRED_FIELD: 'Trường này là bắt buộc',
  VALIDATION_INVALID_FORMAT: 'Định dạng không hợp lệ',
  VALIDATION_MIN_LENGTH: 'Độ dài tối thiểu không đạt',
  VALIDATION_MAX_LENGTH: 'Độ dài vượt quá giới hạn',

  // Generic Errors
  INTERNAL_SERVER_ERROR: 'Lỗi hệ thống. Vui lòng thử lại sau',
  DATABASE_ERROR: 'Lỗi cơ sở dữ liệu. Vui lòng thử lại sau',
  NETWORK_ERROR: 'Lỗi kết nối. Vui lòng kiểm tra mạng',
};

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Helper functions
export const throwError = (code: keyof typeof ErrorCodes, details?: any): never => {
  throw new AppError(code, ErrorCodes[code], 400, details);
};

export const throwNotFound = (code: keyof typeof ErrorCodes): never => {
  throw new AppError(code, ErrorCodes[code], 404);
};

export const throwForbidden = (code: keyof typeof ErrorCodes): never => {
  throw new AppError(code, ErrorCodes[code], 403);
};

export const throwUnauthorized = (code: keyof typeof ErrorCodes): never => {
  throw new AppError(code, ErrorCodes[code], 401);
};
