import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// 'pg' is optional in dev; load dynamically so server can run without it being installed.
let Pool: any = null;
try {
  Pool = require('pg').Pool;
} catch (err) {
  console.log('pg module not installed; Postgres support disabled unless you install pg and set DATABASE_URL');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// In-memory public key store for dev (replace with persistent DB in production)
const publicKeys = new Map<string, string>();

app.post('/keys', express.json(), (req, res) => {
  const { username, publicKey } = req.body as { username?: string; publicKey?: string };
  if (!username || !publicKey) return res.status(400).json({ error: 'username and publicKey required' });
  publicKeys.set(username, publicKey);
  console.log(`stored public key for ${username}`);
  res.json({ ok: true });
});

app.get('/keys/:username', (req, res) => {
  const pk = publicKeys.get(req.params.username);
  if (!pk) return res.status(404).json({ error: 'not found' });
  res.json({ publicKey: pk });
});

// Dev prekey bundle store (replace with DB in production). We'll persist to Postgres if available.
const preKeyBundles = new Map<string, any>();

async function savePrekeyBundleToDb(username: string, bundle: any) {
  if (!pgPool) return;
  const q = `INSERT INTO prekeys (username, identity_key, signed_prekey, prekey, meta, created_at)
    VALUES ($1,$2,$3,$4,$5,now())
    ON CONFLICT (username) DO UPDATE SET identity_key = EXCLUDED.identity_key, signed_prekey = EXCLUDED.signed_prekey, prekey = EXCLUDED.prekey, meta = EXCLUDED.meta, created_at = now()`;
  await pgPool.query(q, [username, bundle.identityKey, bundle.signedPreKey, bundle.preKey || null, bundle.meta || null]);
}

async function loadPrekeyBundleFromDb(username: string) {
  if (!pgPool) return null;
  const { rows } = await pgPool.query('SELECT identity_key as "identityKey", signed_prekey as "signedPreKey", prekey as "preKey", meta FROM prekeys WHERE username=$1', [username]);
  return rows[0] || null;
}

// In-memory reactions store: Map<messageId, Map<emoji, Set<username>>> (dev fallback)
const messageReactions = new Map<string, Map<string, Set<string>>>();

// Redis client (optional). Set REDIS_URL env var to enable Redis caching for reactions.
let redisClient: any = null;
try {
  const Redis = require('ioredis');
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  redisClient.on('error', (err: any) => console.warn('Redis error:', err));
} catch (err) {
  console.warn('Redis not available, continuing (Redis optional)');
}

// Postgres client (optional). Set DATABASE_URL env var to enable persistent reactions storage.
let pgPool: any = null;
if (process.env.DATABASE_URL) {
  try {
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    pgPool.on('error', (err: any) => console.error('Postgres client error', err));

    // run simple migration for reactions
    (async () => {
      const client = await pgPool!.connect();
      try {
        // reactions migration
        await client.query(`
          CREATE TABLE IF NOT EXISTS reactions (
            id SERIAL PRIMARY KEY,
            message_id TEXT NOT NULL,
            emoji TEXT NOT NULL,
            username TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE (message_id, emoji, username)
          );
          CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions (message_id);
        `);

        // prekeys migration
        await client.query(`
          CREATE TABLE IF NOT EXISTS prekeys (
            username TEXT PRIMARY KEY,
            identity_key TEXT NOT NULL,
            signed_prekey JSONB NOT NULL,
            prekey JSONB,
            meta JSONB,
            created_at TIMESTAMPTZ DEFAULT now()
          );
        `);

        console.log('Postgres migrations applied for reactions and prekeys');
      } finally {
        client.release();
      }
    })().catch((err) => {
      console.error('Postgres migrations failed', err);
      pgPool = null;
    });
  } catch (err) {
    console.warn('Postgres not available or failed to initialize, continuing without Postgres', err);
    pgPool = null;
  }
} else {
  console.log('DATABASE_URL not set; Postgres reactions disabled');
} 

app.post('/prekeys', express.json(), async (req, res) => {
  const { username, identityKey, signedPreKey, preKey, meta } = req.body as { username?: string; identityKey?: string; signedPreKey?: any; preKey?: any; meta?: any };
  if (!username || !identityKey || !signedPreKey) return res.status(400).json({ error: 'username, identityKey and signedPreKey required' });
  const storeVal = { identityKey, signedPreKey, preKey, meta, createdAt: Date.now() };

  // Allow skipping verification in local/debug runs where tweetnacl may not be installed
  if (process.env.SKIP_PREKEY_VERIFICATION === 'true') {
    console.log('SKIP_PREKEY_VERIFICATION set; skipping signedPreKey verification (local debug)');
  } else {
    // If a signedPreKey signature is present, verify it using identityKey before accepting
    try {
      const { verifySignedPreKey } = require('./cryptoHelpers');
      if (signedPreKey && signedPreKey.signature) {
        const ok = verifySignedPreKey(
          // identityKey can be object or string depending on client; normalize to base64 string
          typeof identityKey === 'string' ? identityKey : (identityKey.pubKey || identityKey.publicKey || JSON.stringify(identityKey)),
          signedPreKey.publicKey || signedPreKey.pubKey || signedPreKey,
          signedPreKey.signature
        );
        if (!ok) return res.status(400).json({ error: 'invalid signedPreKey signature' });
      }
    } catch (err) {
      console.warn('signedPreKey verification step failed unexpectedly', err);
      // verification not available -> reject by default
      return res.status(400).json({ error: 'signedPreKey verification not available' });
    }
  }

  preKeyBundles.set(username, storeVal);
  try {
    await savePrekeyBundleToDb(username, storeVal);
    console.log(`stored prekey bundle for ${username} (db)`);
  } catch (err) {
    console.warn('failed to persist prekey bundle to db, continuing with in-memory store', err);
  }
  console.log(`stored prekey bundle for ${username}`);
  res.json({ ok: true });
});

app.get('/prekeys/:username', async (req, res) => {
  const username = req.params.username;
  try {
    // try DB first
    if (pgPool) {
      const row = await loadPrekeyBundleFromDb(username);
      if (row) return res.json(row);
    }

    const bundle = preKeyBundles.get(username);
    if (!bundle) return res.status(404).json({ error: 'not found' });
    res.json(bundle);
  } catch (err) {
    console.error('prekey fetch failed', err);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/prekeys/:username', (req, res) => {
  const bundle = preKeyBundles.get(req.params.username);
  if (!bundle) return res.status(404).json({ error: 'not found' });
  res.json(bundle);
});

// reactions endpoints for dev/debugging
app.get('/reactions/:messageId', async (req, res) => {
  const id = req.params.messageId;
  try {
    if (pgPool) {
      const q = `SELECT emoji, json_agg(username) as users FROM reactions WHERE message_id=$1 GROUP BY emoji`;
      const { rows } = await pgPool.query(q, [id]);
      const obj: any = {};
      rows.forEach((r: any) => { obj[r.emoji] = r.users; });
      return res.json({ reactions: obj });
    }

    if (redisClient) {
      const all = await redisClient.hgetall(`message:reactions:${id}`);
      const obj: any = {};
      for (const k of Object.keys(all)) obj[k] = JSON.parse(all[k]);
      return res.json({ reactions: obj });
    }

    const map = messageReactions.get(id);
    if (!map) return res.json({ reactions: {} });
    const obj: any = {};
    for (const [emoji, set] of map.entries()) obj[emoji] = Array.from(set);
    res.json({ reactions: obj });
  } catch (err) {
    console.error('reactions fetch failed', err);
    res.status(500).json({ error: 'failed' });
  }
});

// Sentiment endpoint — uses external Gemini endpoint when configured, with a fast heuristic fallback
import { classifyText } from './sentiment';

app.post('/sentiment', express.json(), async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const s = await classifyText(text);
    return res.json(s);
  } catch (err) {
    console.error('sentiment classification failed', err);
    // last resort fallback: simple heuristic
    const lower = text.toLowerCase();
    let chosen = 'neutral';
    for (const k of ['happy','love','trust','wow','angry','afraid','sad','disgust','wait','meh','party','confused']) if (lower.includes(k)) chosen = k;
    const score = Math.min(0.99, 0.5 + (lower.length % 10) * 0.05);
    res.json({ emotion: chosen, score });
  }
});

