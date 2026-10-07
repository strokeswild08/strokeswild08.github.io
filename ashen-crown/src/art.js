// Integer scanlines and Bresenham strokes keep the artwork on a single pixel grid.
export function polygon(c,points,color){c.fillStyle=color;const min=Math.ceil(Math.min(...points.map(p=>p[1]))),max=Math.floor(Math.max(...points.map(p=>p[1])));for(let y=min;y<=max;y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)c.fillRect(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1);}}
export function stroke(c,x0,y0,x1,y1,color,size=1){c.fillStyle=color;x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;while(true){c.fillRect(x0-Math.floor(size/2),y0-Math.floor(size/2),size,size);if(x0===x1&&y0===y1)break;const a=2*e;if(a>=dy){e+=dy;x0+=sx;}if(a<=dx){e+=dx;y0+=sy;}}}
export const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
const frames={idle:4,walk:6,attack:4,hurt:2};
export function createSprites(factory=()=>document.createElement('canvas')){
  const sheets={};for(const kind of ['knight','ranger','mage','raider','guard','boss']){const out=factory();out.width=64*16;out.height=72;const c=out.getContext('2d');let index=0;const clips={};for(const [pose,count]of Object.entries(frames)){clips[pose]={start:index,count};for(let f=0;f<count;f++){c.save();c.translate(index*64,0);drawCharacter(c,kind,pose,f);c.restore();index++;}}sheets[kind]={image:out,clips};}return sheets;
}
function drawCharacter(c,kind,pose,f){
  const boss=kind==='boss',knight=kind==='knight',ranger=kind==='ranger',mage=kind==='mage',guard=kind==='guard',raider=kind==='raider';
  const cloth=knight?'#97524a':ranger?'#617956':mage?'#505269':boss?'#733e47':guard?'#665978':'#814e4e';
  const light=knight?'#c38065':ranger?'#96a473':mage?'#878295':boss?'#a76360':guard?'#9a829e':'#b07362';
  const metal=boss?'#7c8790':'#9ca7a2',dark=boss?'#343f4d':'#536568';
  const bob=pose==='idle'?(f===2?1:0):pose==='walk'?(f%3===1?-1:0):0,step=pose==='walk'?[0,3,4,0,-3,-4][f]:0,lean=pose==='attack'?[0,-2,4,1][f]:pose==='hurt'?-3:0;
  c.save();c.translate(lean,bob);let top=boss?9:14;
  // Mantles sit behind articulated legs; the lower hem follows the gait.
  if(!raider)polygon(c,[[25,top+14],[43,top+15],[48+Math.round(step/2),59],[35,62],[23,59],[21,42]],'#23333c');
  if(!raider)polygon(c,[[26,top+15],[40,top+16],[44+Math.round(step/2),58],[34,59],[26,55],[25,37]],cloth);
  if(!raider){stroke(c,29,35,28+step/2,55,light,2);stroke(c,39,39,42+step/2,56,'#343c40',2);rect(c,32,56,8,1,light);}
  for(const [hip,knee,foot]of [[29,28+step/2,26+step],[37,38-step/2,39-step]]){stroke(c,hip,44,knee,54,'#283740',7);stroke(c,knee,54,foot,64,'#31434b',6);rect(c,foot-3,62,8,5,'#25343b');rect(c,foot-3,63,7,1,knight||boss?'#89978e':'#987b59');if(knight||boss){rect(c,knee-2,51,5,5,metal);rect(c,knee-1,52,3,1,'#d1d0b6');}}
  polygon(c,[[25,29],[39,28],[44,36],[40,46],[26,47],[22,37]],knight||boss?dark:cloth);
  polygon(c,[[26,30],[38,30],[40,36],[37,43],[27,43],[24,36]],knight||boss?metal:light);
  if(knight||boss){rect(c,28,32,10,2,'#c9cbbb');rect(c,27,37,11,1,'#657d7c');rect(c,29,39,7,3,dark);stroke(c,33,31,33,39,'#e0dcc3');rect(c,22,30,8,6,metal);rect(c,37,30,8,6,metal);rect(c,23,30,6,1,'#d7d4bd');rect(c,38,30,5,1,'#d7d4bd');}
  else{rect(c,28,31,3,11,cloth);rect(c,35,33,3,9,cloth);stroke(c,27,31,38,41,'#493f36',3);stroke(c,28,31,38,40,'#b59b68');}
  rect(c,25,44,16,4,'#4b3c33');rect(c,32,44,4,3,'#d2b07a');rect(c,39,44,4,6,'#8f6949');
  const hand=pose==='attack'?[43,40,53,46][f]:44;
  stroke(c,41,34,44,41,knight||boss?dark:cloth,6);stroke(c,44,41,hand,44,knight||boss?metal:'#99714f',5);rect(c,hand-2,42,4,4,'#cfb18a');
  stroke(c,24,34,21,43,knight||boss?metal:cloth,6);rect(c,19,41,4,4,'#c7a47c');
  // Head, neck, hood / helm: a smaller head keeps the full figure grounded.
  rect(c,29,25,7,6,'#b6906c');rect(c,26,top+2,14,14,'#3a403f');rect(c,28,top+5,10,11,raider?'#adb399':'#d2b78e');rect(c,31,top+14,5,3,'#9d7f5f');rect(c,34,top+9,2,2,'#26363c');rect(c,36,top+13,3,1,'#815f48');
  if(knight||boss){polygon(c,[[25,top+3],[27,top],[37,top],[41,top+4],[40,top+10],[25,top+10]],metal);rect(c,28,top+1,8,1,'#dbdcc7');rect(c,25,top+9,16,3,dark);rect(c,28,top+10,9,1,boss?'#dd9776':'#c5c3a7');rect(c,25,top+12,3,6,metal);if(boss){polygon(c,[[25,top+4],[21,top],[21,top-5],[28,top+2]],'#d1b27c');polygon(c,[[39,top+3],[43,top-5],[44,top],[42,top+5]],'#d1b27c');rect(c,32,top+2,3,5,'#c5a473');}else{rect(c,29,top-4,3,5,cloth);rect(c,31,top-3,5,2,light);}}
  if(ranger||mage||guard){polygon(c,[[25,top+6],[27,top],[36,top-1],[41,top+4],[41,top+16],[37,top+18],[37,top+7],[28,top+7],[27,top+18],[24,top+15]],cloth);stroke(c,28,top+2,36,top+1,light,2);rect(c,27,top+7,10,2,'#293e3c');rect(c,29,top+9,8,5,'#d0b78d');rect(c,35,top+10,1,2,'#2d393a');}
  if(raider){rect(c,27,top+1,11,3,'#69604a');rect(c,24,top+7,5,8,'#8b9c81');rect(c,39,top+8,3,5,'#7c906f');rect(c,28,top+12,10,3,'#384c48');rect(c,29,top+12,8,1,'#d7d0a8');}
  rect(c,26,29,13,3,cloth);rect(c,27,29,9,1,light);
  if(knight){polygon(c,[[17,36],[26,33],[30,36],[28,51],[22,56],[16,51]],'#394e56');polygon(c,[[18,37],[26,35],[28,37],[26,50],[22,53],[18,49]],'#a09f83');rect(c,20,38,3,11,'#687f77');rect(c,18,38,9,1,'#d4ccaa');stroke(c,19,47,24,43,'#d4c799',2);}
  if(knight||boss||raider){const end=pose==='attack'?(f===1?{x:34,y:8}:f===2?{x:62,y:31}:{x:49,y:18}):{x:49,y:20};stroke(c,hand,43,end.x,end.y,'#263640',boss?7:5);stroke(c,hand,43,end.x,end.y,metal,boss?5:3);stroke(c,hand+1,42,end.x+1,end.y,'#d7d9c6');stroke(c,hand-4,43,hand+4,45,'#c7a56c',3);rect(c,hand-1,45,3,5,'#684e3d');}
  if(ranger){const bow=hand+3;stroke(c,bow,24,bow+4,30,'#bda577',3);stroke(c,bow+4,30,bow+5,43,'#876747',3);stroke(c,bow+5,43,bow,51,'#c8aa75',3);stroke(c,bow,24,bow,51,'#d7d8b4');stroke(c,bow-9,38,bow+8,38,'#dad4b2');rect(c,19,26,4,13,'#725940');for(const x of [18,21,24]){stroke(c,x,28,x-3,18,'#bfa67a');rect(c,x-4,17,2,4,'#d2d5c2');}}
  if(mage){stroke(c,hand+4,23,hand+4,65,'#614d40',3);stroke(c,hand+3,26,hand+3,61,'#ab8860');polygon(c,[[hand+4,13],[hand+9,20],[hand+4,27],[hand-1,20]],'#eaa76c');rect(c,hand+3,17,3,6,'#ffe5ae');rect(c,hand+1,27,6,2,'#c6b27e');rect(c,28,37,8,2,'#d3a475');}
  if(guard){stroke(c,hand-9,40,hand+8,38,'#b9976e',4);stroke(c,hand+2,32,hand+3,47,'#a19b89',3);stroke(c,hand-2,34,hand+7,44,'#ded7b6');rect(c,hand-1,38,6,3,'#3b4349');}
  c.restore();
}
export function drawPortrait(canvas,sprites,kind){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;c.fillStyle='#263742';c.fillRect(0,0,canvas.width,canvas.height);const s=sprites[kind];c.drawImage(s.image,16,0,40,49,0,0,canvas.width,canvas.height);}
export function drawTile(c,t,x,y,time){
  const h=12+t.height*17,stone=['stone','path','cracked'].includes(t.terrain),base=t.terrain==='rim'?'#344a43':stone?'#73817b':'#617b52';
  polygon(c,[[x-32,y],[x,y+16],[x,y+16+h],[x-32,y+h]],stone?'#3e5659':'#364e42');
  polygon(c,[[x,y+16],[x+32,y],[x+32,y+h],[x,y+16+h]],stone?'#4b6260':'#415b48');
  polygon(c,[[x,y-16],[x+32,y],[x,y+16],[x-32,y]],base);
  stroke(c,x-31,y,x,y+15,stone?'#899087':'#748d5b');stroke(c,x,y+15,x+31,y,'#2b453d');
  for(let i=0;i<14;i++){const dx=((i*17+t.x*7)%49)-24,dy=((i*7+t.y*3)%23)-11;if(Math.abs(dx)/32+Math.abs(dy)/16<.8)rect(c,x+dx,y+dy,i%3===0?2:1,1,stone?'#a2aa90':'#879b67');}
  if(stone){stroke(c,x-14,y-7,x+14,y+7,'#465f5c');stroke(c,x+4,y-9,x-15,y+1,'#526961');stroke(c,x+16,y+1,x+3,y+8,'#a0a491');}
  if(t.terrain==='cracked'){stroke(c,x-14,y,x-2,y+2,'#2e4a43',2);stroke(c,x-2,y+2,x+4,y-2,'#314c45',2);stroke(c,x+4,y-2,x+9,y+5,'#314c45');}
  if(t.prop==='stairs'){for(let i=0;i<4;i++){polygon(c,[[x-24,y-8+i*4],[x,y-20+i*4],[x+24,y-8+i*4],[x,y+4+i*4]],i%2?'#afb299':'#818e84');stroke(c,x-23,y-7+i*4,x,y+5+i*4,'#4b6460');}}
}
export function drawProp(c,t,x,y,time){const p=t.prop;if(!p||p==='stairs')return;
  if(p==='wall'||p==='ruin'){const h=p==='ruin'?20:32;polygon(c,[[x-25,y-8],[x+3,y-22],[x+27,y-9],[x,y+5]],'#a3aa98');polygon(c,[[x-25,y-8],[x,y+5],[x,y+5-h],[x-25,y-8-h]],'#607774');polygon(c,[[x,y+5],[x+27,y-9],[x+27,y-9-h],[x,y+5-h]],'#7f9385');polygon(c,[[x-25,y-8-h],[x+3,y-22-h],[x+27,y-9-h],[x,y+5-h]],'#b1b79e');stroke(c,x,y+4-h,x+26,y-9-h,'#d2cfb1');for(let i=1;i<3;i++){stroke(c,x+1,y+5-h+i*10,x+25,y-8-h+i*10,'#4b6864');stroke(c,x-24,y-8-h+i*10,x-1,y+4-h+i*10,'#405e5b');}rect(c,x+10,y-22,9,3,'#7e965e');rect(c,x+16,y-21,3,7,'#4e714e');if(p==='wall')rect(c,x-15,y-h-10,7,5,'#536e65');}
  if(p==='pillar'){polygon(c,[[x-15,y],[x,y+8],[x+15,y],[x,y-8]],'#6a8278');rect(c,x-8,y-47,16,49,'#7f9386');rect(c,x-7,y-45,4,46,'#acb29b');rect(c,x+5,y-46,3,47,'#536f68');polygon(c,[[x-12,y-48],[x,y-54],[x+13,y-48],[x,y-41]],'#c2c4a9');rect(c,x-12,y-46,24,4,'#9caa93');rect(c,x-12,y-7,25,5,'#9aab96');stroke(c,x+2,y-41,x-2,y-25,'#526c66');}
  if(p==='crate'){polygon(c,[[x-15,y-24],[x,y-32],[x+15,y-24],[x,y-17]],'#bb9767');polygon(c,[[x-15,y-24],[x,y-17],[x,y+4],[x-15,y-3]],'#7c624b');polygon(c,[[x,y-17],[x+15,y-24],[x+15,y-3],[x,y+4]],'#a38159');stroke(c,x+2,y-16,x+13,y-21,'#d2b785',2);stroke(c,x+2,y+1,x+12,y-20,'#d1ad79',3);stroke(c,x-13,y-21,x-2,y,'#bba074',2);}
  if(p==='bush'){polygon(c,[[x-19,y],[x-14,y-12],[x-2,y-19],[x+14,y-13],[x+21,y-3],[x+10,y+5],[x-9,y+5]],'#304e41');polygon(c,[[x-15,y-4],[x-10,y-14],[x+1,y-16],[x+13,y-11],[x+16,y-5],[x-2,y+1]],'#54754f');rect(c,x-7,y-12,5,2,'#80975d');rect(c,x+10,y-8,4,1,'#91a16c');}
  if(p==='torch'){rect(c,x-2,y-32,4,35,'#5e5545');rect(c,x-6,y-31,12,4,'#a59d74');const b=Math.floor(time*8)%3;polygon(c,[[x-5,y-34],[x-7,y-42-b],[x-2,y-40],[x+1,y-52+b],[x+6,y-43],[x+4,y-33]],'#db8f59');polygon(c,[[x-2,y-34],[x-2,y-41],[x+1,y-46],[x+3,y-40],[x+2,y-34]],'#f6d895');}
  if(p==='banner'){rect(c,x-2,y-63,3,67,'#897b61');stroke(c,x-3,y-62,x+22,y-62,'#c8b58a',2);const a=Math.round(Math.sin(time*2)*2);polygon(c,[[x+2,y-60],[x+23,y-60],[x+21+a,y-33],[x+13,y-28],[x+4+a,y-34]],'#974e4b');stroke(c,x+7,y-57,x+9,y-39,'#cb8b68');rect(c,x+12,y-51,6,8,'#d4b47b');}
}
export const iconPaths={sword:'M5 20l4-4m-3-3 5 5m-3-4L18 4l2 2-10 10',shield:'M12 3l8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z M12 7v9',guard:'M12 3l8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z M8 12l3 3 5-6',arrow:'M4 20L20 4M13 4h7v7M4 14v6h6',boot:'M8 3h7v10l5 3v5H5v-5l3-3z',fire:'M13 2c2 6 7 7 7 12a8 8 0 01-16 0c0-4 2-6 4-8 0 4 2 5 3 3z',ember:'M12 3l8 4v6c0 4-4 7-8 8-4-1-8-4-8-8V7z M12 8l3 5-3 3-3-3z',move:'M4 12h16m-4-4 4 4-4 4M8 8l-4 4 4 4',wait:'M12 4v8l5 3M21 12a9 9 0 11-18 0 9 9 0 0118 0',crown:'M3 7l5 4 4-7 4 7 5-4-2 12H5z'};
export function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPaths[name]||iconPaths.crown}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
