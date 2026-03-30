#!/usr/bin/env node
/**
 * Upload images to Firebase Storage using REST API
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET = 'exitpollsimulator.firebasestorage.app';
const PROJECT_ID = 'exitpollsimulator';

// Get access token from gcloud
function getAccessToken() {
  try {
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf8', timeout: 30000 }).trim();
    return token;
  } catch (error) {
    console.error('❌ Error: Could not get access token. Run: gcloud auth login');
    process.exit(1);
  }
}

// Upload file using REST API
async function uploadFile(localPath, remotePath, accessToken) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(localPath);
    const encodedPath = encodeURIComponent(remotePath);
    
    const options = {
      hostname: 'storage.googleapis.com',
      path: `/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodedPath}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'image/webp',
        'Content-Length': fileData.length,
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => reject(err));
    req.write(fileData);
    req.end();
  });
}

// Make file public
async function makePublic(remotePath, accessToken) {
  return new Promise((resolve, reject) => {
    const encodedPath = encodeURIComponent(remotePath);
    const aclData = JSON.stringify({
      entity: 'allUsers',
      role: 'READER'
    });
    
    const options = {
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${BUCKET}/o/${encodedPath}/acl`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': aclData.length,
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => reject(err));
    req.write(aclData);
    req.end();
  });
}

async function main() {
  console.log('🚀 Uploading images to Firebase Storage...\n');
  
  const accessToken = getAccessToken();
  
  const IMAGES_DIR = path.join(__dirname, '..', 'static', 'images', 'parties');
  
  let successCount = 0;
  let failCount = 0;
  
  // Upload logos
  const logosDir = path.join(IMAGES_DIR, 'logos');
  const logoFiles = fs.readdirSync(logosDir);
  
  console.log(`📦 Uploading ${logoFiles.length} logos...`);
  for (const file of logoFiles) {
    const localPath = path.join(logosDir, file);
    const remotePath = `images/parties/logos/${file}`;
    
    try {
      await uploadFile(localPath, remotePath, accessToken);
      await makePublic(remotePath, accessToken);
      console.log(`  ✓ ${file}`);
      successCount++;
    } catch (error) {
      console.log(`  ✗ ${file} - ${error.message}`);
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
    
    try {
      await uploadFile(localPath, remotePath, accessToken);
      await makePublic(remotePath, accessToken);
      console.log(`  ✓ ${file}`);
      successCount++;
    } catch (error) {
      console.log(`  ✗ ${file} - ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n✅ Upload complete!`);
  console.log(`   Success: ${successCount} files`);
  console.log(`   Failed: ${failCount} files`);
  
  if (failCount === 0) {
    console.log(`\n🌎 All images now available at:`);
    console.log(`   https://storage.googleapis.com/${BUCKET}/images/parties/`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(console.error);
