const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { redis, sub } = require('./redisClient');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

const roomListKey = (roomId) => `room:${roomId}:messages`;
const roomChannel = (roomId) => `room:${roomId}:pubsub`;

async function persistAndPublish(roomId, message) {
  const id = uuidv4();
  const envelope = { id, roomId, ts: Date.now(), ...message };
  await redis.rpush(roomListKey(roomId), JSON.stringify(envelope));
  await redis.ltrim(roomListKey(roomId), -1000, -1);
  await redis.publish(roomChannel(roomId), JSON.stringify(envelope));
  return envelope;
}

sub.on('message', (channel, msg) => {
  try {
    const envelope = JSON.parse(msg);
    wss.clients.forEach((ws) => {
      const meta = clients.get(ws);
      if (!meta) return;
      if (meta.rooms && meta.rooms.has(envelope.roomId)) {
        ws.send(JSON.stringify({ type: 'message', payload: envelope }));
      }
    });
  } catch (err) {
    console.error('Failed to process sub message', err);
  }
});

async function ensureSubscribed(roomId) {
  await sub.subscribe(roomChannel(roomId));
}

wss.on('connection', (ws) => {
  clients.set(ws, { name: 'Guest', rooms: new Set() });

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    const meta = clients.get(ws);

    switch (msg.type) {
      case 'setName':
        meta.name = msg.name || `Guest-${Math.floor(Math.random() * 1000)}`;
        ws.send(JSON.stringify({ type: 'nameSet', name: meta.name }));
        break;

      case 'join':
        meta.rooms.add(msg.roomId);
        await ensureSubscribed(msg.roomId);
        const rawMsgs = await redis.lrange(roomListKey(msg.roomId), -50, -1);
        const messages = rawMsgs.map(r => JSON.parse(r));
        ws.send(JSON.stringify({ type: 'history', roomId: msg.roomId, messages }));
        break;

      case 'send':
        if (!msg.roomId || !msg.content) return;
        const envelope = await persistAndPublish(msg.roomId, {
          from: meta.name,
          content: msg.content,
        });
        ws.send(JSON.stringify({ type: 'sent', message: envelope }));
        break;
    }
  });

  ws.on('close', () => clients.delete(ws));
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`FleetSocket server listening on ${PORT}`));
