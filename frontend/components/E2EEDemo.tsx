import React, { useState } from 'react';
import { generateLibsignalBundle } from '../lib/libsignal';
import { saveKeyPairForUsername, loadPublicKeyForUsername, loadPrivateKeyForUsername } from '../lib/crypto';

async function generateX25519KeyPair(): Promise<{ publicKeyB64: string; privateKey: CryptoKey } | null> {
  try {
    // Attempt X25519 (supported in modern browsers' Web Crypto)
    const keyPair = await (crypto as any).subtle.generateKey(
      { name: 'X25519', namedCurve: 'X25519' },
      true,
      ['deriveKey', 'deriveBits']
    );

    const rawPub = await (crypto as any).subtle.exportKey('raw', keyPair.publicKey);
    const pubB64 = Buffer.from(rawPub).toString('base64');
    return { publicKeyB64: pubB64, privateKey: keyPair.privateKey };
  } catch (err) {
    console.warn('X25519 not available in this environment, falling back to P-256 ECDH for demo only', err);
    // Fallback: ECDH P-256 (not the same as X25519 — placeholder for dev)
    const keyPair = await (crypto as any).subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    const rawPub = await (crypto as any).subtle.exportKey('raw', keyPair.publicKey);
    const pubB64 = Buffer.from(rawPub).toString('base64');
    return { publicKeyB64: pubB64, privateKey: keyPair.privateKey };
  }
}

function safetyNumberFromPubB64(pubB64: string): string {
  // For demo, compute a short hash-like safety number
  const buf = Buffer.from(pubB64, 'base64');
  let hash = 0;
  for (let i = 0; i < buf.length; i++) hash = (hash * 31 + buf[i]) & 0xffffffff;
  // Represent as 6 groups of 4 digits
  const sn = ('000000000000' + Math.abs(hash).toString()).slice(-12);
  return sn.replace(/(.{4})/g, '$1 ').trim();
}

