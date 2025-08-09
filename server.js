// server.js — Snake PRO Multiplayer (Drops de Pontos) — CommonJS
// deps: npm i ws nanoid
const { WebSocketServer } = require('ws');
const { nanoid } = require('nanoid');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const TICK_MS = 110;
const WORLD = { w: 160, h: 120 };
const BASE_APPLES = 4;
const MAX_NAME = 18;
const MAX_PLAYERS = 50;

const server = http.createServer((req, res) => {
  if (req.url === '/rank') {
    const list = getGlobalRank();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list));
    return;
  }
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, 'public', safePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === '.js' ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
server.listen(PORT, () => console.log(`HTTP/WebSocket server on http://localhost:${PORT}`));

// rooms: Map<roomId, {id, auto, tick, players, apples, drops, world}>
const rooms = new Map();
let autoRoomCounter = 1;
const globalRank = new Map();

function updateGlobalRank(room) {
  room.players.forEach(p => {
    const prev = globalRank.get(p.name) || 0;
    if (p.score > prev) globalRank.set(p.name, p.score);
  });
}

function getGlobalRank() {
  return [...globalRank.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, score]) => ({ name, score }));
}
function createRoom(id, auto = false) {
  const room = { id, auto, tick: 0, players: new Map(), apples: [], drops: [], world: { ...WORLD } };
  rooms.set(id, room);
  return room;
}
function getRoom(roomId) {
  const id = (roomId || 'public').toLowerCase().slice(0, 24);
  return rooms.get(id) || createRoom(id);
}
function getAutoRoom() {
  for (const room of rooms.values()) {
    if (room.auto && room.players.size < MAX_PLAYERS) return room;
  }
  return createRoom(`room${autoRoomCounter++}`, true);
}

function rand(n){ return Math.floor(Math.random()*n); }
function wrap(v, max){ return (v + max) % max; }
function clampName(n){ return String(n||'').replace(/[^\p{L}\p{N}_\- ]/gu,'').trim().slice(0, MAX_NAME) || `Player-${rand(1000)}`; }
function randColor(){ const pal=['#7c5cff','#20e3b2','#ff6b6b','#6c8cff','#ffb86b','#50fa7b','#ffd166','#06d6a0','#118ab2']; return pal[rand(pal.length)]; }

function serializePlayers(players){
  const obj = {};
  players.forEach(p => { obj[p.id] = { x:p.x, y:p.y, body:p.body, color:p.color, name:p.name, score:p.score, alive:p.alive }; });
  return obj;
}
function leader(players){
  return [...players.values()].sort((a,b)=> b.score - a.score).slice(0, 20).map(p => ({ id:p.id, name:p.name, score:p.score }));
}

function spawnApple(room){
  let p;
  const { world, players, apples, drops } = room;
  do {
    p = { id: nanoid(6), x: rand(world.w), y: rand(world.h) };
  } while (
    [...players.values()].some(pl => pl.body.some(s => s.x===p.x && s.y===p.y)) ||
    apples.some(a => a.x===p.x && a.y===p.y) ||
    drops.some(d => d.x===p.x && d.y===p.y)
  );
  room.apples.push(p);
}
function ensureApples(room){
  const target = BASE_APPLES + Math.floor(room.players.size / 2);
  while (room.apples.length < target) spawnApple(room);
}

function newPlayer(room, ws, name){
  const id = nanoid(8);
  const head = { x: rand(room.world.w), y: rand(room.world.h) };
  const p = {
    id, ws, name: clampName(name), color: randColor(),
    x: head.x, y: head.y, dir: { x: 1, y: 0 },
    body: [head, {x: wrap(head.x-1, room.world.w), y: head.y}, {x: wrap(head.x-2, room.world.w), y: head.y}],
    score: 0, alive: true, running: false, lastDirAt: 0, speed: 1
  };
  room.players.set(id, p);
  return p;
}

