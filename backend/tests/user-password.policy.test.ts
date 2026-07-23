import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/core/errors/api-error';
import {
  assertValidUserPassword,
  MIN_USER_PASSWORD_LENGTH,
} from '../src/modules/users/user-password.policy';

test('user passwords require at least six characters', () => {
  assert.equal(MIN_USER_PASSWORD_LENGTH, 6);
  assert.throws(
    () => assertValidUserPassword('12345'),
    (error: unknown) => (
      error instanceof ApiError
      && error.statusCode === 400
      && error.code === 'PASSWORD_TOO_SHORT'
    ),
  );
  assert.doesNotThrow(() => assertValidUserPassword('123456'));
});
