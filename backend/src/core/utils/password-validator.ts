import { z } from 'zod';

/**
 * Strong password validation schema
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
  .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*)');

/**
 * Medium password validation (for backward compatibility)
 * Requirements:
 * - At least 6 characters
 * - At least 1 letter
 * - At least 1 number
 */
export const mediumPasswordSchema = z
  .string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất 1 chữ cái')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số');

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number; // 0-4
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  else feedback.push('Mật khẩu nên có ít nhất 8 ký tự');

  if (password.length >= 12) score++;

  // Character variety
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Thêm chữ hoa để mật khẩu mạnh hơn');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Thêm chữ thường để mật khẩu mạnh hơn');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Thêm chữ số để mật khẩu mạnh hơn');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Thêm ký tự đặc biệt (!@#$%^&*) để mật khẩu mạnh hơn');

  // Common patterns check
  const commonPatterns = [
    /^123456/,
    /^password/i,
    /^admin/i,
    /^qwerty/i,
    /^abc123/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 2);
      feedback.push('Mật khẩu quá phổ biến, dễ bị đoán');
      break;
    }
  }

  return {
    score: Math.min(4, score),
    feedback,
  };
}

/**
 * Validate password meets minimum requirements
 */
export function validatePassword(password: string, strict = false): {
  valid: boolean;
  errors: string[];
} {
  const schema = strict ? strongPasswordSchema : mediumPasswordSchema;
  const result = schema.safeParse(password);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => e.message),
  };
}
