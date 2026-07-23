import { ApiError } from '../../core/errors/api-error';

export const MIN_USER_PASSWORD_LENGTH = 6;

export const assertValidUserPassword = (password: string): void => {
  if (password.length < MIN_USER_PASSWORD_LENGTH) {
    throw ApiError.badRequest(
      `Mật khẩu phải có ít nhất ${MIN_USER_PASSWORD_LENGTH} ký tự`,
      'PASSWORD_TOO_SHORT',
    );
  }
};
