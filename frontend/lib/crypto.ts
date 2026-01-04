// Minimal WebCrypto-based X25519 key agreement + AES-GCM helpers (dev/demo)
// SECURITY NOTICE: This implementation is for development and demos only.
// - HKDF uses a zero salt here for simplicity — DO NOT use this in production.
// - This is NOT a replacement for a proper Signal double-ratchet implementation.
// - For production apps you MUST migrate to a vetted library such as libsignal and
//   employ signed prekeys, persistent session storage, and proper key lifecycle.

export async function generateAndExportKeyPair() {
  const kp = await (crypto as any).subtle.generateKey(
    { name: 'X25519', namedCurve: 'X25519' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const rawPub = await (crypto as any).subtle.exportKey('raw', kp.publicKey);
  const rawPriv = await (crypto as any).subtle.exportKey('pkcs8', kp.privateKey);
  return {
    publicKeyB64: arrayBufferToB64(rawPub),
    privateKeyB64: arrayBufferToB64(rawPriv),
  };
}

export async function importPrivateKeyFromB64(pkcs8B64: string) {
  const raw = b64ToArrayBuffer(pkcs8B64);
  return (crypto as any).subtle.importKey('pkcs8', raw, { name: 'X25519', namedCurve: 'X25519' }, true, ['deriveBits']);
}

export async function importPublicKeyFromB64(rawB64: string) {
  const raw = b64ToArrayBuffer(rawB64);
  return (crypto as any).subtle.importKey('raw', raw, { name: 'X25519', namedCurve: 'X25519' }, true, []);
}

export async function deriveAESGCMKey(ownPrivateKey: CryptoKey, peerPublicKeyB64: string) {
  const peerKey = await importPublicKeyFromB64(peerPublicKeyB64);
  // derive raw shared secret (32 bytes)
  const shared = await (crypto as any).subtle.deriveBits({ name: 'X25519', public: peerKey }, ownPrivateKey, 256);

  // HKDF to derive AES-GCM 256-bit key
  const salt = new Uint8Array(16); // zero salt for demo; in prod use random salt + transmit
  const info = new TextEncoder().encode('sean-chat-hkdf');
  const baseKey = await (crypto as any).subtle.importKey('raw', shared, { name: 'HKDF' }, false, ['deriveKey']);
  const aesKey = await (crypto as any).subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return aesKey;
}

export async function encryptWithAESGCM(aesKey: CryptoKey, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = await (crypto as any).subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc);
  return { ciphertextB64: arrayBufferToB64(ct), ivB64: arrayBufferToB64(iv.buffer) };
}

export async function decryptWithAESGCM(aesKey: CryptoKey, ciphertextB64: string, ivB64: string) {
  try {
    const ct = b64ToArrayBuffer(ciphertextB64);
    const iv = b64ToArrayBuffer(ivB64);
    const pt = await (crypto as any).subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, aesKey, ct);
    return new TextDecoder().decode(pt);
  } catch (err) {
    console.warn('decrypt failed', err);
    return null;
  }
}

// localStorage helpers for storing keys per-username
export function storageKeyFor(username: string, suffix: 'pub' | 'priv') {
  return `sean:${username}:${suffix}`;
}

export async function saveKeyPairForUsername(username: string, pubB64: string, privB64: string) {
  localStorage.setItem(storageKeyFor(username, 'pub'), pubB64);
  localStorage.setItem(storageKeyFor(username, 'priv'), privB64);
}

export function loadPublicKeyForUsername(username: string) {
  return localStorage.getItem(storageKeyFor(username, 'pub'));
}

export function loadPrivateKeyForUsername(username: string) {
  return localStorage.getItem(storageKeyFor(username, 'priv'));
}

// util
function arrayBufferToB64(buf: ArrayBuffer) {
  return Buffer.from(buf).toString('base64');
}
function b64ToArrayBuffer(b64: string) {
  return Buffer.from(b64, 'base64');
}
