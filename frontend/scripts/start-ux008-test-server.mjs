import { rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const distDir = '.next-ux008';
await rm(distDir, { recursive: true, force: true });
const child = spawn(process.execPath, ['./node_modules/next/dist/bin/next', 'dev', '-p', '3018'], { env: { ...process.env, NEXT_DIST_DIR: distDir, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:4010/api/v1', PORT: '3018' }, stdio: 'inherit' });
const stop = async () => { child.kill('SIGTERM'); await rm(distDir, { recursive: true, force: true }); };
process.on('SIGTERM', () => void stop().finally(() => process.exit(0)));
process.on('SIGINT', () => void stop().finally(() => process.exit(0)));
child.on('exit', async (code) => { await rm(distDir, { recursive: true, force: true }); process.exit(code ?? 0); });
