const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Bytemonk Federation System...\n');

const services = [
  { name: 'Users Service', cmd: 'node', args: [path.join(__dirname, '../subgraphs/users/index.js')], port: 4001 },
  { name: 'Movies Service', cmd: 'node', args: [path.join(__dirname, '../subgraphs/movies/index.js')], port: 4002 },
  { name: 'Reviews Service', cmd: 'node', args: [path.join(__dirname, '../subgraphs/reviews/index.js')], port: 4003 },
];

const processes = [];

// Start all subgraph services
services.forEach(service => {
  console.log(`Starting ${service.name}...`);
  const proc = spawn(service.cmd, service.args, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  processes.push(proc);
  
  proc.on('error', (err) => {
    console.error(`Failed to start ${service.name}:`, err);
  });
});

// Wait a bit for services to start
setTimeout(() => {
  console.log('\n📦 Composing supergraph...');
  try {
    execSync('rover supergraph compose --config ./supergraph.yaml > supergraph.graphql', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('✅ Supergraph composed successfully!\n');
    
    console.log('🌐 Starting Apollo Router...');
    const routerCmd = process.platform === 'win32' ? 'router.exe' : './router';
    const router = spawn(routerCmd, ['--config', 'router.yaml', '--supergraph', 'supergraph.graphql'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    processes.push(router);
    
    router.on('error', (err) => {
      console.error('Failed to start Router:', err);
      console.error('Make sure you have downloaded Apollo Router!');
    });
  } catch (err) {
    console.error('Failed to compose supergraph:', err.message);
  }
}, 3000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down services...');
  processes.forEach(proc => proc.kill());
  process.exit(0);
});

process.on('SIGTERM', () => {
  processes.forEach(proc => proc.kill());
  process.exit(0);
});

