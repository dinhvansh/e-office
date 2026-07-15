import { rm } from 'node:fs/promises';
export default async function cleanupUx008Output() { await rm('.next-ux008', { recursive: true, force: true }); }
