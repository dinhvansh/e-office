import { rm } from 'node:fs/promises';
export default async function cleanupUx007Output() { await rm('.next-ux007', { recursive: true, force: true }); }
