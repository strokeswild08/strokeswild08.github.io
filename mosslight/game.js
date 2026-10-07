/* Mosslight: The Last Lantern — a small, dependency-free browser adventure. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
  const W = 480, H = 288, TILE = 24, COLS = 40, ROWS = 26;
  const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm = (x, y) => { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n }; };
  const hash = (x, y, n = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + n * 74.7) * 43758.5453; return v - Math.floor(v); };
  let clock = 0, lastFrame = 0, uid = 0, map, background, scenery = [], flow = [], flowTimer = 0;
  let run = { mode: 'title', level: 0, time: 0, kills: 0, deaths: 0, lanterns: 0 };
  let player, enemies = [], projectiles = [], particles = [], pickups = [], rings = [], beacons = [];
  let camera = { x: 0, y: 0 }, shake = 0, hitstop = 0, toastTimer = 0, transitionTimer = 0;
  let mouseAim = { x: 0, y: 1, age: 99 }, touchMove = { x: 0, y: 0 };
  const keys = new Set(), pending = { attack: false, dash: false, interact: false };
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('motion-toggle').checked = reducedMotion;
  let best = 0;
  try { best = Number(localStorage.getItem('mosslight-best-v1')) || 0; } catch { /* Private browsing may disable storage. */ }
  const timeLabel = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  if (best) $('best-time').textContent = `Your best crossing: ${timeLabel(best)}`;

  const chapters = [
    { title: 'The Sunken Garden', chapter: 'CHAPTER I', subtitle: 'Even here, something is still growing.', start: [8, 21], lights: [[9, 16], [29, 18], [28, 7]], exit: [20, 3] },
    { title: 'The Rootbound Hall', chapter: 'CHAPTER II', subtitle: 'Old stone. New roots. The same stubborn dark.', start: [8, 21], lights: [[8, 6], [29, 7], [30, 20]], exit: [29, 3] },
    { title: 'The Heart of the Ruin', chapter: 'CHAPTER III', subtitle: 'The last light has a keeper of its own.', start: [20, 21], lights: [], exit: [20, 3] }
  ];
  const atTile = (x, y) => ({ x: (x + .5) * TILE, y: (y + .5) * TILE });
  const palette = { outline: '#12221f', cloak: '#367577', shade: '#245457', light: '#65a19a', scarf: '#dfae62', skin: '#e3c699', white: '#f2e1b5', steel: '#a7c1b1' };
  const spriteDefs = {
    keeper: [
      '     oooooo     ', '    occcccco    ', '   occllllcco   ', '   occllllcclo  ',
      '  occoossoocco  ', '  ocoswwwwsoco  ', '  ocoswoowsoco  ', '  occossssocco  ',
      '   oaaaaaaaao   ', '  oaaaaaaaaoao  ', '  occaaaccclco  ', ' occcccccllllco ',
      ' occccccllllcco ', ' occcccccllccco ', '  occccccccccco ', '  occcclcccccco ',
      '   occclcccco   ', '   osssosssso   ', '   osso osso    ', '   oooo oooo    '
    ],
    grub: [
      '   o       o   ', '    ao   oa    ', '    ooooooo    ', '  oogglllggoo  ',
      ' ogglllllllgggo', ' ogglwlllwllggo', 'oggglolllolgggo', 'ogggggggggggggo',
      ' ogggddddggggo ', '  ooddddddooo  ', '  oo oo oo oo  '
    ],
    wisp: [
      '      l       ', '     lpl      ', '   llpppll    ', '  lppwwpppl   ',
      ' lppwwwwpppl  ', ' lppwowoppll  ', '  lppwwppl    ', '   lppppl     ',
      '    lpll      ', '   lp lpl     ', '  ll   ll     '
    ],
    sentinel: [
      '    ooooooo    ', '   odmmmmmdo   ', '  odmmmmmmddo  ', '  odmwwwwmddo  ',
      '  odmwowomddo  ', '   odmmmdddo   ', '  oaaaaoaaaao  ', ' odmmmmaaammdo ',
      'odmmmmmmmddddo ', 'odmdddddmmmddo ', ' odmmmmmmmmdo  ', ' odmmmdmmmddo  ',
      '  oddddddddo   ', '  odddo odddo  ', '  ooo   oooo   '
    ],
    warden: [
      '    a                     a    ', '   oao                   oao   ', '   ooao                 oaoo   ',
      '    odmao    aaaaa    oamdo    ', '     odmao  awwwwwa  oamdo     ', '      odmaooammmmmaooamdo      ',
      '       odmmmmmmmmmmmmdo       ', '       ommmmlmmmmmmmmo        ', '      odmmmllmmmmmmmddo       ',
      '      odmwwwwwwwwwwmdo       ', '      odmwoowwwwoowmdo       ', '      odmwwwwwwwwwwmdo       ',
      '       odmddddddddmdo        ', '      oddmaaaaaaammddo       ', '    oddmmaawwwwaammdddo      ',
      '   oddmmmmawwwwammmmdddo     ', '  oddmmmmmmawwammmmmmdddo    ', ' oddmmmmlmmmaammmmlmmmmddo   ',
      ' oddmmmllmmmaammmllmmmmddo   ', ' odmmlmmmmmmmmmmmmmmmmddo    ', ' odmllmmmmmmaammmmmmmmddo    ',
      ' odmmmmmmdmawammddmmmmddo   ', ' oddmmmmddawwwadddmmmdddo   ', '  oddmmdddawwwaddddmmddo    ',
      '   oddmddddaawaddddmddo    ', '    oddmddddddddddmddo     ', '    oddmmddddddddmmddo     ',
      '   oddmmdddo oddddmmddo    ', '  oddmmdddo   oddddmmddo   ', ' oddmmddo       oddmmdddo  ',
      'oddmmddo         oddmmdddo ', 'ooooooo           oooooooo '
    ]
  };
  const spriteColors = {
    keeper: { o: palette.outline, c: palette.cloak, l: palette.light, s: palette.skin, w: palette.white, a: palette.scarf },
    grub: { o: '#182c27', a: '#92a474', g: '#597f56', l: '#8dad70', w: '#e9d898', d: '#3c5c40' },
    wisp: { l: '#577fa1', p: '#98aed1', w: '#d3e4d0', o: '#294252' },
    sentinel: { o: '#182720', d: '#445340', m: '#778069', a: '#b89858', w: '#bcd094' },
    warden: { o: '#13251e', d: '#40503a', m: '#768167', l: '#98a075', a: '#c5a067', w: '#ffe6ad' }
  };
  const sprites = {};
  for (const [name, lines] of Object.entries(spriteDefs)) {
    const c = document.createElement('canvas'); c.width = Math.max(...lines.map(l => l.length)); c.height = lines.length;
    const g = c.getContext('2d');
    lines.forEach((line, y) => [...line].forEach((s, x) => { if (spriteColors[name][s]) { g.fillStyle = spriteColors[name][s]; g.fillRect(x, y, 1, 1); } }));
    sprites[name] = c;
  }

  /* Audio only starts inside a user gesture. No remote audio or assets are required. */
  let audio, master, soundOn = false, musicTimer = 0, musicStep = 0;
  function initAudio() {
    try {
      if (!audio) { audio = new (window.AudioContext || window.webkitAudioContext)(); master = audio.createGain(); master.gain.value = .25; master.connect(audio.destination); }
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch { soundOn = false; }
  }
  function tone(freq, length, type = 'sine', volume = .12, slide = freq, delay = 0) {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const now = audio.currentTime + delay, oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slide), now + length);
    gain.gain.setValueAtTime(.001, now); gain.gain.linearRampToValueAtTime(volume, now + .012); gain.gain.exponentialRampToValueAtTime(.001, now + length);
    oscillator.connect(gain); gain.connect(master); oscillator.start(now); oscillator.stop(now + length + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function sound(kind) {
    if (kind === 'strike') { tone(180, .12, 'triangle', .16, 55); tone(850, .055, 'sine', .04, 170); }
    if (kind === 'dash') tone(160, .14, 'sine', .09, 460);
    if (kind === 'hit') { tone(78, .15, 'triangle', .24, 35); tone(210, .08, 'square', .035, 55); }
    if (kind === 'hurt') { tone(110, .3, 'sawtooth', .06, 60); tone(220, .18, 'triangle', .1, 90); }
    if (kind === 'light') [392, 523.25, 659.25, 783.99].forEach((n, i) => tone(n, .8, 'sine', .1, n, i * .13));
    if (kind === 'heal') { tone(523, .3, 'sine', .08); tone(784, .5, 'sine', .08, 784, .12); }
    if (kind === 'warning') { tone(65, .7, 'triangle', .22, 50); tone(130, .7, 'sine', .09, 100); }
    if (kind === 'win') [261.6, 329.6, 392, 523.25, 659.25].forEach((n, i) => tone(n, 1.4, 'sine', .13, n, i * .22));
  }
  function music(dt) {
    if (!soundOn) return;
    musicTimer -= dt;
    if (musicTimer <= 0) {
      musicTimer = run.level === 2 ? .85 : 1.45;
      const notes = [196, 246.94, 293.66, 369.99, 293.66, 246.94, 220, 293.66];
      const n = notes[musicStep++ % notes.length];
      tone(n, 1.7, 'sine', .03, n); tone(n / 2, 2.4, 'triangle', .035, n / 2);
    }
  }
  function setSound(on) {
    soundOn = on; if (on) initAudio();
    if (master && audio) master.gain.setTargetAtTime(soundOn ? .25 : 0, audio.currentTime, .02);
    $('sound-label').textContent = soundOn ? 'ON' : 'OFF';
    $('sound-button').setAttribute('aria-label', `${soundOn ? 'Mute' : 'Enable'} sound`);
    $('sound-button').setAttribute('aria-pressed', String(soundOn));
  }

  function paintRect(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function carve(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map[j][i] = 1; }
  function block(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map[j][i] = 0; }
  function passable(tx, ty) { return tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && map[ty][tx] === 1; }
  function blocked(x, y, r = 7) {
    return [[-r,-r],[r,-r],[-r,r],[r,r]].some(([a,b]) => !passable(Math.floor((x+a)/TILE), Math.floor((y+b)/TILE)));
  }
  function move(body, dx, dy) {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 5) || 1;
    for (let n = 0; n < steps; n++) {
      if (!blocked(body.x + dx / steps, body.y, body.r)) body.x += dx / steps;
      if (!blocked(body.x, body.y + dy / steps, body.r)) body.y += dy / steps;
    }
  }
  function floorTile(g, x, y) {
    const n = hash(x, y, run.level), px = x*TILE, py = y*TILE;
    const garden = run.level === 0;
    const path = (x>=8&&x<=10)||(y>=15&&y<=17&&x>=8&&x<=31)||(x>=27&&x<=29&&y<=19)||(y>=3&&y<=5&&x>=9&&x<=28);
    if (garden && !path) {
      paintRect(g,px,py,24,24,['#293e2c','#2c422f','#2b402d'][Math.floor(n*3)]);
      for(let i=0;i<7;i++) {
        const dx=Math.floor(hash(x,y,i+4)*22),dy=Math.floor(hash(y,x,i+9)*22);
        paintRect(g,px+dx,py+dy,1,2+(i%3),['#3c5b37','#4a653e','#334e30'][i%3]);
        if(i%3===0)paintRect(g,px+dx-1,py+dy+2,3,1,'#3a5434');
      }
      if(n>.88){paintRect(g,px+4,py+12,9,4,'#25362b');paintRect(g,px+5,py+10,7,3,'#64725a');paintRect(g,px+5,py+10,4,1,'#879074');}
      return;
    }
    paintRect(g, px, py, TILE, TILE, garden ? ['#344638','#3a4b3b','#364b3b'][Math.floor(n*3)] : ['#34403b','#394740','#36433e'][Math.floor(n*3)]);
    paintRect(g, px+1, py+1, 21, 1, '#526052'); paintRect(g, px, py+23, 24, 1, '#26372d');
    paintRect(g, px+23, py, 1, 24, '#25372e');
    if (n>.5) { paintRect(g,px+2,py+12,10,1,'#2a3b30'); paintRect(g,px+11,py+13,1,9,'#2a3b30'); }
    for(let i=0;i<6;i++) {
      const dx=Math.floor(hash(x,y,i+4)*21),dy=Math.floor(hash(y,x,i+9)*21);
      paintRect(g,px+dx,py+dy,2+(i%2),1,garden?'#516a43':'#4b6150');
    }
    if (n>.82) { paintRect(g,px+3,py+4,5,2,'#627147');paintRect(g,px+4,py+3,2,5,'#627147'); }
  }
  function wallTile(g, x, y) {
    const px=x*TILE,py=y*TILE,n=hash(x,y);
    const edge = passable(x,y+1);
    paintRect(g,px,py,24,24,run.level===0?'#193a2b':'#202f2b');
    if (edge) {
      paintRect(g,px,py+3,24,10,'#71806a');paintRect(g,px+1,py+4,21,1,'#a0a384');
      paintRect(g,px,py+13,24,11,'#425647');paintRect(g,px+1,py+15,22,2,'#566954');
      paintRect(g,px,py+23,24,1,'#182a23');paintRect(g,px+12,py+14,1,10,'#2b4133');
      paintRect(g,px+1,py+3,4,4,'#74935e');paintRect(g,px+1,py+7,2,9,'#617f51');
    } else if (run.level===0) {
      const col=['#204a32','#2c5738','#285139'][Math.floor(n*3)];
      paintRect(g,px+2,py+3,20,17,col);paintRect(g,px+5,py+1,14,21,col);
      paintRect(g,px+6,py+4,6,2,'#456847');paintRect(g,px+13,py+11,6,2,'#395c3d');
      paintRect(g,px+1,py+20,22,4,'#162e24');
    } else {
      paintRect(g,px+1,py+1,22,22,'#405346');paintRect(g,px+2,py+2,20,2,'#64745f');
      paintRect(g,px+11,py+2,1,20,'#2c4134');paintRect(g,px+1,py+12,22,1,'#2c4134');
      if(n>.7)paintRect(g,px+3,py+4,6,3,'#647948');
    }
  }
  function pillar(g,x,y) {
    paintRect(g,x-9,y-5,21,7,'#20352b');paintRect(g,x-6,y-25,12,23,'#61705c');
    paintRect(g,x-5,y-25,3,22,'#8b9374');paintRect(g,x+3,y-24,3,21,'#455946');
    paintRect(g,x-8,y-27,16,5,'#8e9478');paintRect(g,x-9,y-4,18,5,'#76816a');
    paintRect(g,x-7,y-19,4,6,'#719255');paintRect(g,x-7,y-14,2,9,'#527448');
    paintRect(g,x,y-24,1,9,'#354d3b');paintRect(g,x,y-16,4,1,'#354d3b');
  }
  function tree(x,y,seed=0) {
    shadow(x,y,24);
    paintRect(ctx,x-5,y-39,10,41,'#243729');paintRect(ctx,x-3,y-35,3,33,'#4c5835');
    paintRect(ctx,x-10,y-1,20,4,'#283c28');paintRect(ctx,x+5,y-8,8,3,'#283c28');
    const leaves=[[-19,-66,37,30],[-31,-52,58,32],[-26,-36,51,18],[-11,-76,23,20]];
    leaves.forEach(([dx,dy,w,h])=>{paintRect(ctx,x+dx,y+dy,w,h,'#142f23');paintRect(ctx,x+dx+2,y+dy+2,w-4,h-7,'#23492e');});
    [[-18,-63,13,5],[-26,-47,19,5],[3,-59,14,4],[-9,-72,13,5],[8,-32,12,4],[-20,-28,15,3]].forEach(([dx,dy,w,h])=>paintRect(ctx,x+dx,y+dy,w,h,'#365b37'));
    for(let i=0;i<14;i++){const dx=hash(i,seed)*47-24,dy=-25-hash(seed,i)*43;paintRect(ctx,x+dx,y+dy,3,1,'#4d6c40');}
  }
  function gardenDetails(g) {
    // A shallow, irregular pool beside the entrance. Its shelf remains walkable.
    const x=15*TILE,y=20*TILE;
    [[12,0,54,12],[0,12,78,30],[12,42,54,12]].forEach(([dx,dy,w,h])=>paintRect(g,x+dx,y+dy,w,h,'#526249'));
    [[14,2,50,12],[3,14,72,24],[14,36,50,14]].forEach(([dx,dy,w,h])=>paintRect(g,x+dx,y+dy,w,h,'#24463e'));
    [[20,8,25,1],[9,21,19,1],[42,30,25,1],[19,42,30,1]].forEach(([dx,dy,w,h])=>paintRect(g,x+dx,y+dy,w,h,'#527c6a'));
    [[8,34],[60,15],[40,41]].forEach(([dx,dy])=>{paintRect(g,x+dx,y+dy,9,4,'#58734c');paintRect(g,x+dx+2,y+dy-1,5,1,'#87935d');});
    // Weathered masonry and a cloth left by an earlier keeper.
    const p=atTile(5,22);paintRect(g,p.x-11,p.y-4,22,10,'#20362a');paintRect(g,p.x-10,p.y-5,19,8,'#8f805b');paintRect(g,p.x-8,p.y-5,3,8,'#b49e6c');
    paintRect(g,p.x+10,p.y-9,5,8,'#617359');paintRect(g,p.x+11,p.y-8,3,4,'#c1b488');
    const r=atTile(12,19);paintRect(g,r.x-14,r.y-4,26,7,'#26392c');paintRect(g,r.x-11,r.y-8,8,6,'#839077');paintRect(g,r.x+2,r.y-4,10,5,'#697b61');paintRect(g,r.x-10,r.y-8,6,1,'#a1a78a');
  }
  function makeWorld(level) {
    run.level=level; shake=0; hitstop=0; mouseAim.age=99; clearInput();
    map=Array.from({length:ROWS},()=>Array(COLS).fill(0));
    if(level===0) {
      carve(3,3,34,21);block(14,6,3,5);block(20,16,3,5);block(5,8,3,3);block(32,9,3,5);
      block(10,12,5,2);block(23,11,5,2);
    } else if(level===1) {
      carve(3,15,12,9);carve(3,3,12,9);carve(21,3,15,9);carve(21,15,15,9);
      carve(7,10,4,9);carve(27,10,4,9);carve(8,11,21,4);
      block(11,5,2,3);block(23,17,2,3);block(32,5,2,3);
    } else carve(6,4,28,20);
    scenery=[];
    background=document.createElement('canvas');background.width=WORLD_W;background.height=WORLD_H;
    const g=background.getContext('2d');g.imageSmoothingEnabled=false;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)map[y][x]?floorTile(g,x,y):wallTile(g,x,y);
    if(level===0)gardenDetails(g);
    const columnTiles=level===0?[[11,4],[24,4],[6,19],[34,21],[17,15],[31,6]]:level===1?[[4,4],[13,10],[22,4],[34,10],[4,16],[34,22]]:[[8,7],[31,7],[8,21],[31,21]];
    columnTiles.forEach(([x,y])=>{const p=atTile(x,y);pillar(g,p.x,p.y);});
    // Thin roots, stone fragments and deliberate path details.
    for(let y=2;y<ROWS-2;y++)for(let x=2;x<COLS-2;x++)if(passable(x,y)) {
      const n=hash(x,y,18),p=atTile(x,y);
      if(n>.975) { paintRect(g,p.x-7,p.y+2,13,4,'#26372e');paintRect(g,p.x-6,p.y,10,4,'#7b8265');paintRect(g,p.x-5,p.y,5,1,'#a0a183'); }
      if(n<.055)scenery.push({x:p.x,y:p.y,type:'grass',seed:n});
      if(n>.86&&n<.89)scenery.push({x:p.x-3,y:p.y,type:'flower',seed:n});
    }
    if(level===0)[[2,14],[2,22],[5,25],[14,25],[26,25],[37,21],[38,15],[37,5],[29,2],[7,2]].forEach(([x,y],i)=>scenery.push({...atTile(x,y),type:'tree',seed:i}));
    if(level===2) {
      for(let i=0;i<32;i++){const a=i/32*TAU;paintRect(g,20.5*TILE+Math.cos(a)*105,13.5*TILE+Math.sin(a)*105,3,3,'#718065');}
      paintRect(g,20*TILE-6,13*TILE,36,1,'#899376');paintRect(g,20.5*TILE,13*TILE-12,1,36,'#899376');
    }
    beacons=chapters[level].lights.map(([x,y],i)=>({...atTile(x,y),lit:false,id:i,pulse:0}));
    enemies=[];projectiles=[];particles=[];pickups=[];rings=[];flow=[];flowTimer=0;
    player={...atTile(...chapters[level].start),r:6,hp:6,maxHp:6,aim:{x:0,y:-1},swing:0,attackCd:0,dashTime:0,dashCd:0,invuln:1,dashDir:{x:0,y:-1},walk:0,knock:{x:0,y:0},trail:[]};
    camera={x:clamp(player.x-W/2,0,WORLD_W-W),y:clamp(player.y-H*(level===2?.75:.58),0,WORLD_H-H)};
    $('room-number').textContent=chapters[level].chapter;$('room-name').textContent=chapters[level].title;
    $('boss-hud').hidden=level!==2;$('context-prompt').hidden=true;
    if(level===0) { spawnEnemy('grub',atTile(16,19));spawnEnemy('grub',atTile(22,9)); }
    if(level===1) { spawnEnemy('grub',atTile(11,20));spawnEnemy('sentinel',atTile(17,13)); }
    if(level===2)spawnEnemy('warden',atTile(20,15));
    updateHUD();
  }
  function spawnEnemy(type,p) {
    const spec={grub:{hp:6,speed:30,r:7},wisp:{hp:6,speed:24,r:6},sentinel:{hp:12,speed:24,r:9},warden:{hp:110,speed:16,r:20}}[type];
    enemies.push({...p,...spec,maxHp:spec.hp,type,id:uid++,hurt:0,age:0,cool:1.5,knock:{x:0,y:0},tell:0,phase:1,pattern:0,attack:null,dead:false});
  }
  function burst(x,y,color,count=12,speed=50) {
    for(let i=0;i<count;i++) {const a=Math.random()*TAU,v=(.35+Math.random()*.65)*speed;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.4,max:.7,color,size:Math.random()>.65?2:1});}
  }
  function toast(text,duration=4) {$('dialogue').querySelector('p').textContent=text;$('dialogue').hidden=false;toastTimer=duration;}
  let previousHealth = -1, previousObjective = '', previousCount = '';
  function updateHUD() {
    if (previousHealth !== player.hp) {
      $('hearts').innerHTML=Array.from({length:6},(_,i)=>`<span${i>=player.hp?' class="heart-lost"':''}>♥</span>`).join(' ');
      $('hearts').setAttribute('aria-label',`${player.hp} of ${player.maxHp} health`);
      previousHealth = player.hp;
    }
    const lit=beacons.filter(b=>b.lit).length,ready=lit===3&&!enemies.some(e=>!e.dead);
    const count=run.level===2?'6 / 6':`${lit} / 3`;
    const objective=run.mode==='win'?'The ruin remembers the light':run.level===2?'Defeat the Hollow Warden':ready?'Follow the gold passage marker':lit===3?'Clear the remaining creatures':`Relight the three ${run.level===0?'garden':'hall'} lanterns`;
    if (count !== previousCount) { $('lantern-count').textContent=count; previousCount=count; }
    if (objective !== previousObjective) { $('objective').textContent=objective; previousObjective=objective; }
  }
  function startGame() {
    run={mode:'playing',level:0,time:0,kills:0,deaths:0,lanterns:0};makeWorld(0);hideOverlay();setSound(true);
    toast('A sleeping lantern. Get close, then press E.');canvas.focus({preventScroll:true});
  }
  function hideOverlay() {$('overlay').hidden=true;}
  function showOverlay(title,copy,button,action,note='') {
    $('overlay').hidden=false;$('overlay-title').innerHTML=title;$('overlay-copy').innerHTML=copy;
    $('start-button').innerHTML=`${button} <span>→</span>`;$('start-button').onclick=action;
    $('overlay').querySelector('.eyebrow').textContent=run.mode==='dead'?'EVEN KEEPERS NEED A SECOND TRY':run.mode==='win'?'SIX LIGHTS. ONE QUIET MORNING.':'TAKE A BREATH';
    $('overlay').querySelector('.start-note').textContent=note;
    $('start-button').focus({preventScroll:true});
  }
  function clearInput(){keys.clear();touchMove={x:0,y:0};Object.keys(pending).forEach(k=>pending[k]=false);$('joystick-knob').style.transform='';}
  function pause() {
    if(run.mode!=='playing')return;run.mode='paused';clearInput();
    showOverlay('The light<br><em>can wait.</em>','Your journey is right where you left it.','Keep going',resume,'P / ESC TO RESUME');$('pause-button').setAttribute('aria-label','Resume game');
  }
  function resume(){if(run.mode!=='paused')return;run.mode='playing';hideOverlay();$('pause-button').setAttribute('aria-label','Pause game');canvas.focus({preventScroll:true});}
  function retry(){run.deaths++;makeWorld(run.level);run.mode='playing';hideOverlay();toast('Still a spark left. Try a different step.');canvas.focus({preventScroll:true});}
  function die(){run.mode='dead';clearInput();sound('hurt');showOverlay('Not out.<br><em>Not yet.</em>','The dark caught you this time.<br>Retry from the start of this chapter.','Try again',retry);}
  function win() {
    run.mode='win';clearInput();sound('win');$('boss-hud').hidden=true;$('context-prompt').hidden=true;$('dialogue').hidden=true;
    const newBest=!best||run.time<best;
    if(newBest){best=run.time;try{localStorage.setItem('mosslight-best-v1',String(best));}catch{}}
    $('best-time').textContent=`Your best crossing: ${timeLabel(best)}`;
    showOverlay('Morning<br><em>finds a way.</em>',`All six lanterns are burning.<br>${timeLabel(run.time)} · ${run.kills} creatures cleared · ${run.deaths} ${run.deaths===1?'retry':'retries'}`,'Walk it again',startGame,newBest?'A NEW PERSONAL BEST':'THANK YOU FOR KEEPING THE LIGHT');updateHUD();
  }
  function interact() {
    if(run.mode!=='playing')return;
    const b=beacons.find(b=>!b.lit&&dist(b,player)<35);
    if(b) {
      b.lit=true;b.pulse=2;run.lanterns++;sound('light');burst(b.x,b.y-12,'#f6d494',24,65);shake=.8;
      const n=beacons.filter(b=>b.lit).length;
      toast(n===1?'That is one. The dark noticed.':n===2?'Two lights. Keep your feet moving.':'The last light is awake. Clear a way to the passage.');
      const types=run.level===0?(n===1?['grub','grub']:n===2?['grub','wisp','grub']:['grub','grub','wisp']):(n===1?['grub','sentinel','wisp']:n===2?['sentinel','wisp','grub']:['sentinel','wisp','grub','grub']);
      types.forEach((type,i)=> {
        let p=null;
        for(let k=0;k<40;k++) {const a=(i/types.length)*TAU+k*.43,x=b.x+Math.cos(a)*(65+k),y=b.y+Math.sin(a)*(65+k);if(!blocked(x,y,10)&&Math.hypot(x-player.x,y-player.y)>45){p={x,y};break;}}
        if(p)spawnEnemy(type,p);
      });updateHUD();return;
    }
    const exit=atTile(...chapters[run.level].exit);
    if(run.level<2&&beacons.every(b=>b.lit)&&enemies.length===0&&dist(player,exit)<39) {
      run.mode='transition';clearInput();$('transition').classList.add('active');transitionTimer=.65;sound('light');
    }
  }
  function strike() {
    if(player.attackCd>0||player.dashTime>0)return;
    player.attackCd=.32;player.swing=.2;sound('strike');
    const closest=enemies.filter(e=>!e.dead&&dist(e,player)<64).sort((a,b)=>dist(a,player)-dist(b,player))[0];
    if(closest&&mouseAim.age>1)player.aim=norm(closest.x-player.x,closest.y-player.y);
    burst(player.x+player.aim.x*23,player.y-6+player.aim.y*23,'#d8dda0',4,30);
    enemies.forEach(e=>{
      const d=dist(e,player),direction=norm(e.x-player.x,e.y-player.y);
      if(d<38+e.r&&direction.x*player.aim.x+direction.y*player.aim.y>-.2) {
        e.hp-=e.type==='warden'?5:4;e.hurt=.2;e.knock={x:direction.x*120,y:direction.y*120};
        burst(e.x,e.y-6,e.type==='wisp'?'#b1cce0':'#c5ce95',13);sound('hit');shake=2;hitstop=.035;
        if(e.hp<=0)kill(e);
      }
    });
  }
  function kill(e) {
    if(e.dead)return;e.dead=true;run.kills++;burst(e.x,e.y-8,e.type==='warden'?'#ebc47c':'#8aaf87',e.type==='warden'?70:22,80);
    if(e.type==='warden'){win();return;}
    if((run.kills%3===0||player.hp<=2)&&player.hp<6)pickups.push({x:e.x,y:e.y,type:'heart',age:0});
  }
  function dash() {
    if(player.dashCd>0)return;
    const m=movement();player.dashDir=Math.hypot(m.x,m.y)>.1?norm(m.x,m.y):{...player.aim};
    player.aim={...player.dashDir};player.dashTime=.17;player.dashCd=1.1;player.invuln=Math.max(player.invuln,.32);sound('dash');
  }
  function hurt(source) {
    if(player.invuln>0||run.mode!=='playing')return;
    player.hp--;player.invuln=1;const d=norm(player.x-source.x,player.y-source.y);player.knock={x:d.x*125,y:d.y*125};
    burst(player.x,player.y-8,'#e2a67b',16);shake=3.5;hitstop=.07;sound('hurt');updateHUD();if(player.hp<=0)die();
  }
  function movement() {
    const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x;
    const y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touchMove.y;
    return Math.hypot(x,y)>1?norm(x,y):{x,y};
  }
  function rebuildFlow() {
    flow=Array.from({length:ROWS},()=>Array(COLS).fill(999));
    const px=Math.floor(player.x/TILE),py=Math.floor(player.y/TILE),queue=[[px,py]];flow[py][px]=0;
    for(let n=0;n<queue.length;n++){const[x,y]=queue[n];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(passable(x+dx,y+dy)&&flow[y+dy][x+dx]===999){flow[y+dy][x+dx]=flow[y][x]+1;queue.push([x+dx,y+dy]);}}
  }
  function pursuit(e) {
    const tx=Math.floor(e.x/TILE),ty=Math.floor(e.y/TILE),px=Math.floor(player.x/TILE),py=Math.floor(player.y/TILE);
    if(Math.abs(tx-px)+Math.abs(ty-py)<3)return norm(player.x-e.x,player.y-e.y);
    const options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:tx+dx,y:ty+dy,d:flow[ty+dy]?.[tx+dx]??999})).filter(p=>passable(p.x,p.y)).sort((a,b)=>a.d-b.d);
    if(!options.length)return{x:0,y:0};const target=atTile(options[0].x,options[0].y);return norm(target.x-e.x,target.y-e.y);
  }
  function fire(from,to,speed=74,type='wisp') {
    const d=norm(to.x-from.x,to.y-from.y);projectiles.push({x:from.x,y:from.y-4,vx:d.x*speed,vy:d.y*speed,life:5,type,r:3});
  }
  function bossAI(e,dt) {
    if(e.hp<e.maxHp*.5&&e.phase===1) {e.phase=2;e.cool=.6;toast('The roots are breaking. Watch for the second pulse.',5);burst(e.x,e.y-25,'#d2ba7a',25);sound('warning');}
    if(e.tell>0) {
      e.tell-=dt;
      if(e.tell<=0) {
        if(e.attack==='slam') {
          rings.push({x:e.x,y:e.y,r:8,max:145,speed:e.phase===2?115:90,hit:false});shake=4;sound('hit');
          if(e.phase===2)e.secondRing=.55;
        } else {
          const d=norm(player.x-e.x,player.y-e.y),base=Math.atan2(d.y,d.x);
          for(let k=-2;k<=2;k++)fire(e,{x:e.x+Math.cos(base+k*.28)*100,y:e.y+Math.sin(base+k*.28)*100},e.phase===2?92:76,'boss');
          sound('warning');
        }
        e.cool=e.phase===2?1.65:2.2;e.attack=null;
      }
    } else {
      const d=norm(player.x-e.x,player.y-e.y);if(dist(e,player)>42)move(e,d.x*e.speed*dt,d.y*e.speed*dt);
      e.cool-=dt;
      if(e.cool<=0){e.attack=e.pattern++%2===0?'slam':'volley';e.tell=e.phase===2?.85:1.15;sound('warning');}
    }
    if(e.secondRing>0){e.secondRing-=dt;if(e.secondRing<=0)rings.push({x:e.x,y:e.y,r:8,max:145,speed:110,hit:false});}
    $('boss-health').style.width=`${Math.max(0,e.hp/e.maxHp*100)}%`;$('boss-phase').textContent=e.phase===2?'THE ROOTS BREAK':'ROOT AND RUST';
  }
  function update(dt) {
    clock+=dt;mouseAim.age+=dt;
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('dialogue').hidden=true;}
    if(run.mode==='transition') {
      transitionTimer-=dt;
      if(transitionTimer<=0){makeWorld(run.level+1);run.mode='playing';$('transition').classList.remove('active');toast(chapters[run.level].subtitle,5);if(run.level===2)sound('warning');}
    }
    if(run.mode!=='playing'){particles.forEach(p=>p.life-=dt);particles=particles.filter(p=>p.life>0);return;}
    run.time+=dt;music(dt);
    if(hitstop>0){hitstop-=dt;return;}
    shake=Math.max(0,shake-dt*12);player.invuln=Math.max(0,player.invuln-dt);
    player.attackCd=Math.max(0,player.attackCd-dt);player.swing=Math.max(0,player.swing-dt);player.dashCd=Math.max(0,player.dashCd-dt);
    if(pending.dash){dash();pending.dash=false;}if(pending.attack){strike();pending.attack=false;}if(pending.interact){interact();pending.interact=false;}
    if(run.mode!=='playing')return;
    const m=movement();if(Math.hypot(m.x,m.y)>.1){if(player.swing<=0&&mouseAim.age>1)player.aim=norm(m.x,m.y);player.walk+=dt*10;}
    if(player.dashTime>0) {
      player.dashTime-=dt;move(player,player.dashDir.x*330*dt,player.dashDir.y*330*dt);
      player.trail.push({x:player.x,y:player.y,life:.16});
    } else move(player,m.x*92*dt,m.y*92*dt);
    move(player,player.knock.x*dt,player.knock.y*dt);player.knock.x*=Math.exp(-14*dt);player.knock.y*=Math.exp(-14*dt);
    player.trail.forEach(p=>p.life-=dt);player.trail=player.trail.filter(p=>p.life>0);
    flowTimer-=dt;if(flowTimer<=0){rebuildFlow();flowTimer=.28;}
    for(const e of enemies) {
      if(e.dead)continue;e.age+=dt;e.hurt=Math.max(0,e.hurt-dt);move(e,e.knock.x*dt,e.knock.y*dt);e.knock.x*=Math.exp(-13*dt);e.knock.y*=Math.exp(-13*dt);
      if(e.age<.75)continue;
      if(e.type==='warden')bossAI(e,dt);
      else {
        const direction=pursuit(e),d=dist(e,player);
        if(e.type!=='wisp'||d>106)move(e,direction.x*e.speed*dt,direction.y*e.speed*dt);
        if(e.type==='wisp'){e.cool-=dt;if(e.cool<=0&&d<210){fire(e,player);e.cool=2.7;}}
        // Separation keeps packs readable and stops enemies forming one stack.
        for(const other of enemies)if(other!==e&&!other.dead&&other.type!=='warden'){
          const gap=dist(e,other);if(gap<e.r+other.r&&gap>0){const n=norm(e.x-other.x,e.y-other.y);move(e,n.x*15*dt,n.y*15*dt);}
        }
      }
      if(dist(e,player)<e.r+player.r+2)hurt(e);
    }
    enemies=enemies.filter(e=>!e.dead);
    projectiles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(blocked(p.x,p.y,2))p.life=0;if(dist(p,player)<9){hurt(p);p.life=0;}});projectiles=projectiles.filter(p=>p.life>0);
    rings.forEach(r=>{r.r+=r.speed*dt;if(!r.hit&&Math.abs(dist(r,player)-r.r)<9){hurt(r);r.hit=true;}});rings=rings.filter(r=>r.r<r.max);
    for(const p of pickups){p.age+=dt;if(dist(p,player)<15){player.hp=Math.min(6,player.hp+1);p.collected=true;burst(p.x,p.y,'#e9bc84',12);sound('heal');updateHUD();}}
    pickups=pickups.filter(p=>!p.collected&&p.age<40);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-3*dt);p.vy*=Math.exp(-3*dt);p.life-=dt;});particles=particles.filter(p=>p.life>0);
    beacons.forEach(b=>b.pulse=Math.max(0,b.pulse-dt));
    camera.x+=(clamp(player.x-W/2,0,WORLD_W-W)-camera.x)*Math.min(1,dt*7);
    camera.y+=(clamp(player.y-H*(run.level===2?.75:.58),0,WORLD_H-H)-camera.y)*Math.min(1,dt*7);
    $('dash-charge').style.width=`${(1-player.dashCd/1.1)*100}%`;$('dash-label').textContent=player.dashCd>0?'RECOVERING':'DODGE READY';
    const b=beacons.find(b=>!b.lit&&dist(b,player)<35),exit=atTile(...chapters[run.level].exit);
    const nearExit=run.level<2&&beacons.every(b=>b.lit)&&enemies.length===0&&dist(player,exit)<39;
    $('context-prompt').hidden=!(b||nearExit);$('context-prompt').querySelector('span').textContent=nearExit?'Enter the passage':'Light the lantern';
    updateHUD();
  }

  function glow(x,y,r,color,alpha=.5) {
    ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.globalAlpha=alpha;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  function drawSprite(name,x,y,scale=1,flip=false,alpha=1) {
    const s=sprites[name];ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(flip?-scale:scale,scale);ctx.globalAlpha=alpha;ctx.drawImage(s,-Math.floor(s.width/2),-s.height);ctx.restore();
  }
  function shadow(x,y,r=9) {ctx.fillStyle='#0d211b80';ctx.fillRect(Math.round(x-r),Math.round(y-2),r*2,4);ctx.fillRect(Math.round(x-r+2),Math.round(y-3),r*2-4,6);}
  function lantern(b,decorative=false) {
    const {x,y}=b,lit=b.lit||decorative,flame=Math.sin(clock*8+b.id)*.6;
    shadow(x,y,11);paintRect(ctx,x-8,y-3,16,5,'#54614a');paintRect(ctx,x-6,y-5,12,3,'#8b8b66');
    paintRect(ctx,x-3,y-23,6,19,'#394d3b');paintRect(ctx,x-4,y-26,8,4,'#9c9367');paintRect(ctx,x-5,y-20,10,10,'#263b2c');
    paintRect(ctx,x-6,y-22,12,3,'#8e8b62');paintRect(ctx,x-6,y-10,12,2,'#8e8b62');
    paintRect(ctx,x-5,y-19,1,9,'#bbb58a');paintRect(ctx,x+4,y-19,1,9,'#4b6549');
    if(lit) {paintRect(ctx,x-2,y-18+flame,4,7,'#e8b45a');paintRect(ctx,x-1,y-16+flame,2,4,'#fff0b5');paintRect(ctx,x-3,y-12,6,1,'#ba813e');}
    else {paintRect(ctx,x-2,y-16,4,3,'#778369');if(run.mode==='playing'&&dist(b,player)<65){ctx.strokeStyle='#d6b87980';ctx.strokeRect(x-9,y-29,18,33);}}
  }
  function exitDoor() {
    if(run.level===2)return;
    const e=atTile(...chapters[run.level].exit),open=beacons.every(b=>b.lit)&&enemies.length===0;
    paintRect(ctx,e.x-17,e.y-37,34,38,'#1d3027');paintRect(ctx,e.x-21,e.y-31,6,37,'#79816c');paintRect(ctx,e.x+15,e.y-31,6,37,'#6b7964');
    paintRect(ctx,e.x-18,e.y-37,36,7,'#8a9075');paintRect(ctx,e.x-19,e.y+2,38,6,'#63725b');
    if(open) {glow(e.x,e.y-12,48,'#dcb769',.55);paintRect(ctx,e.x-12,e.y-29,24,32,'#615839');paintRect(ctx,e.x-8,e.y-26,16,28,'#a88e56');paintRect(ctx,e.x-3,e.y-24,6,26,'#c2ab6c');}
    else {for(let i=-10;i<=10;i+=5)paintRect(ctx,e.x+i,e.y-27,2,28,'#59705a');paintRect(ctx,e.x-13,e.y-10,26,2,'#819173');paintRect(ctx,e.x-2,e.y-13,4,7,'#b9a35f');}
  }
  function enemyRender(e) {
    shadow(e.x,e.y,e.type==='warden'?24:e.r+2);
    const bob=e.type==='wisp'?Math.sin(clock*3+e.id)*3:Math.sin(clock*5+e.id)*.7;
    const alpha=e.age<.75?clamp(e.age/.75,.1,1):e.hurt>0&&Math.floor(e.hurt*35)%2===0?.45:1;
    drawSprite(e.type,e.x,e.y+bob,e.type==='warden'?2:1,e.x>player.x,alpha);
    if(e.type==='wisp')glow(e.x,e.y-9,24,'#839dbb',.35);
    if(e.type==='warden') {
      glow(e.x,e.y-32,55,e.phase===2?'#deb476':'#aea776',.32);
      if(e.tell>0&&e.attack==='slam') {
        ctx.strokeStyle=`rgba(229,171,83,${.35+Math.sin(clock*16)*.12})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,58+(1-e.tell/1.15)*40,0,TAU);ctx.stroke();
        const d=norm(player.x-e.x,player.y-e.y);paintRect(ctx,e.x+d.x*45,e.y+d.y*45,3,3,'#f7d293');
      } else if(e.tell>0) {ctx.strokeStyle='#d5a46188';ctx.lineWidth=1;for(let k=-2;k<=2;k++){const a=Math.atan2(player.y-e.y,player.x-e.x)+k*.28;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(a)*112,e.y+Math.sin(a)*112);ctx.stroke();}}
    } else if(e.hp<e.maxHp) {paintRect(ctx,e.x-9,e.y-sprites[e.type].height-7,18,2,'#182b23');paintRect(ctx,e.x-9,e.y-sprites[e.type].height-7,18*e.hp/e.maxHp,2,'#bcc288');}
  }
  function playerRender() {
    player.trail.forEach(p=>drawSprite('keeper',p.x,p.y,1,player.aim.x<0,p.life/.16*.22));
    shadow(player.x,player.y,8);const bob=player.dashTime>0?0:Math.hypot(...Object.values(movement()))>.1?Math.sin(player.walk)*1:Math.sin(clock*2)*.35;
    const alpha=player.invuln>0&&run.mode==='playing'&&Math.floor(player.invuln*12)%2===0?.55:1;
    drawSprite('keeper',player.x,player.y+bob,1,player.aim.x<0,alpha);
    const lx=player.x+(player.aim.x<0?-10:10),ly=player.y-10+bob;
    paintRect(ctx,lx-2,ly-1,4,5,'#886d42');paintRect(ctx,lx-1,ly,2,3,'#ffe0a0');
    if(player.swing>0) {
      const aim=Math.atan2(player.aim.y,player.aim.x),p=1-player.swing/.2;
      ctx.save();ctx.translate(player.x,player.y-5);ctx.rotate(aim-.95+p*1.9);
      paintRect(ctx,7,-2,25,3,'#d4e2bd');paintRect(ctx,12,-1,21,1,'#f6edc4');paintRect(ctx,6,-5,2,9,'#d4b76c');
      ctx.strokeStyle='#dae6b6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,30, -.65,.5);ctx.stroke();ctx.restore();
    }
  }
  function guidance() {
    if(run.mode!=='playing'||run.level===2)return;
    const unlit=beacons.filter(b=>!b.lit).sort((a,b)=>dist(a,player)-dist(b,player));
    const target=unlit[0]||(enemies.length?null:atTile(...chapters[run.level].exit));if(!target||dist(target,player)<40)return;
    const dx=target.x-camera.x,dy=target.y-camera.y;
    const x=clamp(dx,20,W-20),y=clamp(dy,22,H-27);
    if(dx>15&&dx<W-15&&dy>20&&dy<H-20) {
      ctx.fillStyle='#d5be7a';const bob=Math.sin(clock*3)*2;ctx.beginPath();ctx.moveTo(x-3,y-37+bob);ctx.lineTo(x+3,y-37+bob);ctx.lineTo(x,y-33+bob);ctx.fill();
    } else {
      const a=Math.atan2(dy-H/2,dx-W/2);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#e4c98a';ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-3);ctx.lineTo(-1,0);ctx.lineTo(-3,3);ctx.fill();ctx.restore();
      ctx.font='7px monospace';ctx.textAlign='center';ctx.fillStyle='#b3c2a2';ctx.fillText(unlit.length?'LIGHT':'PASSAGE',x,y+12);
    }
  }
  function render() {
    ctx.imageSmoothingEnabled=false;ctx.fillStyle='#13261c';ctx.fillRect(0,0,W,H);
    const jitter=reducedMotion?0:shake;
    const cx=Math.round(camera.x)+(jitter?(Math.random()-.5)*jitter:0),cy=Math.round(camera.y)+(jitter?(Math.random()-.5)*jitter:0);
    ctx.save();ctx.translate(-Math.round(cx),-Math.round(cy));ctx.drawImage(background,0,0);
    scenery.filter(s=>s.type!=='tree').forEach(s=> {
      if(s.x<cx-20||s.x>cx+W+20||s.y<cy-20||s.y>cy+H+20)return;
      if(s.type==='grass'){const sway=Math.sin(clock*2+s.x)*.7;paintRect(ctx,s.x-3,s.y-7+sway,1,7,'#82a16a');paintRect(ctx,s.x,s.y-9,1,9,'#5d8556');paintRect(ctx,s.x+3,s.y-5-sway,1,5,'#8b9d61');}
      else {paintRect(ctx,s.x,s.y-4,1,5,'#547c50');paintRect(ctx,s.x-1,s.y-6,3,3,run.level===0?'#d5bb87':'#92ada0');}
    });
    exitDoor();
    rings.forEach(r=>{ctx.strokeStyle='#e2b675';ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke();ctx.strokeStyle='#f0d39b88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(r.x,r.y,r.r-4,0,TAU);ctx.stroke();});
    const actors=[{y:player.y,type:'player'},...beacons.map(b=>({y:b.y,type:'lantern',b})),...enemies.map(e=>({y:e.y,type:'enemy',e})),...scenery.filter(s=>s.type==='tree').map(s=>({y:s.y,type:'tree',s}))].sort((a,b)=>a.y-b.y);
    actors.forEach(a=>a.type==='player'?playerRender():a.type==='lantern'?lantern(a.b):a.type==='tree'?tree(a.s.x,a.s.y,a.s.seed):!a.e.dead&&enemyRender(a.e));
    if(run.level===2)[[9,9],[30,9],[9,19],[30,19]].forEach(([x,y],i)=>lantern({...atTile(x,y),lit:true,id:i},true));
    pickups.forEach(p=>{const y=p.y-5+Math.sin(clock*4+p.x)*2;shadow(p.x,p.y,5);paintRect(ctx,p.x-3,y,2,2,'#e9b388');paintRect(ctx,p.x+1,y,2,2,'#e9b388');paintRect(ctx,p.x-3,y+2,6,2,'#e9b388');paintRect(ctx,p.x-1,y+4,2,2,'#e9b388');});
    projectiles.forEach(p=>{glow(p.x,p.y,13,p.type==='boss'?'#d4a663':'#8daac7',.55);paintRect(ctx,p.x-2,p.y-2,4,4,p.type==='boss'?'#ead391':'#c4d8dc');paintRect(ctx,p.x-1,p.y-1,2,2,'#f4e9b7');});
    particles.forEach(p=>{ctx.globalAlpha=clamp(p.life/.3,0,1);paintRect(ctx,p.x,p.y,p.size,p.size,p.color);});ctx.globalAlpha=1;
    ctx.restore();
    // Soft light sits over the crisp sprite and tile layer.
    const vignette=ctx.createRadialGradient(W/2,H/2,50,W/2,H/2,W*.63);vignette.addColorStop(0,'#0a19140c');vignette.addColorStop(1,'#07150ec0');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    glow(player.x-cx,player.y-cy-10,85,'#d7af65',.2);
    beacons.filter(b=>b.lit).forEach(b=>glow(b.x-cx,b.y-cy-16,75+b.pulse*8,'#d5ac60',.23));
    // Sparse fireflies and drifting dust lend the ruin a little life.
    for(let i=0;i<18;i++) {
      const x=(hash(i,8)*W+Math.sin(clock*.25+i)*12+W)%W,y=(hash(i,12)*H-clock*(1+i%3)*.45+H*20)%H;
      const alpha=.12+Math.max(0,Math.sin(clock*1.5+i))* .35;
      ctx.globalAlpha=alpha;paintRect(ctx,x,y,1,1,i%3===0?'#ead692':'#a3bf9a');
    }ctx.globalAlpha=1;
    guidance();
  }
  function frame(now) {const dt=lastFrame?Math.min((now-lastFrame)/1000,.04):.016;lastFrame=now;update(dt);render();requestAnimationFrame(frame);}

  $('start-button').onclick=startGame;
  $('sound-button').onclick=()=>setSound(!soundOn);
  $('pause-button').onclick=()=>run.mode==='playing'?pause():resume();
  const help=$('help-dialog');let helpWasPlaying=false;
  function openHelp(){helpWasPlaying=run.mode==='playing';if(helpWasPlaying)pause();if(!help.open)help.showModal();}
  function closeHelp(){help.close();}
  $('help-button').onclick=openHelp;$('close-help').onclick=closeHelp;$('help-done').onclick=closeHelp;
  help.addEventListener('close',()=>{if(helpWasPlaying){resume();helpWasPlaying=false;}});
  $('motion-toggle').onchange=e=>{reducedMotion=e.target.checked;};
  // Fullscreen the entire game frame, including touch controls and status.
  $('fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-shell').requestFullscreen();}catch{toast('Fullscreen is not available here. The game still plays in this view.');}};
  document.addEventListener('fullscreenchange',()=>$('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
  const controlCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyJ','ShiftLeft','ShiftRight','KeyK','KeyE','KeyP','Escape']);
  window.addEventListener('keydown',e=> {
    if(help.open)return;
    if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){if(run.mode==='playing'){e.preventDefault();pause();}else if(run.mode==='paused'){e.preventDefault();resume();}return;}
    if(run.mode!=='playing')return;
    if(controlCodes.has(e.code))e.preventDefault();keys.add(e.code);
    if(e.repeat)return;if(e.code==='Space'||e.code==='KeyJ')pending.attack=true;if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyK')pending.dash=true;if(e.code==='KeyE')pending.interact=true;
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{clearInput();pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W+camera.x,y=(e.clientY-r.top)/r.height*H+camera.y;mouseAim={...norm(x-player.x,y-player.y),age:0};if(player.swing<=0)player.aim={x:mouseAim.x,y:mouseAim.y};});
  canvas.addEventListener('pointerdown',e=>{if(run.mode==='playing'&&e.pointerType!=='touch'&&e.button===0){pending.attack=true;canvas.focus({preventScroll:true});}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  let joystickPointer=null;
  function joystickMove(e){const r=$('joystick').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),range=r.width*.35,d=norm(dx,dy);touchMove=length<5?{x:0,y:0}:{x:d.x*Math.min(1,length/range),y:d.y*Math.min(1,length/range)};$('joystick-knob').style.transform=`translate(${touchMove.x*range}px,${touchMove.y*range}px)`;}
  $('joystick').addEventListener('pointerdown',e=>{if(run.mode!=='playing')return;joystickPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joystickMove(e);});
  $('joystick').addEventListener('pointermove',e=>{if(e.pointerId===joystickPointer)joystickMove(e);});
  function releaseJoystick(e){if(e.pointerId!==joystickPointer)return;joystickPointer=null;touchMove={x:0,y:0};$('joystick-knob').style.transform='';}
  $('joystick').addEventListener('pointerup',releaseJoystick);$('joystick').addEventListener('pointercancel',releaseJoystick);$('joystick').addEventListener('lostpointercapture',releaseJoystick);
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();if(run.mode==='playing')pending[b.dataset.action]=true;}));

  makeWorld(0);requestAnimationFrame(frame);
  // A read-only state snapshot is useful when checking gameplay and integrations.
  window.mosslight = Object.freeze({ snapshot:()=>({mode:run.mode,chapter:run.level+1,time:run.time,kills:run.kills,retries:run.deaths,player:{x:player.x,y:player.y,hp:player.hp,invulnerable:player.invuln,dashCooldown:player.dashCd},lanterns:beacons.map(b=>({x:b.x,y:b.y,lit:b.lit})),enemies:enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,type:e.type,phase:e.phase,tell:e.tell,attack:e.attack})),rings:rings.map(r=>({x:r.x,y:r.y,r:r.r})),projectiles:projectiles.length,passage:atTile(...chapters[run.level].exit)}) });
  // Test helpers are restricted to a local development server.
  if(['localhost','127.0.0.1'].includes(location.hostname))window.mosslightTest={
    loadChapter:n=>{makeWorld(n);run.mode='playing';hideOverlay();},
    place:(x,y)=>{if(!blocked(x,y,6)){player.x=x;player.y=y;camera={x:clamp(x-W/2,0,WORLD_W-W),y:clamp(y-H*.58,0,WORLD_H-H)};}},
    clearEnemies:()=>{enemies.forEach(e=>{e.hp=0;kill(e);});enemies=enemies.filter(e=>!e.dead);updateHUD();},
    damage:()=>{player.invuln=0;hurt({x:player.x-10,y:player.y});},
    spawn:(type,x,y)=>spawnEnemy(type,{x,y}),
    map:()=>map.map(row=>row.slice())
  };
})();
