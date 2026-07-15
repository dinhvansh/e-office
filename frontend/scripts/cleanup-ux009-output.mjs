import { rm } from 'node:fs/promises';
export default async function cleanupUx009Output() { await rm('.next-ux009', { recursive: true, force: true }); }
