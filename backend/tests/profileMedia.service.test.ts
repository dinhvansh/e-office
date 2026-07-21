import assert from 'node:assert/strict';
import test from 'node:test';
import { usersRepository } from '../src/modules/users/users.repository';
import { usersService } from '../src/modules/users/users.service';
import { storageService } from '../src/core/storage/storage.service';

const transparentPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('profile avatar is validated, transformed, swapped and old object is deleted after DB update', async () => {
  const originalFind = usersRepository.findById;
  const originalUpdate = usersRepository.update;
  const originalPut = storageService.put;
  const originalDelete = storageService.delete;
  const deleted: string[] = [];
  let storedContentType = '';
  let current: any = {
    id: 7, tenant_id: 3, email: 'user@example.test', full_name: 'User', phone: null,
    avatar_url: 'storage/3/profiles/7/avatar-old.webp', signature_image_path: null,
    signature_type: null, signature_updated_at: null, password_hash: 'secret',
  };
  try {
    usersRepository.findById = async () => ({ ...current });
    usersRepository.update = async (_id: number, data: any) => {
      current = { ...current, ...data };
      return { ...current };
    };
    storageService.put = async (input) => {
      storedContentType = input.contentType || '';
      assert.ok(input.key.startsWith('storage/3/profiles/7/avatar-'));
      assert.ok(input.body.byteLength > 0);
      return { key: input.key, sizeBytes: input.body.byteLength, contentType: input.contentType };
    };
    storageService.delete = async (key) => { deleted.push(key); };

    const result = await usersService.uploadAvatar(7, 3, transparentPng);
    assert.equal(storedContentType, 'image/webp');
    assert.equal(result.avatar_url, '/users/profile/avatar');
    assert.equal((result as any).password_hash, undefined);
    assert.equal((result as any).signature_image_path, undefined);
    assert.deepEqual(deleted, ['storage/3/profiles/7/avatar-old.webp']);
  } finally {
    usersRepository.findById = originalFind;
    usersRepository.update = originalUpdate;
    storageService.put = originalPut;
    storageService.delete = originalDelete;
  }
});

test('default signature is stored as a PNG profile object without changing signing history', async () => {
  const originalFind = usersRepository.findById;
  const originalUpdate = usersRepository.update;
  const originalPut = storageService.put;
  const originalDelete = storageService.delete;
  const deleted: string[] = [];
  let current: any = {
    id: 8, tenant_id: 4, email: 'signer@example.test', full_name: 'Signer', phone: null,
    avatar_url: null, signature_image_path: 'storage/4/profiles/8/signature-old.png',
    signature_type: 'drawn', signature_updated_at: new Date(), password_hash: 'secret',
  };
  try {
    usersRepository.findById = async () => ({ ...current });
    usersRepository.update = async (_id: number, data: any) => {
      current = { ...current, ...data };
      return { ...current };
    };
    storageService.put = async (input) => {
      assert.ok(input.key.startsWith('storage/4/profiles/8/signature-'));
      assert.equal(input.contentType, 'image/png');
      return { key: input.key, sizeBytes: input.body.byteLength, contentType: input.contentType };
    };
    storageService.delete = async (key) => { deleted.push(key); };

    const result = await usersService.uploadSignature(8, 4, transparentPng, 'typed');
    assert.equal(result.signature_type, 'typed');
    assert.equal(result.signature_image_url, '/users/profile/signature');
    assert.deepEqual(deleted, ['storage/4/profiles/8/signature-old.png']);
  } finally {
    usersRepository.findById = originalFind;
    usersRepository.update = originalUpdate;
    storageService.put = originalPut;
    storageService.delete = originalDelete;
  }
});

test('profile media rejects unsupported image content before writing storage', async () => {
  const originalFind = usersRepository.findById;
  const originalPut = storageService.put;
  let putCalled = false;
  try {
    usersRepository.findById = async () => ({ id: 9, tenant_id: 5, avatar_url: null } as any);
    storageService.put = async (input) => {
      putCalled = true;
      return { key: input.key, sizeBytes: input.body.byteLength };
    };
    await assert.rejects(
      usersService.uploadAvatar(9, 5, Buffer.from('not an image').toString('base64')),
      (error: any) => error?.code === 'PROFILE_IMAGE_INVALID',
    );
    assert.equal(putCalled, false);
  } finally {
    usersRepository.findById = originalFind;
    storageService.put = originalPut;
  }
});
