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

await new Promise(r => server.listen(8773, r));

const chromePath = 'C:\\Users\\LENOVO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const profilePath = path.resolve('.chrome-test-profile');
const testPdfPath = path.resolve('kursbuch.pdf');

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
  `--user-data-dir=${profilePath}`,
  '--no-first-run',
  '--window-size=1280,1024',
  'http://127.0.0.1:8773/viewer.html'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const versionRes = await fetch('http://127.0.0.1:9223/json/version');
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

  ws.addEventListener('message', async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Target.attachedToTarget') {
      const { sessionId: subSessionId } = msg.params;
      await send('Runtime.enable', {}, subSessionId);
      await send('Runtime.runIfWaitingForDebugger', {}, subSessionId);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[CONSOLE ${msg.params.type.toUpperCase()}]`, ...msg.params.args.map(a => a.value !== undefined ? a.value : a.description));
    }
  });

  const targets = await send('Target.getTargets');
  const pageTarget = targets.targetInfos.find(t => t.url.includes('viewer.html'));
  const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  const sessionId = attachRes.sessionId;

  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('DOM.enable', {}, sessionId);

  await new Promise(r => setTimeout(r, 1000));

  // Load kursbuch.pdf
  console.log('Loading kursbuch.pdf...');
  const doc = await send('DOM.getDocument', {}, sessionId);
  const inputNode = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  }, sessionId);

  await send('DOM.setFileInputFiles', {
    files: [testPdfPath],
    nodeId: inputNode.nodeId
  }, sessionId);

  // Wait for initial render of page 1
  console.log('Waiting for PDF to render...');
  await new Promise(r => setTimeout(r, 4000));

  // Navigate to page 59
  console.log('Navigating to page 59...');
  const navResult = await send('Runtime.evaluate', {
    expression: `(() => {
      // Find the page number input inside the form in PDFControls
      const form = document.querySelector('form');
      const input = form ? form.querySelector('input') : null;
      if (!input) return 'No page input found';
      
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, '59');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return 'Submitted page 59';
    })()`,
    returnByValue: true
  }, sessionId);
  console.log('Navigation call result:', navResult.result.value);

  // Wait for page 59 to render
  await new Promise(r => setTimeout(r, 4000));

  // Check buttons present on page
  const buttonInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.innerText);
    })()`,
    returnByValue: true
  }, sessionId);
  console.log('Buttons present on page:', buttonInfo.result.value);

  console.log('Clicking Run OCR button on page 59...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run OCR') || b.innerText.includes('OCR'));
      if (btn) {
        btn.click();
        return 'Clicked ' + btn.innerText;
      }
      return 'No OCR button found';
    })()`,
    returnByValue: true
  }, sessionId);

  // Wait for OCR
  console.log('Waiting for OCR completion...');
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await send('Runtime.evaluate', {
      expression: `(() => {
        const layer = document.querySelector('.ocrTextLayer');
        const spans = layer ? layer.querySelectorAll('span').length : 0;
        const banner = document.querySelector('[role="status"]')?.innerText || document.querySelector('[role="alert"]')?.innerText;
        return { hasLayer: !!layer, spans, banner };
      })()`,
      returnByValue: true
    }, sessionId);
    if (i % 5 === 0) {
      console.log(`[Status ${i}s] spans: ${status.result.value.spans}, banner: ${status.result.value.banner}`);
    }
    if (status.result.value.hasLayer && status.result.value.spans > 0) {
      console.log(`OCR complete! Rendered ${status.result.value.spans} word spans.`);
      break;
    }
  }

  // Dump spans
  const domInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));
      return spans.map(s => ({
        text: s.innerText,
        ocrWord: s.getAttribute('data-ocr-word'),
        rect: s.getBoundingClientRect(),
        style: {
          left: s.style.left,
          top: s.style.top,
          width: s.style.width,
          height: s.style.height
        }
      }));
    })()`,
    returnByValue: true
  }, sessionId);

  const spans = domInfo.result.value || [];
  console.log(`Total spans in DOM: ${spans.length}`);
  fs.writeFileSync('test-assets/browser-page-59-spans.json', JSON.stringify(spans, null, 2));

  const targetWords = ['Modalverben', 'Modatverben', 'arbeiten', 'einkaufen', 'Berge', 'müssen', 'mässen', 'Telefongespräch', 'morgen'];
  for (const t of targetWords) {
    const matching = spans.filter(s => s.text.toLowerCase().includes(t.toLowerCase()));
    console.log(`Matching "${t}": ${matching.length} instances`);
    for (const m of matching) {
      console.log(`  text: "${m.text}", rect: [left=${Math.round(m.rect.left)}, top=${Math.round(m.rect.top)}, w=${Math.round(m.rect.width)}, h=${Math.round(m.rect.height)}]`);
    }
  }

  await send('Browser.close');
} catch (err) {
  console.error('Error:', err);
  chrome.kill();
} finally {
  server.close();
}