function send(ws, msg){ if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcastRoom(room, msg){
  const data = JSON.stringify(msg);
  room.players.forEach(p => { if (p.ws.readyState === 1) p.ws.send(data); });
}
function fullState(room){
  return { type:'state', tick: room.tick, apples: room.apples, drops: room.drops, players: serializePlayers(room.players), leader: leader(room.players) };
}

// === Mecânica de morte por colisão + drop de pontos ===
function killWithDrop(room, p, head){
  if (!p.alive) return;
  p.alive = false;
  // cria drop com a pontuação atual do jogador
  const value = p.score > 0 ? p.score : 0;
  if (value > 0) {
    room.drops.push({ id: nanoid(6), x: head.x, y: head.y, value });
  }
  // zera pontuação e esvazia corpo para não bloquear o mapa
  p.score = 0;
  p.body = [];
}

setInterval(() => {
  rooms.forEach(room => {
    const { world } = room;

    // pelo menos um rodando?
    if (![...room.players.values()].some(p => p.running && p.alive)) { room.tick++; return; }

    // 1) mover todos
    room.players.forEach(p => {
      if(!p.running || !p.alive) return;
      const steps = p.speed || 1;
      for(let step=0; step<steps && p.alive; step++){
        const nx = wrap(p.x + p.dir.x, world.w);
        const ny = wrap(p.y + p.dir.y, world.h);
        const head = { x: nx, y: ny };

        // colisão com si mesmo?
        if (p.body.some(s => s.x===head.x && s.y===head.y)) {
          killWithDrop(room, p, head);
          break;
        }
        // colisão com outras cobras?
        for (const q of room.players.values()) {
          if (q.id === p.id) continue;
          if (q.body.some(s => s.x===head.x && s.y===head.y)) {
            killWithDrop(room, p, head);
            break;
          }
        }
        if(!p.alive) break;

        // andar
        p.body.unshift(head); p.x = head.x; p.y = head.y;

        // 2) maçã?
        const hitApple = room.apples.findIndex(a => a.x===head.x && a.y===head.y);
        if (hitApple >= 0) {
          room.apples.splice(hitApple, 1);
          p.score += 10;
          ensureApples(room);
        } else {
          p.body.pop();
        }

        // 3) coletar drop de pontos?
        const hitDrop = room.drops.findIndex(d => d.x===head.x && d.y===head.y);
        if (hitDrop >= 0) {
          p.score += room.drops[hitDrop].value;
          room.drops.splice(hitDrop, 1);
        }
      }
    });

    room.tick++;
    updateGlobalRank(room);
    broadcastRoom(room, fullState(room));
  });
}, TICK_MS);

// ===== Conexões =====
wss.on('connection', (ws) => {
  let room = null, me = null;

  ws.on('message', (buf) => {
    let msg; try { msg = JSON.parse(buf.toString()); } catch { return; }

    if (msg.type === 'hello') {
      room = msg.room ? getRoom(msg.room) : getAutoRoom();
      if (room.players.size >= MAX_PLAYERS) room = getAutoRoom();
      me = newPlayer(room, ws, msg.name);
      ensureApples(room);
      send(ws, { type:'init', id: me.id, room: room.id, world: room.world, apples: room.apples, drops: room.drops, players: serializePlayers(room.players), leader: leader(room.players), tick: room.tick });
      broadcastRoom(room, { type:'msg', text: `${me.name} entrou na sala ${room.id}.` });
      return;
    }
    if (!room || !me) return;

    if (msg.type === 'dir') {
      const now = Date.now();
      if (now - me.lastDirAt < 30) return;
      me.lastDirAt = now;
      const { x, y } = msg;
      const cur = me.dir;
      if (me.body.length > 1 && (x === -cur.x && y === -cur.y)) return;
      me.dir = { x, y };
    }
    else if (msg.type === 'speed') {
      me.speed = msg.fast ? 2 : 1;
    }
    else if (msg.type === 'start') { me.running = true; me.alive = true; }
    else if (msg.type === 'pause') { me.running = false; }
    else if (msg.type === 'resume'){ me.running = true; }
    else if (msg.type === 'reset') {
      const nm = me.name;
      room.players.delete(me.id);
      me = newPlayer(room, ws, nm);
      ensureApples(room);
      send(ws, { type:'init', id: me.id, room: room.id, world: room.world, apples: room.apples, drops: room.drops, players: serializePlayers(room.players), leader: leader(room.players), tick: room.tick });
    }
    else if (msg.type === 'ping') { send(ws, { type:'pong', t: msg.t }); }
    else if (msg.type === 'chat') {
      const text = String(msg.text||'').slice(0, 120);
      if (!text.trim()) return;
      broadcastRoom(room, { type:'chat', text: `${me.name}: ${text}` });
    }
  });

  ws.on('close', () => {
    if (room && me) {
      room.players.delete(me.id);
      broadcastRoom(room, { type:'msg', text: `${me.name} saiu.` });
    }
  });
});
