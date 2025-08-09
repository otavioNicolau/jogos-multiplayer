    function hash32(x, y){ let h=(x*374761393 + y*668265263)|0; h^=h<<13; h^=h>>>17; h^=h<<5; return (h>>>0)/4294967296; }
    function $(id){ return document.getElementById(id); }
    const screenSetup=$('screen-setup'), screenGame=$('screen-game');
    const wsUrlEl=$('wsurl'), roomEl=$('room'), nameEl=$('playername'), zoomSel=$('zoom');
    const btnConnect=$('btnConnect'), btnStart=$('btnStart');
    const cvs=$('c'), ctx=cvs?cvs.getContext('2d'):null;
    const miniCanvas=$('mini');
    const miniMap=miniCanvas?new MiniMap(miniCanvas):null;
    const scoreEl=$('score'), pcountEl=$('pcount'), pingEl=$('ping'), worldEl=$('world'), roomLabel=$('roomLabel');
    const leaderEl=$('leader'), chatlog=$('chatlog'), chatInput=$('chatmsg');
    const pause=$('pause'), resumeBtn=$('resume'), backBtn=$('backToSetup');
    const toggleMini=$('toggleMini'), toggleLeader=$('toggleLeader'), toggleChat=$('toggleChat');
    const miniWrap=$('miniWrap'), leaderWrap=$('leaderWrap'), chatWrap=$('chatWrap');
    const dpad=$('dpad');
    let ws, connected=false, running=false, myId=null; let CELL=Number(zoomSel.value);
    let WORLD={w:160,h:120}; let players={}, apples=[], leaderboard=[], drops=[]; let lastServerTick=0;
    const LS_KEY='snake_pro_setup';
    function loadSetup(){ try{ const s=JSON.parse(localStorage.getItem(LS_KEY)||'{}'); if(s.wsurl) wsUrlEl.value=s.wsurl; if(s.room) roomEl.value=s.room; if(s.name) nameEl.value=s.name; if(s.zoom){ zoomSel.value=String(s.zoom); CELL=Number(s.zoom);} }catch{} }
    function saveSetup(){ const s={ wsurl:wsUrlEl.value, room:roomEl.value, name:nameEl.value, zoom:Number(zoomSel.value)}; localStorage.setItem(LS_KEY, JSON.stringify(s)); }
    const sprites={ groundTile:makeGroundTile(), fruits:makeFruitSprites(), coin:makeCoin() };
    function makeGroundTile(){ const s=24, off=document.createElement('canvas'); off.width=off.height=s; const g=off.getContext('2d'); g.fillStyle='#0f1430'; g.fillRect(0,0,s,s); g.strokeStyle='rgba(255,255,255,0.05)'; g.lineWidth=1; g.beginPath(); g.moveTo(-s,s/2); g.lineTo(s*2,s/2); g.stroke(); g.beginPath(); g.moveTo(0,0); g.lineTo(s,s); g.stroke(); g.beginPath(); g.moveTo(0,s); g.lineTo(s,0); g.stroke(); return off; }
    function makeFruitSprites(){ const types=['apple','banana','cherry','pear']; const map={}; types.forEach(t=> map[t]=drawFruit(t)); return map; function drawFruit(type){ const s=22, off=document.createElement('canvas'); off.width=off.height=s; const g=off.getContext('2d'); if(type==='apple'){ g.fillStyle='#ff3b3b'; g.beginPath(); g.arc(s/2, s/2+1, 8, 0, Math.PI*2); g.fill(); g.fillStyle='rgba(255,255,255,.3)'; g.beginPath(); g.arc(s/2-3, s/2-1, 3, 0, Math.PI*2); g.fill(); g.fillStyle='#6d4c41'; g.fillRect(s/2-1, s/2-10, 2, 5); g.fillStyle='#20e3b2'; g.beginPath(); g.ellipse(s/2+5, s/2-6, 5, 3, -0.6, 0, Math.PI*2); g.fill(); } else if(type==='banana'){ g.strokeStyle='#ffd84d'; g.lineWidth=5; g.beginPath(); g.arc(s/2, s/2+3, 9, 0.2, 2.7); g.stroke(); g.strokeStyle='#e6c43f'; g.lineWidth=2; g.beginPath(); g.arc(s/2, s/2+3, 9, 0.5, 2.4); g.stroke(); } else if(type==='cherry'){ g.fillStyle='#ff4d6d'; g.beginPath(); g.arc(s/2-4, s/2+2, 6, 0, Math.PI*2); g.fill(); g.beginPath(); g.arc(s/2+4, s/2+2, 6, 0, Math.PI*2); g.fill(); g.strokeStyle='#6d4c41'; g.lineWidth=2; g.beginPath(); g.moveTo(s/2-4, s/2-5); g.bezierCurveTo(s/2, s/2-12, s/2, s/2-12, s/2+4, s/2-5); g.stroke(); g.fillStyle='#20e3b2'; g.beginPath(); g.ellipse(s/2, s/2-9, 5, 3, 0, 0, Math.PI*2); g.fill(); } else { g.fillStyle='#7ed957'; g.beginPath(); g.moveTo(s/2, s/2-6); g.bezierCurveTo(s/2+9, s/2-10, s/2+9, s/2+8, s/2, s/2+8); g.bezierCurveTo(s/2-9, s/2+8, s/2-9, s/2-10, s/2, s/2-6); g.fill(); g.fillStyle='#20e3b2'; g.beginPath(); g.ellipse(s/2+4, s/2-8, 5, 3, 0.4, 0, Math.PI*2); g.fill(); g.fillStyle='#6d4c41'; g.fillRect(s/2-1, s/2-12, 2, 5);} return off; } }
    function makeCoin(){ const s=22, off=document.createElement('canvas'); off.width=off.height=s; const g=off.getContext('2d'); const grd=g.createRadialGradient(s/2,s/2,3, s/2,s/2,10); grd.addColorStop(0,'#fff3c2'); grd.addColorStop(1,'#ff9f1a'); g.fillStyle=grd; g.beginPath(); g.arc(s/2,s/2,9,0,Math.PI*2); g.fill(); g.strokeStyle='#c97f0a'; g.lineWidth=2; g.stroke(); return off; }
    function worldToScreen(x,y){ const me=players[myId]; const vx=me?me.x:0, vy=me?me.y:0; const sx=Math.floor(cvs.width/2/CELL), sy=Math.floor(cvs.height/2/CELL); const dx=((x-vx+WORLD.w*1.5)%WORLD.w)-WORLD.w/2; const dy=((y-vy+WORLD.h*1.5)%WORLD.h)-WORLD.h/2; return {px:(sx+dx)*CELL, py:(sy+dy)*CELL}; }
    function drawGround(){ if(!ctx) return; const cols=Math.ceil(cvs.width/CELL)+2, rows=Math.ceil(cvs.height/CELL)+2; const me=players[myId]||{x:0,y:0}; const startX=Math.floor(me.x-cols/2), startY=Math.floor(me.y-rows/2); for(let r=0;r<rows;r++){ for(let c=0;c<cols;c++){ const wx=(startX+c+WORLD.w)%WORLD.w, wy=(startY+r+WORLD.h)%WORLD.h; const {px,py}=worldToScreen(wx,wy); const t=sprites.groundTile; ctx.drawImage(t, Math.round(px), Math.round(py), CELL, CELL); const rnd=hash32(wx,wy); if(rnd>0.92){ ctx.fillStyle='rgba(255,255,255,.06)'; ctx.fillRect(Math.round(px+8), Math.round(py+10), 4, 4);} else if(rnd<0.06){ ctx.fillStyle='rgba(32,227,178,.12)'; ctx.fillRect(Math.round(px+5), Math.round(py+6), 3, 6);} } } }
    function fruitTypeFromId(id){ let h=0; for(let i=0;i<id.length;i++){ h=(h*31+id.charCodeAt(i))>>>0;} const types=Object.keys(sprites.fruits); return types[h%types.length]; }
    function drawFruit(x,y,id){ if(!ctx) return; const spr=sprites.fruits[fruitTypeFromId(id||'apple')]||sprites.fruits.apple; const {px,py}=worldToScreen(x,y); ctx.drawImage(spr, Math.round(px+1), Math.round(py+1), CELL-2, CELL-2); }
    function drawDrop(x,y,value){ if(!ctx) return; const {px,py}=worldToScreen(x,y); ctx.drawImage(sprites.coin, Math.round(px+1), Math.round(py+1), CELL-2, CELL-2); ctx.fillStyle='#fff'; ctx.font='10px system-ui,Arial'; ctx.fillText(String(value), Math.round(px)+6, Math.round(py)+CELL-4); }
    function drawSnake(p){ if(!ctx) return; p.body.forEach((seg,i)=>{ const {px,py}=worldToScreen(seg.x,seg.y); ctx.fillStyle=i===0?'#ffffff':p.color; ctx.fillRect(Math.round(px),Math.round(py),CELL-1,CELL-1); }); const head=p.body[0]; if(head){ const {px,py}=worldToScreen(head.x,head.y); const label=p.name||''; const w=ctx.measureText(label).width+8; ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(Math.round(px)-2, Math.round(py)-16, w, 12); ctx.fillStyle='#fff'; ctx.font='12px system-ui,Arial'; ctx.fillText(label, Math.round(px)+2, Math.round(py)-6); } }
    function render(){ if(!ctx) return; ctx.fillStyle='#0f0f17'; ctx.fillRect(0,0,cvs.width,cvs.height); drawGround(); apples.forEach(a=> drawFruit(a.x,a.y,a.id)); drops.forEach(d=> drawDrop(d.x,d.y,d.value)); Object.values(players).forEach(drawSnake); miniMap?.render(WORLD, players, apples, drops, myId); }
    function loop(){ requestAnimationFrame(loop); render(); } requestAnimationFrame(loop);
    let lastDir={x:1,y:0}, lastSend=0;
    function sendDir(nx,ny){ if(!connected) return; const now=performance.now(); if(now-lastSend<40) return; if(lastDir&&nx===-lastDir.x&&ny===-lastDir.y) return; lastDir={x:nx,y:ny}; lastSend=now; ws.send(JSON.stringify({type:'dir', x:nx, y:ny})); }
    addEventListener('keydown',(e)=>{ const k=e.key.toLowerCase(); if(k==='escape'){ togglePause(); return; } if(['arrowup','w'].includes(k)) sendDir(0,-1); else if(['arrowdown','s'].includes(k)) sendDir(0,1); else if(['arrowleft','a'].includes(k)) sendDir(-1,0); else if(['arrowright','d'].includes(k)) sendDir(1,0); if(k==='m') miniWrap.classList.toggle('hide'); if(k==='l') leaderWrap.classList.toggle('hide'); if(k==='c') chatWrap.classList.toggle('hide'); });
    if(dpad){ dpad.querySelectorAll('button[data-dir]').forEach(b=> b.addEventListener('click',()=>{ const d=b.dataset.dir; if(d==='up')sendDir(0,-1); if(d==='down')sendDir(0,1); if(d==='left')sendDir(-1,0); if(d==='right')sendDir(1,0); })); }
    function connect(){ const url=wsUrlEl.value.trim(); ws=new WebSocket(url); const roomInput=(roomEl.value||'').trim().slice(0,24); roomLabel.textContent=roomInput||'auto'; ws.onopen=()=>{ connected=true; btnStart.disabled=false; const hello={type:'hello', name:sanitizeName(nameEl.value)||`Player-${Math.floor(Math.random()*1000)}`}; if(roomInput) hello.room=roomInput; ws.send(JSON.stringify(hello)); ping(); }; ws.onclose=()=>{ connected=false; btnStart.disabled=true; showSetup(); }; ws.onerror=()=>{}; ws.onmessage=(ev)=>{ const data=JSON.parse(ev.data); if(data.type==='init'){ myId=data.id; WORLD=data.world; apples=data.apples; players=data.players; leaderboard=data.leader||[]; lastServerTick=data.tick||0; drops=data.drops||[]; roomLabel.textContent=data.room||roomInput||'auto'; updateHUD(); resizeToViewport(); renderLeader(); } else if(data.type==='state'){ apples=data.apples; players=data.players; leaderboard=data.leader||[]; drops=data.drops||[]; lastServerTick=data.tick||0; updateHUD(); renderLeader(); } else if(data.type==='chat'){ pushChat(data.text); } else if(data.type==='msg'){ pushChat(data.text); } else if(data.type==='pong'){ pingEl.textContent=Math.round(performance.now()-data.t); } }; }
    function sanitizeName(n){ return String(n||'').replace(/[^\p{L}\p{N}_\- ]/gu,'').trim().slice(0,18); }
    function updateHUD(){ pcountEl.textContent=Object.keys(players).length; const me=players[myId]; scoreEl.textContent=me?me.score:0; worldEl.textContent=`${WORLD.w}x${WORLD.h}`; }
    function renderLeader(){ leaderEl.innerHTML=''; leaderboard.slice(0,10).forEach(it=>{ const li=document.createElement('li'); li.textContent=`${it.name} — ${it.score}`; leaderEl.appendChild(li); }); }
    function pushChat(t){ const d=document.createElement('div'); d.textContent=t; chatlog.appendChild(d); chatlog.scrollTop=chatlog.scrollHeight; }
    function ping(){ if(!connected) return; ws.send(JSON.stringify({type:'ping', t: performance.now()})); setTimeout(ping,1000); }
    function resizeToViewport(){ const w=innerWidth, h=innerHeight; if(cvs){ cvs.width=w; cvs.height=h; } if(miniCanvas){ miniCanvas.width=220; miniCanvas.height=220; } }
    addEventListener('resize', resizeToViewport);
    function showGame(){ screenSetup.style.display='none'; screenGame.style.display='block'; resizeToViewport(); }
    function showSetup(){ screenSetup.style.display='grid'; screenGame.style.display='none'; }
    function togglePause(){ const vis=pause.classList.contains('hide'); if(vis){ pause.classList.remove('hide'); running=false; ws?.send(JSON.stringify({type:'pause'})); } else { pause.classList.add('hide'); running=true; ws?.send(JSON.stringify({type:'resume'})); } }
    $('resume').onclick=()=>togglePause();
    $('backToSetup').onclick=()=>{ ws?.close(); showSetup(); };
    $('disconnect').onclick=()=>{ ws?.close(); showSetup(); };
    $('btnConnect').onclick=()=>{ saveSetup(); connect(); $('btnConnect').disabled=true; };
    $('btnStart').onclick=()=>{ if(!connected) return; showGame(); running=true; ws.send(JSON.stringify({type:'start'})); };
    zoomSel.addEventListener('change',()=>{ CELL=Number(zoomSel.value); saveSetup(); resizeToViewport(); });
    toggleMini.onclick=()=> miniWrap.classList.toggle('hide');
    toggleLeader.onclick=()=> leaderWrap.classList.toggle('hide');
    toggleChat.onclick=()=> chatWrap.classList.toggle('hide');
    loadSetup();
    showSetup();
