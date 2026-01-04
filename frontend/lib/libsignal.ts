// Lightweight dynamic wrapper for libsignal-protocol-js (dev/demo purpose)
// Note: This code does dynamic import so the dependency may be installed later.

function toB64(uint8: Uint8Array | ArrayBuffer | number[] | undefined | null) {
  if (!uint8) return null;
  const u8 = uint8 instanceof Uint8Array ? uint8 : new Uint8Array(uint8 as any);
  return Buffer.from(u8).toString('base64');
}

export async function generateLibsignalBundle() {
  try {
    const lib = await import('libsignal-protocol');
    const KeyHelper = (lib as any).KeyHelper || (lib as any).KeyHelper;

    // generate identity key pair
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();

    // generate signed prekey (id = timestamp truncated)
    const signedPreKeyId = Math.floor(Date.now() / 1000) % 1000000;
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);

    // generate a one-time prekey
    const oneTimePreKeyId = signedPreKeyId + 1;
    const preKey = await KeyHelper.generatePreKey(oneTimePreKeyId);

    // serialize into JSON-friendly base64 strings
    const bundle = {
      identityKey: {
        pubKey: toB64((identityKeyPair as any).pubKey || (identityKeyPair as any).publicKey),
        privKey: toB64((identityKeyPair as any).privKey || (identityKeyPair as any).privateKey),
      },
      signedPreKey: {
        keyId: signedPreKeyId,
        publicKey: toB64((signedPreKey as any).keyPair ? (signedPreKey as any).keyPair.pubKey : (signedPreKey as any).publicKey),
        signature: toB64((signedPreKey as any).signature),
      },
      preKey: {
        keyId: oneTimePreKeyId,
        publicKey: toB64((preKey as any).keyPair ? (preKey as any).keyPair.pubKey : (preKey as any).publicKey),
      },
      createdAt: Date.now(),
    };

    return bundle;
  } catch (err) {
    console.error('libsignal import/generate failed', err);
    throw new Error('libsignal generation failed (ensure `libsignal-protocol` is installed)');
  }
}
