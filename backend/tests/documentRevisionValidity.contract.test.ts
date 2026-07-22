import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = [path.resolve(__dirname, '..'), path.resolve(__dirname, '../..')]
  .find((candidate) => fs.existsSync(path.join(candidate, 'src/modules/documents/documents.service.ts')))!;
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('revision intake preserves document type and only admits the current editable source', () => {
  const service = read('src/modules/documents/documents.service.ts');
  assert.match(service, /DOCUMENT_TYPE_REQUIRES_SIGN_REQUEST/);
  assert.match(service, /!input\.forceSignRequest/);
  assert.match(service, /REVISION_DOCUMENT_TYPE_MISMATCH/);
  assert.match(service, /REVISION_SOURCE_NOT_CURRENT/);
  assert.match(service, /async listRevisionSources/);
  assert.match(service, /superseded_by/);
  assert.match(service, /resolveDocumentPermission/);
});

test('validity reminders use an outbox deduplication key', () => {
  const reminder = read('src/modules/documents/documentValidityReminder.service.ts');
  const worker = read('src/workers/outbox.worker.ts');
  assert.match(reminder, /document-validity:\$\{document\.id\}:\$\{kind\}:\$\{dayKey\}/);
  assert.match(worker, /DOCUMENT_VALIDITY_REMINDER/);
});
