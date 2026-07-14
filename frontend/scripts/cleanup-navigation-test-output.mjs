import { rm } from 'node:fs/promises';

export default async function cleanupNavigationTestOutput() {
  await rm('.next-ux-navigation', { recursive: true, force: true });
}
