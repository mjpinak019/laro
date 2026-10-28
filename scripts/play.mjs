import { preview } from 'vite';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

const client = fileURLToPath(new URL('../client/', import.meta.url));
const localUrl = 'http://127.0.0.1:4173/';
function openBrowser(url) {
  if (process.platform === 'win32' && !process.argv.includes('--no-open')) {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { windowsHide: true, stdio: 'ignore' });
    browser.on('error', () => console.log('Open the address above in your browser.'));
  }
}
try {
  await access(new URL('../client/dist/index.html', import.meta.url));
  let alreadyRunning = false;
  try {
    const response = await fetch(localUrl, { signal: AbortSignal.timeout(1200) });
    alreadyRunning = response.ok && (await response.text()).includes('<title>LARO');
  } catch { /* A stopped server is the normal first-launch case. */ }
  if (alreadyRunning) {
    console.log('\nLARO is already running: ' + localUrl);
    openBrowser(localUrl);
  } else {
    const server = await preview({
      root: client,
      preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    });
    const address = new URL(server.resolvedUrls.local[0]);
    address.hostname = '127.0.0.1';
    const url = address.href;
    console.log('\nTara, laro! Your offline game is ready: ' + url);
    console.log('Keep this window open while playing. Press Ctrl+C to stop.\n');
    openBrowser(url);
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.httpServer.close(); process.exit(0); });
  }
} catch (error) {
  console.error('Could not start LARO:', error.message);
  console.error('Run npm.cmd run build first, and make sure port 4173 is available.');
  process.exitCode = 1;
}
