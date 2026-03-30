#!/usr/bin/env node
/**
 * Upload images to Firebase Storage
 * Uses Firebase Admin SDK
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// Using application default credentials (requires firebase login)
const app = initializeApp({
  projectId: 'exitpollsimulator',
  storageBucket: 'exitpollsimulator.firebasestorage.app'
});

const storage = getStorage(app);
const bucket = storage.bucket();

const IMAGES_DIR = path.join(__dirname, '..', 'static', 'images', 'parties');

async function uploadFile(localPath, remotePath) {
  try {
    await bucket.upload(localPath, {
      destination: remotePath,
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    // Make file public
    const file = bucket.file(remotePath);
    await file.makePublic();
    
    console.log(`  ✓ Uploaded: ${remotePath}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${remotePath}`, error.message);
    return false;
  }
}

async function uploadAllImages() {
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
    
    if (await uploadFile(localPath, remotePath)) {
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
    
    if (await uploadFile(localPath, remotePath)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n✅ Upload complete!`);
  console.log(`   Success: ${successCount} files`);
  console.log(`   Failed: ${failCount} files`);
  console.log(`\n🌎 Files now available at:`);
  console.log(`   https://storage.googleapis.com/exitpollsimulator.firebasestorage.app/images/parties/`);
  
  process.exit(0);
}

uploadAllImages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
