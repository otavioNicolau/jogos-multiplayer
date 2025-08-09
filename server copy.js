// server.js — Snake Endless + Multiplayer (CommonJS)
// Instale dependências:  npm i ws nanoid
// Rode: node server.js
const { WebSocketServer } = require('ws');
const { nanoid } = require('nanoid');

const wss = new WebSocketServer({ port: 8080 });
console.log('WS server on ws://localhost:8080');

const TICK_MS = 120;             // velocidade do jogo (ms por tick)
const WORLD = { w: 60, h: 60 };  // mundo toroidal (wrap)
const APPLE_COUNT = 4;

const players = new Map(); // id -> {id, name, color, x,y, dir:{x,y}, body:[], score, alive, running, ws}
let apples = [];

function rand(n){ return Math.floor(Math.random()*n); }
function randColor(){ const pal = ['#7c5cff','#20e3b2','#ff6b6b','#6c8cff','#ffb86b','#50fa7b']; return pal[rand(pal.length)]; }
function wrap(v, max){ return (v + max) % max; }

function spawnApple(){
  let p;
  do { p = { id: nanoid(6), x: rand(WORLD.w), y: rand(WORLD.h) }; }
  while ([...players.values()].some(pl => pl.body.some(s => s.x===p.x && s.y===p.y))
         || apples.some(a => a.x===p.x && a.y===p.y));
  apples.push(p);
}

function spawnApplesIfNeeded(){
  while (apples.length < APPLE_COUNT) spawnApple();
}

function newPlayer(ws, name){
  const id = nanoid(8);
  const head = { x: rand(WORLD.w), y: rand(WORLD.h) };
  const p = {
    id, ws, name: name || `Player-${rand(1000)}`,
    color: randColor(),
    x: head.x, y: head.y,
    dir: { x: 1, y: 0 },
    body: [head, {x: wrap(head.x-1, WORLD.w), y: head.y}, {x: wrap(head.x-2,WORLD.w), y: head.y}],
    score: 0,
    alive: true,
    running: false
  };
  players.set(id, p);
  return p;
}

function serializePlayers(){
  const obj = {};
  players.forEach(p => {
    obj[p.id] = { x: p.x, y: p.y, body: p.body, color: p.color, name: p.name, score: p.score, alive: p.alive };
  });
  return obj;
}

function broadcast(msg){
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(data); });
}

function send(ws, msg){ if(ws.readyState === 1) ws.send(JSON.stringify(msg)); }

function tick(){
  if (![...players.values()].some(p => p.running && p.alive)) return;

  players.forEach(p => {
    if(!p.running || !p.alive) return;

    const nx = wrap(p.x + p.dir.x, WORLD.w);
    const ny = wrap(p.y + p.dir.y, WORLD.h);
    const head = { x: nx, y: ny };

    // colisão com si mesmo
    if (p.body.some(s => s.x === head.x && s.y === head.y)) {
      p.alive = false;
      return;
    }
    // colisão com outras cobras
    for (const q of players.values()) {
      if (q.id === p.id) continue;
      if (q.body.some(s => s.x === head.x && s.y === head.y)) {
        p.alive = false;
        return;
      }
    }

    // move
    p.body.unshift(head);
    p.x = head.x; p.y = head.y;

    // maçã
    const hitIdx = apples.findIndex(a => a.x === head.x && a.y === head.y);
    if (hitIdx >= 0) {
      apples.splice(hitIdx, 1);
      p.score += 10;
      spawnApplesIfNeeded();
      // não tira a cauda (cresce)
    } else {
      p.body.pop(); // mantém tamanho
    }
  });

  broadcast({ type: 'state', apples, players: serializePlayers() });
}

// loop do jogo
setInterval(tick, TICK_MS);

// conexões
wss.on('connection', (ws) => {
  let me = null;

  ws.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { return; }

    if (msg.type === 'hello') {
      me = newPlayer(ws, msg.name);
      spawnApplesIfNeeded();
      send(ws, { type: 'init', id: me.id, world: WORLD, apples, players: serializePlayers() });
      broadcast({ type: 'msg', text: `${me.name} entrou no jogo.` });
      return;
    }

    if (!me) return;

    if (msg.type === 'dir') {
      const { x, y } = msg;
      if (me.body.length > 1) {
        const cur = me.dir;
        if (x === -cur.x && y === -cur.y) return; // evita reversão imediata
      }
      me.dir = { x, y };
    } else if (msg.type === 'start') {
      me.running = true; me.alive = true;
    } else if (msg.type === 'pause') {
      me.running = false;
    } else if (msg.type === 'resume') {
      me.running = true;
    } else if (msg.type === 'reset') {
      const name = me.name;
      players.delete(me.id);
      me = newPlayer(ws, name);
      send(ws, { type: 'init', id: me.id, world: WORLD, apples, players: serializePlayers() });
    } else if (msg.type === 'ping') {
      send(ws, { type: 'pong', t: msg.t });
    }
  });

  ws.on('close', () => {
    if (me) {
      players.delete(me.id);
      broadcast({ type: 'msg', text: `${me.name} saiu.` });
    }
  });
});
