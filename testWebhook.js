require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');

// 1. Check for Secret
const secretKey = process.env.CASHFREE_CLIENT_SECRET;
if (!secretKey || secretKey === 'YOUR_SANDBOX_SECRET_HERE') {
  console.error('ERROR: CASHFREE_CLIENT_SECRET is not set in your .env file.');
  console.error('Please add your Cashfree Sandbox Client Secret to the .env file and try again.');
  process.exit(1);
}

// 2. Read Payload
let payload;
try {
  payload = fs.readFileSync('./payload.json', 'utf8');
} catch (err) {
  console.error('ERROR: Could not read payload.json. Make sure the file exists in the project root.');
  process.exit(1);
}

// 3. Generate Signature
const timestamp = Date.now().toString();
const dataToSign = timestamp + payload;
const generatedSignature = crypto.createHmac('sha256', secretKey).update(dataToSign).digest('base64');

console.log('--- Running Webhook Test ---');
console.log('Timestamp:', timestamp);
console.log('Generated Signature:', generatedSignature);

// 4. Send Request
const options = {
  method: 'POST',
  port: process.env.PORT || 8080,
  path: '/cashfree-webhook',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-webhook-timestamp': timestamp,
    'x-webhook-signature': generatedSignature
  }
};

const req = http.request(options, res => {
  let responseBody = '';
  console.log('\n--- Server Response ---');
  console.log('Status Code:', res.statusCode);
  res.on('data', d => {
    responseBody += d;
  });
  res.on('end', () => {
    console.log('Response Body:', responseBody);
    if (res.statusCode === 200) {
      console.log('\n✅ Test Passed: Server returned 200 SUCCESS.');
    } else {
      console.error(`\n❌ Test Failed: Server returned ${res.statusCode}. Check server logs for [Webhook Debug] output.`);
    }
  });
});

req.on('error', error => {
  console.error('\n--- Request Error ---');
  console.error('ERROR: Could not connect to the server.', error.message);
  console.error('Please ensure your server is running with `node app.js`.');
});

req.write(payload);
req.end();
