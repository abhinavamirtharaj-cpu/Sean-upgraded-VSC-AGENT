import nacl from 'tweetnacl';

// Verify an Ed25519 signature: identityPubKey signs the signedPreKeyPublicKey
export function verifySignedPreKey(identityPubKeyB64: string, signedPreKeyPublicKeyB64: string, signatureB64: string) {
  if (!identityPubKeyB64 || !signedPreKeyPublicKeyB64 || !signatureB64) return false;
  try {
    const pub = Buffer.from(identityPubKeyB64, 'base64');
    const msg = Buffer.from(signedPreKeyPublicKeyB64, 'base64');
    const sig = Buffer.from(signatureB64, 'base64');
    return nacl.sign.detached.verify(new Uint8Array(msg), new Uint8Array(sig), new Uint8Array(pub));
  } catch (err) {
    console.warn('verifySignedPreKey failed', err);
    return false;
  }
}
