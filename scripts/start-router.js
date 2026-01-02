const { spawn } = require('child_process');
const path = require('path');

const routerCmd = process.platform === 'win32' ? 'router.exe' : './router';
const routerPath = path.join(__dirname, '..', routerCmd);

console.log('🌐 Starting Apollo Router...');

const router = spawn(routerPath, ['--config', 'router.yaml', '--supergraph', 'supergraph.graphql'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

router.on('error', (err) => {
  console.error('❌ Failed to start Router:', err.message);
  console.error('Make sure Apollo Router is downloaded!');
  console.error('Download from: https://router.apollo.dev/download');
  process.exit(1);
});

router.on('exit', (code) => {
  process.exit(code);
});

process.on('SIGINT', () => {
  router.kill();
  process.exit(0);
});

