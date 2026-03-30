#!/usr/bin/env node
/**
 * Upload images to Firebase Storage using Firebase CLI
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '..', 'static', 'images', 'parties');
const BUCKET = 'exitpollsimulator.firebasestorage.app';

function uploadFile(localPath, remotePath) {
  try {
    const cmd = `firebase storage:upload "${localPath}" "gs://${BUCKET}/${remotePath}" --project exitpollsimulator -P`;
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });
    console.log(`  ✓ Uploaded: ${remotePath}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${remotePath}`);
    console.error(`    Error: ${error.message}`);
    return false;
  }
}

console.log('🚀 Uploading images to Firebase Storage...\n');

let successCount = 0;
let failCount = 0;

// Upload logos
const logosDir = path.join(IMAGES_DIR, 'logos');
const logoFiles = fs.readdirSync(logosDir);

console.log(`📦 Uploading ${logoFiles.length} logos...`);
for (const file of logoFiles) {
  const localPath = path.join(logosDir, file);
  const remotePath = `images/parties/logos/${file}`;
  
  if (uploadFile(localPath, remotePath)) {
    successCount++;
  } else {
    failCount++;
  }
}

// Upload candidates
const candidatesDir = path.join(IMAGES_DIR, 'candidates');
const candidateFiles = fs.readdirSync(candidatesDir);

console.log(`\n📦 Uploading ${candidateFiles.length} candidate photos...`);
for (const file of candidateFiles) {
  const localPath = path.join(candidatesDir, file);
  const remotePath = `images/parties/candidates/${file}`;
  
  if (uploadFile(localPath, remotePath)) {
    successCount++;
  } else {
    failCount++;
  }
}

console.log(`\n✅ Upload complete!`);
console.log(`   Success: ${successCount} files`);
console.log(`   Failed: ${failCount} files`);

if (failCount > 0) {
  console.log(`\n⚠️  ${failCount} files failed to upload. Check Firebase authentication.`);
  process.exit(1);
} else {
  console.log(`\n🌎 All images now available at:`);
  console.log(`   https://storage.googleapis.com/${BUCKET}/images/parties/`);
  process.exit(0);
}
