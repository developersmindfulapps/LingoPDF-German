import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const distDir = path.resolve('dist');
const chromePath = 'C:\\Users\\LENOVO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = path.resolve('.chrome-diagnose-profile');
const testPort = 8791;
const cdpPort = 9232;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/viewer.html';
  const filePath = path.join(distDir, reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath)) {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

await new Promise(r => server.listen(testPort, r));

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=' + cdpPort,
  '--user-data-dir=' + profileDir,
  '--no-first-run',
  'http://127.0.0.1:' + testPort + '/viewer.html'
]);

await new Promise(r => setTimeout(r, 2000));
const versionRes = await fetch('http://127.0.0.1:' + cdpPort + '/json/version');
const versionData = await versionRes.json();
const ws = new WebSocket(versionData.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let currentSessionId = null;
const send = (method, params = {}, sId = currentSessionId) => new Promise(res => {
  const id = Math.floor(Math.random() * 100000);
  const onMsg = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === id) { ws.removeEventListener('message', onMsg); res(msg.result); }
  };
  ws.addEventListener('message', onMsg);
  const payload = { id, method, params };
  if (sId) payload.sessionId = sId;
  ws.send(JSON.stringify(payload));
});

const targets = await send('Target.getTargets');
const pageTarget = targets.targetInfos.find(t => t.url.includes('viewer.html'));
const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
currentSessionId = attachRes.sessionId;
const sessionId = currentSessionId;

await send('Runtime.enable', {}, sessionId);
await send('DOM.enable', {}, sessionId);

const testComp = await send('Runtime.evaluate', {
  expression: `(() => {
    const div = document.createElement('div');
    div.style.position = 'relative';
    div.style.width = '1000px';
    div.style.height = '1000px';
    document.body.appendChild(div);

    // Option 1: Current bug (width: 127.35px + scaleX: 6.364)
    const s1 = document.createElement('span');
    s1.innerText = 'EEE';
    s1.style.position = 'absolute';
    s1.style.left = '100px';
    s1.style.top = '100px';
    s1.style.width = '127.35px';
    s1.style.fontSize = '10px';
    s1.style.fontFamily = 'sans-serif';
    s1.style.whiteSpace = 'pre';
    s1.style.transform = 'scaleX(6.364)';
    s1.style.transformOrigin = '0 0';
    div.appendChild(s1);

    // Option 2: width: auto + scaleX: 6.364 (PDF.js standard approach)
    const s2 = document.createElement('span');
    s2.innerText = 'EEE';
    s2.style.position = 'absolute';
    s2.style.left = '100px';
    s2.style.top = '150px';
    s2.style.fontSize = '10px';
    s2.style.fontFamily = 'sans-serif';
    s2.style.whiteSpace = 'pre';
    s2.style.transform = 'scaleX(6.364)';
    s2.style.transformOrigin = '0 0';
    div.appendChild(s2);

    // Option 3: width: 127.35px without scaleX
    const s3 = document.createElement('span');
    s3.innerText = 'EEE';
    s3.style.position = 'absolute';
    s3.style.left = '100px';
    s3.style.top = '200px';
    s3.style.width = '127.35px';
    s3.style.fontSize = '10px';
    s3.style.fontFamily = 'sans-serif';
    s3.style.whiteSpace = 'pre';
    div.appendChild(s3);

    return {
      s1Width: s1.getBoundingClientRect().width,
      s2Width: s2.getBoundingClientRect().width,
      s3Width: s3.getBoundingClientRect().width,
    };
  })()`,
  returnByValue: true
}, sessionId);

console.log('Result:', testComp.result.value);

ws.close();
chromeProc.kill();
server.close();
process.exit(0);
