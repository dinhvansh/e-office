import { rm } from 'node:fs/promises';

export default async function cleanupUx011Output() {
  await rm('.next-ux011', { recursive: true, force: true });
}
