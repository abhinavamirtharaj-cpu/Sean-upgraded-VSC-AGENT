#!/usr/bin/env node
const nacl = require('tweetnacl');
const { verifySignedPreKey } = require('../src/cryptoHelpers');

// generate a keypair and sign a message
const keypair = nacl.sign.keyPair();
const msg = Buffer.from('test-message');
const sig = nacl.sign.detached(new Uint8Array(msg), keypair.secretKey);

const pubB64 = Buffer.from(keypair.publicKey).toString('base64');
const msgB64 = Buffer.from(msg).toString('base64');
const sigB64 = Buffer.from(sig).toString('base64');

console.log('pubB64', pubB64);
console.log('msgB64', msgB64);
console.log('sigB64', sigB64);

const ok = verifySignedPreKey(pubB64, msgB64, sigB64);
if (!ok) {
  console.error('verification failed');
  process.exit(1);
}
console.log('verification succeeded (expected)');

// negative test
const brokenOk = verifySignedPreKey(pubB64, msgB64, Buffer.from(sig.map((b,i)=>b ^ (i%5))).toString('base64'));
if (brokenOk) {
  console.error('negative verification unexpectedly succeeded');
  process.exit(1);
}
console.log('negative test succeeded (verification rejected bad sig)');
