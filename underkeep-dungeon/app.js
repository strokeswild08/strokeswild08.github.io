'use strict';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),T=20,SAVE_KEY='wild-strokes-underkeep-v1';
let map,state,base,visible=new Set(),route=[],held=new Set(),lastTime=0,time=0,lastTile='',generationTime=0,view={scale:1,x:0,y:0},distanceField;
const message=text=>$('status').textContent=text;
const safeStore={set(value){try{localStorage.setItem(SAVE_KEY,JSON.stringify(value));return true;}catch{return false;}},get(){try{return localStorage.getItem(SAVE_KEY);}catch{return null;}}};
function options(){return {seed:$('seed').value,size:$('size').value,rooms:Number($('rooms').value),loops:Number($('loops').value)};}
function apply(settings){for(const id of ['seed','size','rooms','loops'])$(id).value=String(settings[id]);labels();}
function labels(){$('roomsValue').textContent=$('rooms').value;$('loopsValue').textContent=['Few','Light','Balanced','Many','Winding'][Math.round(Number($('loops').value)*4)];}
function noise(x,y){return (((x*73856093)^(y*19349663))>>>0)%100/100;}
function rect(c,x,y,w,h,colour){c.fillStyle=colour;c.fillRect(x,y,w,h);}
function buildBase(){
 base=document.createElement('canvas');base.width=map.width*T;base.height=map.height*T;const c=base.getContext('2d');c.imageSmoothingEnabled=false;
 rect(c,0,0,base.width,base.height,'#122120');
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const X=x*T,Y=y*T,n=noise(x,y);
  if(Dungeon.walkable(map,x,y)){
   rect(c,X,Y,T,T,n>.5?'#3b4740':'#36443c');rect(c,X+1,Y+1,T-2,1,'#62705a44');rect(c,X+1,Y+T-2,T-2,1,'#243930');
   if(n>.72){rect(c,X+5,Y+8,6,1,'#253b31');rect(c,X+10,Y+9,1,4,'#253b31');}
   if(n<.15){rect(c,X+3,Y+3,2,1,'#9fa17722');rect(c,X+12,Y+13,2,1,'#9fa17722');}
  }else{
   const neighbour=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>Dungeon.walkable(map,x+a,y+b));
   if(neighbour){rect(c,X,Y,T,T,'#263b37');rect(c,X+1,Y+2,T-2,7,n>.5?'#607261':'#576d5b');rect(c,X+2,Y+3,T-4,1,'#8a967222');rect(c,X+1,Y+11,8,6,'#40584b');rect(c,X+11,Y+11,8,6,'#4b6051');rect(c,X,Y+T-2,T,2,'#132621');}
   else if(n>.55){rect(c,X+2,Y+5,12,2,'#253a3022');}
  }
 }
 for(const room of map.rooms){
  const x=room.x*T,y=room.y*T,w=room.w*T,h=room.h*T;
  if(room.id%3===1&&room.w>=5&&room.h>=5){rect(c,x+22,y+22,w-44,h-44,'#6b4a3c');rect(c,x+24,y+24,w-48,h-48,'#80573c');rect(c,x+27,y+27,w-54,h-54,'#63503c');}
  // Decorative shelves hug walls; they do not block walkable tiles.
  if(room.w>=6){rect(c,x+10,y+4,35,7,'#92724a');rect(c,x+11,y+4,33,2,'#b29662');for(let i=0;i<6;i++)rect(c,x+13+i*5,y+2,3,6,['#8d6254','#7a8763','#b49758'][i%3]);}
  const tx=x+w-9,ty=y+12;const g=c.createRadialGradient(tx,ty,0,tx,ty,65);g.addColorStop(0,'#caa45730');g.addColorStop(1,'#caa45700');c.fillStyle=g;c.fillRect(tx-65,ty-65,130,130);rect(c,tx-2,ty+2,4,8,'#92734a');rect(c,tx-2,ty-4,4,6,'#e4b665');rect(c,tx-1,ty-6,2,5,'#f2ddb0');
 }
}
function reveal(){const key=Math.floor(state.player.x)+':'+Math.floor(state.player.y);if(key===lastTile)return;lastTile=key;visible=Dungeon.visible(map,state.player);for(const i of visible)state.seen.add(i);hud();}
function hud(){
 const relics=map.items.filter(i=>i.kind==='relic'),count=relics.filter(i=>state.collected.has(i.id)).length;
 $('keyStatus').textContent=state.collected.has('brass_key')?'Found':'Missing';$('relicStatus').textContent=count+' / '+relics.length;
 $('progressBar').style.width=(100*state.collected.size/map.items.length)+'%';
 $('questStatus').textContent=state.won?'Expedition complete.':state.collected.size===map.items.length?'The gate is open. Find your way out.':'Recover the key and every lost relic.';
 $('victory').hidden=!state.won;
 const floors=map.tiles.reduce((n,t)=>n+t,0),seenFloors=[...state.seen].filter(i=>map.tiles[i]).length;
 $('exploredStat').textContent=Math.round(100*seenFloors/floors)+'%';
 const d=distanceField[Dungeon.index(map,Math.floor(state.player.x),Math.floor(state.player.y))];$('distanceStat').textContent=d+' steps';
}
function install(next,nextState){map=next;state=nextState||Dungeon.createState(map);route=[];held.clear();lastTile='';distanceField=Dungeon.flood(map,map.exit);buildBase();reveal();
 $('mapSeed').textContent=map.settings.seed;$('mapSize').textContent=map.width+' × '+map.height;$('roomStat').textContent=map.rooms.length;$('timeStat').textContent=generationTime.toFixed(1)+' ms';hud();canvas.focus({preventScroll:true});}