// socket handling for reactions is added below in the connection handler


io.on('connection', socket => {
  console.log('socket connected:', socket.id);

  socket.on('join-room', ({ room, username }) => {
    console.log(`${username} joining room ${room}`);
    socket.join(room);
    // also join a per-user room so we can route 1:1 messages
    socket.join(`user:${username}`);
    socket.data.username = username;
    socket.to(room).emit('system', { message: `${username} joined` });
  });

  socket.on('encrypted-message', ({ room, to, message }) => {
    // ack back to sender that server received the message
    socket.emit('message-status', { id: message.id, status: 'sent' });

    if (to) {
      console.log('relaying encrypted message to user', to);
      // route to personal room (the recipient socket)
      io.to(`user:${to}`).emit('encrypted-message', message);
      // notify sender that message was delivered to recipient(s)
      socket.emit('message-status', { id: message.id, status: 'delivered' });
      return;
    }

    console.log('relaying encrypted message to room', room);
    // relay to room
    socket.to(room).emit('encrypted-message', message);
    socket.emit('message-status', { id: message.id, status: 'delivered' });
  });

  // typing indicator
  socket.on('typing', ({ room, to, username, isTyping }) => {
    if (to) {
      io.to(`user:${to}`).emit('typing', { username, isTyping });
      return;
    }
    socket.to(room).emit('typing', { username, isTyping });
  });

  // read receipts
  socket.on('message-read', ({ id, from }) => {
    // forward to original sender
    io.to(`user:${from}`).emit('message-status', { id, status: 'read' });
  });

  // message reactions
  socket.on('message-reaction', async ({ messageId, emoji, username }: { messageId: string; emoji: string; username: string }) => {
    try {
      // Prefer Postgres for persistence when available
      if (pgPool) {
        const client = await pgPool.connect();
        try {
          const exists = await client.query('SELECT id FROM reactions WHERE message_id=$1 AND emoji=$2 AND username=$3', [messageId, emoji, username]);
          if (exists.rowCount > 0) {
            await client.query('DELETE FROM reactions WHERE message_id=$1 AND emoji=$2 AND username=$3', [messageId, emoji, username]);
          } else {
            await client.query('INSERT INTO reactions (message_id, emoji, username) VALUES ($1,$2,$3)', [messageId, emoji, username]);
          }

          const agg = await client.query('SELECT emoji, json_agg(username) as users FROM reactions WHERE message_id=$1 GROUP BY emoji', [messageId]);
          const obj: any = {};
          agg.rows.forEach((r: any) => { obj[r.emoji] = r.users; });

          io.emit('reaction-updated', { messageId, reactions: obj });
        } finally {
          client.release();
        }
        return;
      }

      // toggle reaction using Redis if available
      if (redisClient) {
        const field = emoji;
        const key = `message:reactions:${messageId}`;
        const raw = await redisClient.hget(key, field);
        let arr: string[] = raw ? JSON.parse(raw) : [];
        if (arr.includes(username)) arr = arr.filter(u => u !== username);
        else arr.push(username);
        await redisClient.hset(key, field, JSON.stringify(arr));

        const all = await redisClient.hgetall(key);
        const obj: any = {};
        for (const k of Object.keys(all)) obj[k] = JSON.parse(all[k]);

        io.emit('reaction-updated', { messageId, reactions: obj });
        return;
      }

      // fallback to in-memory map
      let map = messageReactions.get(messageId);
      if (!map) {
        map = new Map();
        messageReactions.set(messageId, map);
      }

      let set = map.get(emoji);
      if (!set) {
        set = new Set();
        map.set(emoji, set);
      }

      if (set.has(username)) set.delete(username);
      else set.add(username);

      const obj: any = {};
      for (const [e, s] of map.entries()) obj[e] = Array.from(s);

      io.emit('reaction-updated', { messageId, reactions: obj });
    } catch (err) {
      console.error('message-reaction handler failed', err);
    }
  });


  socket.on('disconnect', () => {
    console.log('socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
