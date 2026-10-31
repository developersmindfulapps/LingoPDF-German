import fs from 'node:fs';

let code = fs.readFileSync('scripts/verify-phase6-ocr-recovery.mjs', 'utf8');

const oldTarget = `  // Test selecting a word in normal text layer
  console.log('Testing word selection on normal text layer: "Deutschkurs"...');
  const selectWordRes = await send('Runtime.evaluate', {
    expression: \`(() => {
      const spans = Array.from(document.querySelectorAll('.textLayer span'));
      const targetSpan = spans.find(s => s.innerText.includes('Deutschkurs'));
      if (!targetSpan) return { found: false };
      const r = targetSpan.getBoundingClientRect();
      return {
        found: true,
        x: r.left + 25,
        y: r.top + r.height / 2,
      };
    })()\`,
    returnByValue: true
  }, sessionId);

  assert(selectWordRes.result.value.found, 'Located "Deutschkurs" span in textLayer');

  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: selectWordRes.result.value.x,
    y: selectWordRes.result.value.y,
    button: 'left',
    clickCount: 1,
  }, sessionId);
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: selectWordRes.result.value.x,
    y: selectWordRes.result.value.y,
    button: 'left',
  }, sessionId);

  await new Promise(r => setTimeout(r, 600));

  const tooltipCheck = await send('Runtime.evaluate', {
    expression: \`(() => {
      const tooltip = document.querySelector('[role="tooltip"]');
      if (!tooltip) return { found: false };
      return {
        found: true,
        text: tooltip.innerText,
      };
    })()\`,
    returnByValue: true
  }, sessionId);

  assert(tooltipCheck.result.value.found, 'Clicking "Deutschkurs" opened dictionary tooltip');
  assert(tooltipCheck.result.value.text.includes('German course'), 'Tooltip displays translation for "Deutschkurs"');`;

const newTarget = `  // Test selecting a word in normal text layer: "Buch" (book)
  console.log('Testing word selection on normal text layer: "Buch"...');
  const selectWordRes = await send('Runtime.evaluate', {
    expression: \`(() => {
      const spans = Array.from(document.querySelectorAll('.textLayer span'));
      const targetSpan = spans.find(s => s.innerText.includes('Buch'));
      if (!targetSpan) return { found: false };
      const r = targetSpan.getBoundingClientRect();
      return {
        found: true,
        x: r.left + 155, // Center on "Buch" in "Wir lesen ein Buch..."
        y: r.top + r.height / 2,
      };
    })()\`,
    returnByValue: true
  }, sessionId);

  assert(selectWordRes.result.value.found, 'Located "Buch" span in textLayer');

  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: selectWordRes.result.value.x,
    y: selectWordRes.result.value.y,
    button: 'left',
    clickCount: 1,
  }, sessionId);
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: selectWordRes.result.value.x,
    y: selectWordRes.result.value.y,
    button: 'left',
  }, sessionId);

  await new Promise(r => setTimeout(r, 600));

  const tooltipCheck = await send('Runtime.evaluate', {
    expression: \`(() => {
      const tooltip = document.querySelector('[role="tooltip"]');
      if (!tooltip) return { found: false };
      return {
        found: true,
        text: tooltip.innerText,
      };
    })()\`,
    returnByValue: true
  }, sessionId);

  assert(tooltipCheck.result.value.found, 'Clicking "Buch" opened dictionary tooltip');
  assert(tooltipCheck.result.value.text.toLowerCase().includes('book'), 'Tooltip displays translation "book" for "Buch"');`;

code = code.replace(oldTarget, newTarget);
fs.writeFileSync('scripts/verify-phase6-ocr-recovery.mjs', code, 'utf8');
console.log('Updated test target to Buch in verify-phase6-ocr-recovery.mjs');
