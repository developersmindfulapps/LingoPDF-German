import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const chromePath = 'C:\\Users\\LENOVO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.resolve('.chrome-diagnose-profile');
const testPort = 8798;
const cdpPort = 9225;

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

  console.log('Loading kursbuch.pdf...');
  await send('DOM.setFileInputFiles', {
    files: [path.resolve('kursbuch.pdf')],
    nodeId: inputNode.nodeId
  }, sessionId);

  await new Promise(r => setTimeout(r, 4000));

  for (const pageToTest of [59, 60, 61]) {
    console.log(`\n=======================================================`);
    console.log(`           DIAGNOSING PAGE ${pageToTest}`);
    console.log(`=======================================================`);

    // Navigate to page
    await send('Runtime.evaluate', {
      expression: `(() => {
        const form = document.querySelector('form');
        const input = form ? form.querySelector('input') : null;
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '${pageToTest}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return true;
      })()`
    }, sessionId);

    await new Promise(r => setTimeout(r, 3000));

    // Run OCR
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run OCR'));
        if (btn) btn.click();
      })()`
    }, sessionId);

    // Wait for OCR
    console.log(`Waiting for OCR on page ${pageToTest}...`);
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const status = await send('Runtime.evaluate', {
        expression: `(() => {
          const layer = document.querySelector('.ocrTextLayer');
          const count = layer ? layer.querySelectorAll('span').length : 0;
          return { hasLayer: !!layer, count };
        })()`,
        returnByValue: true
      }, sessionId);

      if (status.result.value.hasLayer && status.result.value.count > 50) {
        console.log(`  OCR complete! ${status.result.value.count} word spans rendered.`);
        break;
      }
    }

    // Inspect geometry, spans, and hit-testing
    const diagnosis = await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('canvas');
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
        const layer = document.querySelector('.ocrTextLayer');
        const layerRect = layer ? layer.getBoundingClientRect() : null;
        const spans = Array.from(document.querySelectorAll('.ocrTextLayer span'));

        // All spans details
        const spanData = spans.map((s, idx) => {
          const rect = s.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const elAtPoint = document.elementFromPoint(cx, cy);
          const isReachable = elAtPoint === s || s.contains(elAtPoint);
          return {
            idx,
            text: s.innerText,
            ocrWord: s.getAttribute('data-ocr-word'),
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
            style: { left: s.style.left, top: s.style.top, width: s.style.width, height: s.style.height },
            cx, cy,
            isReachable,
            elAtPointTag: elAtPoint ? elAtPoint.tagName + '.' + elAtPoint.className : 'null'
          };
        });

        // Top 10% words
        const topWords = spanData.filter(s => layerRect && s.rect.top < layerRect.top + layerRect.height * 0.10);
        // Bottom 10% words
        const bottomWords = spanData.filter(s => layerRect && s.rect.bottom > layerRect.bottom - layerRect.height * 0.10);
        // Yellow callout words (near right middle)
        const calloutKeywords = ['modalverben', 'satz', 'kinder', 'können', 'helfen', 'samstag', 'muss', 'arbeiten'];
        const matchingKeywords = spanData.filter(s => calloutKeywords.some(kw => s.text.toLowerCase().includes(kw)));

        return {
          canvasRect,
          layerRect,
          totalSpans: spans.length,
          spanData,
          topWords: topWords.map(s => ({ text: s.text, top: Math.round(s.rect.top), left: Math.round(s.rect.left), isReachable: s.isReachable, elAtPoint: s.elAtPointTag })),
          bottomWords: bottomWords.map(s => ({ text: s.text, bottom: Math.round(s.rect.bottom), top: Math.round(s.rect.top), left: Math.round(s.rect.left), isReachable: s.isReachable, elAtPoint: s.elAtPointTag })),
          matchingKeywords: matchingKeywords.map(s => ({ text: s.text, rect: s.rect, isReachable: s.isReachable, elAtPoint: s.elAtPointTag })),
          unreachableSpans: spanData.filter(s => !s.isReachable).map(s => ({ text: s.text, rect: s.rect, elAtPoint: s.elAtPointTag }))
        };
      })()`,
      returnByValue: true
    }, sessionId);

    const data = diagnosis.result.value;
    // Save full spanData to json file for deep inspection
    fs.writeFileSync(`test-assets/browser-spans-page-${pageToTest}.json`, JSON.stringify(data.spanData, null, 2));

    console.log(`Canvas rect:`, data.canvasRect);
    console.log(`Layer rect: `, data.layerRect);
    console.log(`\nTop words on page ${pageToTest}:`);
    for (const w of data.topWords) {
      console.log(`  "${w.text}" at [top=${w.top}, left=${w.left}] reachable: ${w.isReachable} (el: ${w.elAtPoint})`);
    }

    console.log(`\nBottom words on page ${pageToTest}:`);
    for (const w of data.bottomWords) {
      console.log(`  "${w.text}" at [top=${w.top}, bottom=${w.bottom}, left=${w.left}] reachable: ${w.isReachable} (el: ${w.elAtPoint})`);
    }

    console.log(`\nKeyword words on page ${pageToTest}:`);
    for (const w of data.matchingKeywords) {
      console.log(`  "${w.text}" at [top=${Math.round(w.rect.top)}, left=${Math.round(w.rect.left)}, w=${Math.round(w.rect.width)}, h=${Math.round(w.rect.height)}] reachable: ${w.isReachable} (el: ${w.elAtPoint})`);
    }

    console.log(`\nTotal unreachable spans: ${data.unreachableSpans.length}`);
    if (data.unreachableSpans.length > 0) {
      console.log('Sample unreachable spans:', data.unreachableSpans.slice(0, 10));
    }
  }

  await send('Browser.close');
} finally {
  server.close();
  chromeProc.kill();
}
