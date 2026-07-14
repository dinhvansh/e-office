import { rm } from 'node:fs/promises';
export default async function cleanupUx006Output() { await rm('.next-ux006', { recursive: true, force: true }); }
