import { rm } from 'node:fs/promises';

export default async function cleanupUx016Output() {
  await rm('.next-ux016', { recursive: true, force: true });
}
