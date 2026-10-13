/* Seeded BSP layout, graph connections, pathfinding and exploration state. */
(function(root){
'use strict';
const SIZES={small:[48,32],medium:[64,40],large:[80,48]};
function rng(seed){let state=2166136261;for(const c of String(seed)){state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;}return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function normalise(settings={}){
 const seed=String(settings.seed??'OWAIS-27').trim();
 if(!seed||seed.length>48)throw new Error('Seed must contain 1–48 characters.');
 const size=settings.size??'medium',rooms=settings.rooms??12,loops=settings.loops??.5;
 if(!Object.hasOwn(SIZES,size)||!Number.isInteger(rooms)||rooms<6||rooms>18||!Number.isFinite(loops)||loops<0||loops>1)throw new Error('Invalid generation settings.');
 return {seed,size,rooms,loops};
}
function index(map,x,y){return y*map.width+x;}
function walkable(map,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<map.width&&y<map.height&&map.tiles[index(map,x,y)]===1;}
function flood(map,start){
 const dist=new Int32Array(map.tiles.length);dist.fill(-1);
 if(!walkable(map,start.x,start.y))return dist;
 const queue=[index(map,start.x,start.y)];dist[queue[0]]=0;
 for(let head=0;head<queue.length;head++){
  const i=queue[head],x=i%map.width,y=Math.floor(i/map.width);
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
   const nx=x+dx,ny=y+dy,j=index(map,nx,ny);
   if(walkable(map,nx,ny)&&dist[j]<0){dist[j]=dist[i]+1;queue.push(j);}
  }
 }
 return dist;
}
function path(map,start,end){
 if(!walkable(map,start.x,start.y)||!walkable(map,end.x,end.y))return [];
 const dist=flood(map,end);if(dist[index(map,start.x,start.y)]<0)return [];
 const route=[{...start}];let current=start;
 while(current.x!==end.x||current.y!==end.y){
  const value=dist[index(map,current.x,current.y)];let next;
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const x=current.x+dx,y=current.y+dy;if(walkable(map,x,y)&&dist[index(map,x,y)]===value-1){next={x,y};break;}}
  if(!next)return [];route.push(next);current=next;
 }
 return route;
}
function generate(input={}){
 const settings=normalise(input),rand=rng(settings.seed),[width,height]=SIZES[settings.size],tiles=new Array(width*height).fill(0);
 const leaves=[{x:1,y:1,w:width-2,h:height-2}];
 while(leaves.length<settings.rooms){
  const candidates=leaves.map((leaf,i)=>({leaf,i})).filter(({leaf})=>leaf.w>=16||leaf.h>=16).sort((a,b)=>b.leaf.w*b.leaf.h-a.leaf.w*a.leaf.h||a.i-b.i);
  if(!candidates.length)break;
  const {leaf,i}=candidates[0];let vertical=leaf.w>leaf.h*1.15?true:leaf.h>leaf.w*1.15?false:rand()<.5;
  if(leaf.w<16)vertical=false;if(leaf.h<16)vertical=true;
  const length=vertical?leaf.w:leaf.h,split=8+Math.floor(rand()*(length-15));
  const a={...leaf},b={...leaf};if(vertical){a.w=split;b.x+=split;b.w-=split;}else{a.h=split;b.y+=split;b.h-=split;}
  leaves.splice(i,1,a,b);
 }
 const rooms=leaves.map((leaf,id)=>{
  const w=4+Math.floor(rand()*(leaf.w-5)),h=4+Math.floor(rand()*(leaf.h-5));
  const x=leaf.x+1+Math.floor(rand()*(leaf.w-w-1)),y=leaf.y+1+Math.floor(rand()*(leaf.h-h-1));
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy*width+xx]=1;
  return {id,x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)};
 });
 const edges=[],connected=new Set([0]),edgeSet=new Set();
 function connect(a,b,loop=false){
  edges.push({a:a.id,b:b.id,loop});edgeSet.add([Math.min(a.id,b.id),Math.max(a.id,b.id)].join(':'));
  let x=a.cx,y=a.cy;const horizontalFirst=rand()<.5;
  const goX=()=>{while(x!==b.cx){tiles[y*width+x]=1;x+=Math.sign(b.cx-x);}tiles[y*width+x]=1;};
  const goY=()=>{while(y!==b.cy){tiles[y*width+x]=1;y+=Math.sign(b.cy-y);}tiles[y*width+x]=1;};
  if(horizontalFirst){goX();goY();}else{goY();goX();}
 }
 while(connected.size<rooms.length){
  let best=null;
  for(const a of rooms.filter(r=>connected.has(r.id)))for(const b of rooms.filter(r=>!connected.has(r.id))){
   const cost=Math.abs(a.cx-b.cx)+Math.abs(a.cy-b.cy);if(!best||cost<best.cost)best={a,b,cost};
  }
  connect(best.a,best.b);connected.add(best.b.id);
 }
 let loops=Math.round(rooms.length*.4*settings.loops);
 const extra=[];for(let a=0;a<rooms.length;a++)for(let b=a+1;b<rooms.length;b++)if(!edgeSet.has(a+':'+b))extra.push([a,b]);
 while(loops--&&extra.length){const [a,b]=extra.splice(Math.floor(rand()*extra.length),1)[0];connect(rooms[a],rooms[b],true);}
 const spawn={x:rooms[0].cx,y:rooms[0].cy},map={version:1,settings,width,height,tiles,rooms,edges,spawn,exit:null,items:[]};
 const dist=flood(map,spawn);let far=index(map,spawn.x,spawn.y);
 for(let i=0;i<dist.length;i++)if(dist[i]>dist[far])far=i;
 map.exit={x:far%width,y:Math.floor(far/width)};
 const occupied=new Set([index(map,spawn.x,spawn.y),far]);
 const candidates=rooms.map(r=>({x:r.cx,y:r.cy})).filter(p=>!occupied.has(index(map,p.x,p.y))).sort((a,b)=>dist[index(map,b.x,b.y)]-dist[index(map,a.x,a.y)]);
 const key=candidates.shift();map.items.push({id:'brass_key',kind:'key',...key});occupied.add(index(map,key.x,key.y));
 const relicCount=Math.min(5,candidates.length);
 for(let i=0;i<relicCount;i++){const point=candidates.splice(Math.floor(rand()*candidates.length),1)[0];map.items.push({id:'relic_'+i,kind:'relic',...point});}
 return map;
}
function canStand(map,x,y,radius=.22){
 return Number.isFinite(x)&&Number.isFinite(y)&&[[x-radius,y-radius],[x+radius,y-radius],[x-radius,y+radius],[x+radius,y+radius]].every(([a,b])=>walkable(map,Math.floor(a),Math.floor(b)));
}
function move(map,player,dx,dy){
 if(![dx,dy].every(Number.isFinite)||Math.abs(dx)>.4||Math.abs(dy)>.4)throw new Error('Movement step is too large.');
 let x=player.x,y=player.y;if(canStand(map,x+dx,y))x+=dx;if(canStand(map,x,y+dy))y+=dy;return {x,y};
}
function lineVisible(map,x0,y0,x1,y1){
 const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
 while(true){if(x0===x1&&y0===y1)return true;if(!walkable(map,x0,y0))return false;const e=2*error;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}
}
function visible(map,player,radius=7){
 const x=Math.floor(player.x),y=Math.floor(player.y),result=new Set();
 for(let yy=Math.max(0,y-radius);yy<=Math.min(map.height-1,y+radius);yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(map.width-1,x+radius);xx++)if((xx-x)**2+(yy-y)**2<=radius**2&&lineVisible(map,x,y,xx,yy))result.add(index(map,xx,yy));
 return result;
}
function createState(map){return {player:{x:map.spawn.x+.5,y:map.spawn.y+.5},collected:new Set(),seen:new Set(),won:false};}
function collect(map,state){
 const x=Math.floor(state.player.x),y=Math.floor(state.player.y),found=[];
 for(const item of map.items)if(item.x===x&&item.y===y&&!state.collected.has(item.id)){state.collected.add(item.id);found.push(item);}
 if(x===map.exit.x&&y===map.exit.y&&state.collected.size===map.items.length)state.won=true;
 return found;
}
function snapshot(map,state){return {version:1,settings:map.settings,player:state.player,collected:[...state.collected],seen:[...state.seen],won:state.won};}
function restore(data){
 if(!data||data.version!==1)throw new Error('Unsupported save version.');
 const map=generate(data.settings),state=createState(map);
 if(!data.player||!canStand(map,data.player.x,data.player.y))throw new Error('Saved player position is invalid.');
 if(!Array.isArray(data.collected)||new Set(data.collected).size!==data.collected.length||data.collected.some(id=>!map.items.some(item=>item.id===id)))throw new Error('Invalid saved items.');
 if(!Array.isArray(data.seen)||data.seen.length>map.tiles.length||new Set(data.seen).size!==data.seen.length||data.seen.some(i=>!Number.isInteger(i)||i<0||i>=map.tiles.length))throw new Error('Invalid explored map.');
 if(typeof data.won!=='boolean'||data.won&&(data.collected.length!==map.items.length||Math.floor(data.player.x)!==map.exit.x||Math.floor(data.player.y)!==map.exit.y))throw new Error('Invalid saved completion state.');
 state.player={...data.player};state.collected=new Set(data.collected);state.seen=new Set(data.seen);state.won=data.won;return {map,state};
}
const api={SIZES,rng,normalise,generate,index,walkable,flood,path,canStand,move,visible,createState,collect,snapshot,restore};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Dungeon=api;
})(typeof globalThis!=='undefined'?globalThis:this);
