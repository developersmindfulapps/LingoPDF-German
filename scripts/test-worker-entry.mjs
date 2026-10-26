import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('======================================================================');
console.log('   TESSERACT WORKER ENTRYPOINT UNIT TEST                            ');
console.log('======================================================================\n');

const entryPath = path.resolve('public/tesseract/worker-entry.js');
assert(fs.existsSync(entryPath), 'worker-entry.js exists in public/tesseract/');

const distEntryPath = path.resolve('dist/tesseract/worker-entry.js');
assert(fs.existsSync(distEntryPath), 'worker-entry.js exists in dist/tesseract/');

// Read content
const code = fs.readFileSync(entryPath, 'utf8');

// Verify that it does not import or use any forbidden external sources
assert(!code.includes('http://'), 'No external HTTP URLs in worker-entry.js');
assert(!code.includes('https://'), 'No external HTTPS URLs in worker-entry.js');
assert(code.includes("importScripts('./worker.min.js')"), "Imports local ./worker.min.js");

// Test interception logic in simulated worker scope
let errorCalls = [];
let infoCalls = [];
let logCalls = [];

const mockSelf = {
  console: {
    error: (...args) => { errorCalls.push(args); },
    info: (...args) => { infoCalls.push(args); },
    log: (...args) => { logCalls.push(args); }
  }
};

// Evaluate the interception block using Function with mockSelf as self
const fn = new Function('self', 'importScripts', `
  ${code.replace("importScripts('./worker.min.js');", "// importScripts bypassed in unit test")}
`);

fn(mockSelf, () => {});

// Test 1: Tesseract C++ diagnostic message "Estimating resolution as 109"
console.log('[Test 1] Tesseract DPI estimation diagnostic:');
mockSelf.console.error('Estimating resolution as 109');
assert.strictEqual(errorCalls.length, 0, 'Must NOT invoke console.error for "Estimating resolution as 109"');
assert.strictEqual(infoCalls.length, 1, 'Must route to console.info');
assert.strictEqual(infoCalls[0][0], 'Estimating resolution as 109');
console.log('  ✓ Successfully routed "Estimating resolution as 109" to console.info');

// Test 2: Tesseract C++ diagnostic with other resolutions (e.g., 356)
console.log('\n[Test 2] Tesseract DPI estimation with other resolutions (356):');
mockSelf.console.error('Estimating resolution as 356');
assert.strictEqual(errorCalls.length, 0, 'Must NOT invoke console.error for "Estimating resolution as 356"');
assert.strictEqual(infoCalls.length, 2, 'Must route to console.info');
assert.strictEqual(infoCalls[1][0], 'Estimating resolution as 356');
console.log('  ✓ Successfully routed "Estimating resolution as 356" to console.info');

// Test 3: Genuine runtime error string
console.log('\n[Test 3] Genuine runtime error string:');
mockSelf.console.error('Uncaught ReferenceError: foo is not defined');
assert.strictEqual(errorCalls.length, 1, 'MUST invoke original console.error for genuine errors');
assert.strictEqual(errorCalls[0][0], 'Uncaught ReferenceError: foo is not defined');
assert.strictEqual(infoCalls.length, 2, 'Did not route genuine error to info');
console.log('  ✓ Genuine error string correctly forwarded to console.error');

// Test 4: Genuine Error object
console.log('\n[Test 4] Genuine Error object:');
const testErr = new Error('Out of memory');
mockSelf.console.error(testErr);
assert.strictEqual(errorCalls.length, 2, 'MUST invoke original console.error for Error objects');
assert.strictEqual(errorCalls[1][0], testErr);
assert.strictEqual(infoCalls.length, 2, 'Did not route Error object to info');
console.log('  ✓ Genuine Error object correctly forwarded to console.error');

// Test 5: Fallback to console.log if console.info is undefined
console.log('\n[Test 5] Fallback to console.log if console.info is undefined:');
let fallbackLogCalls = [];
let fallbackErrorCalls = [];
const mockSelfNoInfo = {
  console: {
    error: (...args) => { fallbackErrorCalls.push(args); },
    log: (...args) => { fallbackLogCalls.push(args); }
  }
};
fn(mockSelfNoInfo, () => {});
mockSelfNoInfo.console.error('Estimating resolution as 72');
assert.strictEqual(fallbackErrorCalls.length, 0, 'Must NOT invoke console.error');
assert.strictEqual(fallbackLogCalls.length, 1, 'Must fallback to console.log');
assert.strictEqual(fallbackLogCalls[0][0], 'Estimating resolution as 72');
console.log('  ✓ Fallback to console.log works correctly when console.info is absent');

console.log('\n======================================================================');
console.log('🎉 ALL TESSERACT WORKER ENTRYPOINT TESTS PASSED SUCCESSFULLY!        ');
console.log('======================================================================');
