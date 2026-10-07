// Integer-pixel character artwork. Every pose uses the same 64 px cell and ground line.
// Polygons are scan-converted to rectangles, so exports contain no antialiased edges.
export const ANIMATIONS = [
  {id:'idle',name:'Idle',fps:8,loop:true},
  {id:'walk',name:'Walk',fps:10,loop:true},
  {id:'run',name:'Run',fps:14,loop:true},
  {id:'jump',name:'Jump',fps:10,loop:false},
  {id:'attack',name:'Attack',fps:12,loop:false},
  {id:'hurt',name:'Hurt',fps:10,loop:false},
  {id:'roll',name:'Roll',fps:12,loop:false},
  {id:'celebrate',name:'Celebrate',fps:9,loop:true}
];
export const FRAME_SIZE=64;
const K={ink:'#172c3a',deep:'#24444e',shade:'#326363',cloth:'#438879',light:'#72b799',edge:'#b4d7b0',skin:'#d89c72',face:'#f1c095',shine:'#ffe0b1',scarf:'#b85b43',red:'#e98358',gold:'#dba758',glow:'#fff2b9',leather:'#674b45',boot:'#35434b',metal:'#9badac'};
const C={...K,deep:'#583b3e',shade:'#865044',cloth:'#ba7750',light:'#e5ab6a',edge:'#ffdab0',skin:'#cb8756',face:'#ecb576',shine:'#ffe1a3',scarf:'#367974',red:'#68b5a0',leather:'#553c40',boot:'#364852',metal:'#b1cbb8'};
function rect(ctx,c,x,y,w=1,h=1){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(ctx,c,points){
  const low=Math.floor(Math.min(...points.map(p=>p[1]))),high=Math.ceil(Math.max(...points.map(p=>p[1])));
  for(let y=low;y<high;y++){
    const xs=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
    }
    xs.sort((a,b)=>a-b);
    for(let i=0;i+1<xs.length;i+=2){const x=Math.ceil(xs[i]-.5),end=Math.ceil(xs[i+1]-.5);if(end>x)rect(ctx,c,x,y,end-x);}
  }
}
function line(ctx,c,a,b,width=1){
  let [x,y]=a.map(Math.round);const [ex,ey]=b.map(Math.round),dx=Math.abs(ex-x),dy=-Math.abs(ey-y),sx=x<ex?1:-1,sy=y<ey?1:-1;let error=dx+dy;
  while(true){rect(ctx,c,x-Math.floor(width/2),y-Math.floor(width/2),width,width);if(x===ex&&y===ey)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
}
function limb(ctx,p,points,width,color){for(let i=1;i<points.length;i++)line(ctx,p.ink,points[i-1],points[i],width+2);for(let i=1;i<points.length;i++)line(ctx,color,points[i-1],points[i],width);}
function pose(action,f){
  const stride=[-5,-3,0,3,5,3,0,-3][f],lift=[0,-2,-4,-1,0,-2,-4,-1][f];
  const s={x:0,y:0,lean:0,farFoot:[32,58],nearFoot:[25,58],farKnee:[33,49],nearKnee:[26,49],farHand:[21,41],nearHand:[40,41],head:0,blink:action==='idle'&&f===5,lantern:true,raise:0,blade:null};
  if(action==='idle'){s.y=[0,0,-1,-1,-1,0,0,0][f];s.nearHand[1]+=[0,0,0,-1,-1,0,1,1][f];}
  if(action==='walk'||action==='run'){
    const run=action==='run',amp=run?1.6:1;
    s.y=run?[0,-2,-3,-1,0,-2,-3,-1][f]:[0,-1,-2,-1,0,-1,-2,-1][f];s.lean=run?3:1;
    s.farFoot=[32+Math.round(stride*amp),58+(stride<0?lift:0)];s.nearFoot=[27-Math.round(stride*amp),58+(stride>0?lift:0)];
    s.farKnee=[31+Math.round(stride*.5*amp),49-(stride<0?2:0)];s.nearKnee=[27-Math.round(stride*.5*amp),49-(stride>0?2:0)];
    s.farHand=[22-Math.round(stride*.7),40+(run?-2:0)];s.nearHand=[40+Math.round(stride*.5),41+(stride>0?-2:0)];
  }
  if(action==='jump'){
    s.y=[3,1,-3,-4,-4,-3,2,0][f];s.head=[1,0,0,0,0,0,1,0][f];
    if(f>=2&&f<=5){s.nearKnee=[23,47];s.nearFoot=[21,51];s.farKnee=[35,48];s.farFoot=[38,51];s.farHand=[20,31];s.nearHand=[43,30];}
    if(f===0||f===6){s.nearKnee=[22,50];s.nearFoot=[22,55];s.farKnee=[36,50];s.farFoot=[37,55];}
  }
  if(action==='attack'){
    s.lantern=false;s.lean=[-2,-3,-1,4,5,3,1,0][f];s.y=[1,1,0,-1,0,1,0,0][f];
    s.nearHand=[[34,34],[30,29],[36,25],[49,29],[51,37],[46,43],[40,41],[39,40]][f];
    s.blade=[[-7,-16],[-10,-17],[6,-19],[10,-13],[11,3],[7,12],[4,13],[3,14]][f];s.farHand=[20,35];
    s.nearFoot=[24-(f>=3&&f<=5?3:0),58];s.farFoot=[34+(f>=3&&f<=5?4:0),58];
  }
  if(action==='hurt'){
    s.x=[0,-2,-4,-3,-2,-1,0,0][f];s.lean=[0,-3,-4,-3,-2,-1,0,0][f];s.y=[0,1,2,2,1,0,0,0][f];s.blink=f<5;s.nearHand=[37,34];s.farHand=[24,35];
  }
  if(action==='celebrate'){
    s.y=[0,-2,-4,-5,-4,-2,0,0][f];s.nearHand=[42,24];s.farHand=[20,27];s.raise=1;s.head=-1;
  }
  return s;
}
function boot(ctx,p,foot,bright){
  const [x,y]=foot;
  poly(ctx,p.ink,[[x-3,y-4],[x+2,y-4],[x+2,y-1],[x+6,y],[x+6,y+2],[x-4,y+2],[x-4,y-2]]);
  rect(ctx,p.boot,x-2,y-3,4,4);rect(ctx,bright?p.metal:p.deep,x-2,y-3,3,1);rect(ctx,p.leather,x-2,y,7,1);rect(ctx,p.light,x+3,y,2,1);
}
function lantern(ctx,p,x,y,f){
  line(ctx,p.ink,[x,y],[x+1,y+4],1);line(ctx,p.gold,[x+1,y+1],[x+3,y+3]);
  poly(ctx,p.ink,[[x,y+4],[x+5,y+4],[x+7,y+7],[x+7,y+14],[x-2,y+14],[x-2,y+7]]);
  rect(ctx,p.gold,x,y+6,5,7);rect(ctx,'#bd713e',x+4,y+6,1,7);rect(ctx,'#ffcd75',x+1,y+7,3,5);
  rect(ctx,p.glow,x+2,y+7+(f%3===0?1:0),1,4);rect(ctx,p.ink,x-1,y+5,7,1);rect(ctx,p.ink,x-1,y+12,7,1);rect(ctx,p.edge,x,y+13,4,1);
}
function keeperHead(ctx,p,s){
  const x=s.lean,y=s.head;
  ctx.save();ctx.translate(x,y);
  poly(ctx,p.ink,[[22,13],[26,9],[33,8],[39,11],[42,17],[42,26],[38,30],[24,29],[20,24],[20,17]]);
  poly(ctx,p.deep,[[23,14],[27,10],[34,10],[39,13],[41,19],[39,28],[25,28],[22,24],[22,17]]);
  poly(ctx,p.cloth,[[23,16],[26,12],[32,11],[37,13],[39,17],[37,20],[28,20],[25,26],[23,24]]);
  poly(ctx,p.light,[[25,15],[28,12],[32,12],[35,13],[28,14],[26,18],[24,21],[24,17]]);
  rect(ctx,p.edge,28,12,4,1);rect(ctx,p.shade,23,22,3,4);
  poly(ctx,p.skin,[[30,17],[38,17],[39,19],[39,23],[41,23],[41,25],[38,26],[37,28],[31,27],[29,24],[29,19]]);
  poly(ctx,p.face,[[31,18],[37,18],[38,20],[38,23],[40,24],[37,25],[36,27],[32,26],[31,23]]);
  rect(ctx,p.shine,32,18,4,2);rect(ctx,p.ink,36,21,2,s.blink?1:2);rect(ctx,p.glow,36,21,1,s.blink?0:1);
  rect(ctx,'#ad6c59',36,24,2,1);rect(ctx,p.skin,31,24,2,2);rect(ctx,p.deep,27,20,2,5);rect(ctx,p.light,25,25,2,2);
  ctx.restore();
}
function courierHead(ctx,p,s,f){
  ctx.save();ctx.translate(s.lean,s.head);
  line(ctx,p.ink,[28,12],[27,7],3);line(ctx,p.metal,[28,11],[28,7],1);rect(ctx,p.ink,25,5,6,4);rect(ctx,p.gold,26,6,4,2);rect(ctx,p.glow,27,6,2,1);
  poly(ctx,p.ink,[[22,14],[25,11],[37,11],[41,15],[42,25],[38,29],[25,29],[21,25],[20,18]]);
  poly(ctx,p.shade,[[23,15],[26,12],[36,12],[40,16],[40,24],[37,27],[26,27],[23,24]]);
  poly(ctx,p.cloth,[[24,15],[27,13],[35,13],[39,16],[39,24],[36,26],[27,26],[24,23]]);
  rect(ctx,p.light,27,13,8,2);rect(ctx,p.edge,28,13,6,1);rect(ctx,p.deep,38,17,2,7);
  poly(ctx,p.ink,[[27,18],[37,18],[39,20],[39,24],[36,26],[28,25],[26,23],[26,20]]);
  poly(ctx,'#305255',[[28,19],[36,19],[38,21],[37,24],[28,24],[27,22]]);
  rect(ctx,p.red,28,20,8,1);rect(ctx,p.glow,29,21,2,s.blink?1:2);rect(ctx,p.glow,34,21,2,s.blink?1:2);
  rect(ctx,p.metal,31,24,3,1);rect(ctx,p.gold,23,18,2,4);rect(ctx,p.edge,23,18,1,2);rect(ctx,p.ink,25,15,1,1);rect(ctx,p.ink,36,15,1,1);
  ctx.restore();
}
function roll(ctx,p,f,robot){
  // Compression, tucked rotation, then a grounded recovery pose; no canvas rotation/blurring.
  const shells=[[[22,39],[33,34],[43,39],[45,49],[39,57],[24,57],[18,49]],[[19,39],[31,34],[42,38],[46,48],[40,56],[26,59],[18,51]],[[20,40],[31,35],[42,39],[45,50],[38,58],[24,56],[18,48]]];
  poly(ctx,p.ink,shells[f%3]);poly(ctx,p.deep,[[24,40],[33,37],[41,42],[42,49],[36,55],[25,54],[21,48]]);
  poly(ctx,p.cloth,[[25,41],[32,38],[39,41],[41,47],[36,52],[29,53],[24,49],[23,45]]);
  poly(ctx,p.light,[[25,41],[32,38],[36,39],[29,41],[25,45],[24,49],[23,46]]);
  const q=[[32,41],[38,45],[33,51],[26,47],[32,41]][(f-1)%5];
  rect(ctx,p.ink,q[0]-3,q[1]-2,7,6);rect(ctx,robot?p.gold:p.face,q[0]-2,q[1]-1,5,4);rect(ctx,p.ink,q[0]+1,q[1],2,1);
  line(ctx,p.scarf,[24,51],[18-(f%2)*2,49],3);rect(ctx,p.red,17-(f%2)*2,48,3,1);
  rect(ctx,p.ink,36,55,8,4);rect(ctx,p.boot,37,55,5,2);rect(ctx,p.metal,38,55,2,1);
  if(f===2||f===4){line(ctx,p.metal,[11,53],[15,53]);line(ctx,p.deep,[8,57],[14,57]);}
}
function character(ctx,kind,action,f){
  const robot=kind==='courier',p=robot?C:K,s=pose(action,f);
  if(action==='roll'&&f>=1&&f<=5){roll(ctx,p,f,robot);return;}
  if(action==='roll'){s.y=f===0?5:f===6?3:0;s.head=2;s.nearKnee=[22,49];s.nearFoot=[23,55];s.farKnee=[36,49];s.farFoot=[38,55];}
  ctx.save();ctx.translate(s.x,s.y);
  // Rear scarf, pack, far arm and leg establish depth before the torso is drawn.
  const tail=(action==='run'?7:3)+[0,1,2,1,0,-1,-1,0][f];
  poly(ctx,p.ink,[[25+s.lean,29],[17,30],[13-tail,27],[13-tail,32],[19,35],[27+s.lean,32]]);
  poly(ctx,p.scarf,[[24+s.lean,30],[18,31],[14-tail,29],[14-tail,31],[19,33],[25+s.lean,32]]);rect(ctx,p.red,15-tail,30,4,1);
  poly(ctx,p.ink,[[20+s.lean,29],[25+s.lean,30],[25+s.lean,43],[20+s.lean,45],[18+s.lean,42],[18+s.lean,33]]);
  rect(ctx,p.leather,20+s.lean,32,4,10);rect(ctx,p.gold,20+s.lean,34,4,1);rect(ctx,p.skin,20+s.lean,33,1,6);
  limb(ctx,p,[[26+s.lean,33],[22,36],s.farHand],3,p.shade);rect(ctx,p.skin,s.farHand[0]-1,s.farHand[1]-1,3,3);
  limb(ctx,p,[[32+s.lean,43],s.farKnee,s.farFoot],4,p.deep);boot(ctx,p,s.farFoot,false);
  limb(ctx,p,[[27+s.lean,43],s.nearKnee,s.nearFoot],4,p.boot);line(ctx,p.metal,[27+s.lean,45],s.nearKnee,2);boot(ctx,p,s.nearFoot,true);
  poly(ctx,p.ink,[[26+s.lean,27],[35+s.lean,27],[39+s.lean,33],[38+s.lean,42],[41+s.lean,46],[33+s.lean,48],[23+s.lean,46],[22+s.lean,39],[23+s.lean,32]]);
  poly(ctx,p.shade,[[26+s.lean,29],[34+s.lean,29],[37+s.lean,34],[36+s.lean,42],[38+s.lean,45],[31+s.lean,46],[25+s.lean,44],[24+s.lean,38]]);
  poly(ctx,p.cloth,[[27+s.lean,30],[33+s.lean,30],[34+s.lean,35],[33+s.lean,43],[28+s.lean,45],[25+s.lean,43],[25+s.lean,35]]);
  line(ctx,p.light,[27+s.lean,33],[26+s.lean,40],2);rect(ctx,p.edge,27+s.lean,33,1,3);rect(ctx,p.deep,34+s.lean,40,2,5);
  line(ctx,p.leather,[25+s.lean,30],[35+s.lean,42],2);line(ctx,p.gold,[26+s.lean,31],[34+s.lean,40],1);
  rect(ctx,p.leather,24+s.lean,41,13,2);rect(ctx,p.gold,30+s.lean,41,3,3);rect(ctx,p.ink,31+s.lean,42,1,1);
  if(robot){rect(ctx,p.ink,28+s.lean,34,5,5);rect(ctx,p.red,29+s.lean,35,3,3);rect(ctx,p.glow,30+s.lean,35,1,1);rect(ctx,p.gold,25+s.lean,44,2,1);}
  else{rect(ctx,p.gold,28+s.lean,38,1,1);rect(ctx,p.edge,24+s.lean,44,3,1);}
  const shoulder=[36+s.lean,33],elbow=[Math.round((shoulder[0]+s.nearHand[0])/2)+1,Math.round((shoulder[1]+s.nearHand[1])/2)+1];
  limb(ctx,p,[shoulder,elbow,s.nearHand],4,p.cloth);line(ctx,p.light,shoulder,[elbow[0]-1,elbow[1]],2);
  rect(ctx,p.ink,s.nearHand[0]-2,s.nearHand[1]-1,5,4);rect(ctx,p.skin,s.nearHand[0]-1,s.nearHand[1]-1,3,3);rect(ctx,p.shine,s.nearHand[0],s.nearHand[1]-1,2,1);
  if(s.lantern)lantern(ctx,p,s.nearHand[0]+1,s.nearHand[1]+1,f);
  if(s.blade){
    const tip=[s.nearHand[0]+s.blade[0],s.nearHand[1]+s.blade[1]];
    line(ctx,p.ink,s.nearHand,tip,4);line(ctx,p.metal,s.nearHand,tip,2);line(ctx,p.glow,[s.nearHand[0]+1,s.nearHand[1]],tip,1);
    line(ctx,p.gold,[s.nearHand[0]-3,s.nearHand[1]+1],[s.nearHand[0]+3,s.nearHand[1]-1],2);
    if(f===3||f===4){poly(ctx,p.edge,f===3?[[45,9],[56,15],[61,25],[61,30],[58,23],[51,16]]:[[61,27],[61,36],[57,44],[49,49],[54,42],[58,34]]);}
  }
  (robot?courierHead:keeperHead)(ctx,p,s,f);
  // Scarf collar sits over the head/coat seam, with a separate fabric highlight.
  poly(ctx,p.ink,[[25+s.lean,27],[36+s.lean,27],[38+s.lean,29],[36+s.lean,32],[25+s.lean,31],[23+s.lean,29]]);
  rect(ctx,p.scarf,25+s.lean,28,11,3);rect(ctx,p.red,26+s.lean,28,8,1);rect(ctx,p.gold,34+s.lean,29,2,1);
  if(action==='hurt'&&f===1){line(ctx,p.glow,[43,14],[47,10]);line(ctx,p.red,[46,21],[50,21]);}
  if(action==='celebrate'&&(f===2||f===4)){rect(ctx,p.glow,48,14,1,5);rect(ctx,p.glow,46,16,5,1);rect(ctx,p.gold,15,17,1,3);rect(ctx,p.gold,14,18,3,1);}
  ctx.restore();
}
export function createDemo(kind,makeCanvas=()=>document.createElement('canvas')){
  const canvas=makeCanvas();canvas.width=FRAME_SIZE*8;canvas.height=FRAME_SIZE*ANIMATIONS.length;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  ANIMATIONS.forEach((action,row)=>{for(let f=0;f<8;f++){ctx.save();ctx.translate(f*FRAME_SIZE,row*FRAME_SIZE);ctx.beginPath();ctx.rect(0,0,FRAME_SIZE,FRAME_SIZE);ctx.clip();character(ctx,kind,action.id,f);ctx.restore();}});
  return {image:canvas,name:kind==='courier'?'Copper courier':'Lantern keeper',frameSize:FRAME_SIZE,animations:ANIMATIONS,kind};
}
export function atlasFor(kind){
  return {name:kind==='courier'?'Copper courier':'Lantern keeper',image:`${kind}-sheet.png`,frameWidth:64,frameHeight:64,columns:8,rows:8,origin:'top-left',groundY:60,pivot:{x:32,y:60},padding:0,
    animations:Object.fromEntries(ANIMATIONS.map((a,row)=>[a.id,{row:row+1,fps:a.fps,loop:a.loop,frames:Array.from({length:8},(_,f)=>({x:f*64,y:row*64,width:64,height:64,duration:Math.round(1000/a.fps)}))}]))};
}
