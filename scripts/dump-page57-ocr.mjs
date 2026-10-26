import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const chromePath = 'C:\\Users\\LENOVO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.resolve('.chrome-diagnose-profile');
const testPort = 8793;
const cdpPort = 9230;

const mimeTypes = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.wasm': 'application/wasm', '.gz': 'application/gzip', '.bcmap': 'application/octet-stream',
  '.pfb': 'application/x-font-pfb', '.ttf': 'font/ttf'
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

await new Promise(r => server.listen(testPort, r));

const chromeProc = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--window-size=1280,1024',
  `http://127.0.0.1:${testPort}/viewer.html`
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const versionRes = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
  const versionData = await versionRes.json();
  const ws = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

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

  const targets = await send('Target.getTargets');
  const pageTarget = targets.targetInfos.find(t => t.url.includes('viewer.html'));
  const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  const sessionId = attachRes.sessionId;

  await send('Runtime.enable', {}, sessionId);
  await send('DOM.enable', {}, sessionId);
  await new Promise(r => setTimeout(r, 1000));

  const docNode = await send('DOM.getDocument', {}, sessionId);
  const inputNode = await send('DOM.querySelector', {
    nodeId: docNode.root.nodeId,
    selector: 'input[type="file"]'
  }, sessionId);

  await send('DOM.setFileInputFiles', {
    files: [path.resolve('kursbuch.pdf')],
    nodeId: inputNode.nodeId
  }, sessionId);

  await new Promise(r => setTimeout(r, 4000));

  // Navigate to 57
  await send('Runtime.evaluate', {
    expression: `(() => {
      const form = document.querySelector('form');
      const input = form ? form.querySelector('input') : null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '57');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return true;
    })()`
  }, sessionId);

  await new Promise(r => setTimeout(r, 2000));

  // Run OCR
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run OCR'));
      if (btn) btn.click();
    })()`
  }, sessionId);

  console.log('Waiting for OCR on page 57...');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await send('Runtime.evaluate', {
      expression: `(() => {
        const layer = document.querySelector('.ocrTextLayer');
        const count = layer ? layer.querySelectorAll('span').length : 0;
        return { hasLayer: !!layer, count };
      })()`,
      returnByValue: true
    }, sessionId);

    if (status.result.value.hasLayer && status.result.value.count > 10) {
      console.log(`OCR complete with ${status.result.value.count} spans`);
      break;
    }
  }

  // Get raw spans with all attributes
  const rawSpans = await send('Runtime.evaluate', {
    expression: `(() => {
      const layer = document.querySelector('.ocrTextLayer');
      const layerRect = layer ? layer.getBoundingClientRect() : null;
      const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
      return {
        layerRect,
        spans: spans.map(s => {
          const r = s.getBoundingClientRect();
          return {
            text: s.innerText,
            dataWord: s.getAttribute('data-ocr-word'),
            dataIdx: s.getAttribute('data-ocr-index'),
            styleLeft: s.style.left,
            styleTop: s.style.top,
            styleWidth: s.style.width,
            styleHeight: s.style.height,
            styleTransform: s.style.transform,
            rect: { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
          };
        })
      };
    })()`,
    returnByValue: true
  }, sessionId);

  fs.writeFileSync('test-assets/raw-page57-spans.json', JSON.stringify(rawSpans.result.value, null, 2));
  console.log('Dumped raw spans to test-assets/raw-page57-spans.json');

  ws.close();
} finally {
  chromeProc.kill();
  server.close();
  process.exit(0);
}