export default function E2EEDemo() {
  const [pub, setPub] = useState<string | null>(null);
  const [safety, setSafety] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [peerPrekey, setPeerPrekey] = useState<any | null>(null);

  const createKeys = async () => {
    setStatus('generating...');
    try {
      const kp = await generateX25519KeyPair();
      if (!kp) throw new Error('keygen failed');
      setPub(kp.publicKeyB64);
      setSafety(safetyNumberFromPubB64(kp.publicKeyB64));
      // save locally for the username if present
      if (username) {
        await saveKeyPairForUsername(username, kp.publicKeyB64, kp.privateKeyB64);
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      console.error(err);
    }
  };

  const publishPrekeyBundle = async () => {
    // Keep backward-compatible flow: publish simple identity+signedPreKey
    if (!pub) return alert('Generate keys first');
    if (!username) return alert('Set a username first');
    try {
      // If libsignal available we will generate a proper bundle
      let bundle: any = { identityKey: pub, signedPreKey: (await generateX25519KeyPair()).publicKeyB64 };

      // attempt to create a libsignal bundle and publish that if available
      try {
        const lsBundle = await generateLibsignalBundle();
        bundle = {
          identityKey: lsBundle.identityKey.pubKey,
          signedPreKey: {
            keyId: lsBundle.signedPreKey.keyId,
            publicKey: lsBundle.signedPreKey.publicKey,
            signature: lsBundle.signedPreKey.signature,
          },
          preKey: lsBundle.preKey,
          meta: { libsignal: true, createdAt: lsBundle.createdAt },
        };
      } catch (err) {
        console.warn('libsignal not available; publishing demo prekey bundle');
      }

      const resp = await fetch('http://localhost:3001/prekeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ...bundle }),
      });
      if (!resp.ok) throw new Error('publish prekey failed');
      alert('Published prekey bundle (dev)');
    } catch (err) {
      console.error(err);
      alert('Publish prekey failed');
    }
  };

  const fetchPeerPrekey = async () => {
    if (!peerUsername) return alert('Enter peer username');
    try {
      const resp = await fetch(`http://localhost:3001/prekeys/${encodeURIComponent(peerUsername)}`);
      if (!resp.ok) return alert('Peer prekey not found');
      const body = await resp.json();
      setPeerPrekey(body);
      alert('Fetched peer prekey bundle');
    } catch (err) {
      console.error(err);
      alert('Fetch failed');
    }
  };

  const fetchPeerPrekey = async () => {
    if (!peerUsername) return alert('Enter peer username');
    try {
      const resp = await fetch(`http://localhost:3001/prekeys/${encodeURIComponent(peerUsername)}`);
      if (!resp.ok) return alert('Peer prekey not found');
      const body = await resp.json();
      setPeerPrekey(body);
      alert('Fetched peer prekey bundle');
    } catch (err) {
      console.error(err);
      alert('Fetch failed');
    }
  };

  const publishPublicKey = async () => {
    if (!pub) return alert('Generate keys first');
    if (!username) return alert('Set a username first');
    try {
      const resp = await fetch('http://localhost:3001/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, publicKey: pub }),
      });
      if (!resp.ok) throw new Error('publish failed');
      alert('Published public key to server (dev)');
    } catch (err) {
      console.error(err);
      alert('Publish failed');
    }
  };

  // helper to auto-load saved key for current username
  const loadSavedForUsername = async (name: string) => {
    const pubB64 = loadPublicKeyForUsername(name);
    const privB64 = loadPrivateKeyForUsername(name);
    if (pubB64 && privB64) {
      setPub(pubB64);
      setSafety(safetyNumberFromPubB64(pubB64));
      setStatus('loaded saved keys');
    }
  };

  React.useEffect(() => {
    // when username changes, try to load saved keypair
    loadSavedForUsername(username);
  }, [username]);

  const [peerUsername, setPeerUsername] = useState('');
  const [peerPub, setPeerPub] = useState<string | null>(null);

  const fetchPeerKey = async () => {
    if (!peerUsername) return alert('Enter peer username');
    try {
      const resp = await fetch(`http://localhost:3001/keys/${encodeURIComponent(peerUsername)}`);
      if (!resp.ok) return alert('Peer not found');
      const body = await resp.json();
      setPeerPub(body.publicKey);
      const peerSafety = safetyNumberFromPubB64(body.publicKey);
      alert(`Peer safety number: ${peerSafety}`);
    } catch (err) {
      console.error(err);
      alert('Fetch failed');
    }
  };


  return (
    <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
      <h3>End-to-End Encryption (demo)</h3>
      <div style={{ marginBottom: 8 }}>
        <button onClick={createKeys}>Generate Key Pair (client-side)</button>
        <span style={{ marginLeft: 10 }}>{status}</span>
      </div>

      {pub && (
        <div>
          <div style={{ fontSize: 12, color: '#666' }}>Public Key (base64):</div>
          <div style={{ wordBreak: 'break-all', background: '#fafafa', padding: 8 }}>{pub}</div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Safety number:</div>
            <div style={{ background: '#f3f3ff', padding: 8, display: 'inline-block' }}>{safety}</div>
          </div>

          <div style={{ marginTop: 8 }}>
            <button onClick={publishPublicKey}>Publish my public key (dev)</button>
            <button style={{ marginLeft: 8 }} onClick={publishPrekeyBundle}>Publish prekey bundle (dev)</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Fetch peer public key (dev):</div>
            <input value={peerUsername} onChange={e => setPeerUsername(e.target.value)} placeholder="peer username" />
            <button style={{ marginLeft: 8 }} onClick={fetchPeerKey}>Fetch</button>
            <button style={{ marginLeft: 8 }} onClick={fetchPeerPrekey}>Fetch peer prekey bundle</button>
            {peerPub && (
              <div style={{ marginTop: 8, background: '#fafafa', padding: 8, wordBreak: 'break-all' }}>
                <div style={{ fontSize: 12, color: '#666' }}>Peer public key:</div>
                <div>{peerPub}</div>
                <div style={{ marginTop: 6 }}>Peer safety: {safetyNumberFromPubB64(peerPub)}</div>
              </div>
            )}
            {peerPrekey && (
              <div style={{ marginTop: 8, background: '#fff7f0', padding: 8, wordBreak: 'break-all' }}>
                <div style={{ fontSize: 12, color: '#666' }}>Peer prekey bundle (dev):</div>
                <div>identityKey: {peerPrekey.identityKey}</div>
                <div style={{ marginTop: 6 }}>signedPreKey: {peerPrekey.signedPreKey}</div>
                <div style={{ marginTop: 6, color: '#888' }}>Note: signedPreKey currently unsigned demo placeholder; will be replaced with real libsignal signed prekey.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 8, color: '#888' }}>
            Tip: Exchange public keys or safety numbers with another device to verify identity (QR/scan UI to be added).
          </div>
        </div>
      )}
    </div>
  );
}
