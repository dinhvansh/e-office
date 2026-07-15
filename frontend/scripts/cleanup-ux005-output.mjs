import { rm } from 'node:fs/promises';
export default async function cleanupUx005Output() { await rm('.next-ux005', { recursive: true, force: true }); }
