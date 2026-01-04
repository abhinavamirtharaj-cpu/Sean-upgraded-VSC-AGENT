// Minimal libsignal session helper (demo only)
// Uses dynamic import of libsignal-protocol and a tiny in-memory/localStorage-backed store

import { loadPrivateKeyForUsername, loadPublicKeyForUsername, saveKeyPairForUsername } from './crypto';

function b64ToArrayBuffer(b64: string) {
  return Buffer.from(b64, 'base64');
}
function arrayBufferToB64(buf: ArrayBuffer | Uint8Array) {
  return Buffer.from(buf as any).toString('base64');
}

function mkStore() {
  const map = new Map<string, any>();
  return {
    get: (key: string) => map.get(key),
    put: (key: string, value: any) => map.set(key, value),
    remove: (key: string) => map.delete(key),
  };
}

export async function ensureLocalLibsignalIdentity(username: string) {
  // if keys are stored in localStorage via E2E demo, use them; otherwise generate libsignal bundle
  let pub = loadPublicKeyForUsername(username);
  let priv = loadPrivateKeyForUsername(username);
  if (pub && priv) return { pub, priv };

  // Try libsignal generation
  try {
    const lib = await import('libsignal-protocol');
    const KeyHelper = (lib as any).KeyHelper;
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();

    const rawPub = identityKeyPair.pubKey || identityKeyPair.publicKey || (identityKeyPair as any).pubKey;
    const rawPriv = identityKeyPair.privKey || identityKeyPair.privateKey || (identityKeyPair as any).privKey;

    const pubB64 = arrayBufferToB64(rawPub instanceof Uint8Array ? rawPub : new Uint8Array(rawPub));
    const privB64 = arrayBufferToB64(rawPriv instanceof Uint8Array ? rawPriv : new Uint8Array(rawPriv));

    await saveKeyPairForUsername(username, pubB64, privB64);
    return { pub: pubB64, priv: privB64 };
  } catch (err) {
    console.warn('libsignal not available to generate identity', err);
    // fallback: call existing crypto keygen
    const { generateX25519KeyPair } = await import('./crypto');
    const kp = await generateX25519KeyPair();
    await saveKeyPairForUsername(username, kp.publicKeyB64, kp.privateKeyB64);
    return { pub: kp.publicKeyB64, priv: kp.privateKeyB64 };
  }
}

export async function createSessionWithPeer(myUsername: string, peerUsername: string) {
  const lib = await import('libsignal-protocol');
  const store = mkStore();

  // load or create local identity
  const local = await ensureLocalLibsignalIdentity(myUsername);

  // registrationId: use a small random for demo and store
  let registrationId = Number(localStorage.getItem(`sean:${myUsername}:regid`));
  if (!registrationId) {
    registrationId = Math.floor(Math.random() * 16380) + 1;
    localStorage.setItem(`sean:${myUsername}:regid`, String(registrationId));
  }

  // seed store expected values
  store.put('identityKey', {
    pubKey: b64ToArrayBuffer(local.pub),
    privKey: b64ToArrayBuffer(local.priv),
  });
  store.put('registrationId', registrationId);

  // fetch peer prekey bundle
  const resp = await fetch(`http://localhost:3001/prekeys/${encodeURIComponent(peerUsername)}`);
  if (!resp.ok) throw new Error('peer prekey not found');
  const bundle = await resp.json();

  // Build PreKeyBundle structure expected by libsignal
  const PreKeyBundle = {
    identityKey: b64ToArrayBuffer(bundle.identityKey),
    registrationId: bundle.meta?.registrationId || 1,
    preKey: bundle.preKey
      ? { keyId: bundle.preKey.keyId, publicKey: b64ToArrayBuffer(bundle.preKey.publicKey) }
      : undefined,
    signedPreKey: bundle.signedPreKey
      ? { keyId: bundle.signedPreKey.keyId || bundle.signedPreKey.keyId, publicKey: b64ToArrayBuffer(bundle.signedPreKey.publicKey), signature: b64ToArrayBuffer(bundle.signedPreKey.signature) }
      : undefined,
  };

  const address = new (lib as any).ProtocolAddress(peerUsername, 1);
  const builder = new (lib as any).SessionBuilder(store, address);

  // process prekey bundle
  await builder.processPreKey(PreKeyBundle);

  // return a simple session helper
  return {
    encrypt: async (plaintext: string) => {
      const cipher = new (lib as any).SessionCipher(store, address);
      const res = await cipher.encrypt(new TextEncoder().encode(plaintext));
      // res may be a ArrayBuffer or { type, body }
      if (res instanceof ArrayBuffer || res.buffer) {
        return arrayBufferToB64(res);
      }
      if (res.body) return arrayBufferToB64(res.body);
      return arrayBufferToB64(res);
    },
    decrypt: async (msgB64: string) => {
      const cipher = new (lib as any).SessionCipher(store, new (lib as any).ProtocolAddress(peerUsername, 1));
      const msg = b64ToArrayBuffer(msgB64);
      // libsignal expects type2/3 depending; try decryptPreKeyWhatev
      try {
        const res = await cipher.decryptPreKeyWhisperMessage(msg);
        return new TextDecoder().decode(res);
      } catch (err) {
        try {
          const res = await cipher.decryptWhisperMessage(msg);
          return new TextDecoder().decode(res);
        } catch (err2) {
          console.error('decrypt failed', err2);
          return null;
        }
      }
    },
  };
}