function generate(){try{const start=performance.now(),next=Dungeon.generate(options());generationTime=performance.now()-start;install(next);message('New expedition drawn. Find the key, collect every relic, then reach the gate.');}catch(e){message(e.message);}}
function randomise(){const array=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(array);else array[0]=Math.floor(Math.random()*4294967296);$('seed').value='KEEP-'+array[0].toString(36).toUpperCase();generate();}
function update(dt){
 if(state.won)return;
 let dx=0,dy=0;if(held.has('KeyA')||held.has('ArrowLeft'))dx--;if(held.has('KeyD')||held.has('ArrowRight'))dx++;if(held.has('KeyW')||held.has('ArrowUp'))dy--;if(held.has('KeyS')||held.has('ArrowDown'))dy++;
 if(dx||dy){route=[];const length=Math.hypot(dx,dy);dx/=length;dy/=length;}
 else if(route.length){const p=route[0],x=p.x+.5-state.player.x,y=p.y+.5-state.player.y,length=Math.hypot(x,y);if(length<.035){state.player={x:p.x+.5,y:p.y+.5};route.shift();}else{const step=Math.min(length,dt*5);dx=x/length*step/(dt*5||1);dy=y/length*step/(dt*5||1);}}
 if(dx||dy){const before=state.player;state.player=Dungeon.move(map,state.player,dx*dt*5,dy*dt*5);if(route.length&&Math.hypot(state.player.x-before.x,state.player.y-before.y)<.0001)route=[];}
 const found=Dungeon.collect(map,state);if(found.length){hud();message(found[0].kind==='key'?'Brass key recovered. Collect the remaining relics.':'Lost relic recovered. '+state.collected.size+' / '+map.items.length+' objectives found.');}
 if(state.won){held.clear();route=[];hud();message('Expedition complete. Export your map or draw another.');}reveal();
}
function geometry(full=false){const scale=Math.min((960-48)/(map.width*T),(640-48)/(map.height*T))*(full?1:Number($('zoom').value));
 const width=map.width*T*scale,height=map.height*T*scale;
 let x=(960-width)/2,y=(640-height)/2;
 if(!full&&Number($('zoom').value)>1){if(width>912)x=Math.max(960-width-24,Math.min(24,480-state.player.x*T*scale));if(height>592)y=Math.max(640-height-24,Math.min(24,320-state.player.y*T*scale));}
 return {scale,x,y};
}
function diamond(c,x,y,colour){c.fillStyle=colour;c.beginPath();c.moveTo(x,y-5);c.lineTo(x+4,y);c.lineTo(x,y+5);c.lineTo(x-4,y);c.closePath();c.fill();rect(c,x-1,y-3,2,2,'#f4efc5');}
function markers(c,full=false){
 const exit=map.exit,X=exit.x*T,Y=exit.y*T,unlocked=state.collected.size===map.items.length;
 rect(c,X+3,Y+3,14,15,'#202e36');rect(c,X+4,Y+2,12,3,unlocked?'#a4cdb1':'#9995bc');rect(c,X+3,Y+5,3,12,'#727b87');rect(c,X+14,Y+5,3,12,'#727b87');rect(c,X+6,Y+6,8,10,unlocked?'#8bd4b9':'#4d536e');rect(c,X+8,Y+8,4,6,unlocked?'#c8ecb5':'#9c88b4');
 for(const item of map.items){if(!full&&state.collected.has(item.id))continue;const x=(item.x+.5)*T,y=(item.y+.5)*T;
  if(item.kind==='key'){c.strokeStyle='#d9b768';c.lineWidth=2;c.beginPath();c.arc(x-3,y-2,3,0,Math.PI*2);c.stroke();rect(c,x,y-2,7,2,'#d9b768');rect(c,x+5,y-2,2,5,'#d9b768');}
  else{rect(c,x-7,y+5,14,2,'#1f342e');diamond(c,x,y,full?'#7dc4ad':Math.sin(time*3+item.x)>.1?'#b3dfb4':'#7dbba2');}
 }
 const sx=(map.spawn.x+.5)*T,sy=(map.spawn.y+.5)*T;c.strokeStyle='#a59d71';c.lineWidth=1;c.beginPath();c.arc(sx,sy,6,0,Math.PI*2);c.stroke();
}
function player(c){const x=state.player.x*T,y=state.player.y*T,bob=(held.size||route.length)?Math.sin(time*14):0;
 c.fillStyle='#112622';c.beginPath();c.ellipse(x,y+6,7,3,0,0,Math.PI*2);c.fill();rect(c,x-4,y-2+bob,8,7,'#b68e56');rect(c,x-3,y-7+bob,6,5,'#eccb92');rect(c,x-4,y-8+bob,8,2,'#584933');rect(c,x-5,y-1+bob,4,6,'#d6ab5e');rect(c,x+1,y-5+bob,1,1,'#3d3a2a');rect(c,x-3,y+5,2,3,'#3d3930');rect(c,x+2,y+5,2,3,'#3d3930');rect(c,x+5,y,2,4,'#e1b45b');
}
function render(c,full=false){
 c.imageSmoothingEnabled=false;rect(c,0,0,960,640,'#10201e');const g=geometry(full);if(!full)view=g;
 c.save();c.translate(g.x,g.y);c.scale(g.scale,g.scale);c.drawImage(base,0,0);markers(c,full);
 if(!full){
  if($('fog').checked){for(let i=0;i<map.tiles.length;i++)if(!visible.has(i)){const x=(i%map.width)*T,y=Math.floor(i/map.width)*T;rect(c,x,y,T,T,state.seen.has(i)?'#0c1919bb':'#10201e');}}
  if(route.length){c.strokeStyle='#ccb07488';c.lineWidth=1.5;c.setLineDash([3,4]);c.beginPath();c.moveTo(state.player.x*T,state.player.y*T);for(const p of route)c.lineTo((p.x+.5)*T,(p.y+.5)*T);c.stroke();c.setLineDash([]);}
  player(c);
 }
 c.restore();
 c.strokeStyle='#74816b44';c.lineWidth=1;c.strokeRect(14,14,932,612);
 for(const [x,y,sx,sy] of [[14,14,1,1],[946,14,-1,1],[14,626,1,-1],[946,626,-1,-1]]){c.strokeStyle='#b6ab7955';c.beginPath();c.moveTo(x+sx*16,y);c.lineTo(x,y);c.lineTo(x,y+sy*16);c.stroke();}
}
function loop(now){const dt=lastTime?Math.min((now-lastTime)/1000,.04):0;lastTime=now;if(!document.hidden){time+=dt;update(dt);render(ctx);}requestAnimationFrame(loop);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('generate').onclick=generate;$('random').onclick=$('next').onclick=randomise;$('restart').onclick=()=>{install(map);message('Expedition restarted with the same map.');};
$('rooms').oninput=$('loops').oninput=labels;
$('save').onclick=()=>message(safeStore.set(Dungeon.snapshot(map,state))?'Checkpoint saved in this browser.':'Browser storage is unavailable. Map exports still work.');
$('load').onclick=()=>{try{const raw=safeStore.get();if(!raw)throw new Error('No checkpoint saved in this browser yet.');if(raw.length>200000)throw new Error('Checkpoint is too large.');const restored=Dungeon.restore(JSON.parse(raw));apply(restored.map.settings);install(restored.map,restored.state);message('Checkpoint loaded.');}catch(e){message('Could not load: '+e.message);}};
$('json').onclick=()=>{download(new Blob([JSON.stringify(map,null,2)],{type:'application/json'}),'underkeep-map.json');message('Complete map JSON exported, including rooms, corridors and objectives.');};
$('png').onclick=()=>{const exportCanvas=document.createElement('canvas');exportCanvas.width=960;exportCanvas.height=640;render(exportCanvas.getContext('2d'),true);exportCanvas.toBlob(blob=>{if(blob){download(blob,'underkeep-map.png');message('Complete map PNG exported without fog or the explorer.');}else message('PNG export failed.');},'image/png');};
canvas.onclick=e=>{if(state.won)return;const r=canvas.getBoundingClientRect(),x=Math.floor(((e.clientX-r.left)*960/r.width-view.x)/(view.scale*T)),y=Math.floor(((e.clientY-r.top)*640/r.height-view.y)/(view.scale*T));
 if(!Dungeon.walkable(map,x,y))return message('Choose a floor tile to walk there.');const i=Dungeon.index(map,x,y);
 if($('fog').checked&&!state.seen.has(i))return message('That place is still unknown. Explore towards it first.');
 const known=$('fog').checked?{...map,tiles:map.tiles.map((v,i)=>state.seen.has(i)?v:0)}:map;
 const start={x:Math.floor(state.player.x),y:Math.floor(state.player.y)},p=Dungeon.path(known,start,{x,y});
 if(!p.length)return message('No explored route reaches that tile yet.');route=p;canvas.focus({preventScroll:true});message('Following the marked route. WASD / arrows cancel it.');
};
const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
document.addEventListener('keydown',e=>{if(movement.has(e.code)&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)){e.preventDefault();held.add(e.code);}});
document.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>{held.clear();route=[];});document.addEventListener('visibilitychange',()=>{held.clear();lastTime=0;});
labels();generate();requestAnimationFrame(loop);
