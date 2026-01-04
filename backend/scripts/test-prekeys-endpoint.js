#!/usr/bin/env node
let fetch;
try {
  // Node 18+ has global fetch; otherwise, try requiring node-fetch (may not be available in ESM-only installs)
  fetch = globalThis.fetch || (() => { throw new Error('fetch not available') })();
} catch (e) {
  try {
    fetch = require('node-fetch');
  } catch (err) {
    console.error('No fetch implementation available. Use Node 18+ or install node-fetch.');
    process.exit(1);
  }
}
const nacl = require('tweetnacl');

(async () => {
  const base = process.env.SERVER_BASE || 'http://localhost:3001';
  console.log('testing prekeys endpoint at', base);

  // helper to make signed bundle
  function makeSignedBundle(username) {
    const kp = nacl.sign.keyPair();
    const identityPub = Buffer.from(kp.publicKey).toString('base64');

    // create a signedPreKey as a new random key and sign its publicKey
    const sp = nacl.sign.keyPair();
    const spPubB64 = Buffer.from(sp.publicKey).toString('base64');
    const signature = nacl.sign.detached(new Uint8Array(Buffer.from(spPubB64, 'base64')), kp.secretKey);
    const sigB64 = Buffer.from(signature).toString('base64');

    return {
      username,
      identityKey: { pubKey: identityPub },
      signedPreKey: { keyId: 1, publicKey: spPubB64, signature: sigB64 },
      preKey: { keyId: 2, publicKey: spPubB64 }
    };
  }

  try {
    const okBundle = makeSignedBundle('test-user-1');
    const resp = await fetch(`${base}/prekeys`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(okBundle) });
    if (!resp.ok) throw new Error('valid bundle was rejected: ' + resp.status + ' ' + await resp.text());
    console.log('valid bundle accepted');

    const getResp = await fetch(`${base}/prekeys/${encodeURIComponent(okBundle.username)}`);
    if (!getResp.ok) throw new Error('GET prekeys failed: ' + getResp.status);
    const got = await getResp.json();
    if (!got || !got.identityKey) throw new Error('GET prekeys returned invalid body');
    console.log('GET returned bundle OK');

    // send an invalid signature bundle
    const badBundle = JSON.parse(JSON.stringify(okBundle));
    badBundle.username = 'test-user-2';
    badBundle.signedPreKey.signature = Buffer.from(badBundle.signedPreKey.signature, 'base64').map((b, i) => b ^ (i % 5)).toString('base64');

    const badResp = await fetch(`${base}/prekeys`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(badBundle) });
    if (badResp.ok) {
      throw new Error('invalid bundle was incorrectly accepted');
    }
    console.log('invalid signature was correctly rejected (status ' + badResp.status + ')');

    console.log('prekeys endpoint integration test passed');
    process.exit(0);
  } catch (err) {
    console.error('prekeys endpoint test failed', err);
    process.exit(1);
  }
})();
