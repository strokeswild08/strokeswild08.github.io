const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();const ctx=new Proxy({},{get:(_,key)=>key.startsWith('create')?()=>({addColorStop(){}}):()=>{},set:()=>true});
function element(id){if(!elements.has(id))elements.set(id,{hidden:false,value:'normal',textContent:'',classList:{add(){},remove(){}},getContext:()=>ctx});return elements.get(id);}
const sandbox={console,Math,Set,document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},requestAnimationFrame(){},setInterval(){}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('engine/core.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('engine/gamepad.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('game.js','utf8'),sandbox);
const run=s=>vm.runInContext(s,sandbox);run('initAudio=()=>{}; begin(); countdown=0; botThink=100; player.x=400; bot.x=500;');
run("attack(player,'punch');updateFighter(player,bot,.12)");assert.equal(run('bot.hp'),93,'punch must hit in range');run('updateFighter(player,bot,.03)');assert.equal(run('bot.hp'),93,'one attack must not hit twice');
run("player.attack=null;bot.stun=0;bot.block=true;bot.hp=100;attack(player,'kick');updateFighter(player,bot,.28)");assert.equal(run('bot.hp'),98,'guard must reduce damage to chip');
run("player.attack=null;player.energy=49");assert.equal(run("attack(player,'special')"),false,'special requires energy');run('player.energy=50;bot.block=false;');assert.equal(run("attack(player,'special')"),true);assert.equal(run('player.energy'),0);
run('updateFighter(player,bot,.3)');assert.equal(run('bot.hp'),74,'special damage');
run('player.attack=null;player.dashCooldown=0;player.stun=0;player.block=false;dash(player,1);updateFighter(player,bot,.1)');assert.ok(run('player.x')>400,'dash must move');
run('player.y=0;player.attack=null;player.stun=0;jump(player);updateFighter(player,bot,.05)');assert.ok(run('player.y')>0,'jump must rise');
run('bot.hp=0;finishRound()');assert.equal(run('wins[0]'),1);run('update(3)');assert.equal(run('round'),2);assert.equal(run('bot.hp'),100);run('countdown=0;bot.hp=0;finishRound();update(3)');assert.equal(run('state'),'result');assert.equal(element('resultTitle').textContent,'VICTORY');
run('begin();countdown=0;togglePause()');assert.equal(run('paused'),true);run('togglePause()');assert.equal(run('paused'),false);run('menu();draw()');assert.equal(run('state'),'menu');
// Long AI simulation must finish without invalid positions, resources, or health.
run('begin();countdown=0;');for(let i=0;i<9000;i++)run('update(1/60); if(state!=="menu") draw();');assert.ok(run('Number.isFinite(player.x)&&Number.isFinite(bot.x)&&player.hp>=0&&bot.hp>=0&&player.energy<=100&&bot.energy<=100'));
// Newly added combat integration checks.
run("begin();countdown=0;player.x=400;bot.x=500;player.block=true;player.parry=.14;attack(bot,'punch');updateFighter(bot,player,.12)");assert.equal(run('player.hp'),100,'perfect parry prevents damage');assert.ok(run('bot.stun')>0);assert.equal(run('matchStats.parries'),1);
run("begin();countdown=0;player.x=400;bot.x=510;bot.hp=100;comboTracker.hit('punch');comboTracker.hit('punch');attack(player,'kick');updateFighter(player,bot,.28)");assert.equal(run('bot.hp'),80,'combo finisher adds damage');assert.ok(run('bot.vy')>0,'finisher launches');
run("begin();countdown=0;player.x=400;bot.x=500;input('KeyJ',true);input('KeyJ',false);player.attackTime=.25;input('KeyK',true);input('KeyK',false);botThink=100;update(.1);update(.02)");assert.equal(run('player.attack'),'kick','buffered kick starts after recovery');
run("begin();countdown=0;input('KeyA',true,'keyboard');input('KeyA',true,'gamepad');input('KeyA',false,'gamepad')");assert.equal(run("keys.has('KeyA')"),true,'gamepad release preserves held keyboard input');
run("$('mode').value='training';begin();countdown=0;bot.hp=0;update(1/60)");assert.equal(run('state'),'fight','training does not end on dummy KO');assert.equal(run('player.energy'),100);for(let i=0;i<110;i++)run('update(1/60)');assert.equal(run('bot.hp'),100,'training dummy resets');assert.equal(run('clock'),90,'training freezes timer');
console.log('PASS: hits, single-hit windows, block, special, dash, jump, round reset, match end, pause, rendering calls, AI simulation');
