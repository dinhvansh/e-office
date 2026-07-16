import { rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const distDir = '.next-ux011';
const env = { ...process.env, NEXT_DIST_DIR: distDir, PORT: '3011' };
for (const key of Object.keys(env)) {
  if (/^(NEXT_PUBLIC_API_(BASE_)?URL|API_BASE_URL|API_URL)$/i.test(key)) delete env[key];
}

await rm(distDir, { recursive: true, force: true });
const child = spawn(process.execPath, ['./node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', '3011'], {
  env,
  stdio: 'inherit',
});

const stop = async () => {
  child.kill('SIGTERM');
  await rm(distDir, { recursive: true, force: true });
};
process.on('SIGINT', () => void stop().finally(() => process.exit(0)));
process.on('SIGTERM', () => void stop().finally(() => process.exit(0)));
child.on('exit', async (code) => { await rm(distDir, { recursive: true, force: true }); process.exit(code ?? 0); });
