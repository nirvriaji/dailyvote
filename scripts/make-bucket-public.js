#!/usr/bin/env node
/**
 * Make Firebase Storage bucket public using Firebase REST API
 * This uses the Firebase Admin approach via service account
 */

import { execSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET = 'exitpollsimulator.firebasestorage.app';
const PROJECT_ID = 'exitpollsimulator';

// Try to get access token from various sources
function getAccessToken() {
  try {
    // Try gcloud
    return execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8', timeout: 10000 }).trim();
  } catch {
    try {
      // Try firebase login:ci
      const token = execSync('firebase login:ci --interactive 2>/dev/null | head -1', { encoding: 'utf8', timeout: 30000 }).trim();
      if (token && token.startsWith('1//')) {
        return token;
      }
    } catch {
      // nop
    }
    throw new Error('No authentication token available. Please run: firebase login:ci');
  }
}

async function makeBucketPublic(token) {
  const policy = {
    bindings: [{
      role: 'roles/storage.objectViewer',
      members: ['allUsers']
    }]
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(policy);
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${BUCKET}/iam`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🔓 Making Storage bucket public via IaC...\n');
  
  try {
    const token = getAccessToken();
    await makeBucketPublic(token);
    console.log('✅ Success! Bucket is now public.');
    console.log('\nImages will be accessible at:');
    console.log(`  https://storage.googleapis.com/${BUCKET}/images/parties/...`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\nFallback: Execute this in your terminal:');
    console.log('  firebase login:ci');
    console.log('  # Then copy the token and run this script again');
    process.exit(1);
  }
}

main();
