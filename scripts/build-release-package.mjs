import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const unpackedDir = path.join(rootDir, 'dist-unpacked');
const zipPath = path.join(rootDir, 'lingopdf-v0.1.0.zip');
const legacyZipPath = path.join(rootDir, 'pdf-language-companion-v0.1.0.zip');

console.log('=== PACKAGING LINGOPDF RELEASE PACKAGE ===');

// 1. Clean and sync dist-unpacked with dist
if (fs.existsSync(unpackedDir)) {
  fs.rmSync(unpackedDir, { recursive: true, force: true });
}
fs.cpSync(distDir, unpackedDir, { recursive: true });
console.log('✓ Synced dist/ -> dist-unpacked/');

// 2. Remove old zip files if present
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}
if (fs.existsSync(legacyZipPath)) {
  fs.unlinkSync(legacyZipPath);
}

// 3. Create zip archive of dist-unpacked contents
const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${path.join(unpackedDir, '*')}' -DestinationPath '${zipPath}' -Force"`;
execSync(psCommand, { stdio: 'inherit' });

console.log(`✓ Created ${zipPath} (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB)`);
console.log('=== LINGOPDF RELEASE PACKAGING COMPLETE ===');
