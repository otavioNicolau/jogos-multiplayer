    function hash32(x, y){ let h=(x*374761393 + y*668265263)|0; h^=h<<13; h^=h>>>17; h^=h<<5; return (h>>>0)/4294967296; }
    function $(id){ return document.getElementById(id); }
    const screenSetup=$('screen-setup'), screenRank=$('screen-rank'), screenGame=$('screen-game');
    const nameEl=$('playername'), zoomSel=$('zoom');
    const btnStart=$('btnStart'), btnRank=$('btnRank'), backToLogin=$('backToLogin');
    const rankList=$('rankList');
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
    let DPR=window.devicePixelRatio||1;
    const LS_KEY='snake_pro_setup';
    function loadSetup(){ try{ const s=JSON.parse(localStorage.getItem(LS_KEY)||'{}'); if(s.name) nameEl.value=s.name; if(s.zoom){ zoomSel.value=String(s.zoom); CELL=Number(s.zoom);} }catch{} }
    function saveSetup(){ const s={ name:nameEl.value, zoom:Number(zoomSel.value)}; localStorage.setItem(LS_KEY, JSON.stringify(s)); }
    const sprites={ tiles:makeTiles(), tree:makeTree(), fruits:makeFruitSprites(), coin:makeCoin() };
    function makeTiles(){ const s=24, grass=document.createElement('canvas'); grass.width=grass.height=s; const gg=grass.getContext('2d'); gg.fillStyle='#3a7328'; gg.fillRect(0,0,s,s); for(let i=0;i<40;i++){ gg.fillStyle=`rgba(0,0,0,${Math.random()*0.15})`; gg.fillRect(Math.random()*s,Math.random()*s,1,1);} const road=document.createElement('canvas'); road.width=road.height=s; const rg=road.getContext('2d'); rg.fillStyle='#8b5a2b'; rg.fillRect(0,0,s,s); for(let i=0;i<40;i++){ rg.fillStyle=`rgba(0,0,0,${Math.random()*0.15})`; rg.fillRect(Math.random()*s,Math.random()*s,1,1);} return {grass, road}; }
    function makeTree(){ const s=24, off=document.createElement('canvas'); off.width=off.height=s; const g=off.getContext('2d'); g.fillStyle='#5d3a1a'; g.fillRect(s/2-2,s-8,4,8); g.fillStyle='#2e8b57'; g.beginPath(); g.arc(s/2,s-10,10,0,Math.PI*2); g.fill(); return off; }
    function makeFruitSprites(){ const types=['apple','banana','cherry','pear']; const map={}; types.forEach(t=> map[t]=drawFruit(t)); return map; function drawFruit(type){ const s=22, off=document.createElement('canvas'); off.width=off.height=s; const g=off.getContext('2d'); if(type==='apple'){ g.fillStyle='#ff3b3b'; g.beginPath(); g.arc(s/2, s/2+1, 8, 0, Math.PI*2); g.fill(); g.fillStyle='rgba(255,255,255,.3)'; g.beginPath(); g.arc(s/2-3, s/2-1, 3, 0, Math.PI*2); g.fill(); g.fillStyle='#6d4c41'; g.fillRect(s/2-1, s/2-10, 2, 5); g.fillStyle='#20e3b2'; g.beginPath(); g.ellipse(s/2+5, s/2-6, 5, 3, -0.6, 0, Math.PI*2); g.fill(); } else if(type==='banana'){ g.strokeStyle='#ffd84d'; g.lineWidth=5; g.beginPath(); g.arc(s/2, s/2+3, 9, 0.2, 2.7); g.stroke(); g.strokeStyle='#e6c43f'; g.lineWidth=2; g.beginPath(); g.arc(s/2, s/2+3, 9, 0.5, 2.4); g.stroke(); } else if(type==='cherry'){ g.fillStyle='#ff4d6d'; g.beginPath(); g.arc(s/2-4, s/2+2, 6, 0, Math.PI*2); g.fill(); g.beginPath(); g.arc(s/2+4, s/2+2, 6, 0, Math.PI*2); g.fill(); g.strokeStyle='#6d4c41'; g.lineWidth=2; g.beginPath(); g.moveTo(s/2-4, s/2-5); g.bezierCurveTo(s/2, s/2-12, s/2, s/2-12, s/2+4, s/2-5); g.stroke(); g.fillStyle='#20e3b2'; g.beginPath(); g.ellipse(s/2, s/2-9, 5, 3, 0, 0, Math.PI*2); g.fill(); } else { g.fillStyle='#7ed957'; g.beginPath(); g.moveTo(s/2, s/2-6); g.bezierCurveTo(s/2+9, s/2-10, s/2+9, s/2+8, s/2, s/2+8); g.bezierCurveTo(s/2-9, s/2+8, s/2-9, s/2-10, s/2, s/2-6); g.fill(); g.fillStyle='#20e3b2'; g.beginPath(); g.ellipse(s/2+4, s/2-8, 5, 3, 0.4, 0, Math.PI*2); g.fill(); g.fillStyle='#6d4c41'; g.fillRect(s/2-1, s/2-12, 2, 5);} return off; } }
    function makeCoin(){ const s=22, off=document.createElement('canvas'); off.width=off.height=s; const g=off.getContext('2d'); const grd=g.createRadialGradient(s/2,s/2,3, s/2,s/2,10); grd.addColorStop(0,'#fff3c2'); grd.addColorStop(1,'#ff9f1a'); g.fillStyle=grd; g.beginPath(); g.arc(s/2,s/2,9,0,Math.PI*2); g.fill(); g.strokeStyle='#c97f0a'; g.lineWidth=2; g.stroke(); return off; }
    function shade(hex,pct){ const num=parseInt(hex.slice(1),16); const r=num>>16,g=(num>>8)&0xff,b=num&0xff; const t=pct<0?0:255; const p=Math.abs(pct); const R=Math.round((t-r)*p)+r; const G=Math.round((t-g)*p)+g; const B=Math.round((t-b)*p)+b; return `rgb(${R},${G},${B})`; }
    function worldToScreen(x,y){ const me=players[myId]; const vx=me?me.x:0, vy=me?me.y:0; const sx=Math.floor(cvs.width/DPR/2/CELL), sy=Math.floor(cvs.height/DPR/2/CELL); const dx=((x-vx+WORLD.w*1.5)%WORLD.w)-WORLD.w/2; const dy=((y-vy+WORLD.h*1.5)%WORLD.h)-WORLD.h/2; return {px:(sx+dx)*CELL, py:(sy+dy)*CELL}; }
    function drawGround(){ if(!ctx) return; const cols=Math.ceil(cvs.width/CELL)+2, rows=Math.ceil(cvs.height/CELL)+2; const me=players[myId]||{x:0,y:0}; const startX=Math.floor(me.x-cols/2), startY=Math.floor(me.y-rows/2); for(let r=0;r<rows;r++){ for(let c=0;c<cols;c++){ const wx=(startX+c+WORLD.w)%WORLD.w, wy=(startY+r+WORLD.h)%WORLD.h; const {px,py}=worldToScreen(wx,wy); const road=(wx%16<2)||(wy%16<2); const t=road?sprites.tiles.road:sprites.tiles.grass; ctx.drawImage(t, Math.round(px), Math.round(py), CELL, CELL); if(!road){ const rnd=hash32(wx,wy); if(rnd>0.97) ctx.drawImage(sprites.tree, Math.round(px), Math.round(py)-CELL/2, CELL, CELL); } } } }
    function fruitTypeFromId(id){ let h=0; for(let i=0;i<id.length;i++){ h=(h*31+id.charCodeAt(i))>>>0;} const types=Object.keys(sprites.fruits); return types[h%types.length]; }
    function drawFruit(x,y,id){ if(!ctx) return; const spr=sprites.fruits[fruitTypeFromId(id||'apple')]||sprites.fruits.apple; const {px,py}=worldToScreen(x,y); ctx.drawImage(spr, Math.round(px+1), Math.round(py+1), CELL-2, CELL-2); }
    function drawDrop(x,y,value){ if(!ctx) return; const {px,py}=worldToScreen(x,y); ctx.drawImage(sprites.coin, Math.round(px+1), Math.round(py+1), CELL-2, CELL-2); ctx.fillStyle='#fff'; ctx.font='10px system-ui,Arial'; ctx.fillText(String(value), Math.round(px)+6, Math.round(py)+CELL-4); }
    function drawSnake(p){ if(!ctx) return; p.body.forEach((seg,i)=>{ const {px,py}=worldToScreen(seg.x,seg.y); const base=i===0?'#ffffff':p.color; const grad=ctx.createLinearGradient(px,py,px,py+CELL); grad.addColorStop(0,shade(base,0.3)); grad.addColorStop(1,shade(base,-0.3)); ctx.fillStyle=grad; ctx.fillRect(Math.round(px),Math.round(py),CELL-1,CELL-1); ctx.strokeStyle='#000'; ctx.strokeRect(Math.round(px)+0.5,Math.round(py)+0.5,CELL-1,CELL-1); }); const head=p.body[0]; if(head){ const {px,py}=worldToScreen(head.x,head.y); const label=p.name||''; const w=ctx.measureText(label).width+8; ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(Math.round(px)-2, Math.round(py)-16, w, 12); ctx.fillStyle='#fff'; ctx.font='12px system-ui,Arial'; ctx.fillText(label, Math.round(px)+2, Math.round(py)-6); } }
    function render(){ if(!ctx) return; ctx.fillStyle='#0f0f17'; ctx.fillRect(0,0,cvs.width,cvs.height); drawGround(); apples.forEach(a=> drawFruit(a.x,a.y,a.id)); drops.forEach(d=> drawDrop(d.x,d.y,d.value)); Object.values(players).forEach(drawSnake); miniMap?.render(WORLD, players, apples, drops, myId); }
    function loop(){ requestAnimationFrame(loop); render(); } requestAnimationFrame(loop);
    let lastDir={x:1,y:0}, lastSend=0, speeding=false;
    function sendDir(nx,ny){ if(!connected) return; const now=performance.now(); if(now-lastSend<40) return; if(lastDir&&nx===-lastDir.x&&ny===-lastDir.y) return; lastDir={x:nx,y:ny}; lastSend=now; ws.send(JSON.stringify({type:'dir', x:nx, y:ny})); }
    function setSpeed(fast){ if(!connected || speeding===fast) return; speeding=fast; ws.send(JSON.stringify({type:'speed', fast})); }
    addEventListener('keydown',(e)=>{ const k=e.key.toLowerCase(); if(k==='escape'){ togglePause(); return; } if(['arrowup','w'].includes(k)){ sendDir(0,-1); setSpeed(true); } else if(['arrowdown','s'].includes(k)){ sendDir(0,1); setSpeed(true); } else if(['arrowleft','a'].includes(k)){ sendDir(-1,0); setSpeed(true); } else if(['arrowright','d'].includes(k)){ sendDir(1,0); setSpeed(true); } if(k==='m') miniWrap.classList.toggle('hide'); if(k==='l') leaderWrap.classList.toggle('hide'); if(k==='c') chatWrap.classList.toggle('hide'); });
    addEventListener('keyup',(e)=>{ const k=e.key.toLowerCase(); if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)) setSpeed(false); });
    if(dpad){ dpad.querySelectorAll('button[data-dir]').forEach(b=> b.addEventListener('click',()=>{ const d=b.dataset.dir; if(d==='up')sendDir(0,-1); if(d==='down')sendDir(0,1); if(d==='left')sendDir(-1,0); if(d==='right')sendDir(1,0); })); }
    function connect(){
      const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
      const url = protocol + location.host;
      ws = new WebSocket(url);
      roomLabel.textContent='auto';
      ws.onopen = () => {
        connected = true;
        const hello = { type:'hello', name:sanitizeName(nameEl.value)||`Player-${Math.floor(Math.random()*1000)}` };
        ws.send(JSON.stringify(hello));
        ping();
      };
      ws.onclose = () => { connected=false; running=false; btnStart.disabled=false; showLogin(); };
      ws.onerror = () => {};
      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if(data.type==='init'){
          myId=data.id; WORLD=data.world; apples=data.apples; players=data.players; leaderboard=data.leader||[]; lastServerTick=data.tick||0; drops=data.drops||[];
          roomLabel.textContent=data.room||'auto';
          updateHUD(); resizeToViewport(); renderLeader();
          showGame(); running=true; ws.send(JSON.stringify({type:'start'}));
        } else if(data.type==='state'){
          apples=data.apples; players=data.players; leaderboard=data.leader||[]; drops=data.drops||[]; lastServerTick=data.tick||0; updateHUD(); renderLeader();
        } else if(data.type==='chat'){
          pushChat(data.text);
        } else if(data.type==='msg'){
          pushChat(data.text);
        } else if(data.type==='pong'){
          pingEl.textContent=Math.round(performance.now()-data.t);
        }
      };
    }
    function sanitizeName(n){ return String(n||'').replace(/[^\p{L}\p{N}_\- ]/gu,'').trim().slice(0,18); }
    function updateHUD(){ pcountEl.textContent=Object.keys(players).length; const me=players[myId]; scoreEl.textContent=me?me.score:0; worldEl.textContent=`${WORLD.w}x${WORLD.h}`; }
    function renderLeader(){ leaderEl.innerHTML=''; leaderboard.slice(0,10).forEach(it=>{ const li=document.createElement('li'); li.textContent=`${it.name} — ${it.score}`; leaderEl.appendChild(li); }); }
    function fetchRank(){
      fetch('/rank').then(r=>r.json()).then(list=>{
        rankList.innerHTML='';
        list.forEach(it=>{ const li=document.createElement('li'); li.textContent=`${it.name} — ${it.score}`; rankList.appendChild(li); });
      }).catch(()=>{ rankList.innerHTML='<li>erro ao carregar</li>'; });
    }
    function pushChat(t){ const d=document.createElement('div'); d.textContent=t; chatlog.appendChild(d); chatlog.scrollTop=chatlog.scrollHeight; }
    function ping(){ if(!connected) return; ws.send(JSON.stringify({type:'ping', t: performance.now()})); setTimeout(ping,1000); }
    function resizeToViewport(){ const w=innerWidth, h=innerHeight, dpr=window.devicePixelRatio||1; DPR=dpr; if(cvs){ cvs.style.width=w+'px'; cvs.style.height=h+'px'; cvs.width=Math.floor(w*dpr); cvs.height=Math.floor(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=false; } miniMap?.resize(dpr); }
    addEventListener('resize', resizeToViewport);
    function showGame(){ screenSetup.style.display='none'; screenRank.style.display='none'; screenGame.style.display='block'; resizeToViewport(); }
    function showLogin(){ screenSetup.style.display='grid'; screenRank.style.display='none'; screenGame.style.display='none'; }
    function showRank(){ screenSetup.style.display='none'; screenGame.style.display='none'; screenRank.style.display='grid'; }
    function togglePause(){ const vis=pause.classList.contains('hide'); if(vis){ pause.classList.remove('hide'); running=false; ws?.send(JSON.stringify({type:'pause'})); } else { pause.classList.add('hide'); running=true; ws?.send(JSON.stringify({type:'resume'})); } }
    $('resume').onclick=()=>togglePause();
    $('backToSetup').onclick=()=>{ ws?.close(); showLogin(); };
    $('disconnect').onclick=()=>{ ws?.close(); showLogin(); };
    btnStart.onclick=()=>{ saveSetup(); btnStart.disabled=true; connect(); };
    btnRank.onclick=()=>{ fetchRank(); showRank(); };
    backToLogin.onclick=()=>{ showLogin(); };
    zoomSel.addEventListener('change',()=>{ CELL=Number(zoomSel.value); saveSetup(); resizeToViewport(); });
    toggleMini.onclick=()=> miniWrap.classList.toggle('hide');
    toggleLeader.onclick=()=> leaderWrap.classList.toggle('hide');
    toggleChat.onclick=()=> chatWrap.classList.toggle('hide');
    chatInput.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Enter'){
        const text=chatInput.value.trim();
        if(text&&connected){ ws?.send(JSON.stringify({type:'chat', text})); }
        chatInput.value='';
      }
    });
    loadSetup();
    showLogin();
