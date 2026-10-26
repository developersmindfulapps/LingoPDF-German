import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const distDir = path.resolve('dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/x-font-pfb',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/viewer.html';
  const filePath = path.join(distDir, reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(8772, r));

const chromePath = 'C:\\Users\\LENOVO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const profilePath = path.resolve('.chrome-test-repro');
const testPdfPath = path.resolve('test-assets', 'sample-scanned-image.pdf');

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${profilePath}`,
  '--no-first-run',
  '--window-size=1280,900',
  'http://127.0.0.1:8772/viewer.html'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const versionRes = await fetch('http://127.0.0.1:9222/json/version');
  const versionData = await versionRes.json();
  const ws = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  const send = (method, params = {}, sessionId) => {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', onMsg);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', onMsg);
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  };

  const capturedConsoleCalls = [];
  ws.addEventListener('message', async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Target.attachedToTarget') {
      const { sessionId: subSessionId, targetInfo } = msg.params;
      console.log(`[Target Attached] ${targetInfo.type} -> ${targetInfo.url}`);
      await send('Runtime.enable', {}, subSessionId);
      await send('Runtime.runIfWaitingForDebugger', {}, subSessionId);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      capturedConsoleCalls.push({
        sessionId: msg.sessionId,
        type: msg.params.type,
        args: msg.params.args.map(a => a.value !== undefined ? a.value : a.description),
        stackTrace: msg.params.stackTrace
      });
      console.log(`[CONSOLE ${msg.params.type.toUpperCase()}]`, ...msg.params.args.map(a => a.value !== undefined ? a.value : a.description));
    }
  });

  const targets = await send('Target.getTargets');
  const pageTarget = targets.targetInfos.find(t => t.url.includes('viewer.html'));
  const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  const sessionId = attachRes.sessionId;

  // Auto attach inside the page session to catch all dedicated workers
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('DOM.enable', {}, sessionId);

  await new Promise(r => setTimeout(r, 1000));

  // Load scanned PDF file
  const doc = await send('DOM.getDocument', {}, sessionId);
  const inputNode = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  }, sessionId);

  await send('DOM.setFileInputFiles', {
    files: [testPdfPath],
    nodeId: inputNode.nodeId
  }, sessionId);

  await new Promise(r => setTimeout(r, 3000));

  console.log('Clicking Run OCR button...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('OCR') || b.innerText.includes('Recognize') || b.innerText.includes('Text'));
      if (btn) btn.click();
    })()`
  }, sessionId);

  // Wait 12 seconds for OCR
  await new Promise(r => setTimeout(r, 12000));

  console.log('\n--- ALL CAPTURED CONSOLE CALLS ---');
  for (const c of capturedConsoleCalls) {
    console.log(`[${c.type.toUpperCase()}]`, ...c.args);
    if (c.stackTrace) {
      console.log('  CallFrames:');
      for (const f of c.stackTrace.callFrames || []) {
        console.log(`    at ${f.functionName || '(anonymous)'} (${f.url}:${f.lineNumber}:${f.columnNumber})`);
      }
    }
  }

  await send('Browser.close');
} catch (err) {
  console.error('Error:', err);
  chrome.kill();
} finally {
  server.close();
}
