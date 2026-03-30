#!/usr/bin/env node
/**
 * Make all images in Firebase Storage public
 */

import { execSync } from 'child_process';
import https from 'https';

const BUCKET = 'exitpollsimulator.firebasestorage.app';

// Get access token from gcloud
function getAccessToken() {
  try {
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf8', timeout: 30000 }).trim();
    return token;
  } catch (error) {
    console.error('❌ Error: Could not get access token.');
    console.error('   Run: gcloud auth login');
    process.exit(1);
  }
}

// Set bucket to public
async function makeBucketPublic(accessToken) {
  return new Promise((resolve, reject) => {
    const iamPolicy = {
      bindings: [
        {
          role: 'roles/storage.objectViewer',
          members: ['allUsers']
        }
      ]
    };
    
    const data = JSON.stringify(iamPolicy);
    
    const options = {
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${BUCKET}/iam`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          console.log('✅ Bucket permissions updated successfully');
          resolve();
        } else {
          console.error('Status:', res.statusCode);
          console.error('Response:', responseData);
          reject(new Error(`Failed to set permissions: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🔓 Making Firebase Storage bucket public...\n');
  
  const accessToken = getAccessToken();
  
  try {
    await makeBucketPublic(accessToken);
    console.log('\n✅ All images are now public!');
    console.log('\n🌎 Images available at:');
    console.log(`   https://storage.googleapis.com/${BUCKET}/images/parties/`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
