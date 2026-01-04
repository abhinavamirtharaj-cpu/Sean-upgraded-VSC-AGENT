import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import E2EEDemo from '../components/E2EEDemo';
import ChatLayout from '../components/ChatLayout';
import {
  deriveAESGCMKey,
  importPrivateKeyFromB64,
  encryptWithAESGCM,
  decryptWithAESGCM,
  loadPrivateKeyForUsername,
  loadPublicKeyForUsername,
} from '../lib/crypto';
import { createSessionWithPeer } from '../lib/libsignalSession';

type ChatMessage = {
  id: string;
  sender: string;
  ciphertext: string; // base64 ciphertext
  iv?: string;
  senderPublicKey?: string;
  recipient?: string;
  createdAt: number;
};

let socket: Socket | null = null;

function base64Encode(str: string) {
  return Buffer.from(str, 'utf8').toString('base64');
}
function base64Decode(b64: string) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000));
  const [recipient, setRecipient] = useState('');
  
  // crypto helpers
  const [ownPrivateKeyB64, setOwnPrivateKeyB64] = useState<string | null>(null);
  const [ownPublicKeyB64, setOwnPublicKeyB64] = useState<string | null>(null);
  
  useEffect(() => {
    // try to load saved local keys when username changes
    const savedPub = loadPublicKeyForUsername(username);
    const savedPriv = loadPrivateKeyForUsername(username);
    if (savedPub) setOwnPublicKeyB64(savedPub);
    if (savedPriv) setOwnPrivateKeyB64(savedPriv);
  }, [username]);
  useEffect(() => {
    socket = io('http://localhost:3001');

    // expose socket globally for small demo components
    (window as any).socket = socket;

    socket.on('connect', () => {
      setConnected(true);
      (window as any).USERNAME = username;
      socket?.emit('join-room', { room: 'general', username });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('message-status', ({ id, status }: { id: string; status: string }) => {
      setMessages(prev => prev.map(m => (m.id === id ? { ...m, status } : m)));
    });

    socket.on('reaction-updated', ({ messageId, reactions }: { messageId: string; reactions: any }) => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions } : m)));
    });

    socket.on('encrypted-message', async (msg: ChatMessage) => {
      // First, try libsignal-style decrypt for 1:1 messages
      if (msg.recipient && msg.recipient === username && msg.ciphertext) {
        const pt = await tryLibSignalDecrypt(msg);
        if (pt !== null) {
          // call sentiment endpoint (mock) and attach to message
          let sentiment = undefined as any;
          try {
            const sresp = await fetch('http://localhost:3001/sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: pt }) });
            if (sresp.ok) sentiment = await sresp.json();
          } catch (err) {
            console.warn('sentiment fetch failed', err);
          }

          setMessages(prev => [...prev, { ...msg, ciphertext: pt, status: 'delivered', sentiment }]);
          // auto-ack read for demo when visible
          socket.emit('message-read', { id: msg.id, from: msg.sender });
          return;
        }
      }

      // Next, try AES-GCM ECDH decrypt if iv + senderPublicKey present
      if (msg.senderPublicKey && msg.ciphertext && msg.iv) {
        try {
          if (!ownPrivateKeyB64) {
            // try to load from storage
            const saved = loadPrivateKeyForUsername(username);
            if (saved) setOwnPrivateKeyB64(saved);
          }

          const privB64 = ownPrivateKeyB64 || loadPrivateKeyForUsername(username);
          if (!privB64) {
            // can't decrypt
            setMessages(prev => [...prev, { ...msg, ciphertext: '[encrypted - missing keys]' }]);
            return;
          }

          const privKey = await importPrivateKeyFromB64(privB64);
          const aesKey = await deriveAESGCMKey(privKey, msg.senderPublicKey);
          const pt = await decryptWithAESGCM(aesKey, msg.ciphertext, msg.iv!);
          if (pt === null) {
            setMessages(prev => [...prev, { ...msg, ciphertext: '[failed to decrypt]' }]);
          } else {
            // call sentiment endpoint (mock) and attach to message
            let sentiment = undefined as any;
            try {
              const sresp = await fetch('http://localhost:3001/sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: pt }) });
              if (sresp.ok) sentiment = await sresp.json();
            } catch (err) {
              console.warn('sentiment fetch failed', err);
            }

            setMessages(prev => [...prev, { ...msg, ciphertext: pt, status: 'delivered', sentiment }]);
            // auto-ack read for demo when visible
            socket.emit('message-read', { id: msg.id, from: msg.sender });
          }
        } catch (err) {
          console.error('decrypt error', err);
          setMessages(prev => [...prev, { ...msg, ciphertext: '[decrypt error]' }]);
        }
        return;
      }

      // fallback: plain or legacy base64 payload
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [username, ownPrivateKeyB64]);

  const send = async () => {
    if (!input.trim()) return;

    // If recipient specified, try libsignal session encrypt first (if prekey bundle indicates libsignal)
    if (recipient.trim()) {
      try {
        // fetch peer prekey bundle
        const resp = await fetch(`http://localhost:3001/prekeys/${encodeURIComponent(recipient)}`);
        if (!resp.ok) return alert('peer key not found');
        const bundle = await resp.json();

        if (bundle.meta && bundle.meta.libsignal) {
          // use libsignal session
          const session = await createSessionWithPeer(username, recipient);
          const ctB64 = await session.encrypt(input.trim());

          const message: ChatMessage = {
            id: String(Math.random()).slice(2),
            sender: username,
            ciphertext: ctB64,
            senderPublicKey: ownPublicKeyB64 || loadPublicKeyForUsername(username) || undefined,
            recipient: recipient,
            createdAt: Date.now(),
          };

          socket?.emit('encrypted-message', { to: recipient, message });
          setMessages(prev => [...prev, { ...message, ciphertext: input.trim() }]);
          // fetch sentiment for outgoing message so sender sees badge immediately
          (async () => {
            try {
              const sresp = await fetch('http://localhost:3001/sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: input.trim() }) });
              if (sresp.ok) {
                const sentiment = await sresp.json();
                setMessages(prev => prev.map(m => m.id === message.id ? { ...m, sentiment } : m));
              }
            } catch (err) { console.warn('sentiment fetch failed', err); }
          })();
          setInput('');
          return;
        }
      } catch (err) {
        console.warn('libsignal send failed, falling back to ECDH AES-GCM', err);
      }
    }

    // If recipient specified, perform ECDH -> AES-GCM encryption for 1:1
    if (recipient.trim()) {
      // fetch peer public key
      try {
        const resp = await fetch(`http://localhost:3001/keys/${encodeURIComponent(recipient)}`);
        if (!resp.ok) return alert('peer key not found');
        const body = await resp.json();
        const peerPub = body.publicKey as string;

        // ensure own private key available
        let privB64 = ownPrivateKeyB64;
        if (!privB64) {
          privB64 = loadPrivateKeyForUsername(username);
          if (!privB64) return alert('You need to generate keys first in E2EE demo');
          setOwnPrivateKeyB64(privB64);
        }

        // import private key and derive AES key
        const privKey = await importPrivateKeyFromB64(privB64);
        const aesKey = await deriveAESGCMKey(privKey, peerPub);
        const { ciphertextB64, ivB64 } = await encryptWithAESGCM(aesKey, input.trim());

        const message: ChatMessage = {
          id: String(Math.random()).slice(2),
          sender: username,
          ciphertext: ciphertextB64,
          iv: ivB64,
          senderPublicKey: ownPublicKeyB64 || loadPublicKeyForUsername(username) || undefined,
          recipient: recipient,
          createdAt: Date.now(),
        };

        socket?.emit('encrypted-message', { to: recipient, message });
        setMessages(prev => [...prev, { ...message, ciphertext: input.trim() }]); // show plaintext locally
        (async () => {
          try {
            const sresp = await fetch('http://localhost:3001/sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: input.trim() }) });
            if (sresp.ok) {
              const sentiment = await sresp.json();
              setMessages(prev => prev.map(m => m.id === message.id ? { ...m, sentiment } : m));
            }
          } catch (err) { console.warn('sentiment fetch failed', err); }
        })();
        setInput('');
        return;
      } catch (err) {
        console.error(err);
        alert('send failed');
        return;
      }
    }

    // fallback: legacy base64 encoding for room messages
    const ciphertext = base64Encode(input.trim());
    const message: ChatMessage = {
      id: String(Math.random()).slice(2),
      sender: username,
      ciphertext,
      createdAt: Date.now(),
    };

    socket?.emit('encrypted-message', { room: 'general', message });
    setMessages(prev => [...prev, message]);
    (async () => {
      try {
        const sresp = await fetch('http://localhost:3001/sentiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: input.trim() }) });
        if (sresp.ok) {
          const sentiment = await sresp.json();
          setMessages(prev => prev.map(m => m.id === message.id ? { ...m, sentiment } : m));
        }
      } catch (err) { console.warn('sentiment fetch failed', err); }
    })();
    setInput('');
  };

  // helper to attempt libsignal decrypt when a session exists
  const tryLibSignalDecrypt = async (msg: ChatMessage) => {
    try {
      if (!msg.recipient || msg.recipient !== username) return null;
      // try to decrypt using a dynamically created session with sender
      const session = await createSessionWithPeer(username, msg.sender);
      const pt = await session.decrypt(msg.ciphertext);
      return pt;
    } catch (err) {
      console.warn('libsignal decrypt attempt failed', err);
      return null;
    }
  };


  return (
    <main style={{ padding: 24 }}>
      <div className="mx-auto max-w-3xl">
        <div style={{ marginBottom: 8 }}>
          <label>
            Username:{' '}
            <input className="border px-2 py-1 rounded" value={username} onChange={e => setUsername(e.target.value)} />
          </label>
          <span style={{ marginLeft: 12 }}>{connected ? '✅ connected' : '⏳ connecting...'}</span>
        </div>

        <ChatLayout username={username} messages={messages} input={input} setInput={setInput} onSend={send} />

        <div style={{ marginTop: 18 }}>
          <E2EEDemo />
        </div>

        <div style={{ marginTop: 18, color: '#888', fontSize: 13 }}>
          Note: Use E2EE demo to generate/publish keys and prekeys; messages will attempt libsignal first, then fall back to AES-GCM demo.
        </div>
      </div>
    </main>
  );
}
