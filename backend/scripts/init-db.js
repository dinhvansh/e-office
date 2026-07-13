const { spawnSync } = require('node:child_process');

function run(command, args, options = {}) {
  const pretty = [command, ...args].join(' ');
  console.log(`[init-db] Running: ${pretty}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`[init-db] Command failed (${result.status}): ${pretty}`);
  }
}

function main() {
  // Schema push and demo seeds are destructive/development-only operations.
  // Require an explicit opt-in even when this script is invoked outside Compose.
  const autoInitEnabled = (process.env.AUTO_INIT_DB || 'false').toLowerCase() === 'true';
  if (!autoInitEnabled) {
    console.log('[init-db] AUTO_INIT_DB=false, skipping initialization.');
    return;
  }

  console.log('[init-db] Starting database initialization...');

  // Keep local Docker setup resilient against broken migration chain.
  run('npx', ['prisma', 'db', 'push', '--accept-data-loss']);

  // Required baseline data for login + RBAC visibility.
  run('node', ['scripts/seed.js']);
  run('node', ['scripts/seed-rbac.js']);

  // Optional baseline master data for first-time demo usage.
  run('node', ['scripts/seed-document-types.js']);
  run('node', ['scripts/seed-workflows-simple.js']);
  run('node', ['scripts/seed-demo-internal-users.js']);

  console.log('[init-db] Database initialization completed.');
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
