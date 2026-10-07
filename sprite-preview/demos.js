// Integer-pixel character artwork. Every pose uses the same 96 px cell and ground line.
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
export const FRAME_SIZE=96;
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
// Every action has contact, passing, anticipation and recovery poses. The feet
// stay on y=88 in grounded poses; offsets apply to upper-body pieces only.
function pose(action,f){
  const s={body:0,lean:0,head:0,farKnee:[51,74],nearKnee:[42,74],farFoot:[51,88],nearFoot:[40,88],farElbow:[32,51],farHand:[30,61],nearElbow:[55,52],nearHand:[56,62],sword:null,blink:action==='idle'&&f===6,lantern:true,cloak:0,scarf:0};
  if(action==='idle'){
    s.body=[0,0,-1,-1,-1,0,0,1][f];s.head=[0,0,0,-1,-1,0,0,0][f];s.nearHand[1]+=[0,-1,-1,0,1,1,0,0][f];s.scarf=[0,1,2,1,0,-1,-2,-1][f];
  }
  if(action==='walk'){
    s.body=[0,-1,-2,-1,0,-1,-2,-1][f];s.lean=1;
    s.farFoot=[[61,88],[56,88],[45,85],[40,81],[36,88],[42,88],[52,88],[59,88]][f];
    s.nearFoot=[[31,88],[38,88],[48,88],[55,88],[59,88],[54,88],[44,85],[35,81]][f];
    s.farKnee=[[55,74],[52,74],[48,72],[47,70],[41,74],[43,74],[48,75],[52,75]][f];
    s.nearKnee=[[38,75],[41,75],[46,75],[50,74],[52,74],[48,74],[43,72],[40,70]][f];
    s.farHand=[[30,63],[31,60],[33,57],[35,55],[36,54],[35,57],[32,59],[30,62]][f];
    s.nearHand=[[57,57],[57,59],[56,62],[54,64],[53,65],[54,63],[56,60],[57,58]][f];s.scarf=[1,0,-1,-2,-1,0,1,2][f];
  }
  if(action==='run'){
    s.body=[-1,-3,-4,-2,-1,-3,-4,-2][f];s.lean=5;
    s.farFoot=[[64,87],[58,83],[44,78],[35,76],[31,87],[39,86],[54,87],[64,88]][f];
    s.nearFoot=[[28,87],[37,86],[50,87],[62,88],[65,87],[58,83],[44,78],[33,76]][f];
    s.farKnee=[[57,72],[55,71],[50,68],[45,67],[37,74],[39,75],[48,74],[54,73]][f];
    s.nearKnee=[[35,74],[40,75],[47,74],[54,73],[58,72],[54,71],[48,68],[41,67]][f];
    s.farElbow=[[27,48],[29,48],[35,49],[39,50],[40,51],[37,50],[32,48],[27,47]][f];
    s.farHand=[[24,42],[25,42],[31,44],[38,47],[40,52],[35,50],[28,46],[24,43]][f];
    s.nearElbow=[[59,48],[58,49],[55,50],[52,51],[50,51],[54,50],[58,49],[60,48]][f];
    s.nearHand=[[64,43],[62,46],[59,50],[55,54],[52,57],[56,53],[60,48],[63,44]][f];s.scarf=[-2,-3,-2,0,2,3,1,-1][f];s.cloak=4;
  }
  if(action==='jump'){
    s.body=[5,3,-7,-12,-12,-5,5,1][f];s.lean=[-1,0,2,2,1,1,-1,0][f];
    s.nearKnee=[[35,74],[38,72],[34,67],[31,63],[34,65],[41,70],[36,76],[41,75]][f];
    s.nearFoot=[[35,87],[38,87],[29,78],[24,70],[28,73],[39,82],[36,88],[40,88]][f];
    s.farKnee=[[56,75],[54,73],[56,67],[58,63],[57,64],[52,70],[57,75],[52,75]][f];
    s.farFoot=[[57,88],[54,86],[61,76],[64,68],[64,72],[55,80],[58,88],[52,88]][f];
    s.nearHand=[[54,62],[57,51],[60,38],[61,30],[61,31],[59,42],[53,61],[56,62]][f];
    s.nearElbow=[[56,53],[57,46],[58,36],[58,32],[58,32],[58,40],[55,52],[55,52]][f];
    s.farHand=[[28,61],[28,50],[27,41],[28,36],[29,37],[30,46],[29,62],[30,61]][f];s.scarf=[2,0,-3,-4,-2,1,4,1][f];
  }
  if(action==='attack'){
    s.lantern=false;s.lean=[-2,-4,-2,5,7,4,1,0][f];s.body=[1,2,0,-1,0,2,1,0][f];
    s.nearHand=[[46,44],[39,37],[49,32],[69,40],[71,55],[61,64],[55,59],[53,56]][f];
    s.nearElbow=[[53,43],[49,36],[52,33],[61,36],[61,46],[55,53],[53,52],[53,49]][f];
    s.sword=[[-12,-25],[-17,-26],[5,-29],[19,-22],[19,4],[12,20],[10,23],[8,25]][f];
    s.farHand=[[31,57],[28,49],[27,46],[31,45],[34,46],[33,50],[31,58],[30,61]][f];
    s.nearFoot=[[38,88],[35,88],[34,88],[31,88],[30,88],[33,88],[37,88],[40,88]][f];s.farFoot=[[51,88],[51,88],[54,88],[63,88],[65,88],[60,88],[55,88],[51,88]][f];s.cloak=[0,-1,0,3,5,3,1,0][f];s.scarf=[0,1,0,-3,-4,-1,1,0][f];
  }
  if(action==='hurt'){
    s.body=[0,1,3,3,2,1,0,0][f];s.lean=[0,-4,-6,-4,-3,-1,0,0][f];s.head=[0,-1,1,1,0,0,0,0][f];s.blink=f<5;
    s.nearHand=[[55,61],[46,44],[44,43],[45,43],[47,45],[50,50],[55,58],[56,62]][f];s.nearElbow=[52,49];s.farHand=[29,53];s.nearFoot=[37,88];s.farFoot=[53,88];s.scarf=[0,-2,-4,-3,-1,1,1,0][f];
  }
  if(action==='celebrate'){
    s.body=[0,-1,-2,-2,-1,0,0,0][f];s.nearHand=[[57,53],[61,39],[63,25],[63,23],[63,25],[62,31],[59,43],[57,53]][f];s.nearElbow=[[56,47],[59,38],[58,30],[57,29],[58,30],[59,33],[57,40],[56,47]][f];
    s.farHand=[[28,57],[24,48],[22,38],[22,35],[22,38],[24,45],[27,52],[28,57]][f];s.farElbow=[29,43];s.scarf=[0,1,2,3,2,1,0,-1][f];
  }
  if(action==='roll'){
    s.body=[7,0,0,0,0,0,5,0][f];s.lean=f===0?4:f===6?3:0;
    s.nearKnee=[35,76];s.nearFoot=[34,88];s.farKnee=[57,76];s.farFoot=[61,88];s.nearHand=[57,65];s.farHand=[30,64];
  }
  return s;
}
function boot(ctx,p,foot,front){
  const [x,y]=foot;
  poly(ctx,p.ink,[[x-4,y-10],[x+3,y-10],[x+3,y-3],[x+8,y-1],[x+8,y+2],[x-5,y+2],[x-5,y-2]]);
  poly(ctx,front?p.leather:p.deep,[[x-3,y-9],[x+2,y-9],[x+2,y-2],[x+6,y],[x+6,y+1],[x-3,y+1]]);
  rect(ctx,p.boot,x-3,y-3,5,3);rect(ctx,p.skin,x-3,y-8,1,5);rect(ctx,p.gold,x-2,y-6,4,1);rect(ctx,p.metal,x,y-6,1,1);rect(ctx,p.light,x+3,y-1,3,1);rect(ctx,p.ink,x-4,y+1,12,1);
}
function lantern(ctx,p,x,y,f){
  line(ctx,p.ink,[x,y],[x+2,y+4],2);line(ctx,p.gold,[x+1,y+1],[x+3,y+3]);
  poly(ctx,p.ink,[[x,y+4],[x+6,y+4],[x+8,y+7],[x+8,y+18],[x-2,y+18],[x-2,y+7]]);
  poly(ctx,p.gold,[[x+1,y+6],[x+5,y+6],[x+6,y+8],[x+6,y+15],[x,y+15],[x,y+8]]);
  rect(ctx,'#a96736',x+5,y+7,1,9);rect(ctx,'#efac52',x+1,y+8,4,7);rect(ctx,'#ffd783',x+2,y+8,2,6);rect(ctx,p.glow,x+2,y+9+(f%3===0?1:0),1,4);
  rect(ctx,p.ink,x-1,y+6,8,1);rect(ctx,p.ink,x-1,y+15,8,1);rect(ctx,p.metal,x,y+16,6,1);rect(ctx,p.ink,x+3,y+7,1,2);
}
function keeperHead(ctx,p,s){
  ctx.save();ctx.translate(s.lean,s.head+s.body);
  poly(ctx,p.ink,[[36,22],[39,18],[45,16],[51,18],[55,22],[56,31],[53,36],[47,38],[39,35],[34,31],[34,26]]);
  poly(ctx,p.deep,[[37,22],[40,19],[45,18],[50,19],[53,23],[54,30],[51,34],[45,36],[39,33],[36,30]]);
  poly(ctx,p.cloth,[[38,23],[40,20],[45,19],[50,21],[52,25],[47,25],[42,27],[40,33],[37,30]]);
  poly(ctx,p.light,[[39,23],[41,21],[45,20],[48,21],[43,22],[40,26],[38,29],[38,26]]);rect(ctx,p.edge,42,20,4,1);rect(ctx,p.shade,37,29,3,4);
  poly(ctx,p.skin,[[44,24],[51,24],[53,26],[53,29],[55,30],[55,31],[52,32],[50,35],[46,34],[43,31],[42,28]]);
  poly(ctx,p.face,[[45,25],[50,25],[52,27],[52,29],[54,30],[51,31],[49,34],[46,32],[44,29]]);
  rect(ctx,p.shine,45,25,4,1);rect(ctx,p.skin,46,31,2,2);rect(ctx,'#925449',50,32,2,1);
  poly(ctx,'#563e39',[[42,25],[45,23],[50,24],[51,25],[46,25],[43,28],[42,31]]);rect(ctx,'#a66947',44,25,2,1);rect(ctx,p.ink,49,27,3,1);rect(ctx,p.ink,50,28,2,s.blink?1:2);if(!s.blink)rect(ctx,p.glow,51,28);
  rect(ctx,p.light,40,33,2,1);rect(ctx,p.ink,45,34,2,2);
  ctx.restore();
}
function courierHead(ctx,p,s,f){
  ctx.save();ctx.translate(s.lean,s.head+s.body);
  line(ctx,p.ink,[42,20],[41,15],2);line(ctx,p.metal,[42,19],[42,15]);rect(ctx,p.ink,39,13,6,3);rect(ctx,p.gold,40,14,4,1);
  poly(ctx,p.ink,[[36,24],[39,20],[48,19],[54,23],[56,28],[55,33],[50,37],[40,36],[35,32],[34,27]]);
  poly(ctx,p.shade,[[37,24],[40,22],[47,21],[52,24],[54,28],[53,32],[49,35],[41,34],[37,31]]);
  poly(ctx,p.cloth,[[39,24],[42,22],[47,22],[51,24],[53,28],[51,33],[43,34],[39,31],[37,28]]);
  line(ctx,p.light,[40,24],[47,22],2);rect(ctx,p.edge,42,22,4,1);rect(ctx,p.deep,51,26,2,6);
  poly(ctx,p.ink,[[40,26],[51,25],[54,28],[53,32],[49,34],[42,33],[39,30]]);
  poly(ctx,'#27494f',[[41,27],[50,26],[52,28],[51,31],[48,32],[42,31],[40,29]]);
  line(ctx,p.red,[42,28],[49,27]);rect(ctx,p.glow,43,29,2,s.blink?1:2);rect(ctx,p.glow,49,28,2,s.blink?1:2);rect(ctx,p.metal,45,32,3,1);
  rect(ctx,p.ink,36,26,3,5);rect(ctx,p.gold,36,27,2,3);rect(ctx,p.edge,36,27,1,1);rect(ctx,p.ink,40,24);rect(ctx,p.ink,50,23);rect(ctx,p.gold,42,34,2,1);
  ctx.restore();
}
function tuck(ctx,p,f,robot){
  // The tucked head, knees and heel change position across a readable roll.
  const tilt=[0,-2,1,3,-1][f-1],x=tilt;
  poly(ctx,p.ink,[[34+x,59],[42+x,54],[53+x,55],[63+x,63],[64+x,74],[58+x,84],[43+x,89],[32+x,84],[27+x,72],[29+x,65]]);
  poly(ctx,p.deep,[[36+x,61],[43+x,57],[52+x,58],[60+x,65],[61+x,73],[55+x,82],[43+x,86],[34+x,81],[30+x,72],[32+x,66]]);
  poly(ctx,p.cloth,[[37+x,61],[44+x,58],[52+x,60],[58+x,66],[58+x,72],[53+x,79],[43+x,82],[35+x,77],[33+x,69]]);
  poly(ctx,p.light,[[37+x,61],[43+x,58],[49+x,59],[41+x,62],[36+x,68],[35+x,74],[33+x,69]]);
  const h=[[46,59],[57,65],[52,78],[38,78],[34,65]][f-1];
  poly(ctx,p.ink,[[h[0]-5,h[1]-3],[h[0]+3,h[1]-4],[h[0]+7,h[1]],[h[0]+5,h[1]+6],[h[0]-2,h[1]+7],[h[0]-6,h[1]+2]]);
  rect(ctx,robot?p.gold:p.skin,h[0]-2,h[1],5,5);rect(ctx,robot?p.glow:p.face,h[0]-1,h[1],3,3);rect(ctx,p.ink,h[0]+2,h[1]+1,2,1);
  const knee=[[50,77],[38,77],[36,65],[48,62],[54,76]][f-1];rect(ctx,p.ink,knee[0]-4,knee[1]-3,9,7);rect(ctx,p.boot,knee[0]-3,knee[1]-2,6,5);rect(ctx,p.metal,knee[0]-2,knee[1]-2,4,1);
  line(ctx,p.scarf,[34+x,81],[22+x,76],3);line(ctx,p.red,[29+x,78],[23+x,76]);
  if(f===2||f===4){line(ctx,p.metal,[17,82],[23,82]);line(ctx,p.deep,[13,86],[22,86]);}
}
function character(ctx,kind,action,f){
  const robot=kind==='courier',p=robot?C:K,s=pose(action,f);
  if(action==='roll'&&f>=1&&f<=5){tuck(ctx,p,f,robot);return;}
  const b=s.body,t=s.lean;
  // Cloth is drawn behind the body, with a curved hem and delayed wind motion.
  poly(ctx,p.ink,[[36+t,35+b],[42+t,38+b],[39,58+b],[36-s.cloak,74],[27-s.cloak,71+s.scarf],[22-s.cloak,65+s.scarf],[27,49+b],[30+t,39+b]]);
  poly(ctx,p.deep,[[35+t,38+b],[39+t,40+b],[36,57+b],[34-s.cloak,71],[27-s.cloak,68+s.scarf],[25-s.cloak,64+s.scarf],[29,50+b]]);
  poly(ctx,p.shade,[[33+t,41+b],[35+t,43+b],[31,59+b],[29-s.cloak,67+s.scarf],[26-s.cloak,63+s.scarf],[29,52+b]]);line(ctx,p.light,[32+t,43+b],[27-s.cloak,63+s.scarf]);
  poly(ctx,p.ink,[[38+t,35+b],[29,39+b],[20,38+b+s.scarf],[16,41+b+s.scarf],[22,45+b+s.scarf],[31,44+b],[39+t,39+b]]);
  poly(ctx,p.scarf,[[37+t,36+b],[29,40+b],[21,40+b+s.scarf],[19,41+b+s.scarf],[24,43+b+s.scarf],[31,42+b],[38+t,38+b]]);line(ctx,p.red,[23,41+b+s.scarf],[30,41+b]);
  poly(ctx,p.ink,[[29+t,39+b],[35+t,39+b],[38+t,55+b],[33+t,61+b],[28+t,58+b],[26+t,45+b]]);rect(ctx,p.leather,29+t,42+b,6,14);rect(ctx,p.skin,30+t,43+b,1,11);rect(ctx,p.gold,29+t,45+b,6,1);rect(ctx,p.ink,31+t,49+b,3,2);rect(ctx,p.gold,32+t,49+b,1,1);
  limb(ctx,p,[[35+t,42+b],s.farElbow,s.farHand],4,p.shade);rect(ctx,p.ink,s.farHand[0]-2,s.farHand[1]-2,5,5);rect(ctx,p.leather,s.farHand[0]-1,s.farHand[1]-1,3,4);rect(ctx,p.skin,s.farHand[0],s.farHand[1]-1,2,1);
  limb(ctx,p,[[49+t,60+b],s.farKnee,s.farFoot],5,p.deep);boot(ctx,p,s.farFoot,false);
  limb(ctx,p,[[41+t,60+b],s.nearKnee,s.nearFoot],5,p.boot);line(ctx,p.metal,[42+t,64+b],[s.nearKnee[0],s.nearKnee[1]-3],2);rect(ctx,p.ink,s.nearKnee[0]-3,s.nearKnee[1]-2,7,4);rect(ctx,p.shade,s.nearKnee[0]-2,s.nearKnee[1]-2,5,2);rect(ctx,p.gold,s.nearKnee[0]-1,s.nearKnee[1]-2,3,1);boot(ctx,p,s.nearFoot,true);
  poly(ctx,p.ink,[[37+t,34+b],[48+t,34+b],[54+t,42+b],[52+t,57+b],[57+t,68+b],[50+t,72+b],[41+t,70+b],[32+t,69+b],[30+t,63+b],[34+t,50+b],[33+t,41+b]]);
  poly(ctx,p.shade,[[38+t,36+b],[47+t,36+b],[51+t,43+b],[49+t,57+b],[54+t,67+b],[49+t,69+b],[41+t,67+b],[34+t,67+b],[33+t,63+b],[37+t,49+b],[36+t,42+b]]);
  poly(ctx,p.cloth,[[39+t,38+b],[44+t,38+b],[47+t,43+b],[45+t,54+b],[43+t,61+b],[46+t,67+b],[41+t,66+b],[36+t,66+b],[35+t,62+b],[39+t,49+b],[37+t,43+b]]);
  poly(ctx,p.light,[[39+t,39+b],[42+t,39+b],[40+t,47+b],[39+t,55+b],[36+t,60+b],[37+t,48+b]]);rect(ctx,p.edge,39+t,40+b,1,4);line(ctx,p.deep,[47+t,48+b],[49+t,65+b],2);line(ctx,p.light,[35+t,65+b],[40+t,66+b]);line(ctx,p.gold,[48+t,68+b],[52+t,67+b]);
  line(ctx,p.ink,[37+t,36+b],[49+t,55+b],4);line(ctx,p.leather,[37+t,36+b],[49+t,55+b],2);line(ctx,p.skin,[38+t,38+b],[48+t,54+b]);rect(ctx,p.gold,41+t,44+b,3,3);rect(ctx,p.ink,42+t,45+b,1,1);
  rect(ctx,p.ink,34+t,56+b,17,4);rect(ctx,p.leather,35+t,57+b,15,2);rect(ctx,p.gold,42+t,57+b,4,3);rect(ctx,p.ink,43+t,58+b,2,1);
  poly(ctx,p.ink,[[49+t,57+b],[54+t,58+b],[54+t,65+b],[49+t,66+b],[47+t,62+b]]);rect(ctx,p.leather,49+t,59+b,4,5);rect(ctx,p.skin,49+t,59+b,1,3);rect(ctx,p.gold,50+t,59+b,2,1);
  if(robot){rect(ctx,p.ink,40+t,48+b,5,5);rect(ctx,p.red,41+t,49+b,3,3);rect(ctx,p.glow,42+t,49+b);rect(ctx,p.metal,47+t,43+b,2,6);rect(ctx,p.gold,39+t,62+b,2,3);}
  else{rect(ctx,p.ink,37+t,58+b,3,6);rect(ctx,'#629e8a',38+t,60+b,2,3);rect(ctx,p.glow,38+t,60+b);rect(ctx,p.gold,38+t,59+b,1,1);}
  // Shoulder pad, articulated sleeve, leather bracer and gripping hand.
  limb(ctx,p,[[50+t,41+b],s.nearElbow,s.nearHand],5,p.cloth);line(ctx,p.light,[50+t,42+b],[s.nearElbow[0]-1,s.nearElbow[1]],2);
  poly(ctx,p.ink,[[47+t,39+b],[52+t,38+b],[56+t,42+b],[56+t,46+b],[51+t,47+b],[47+t,44+b]]);
  poly(ctx,robot?p.gold:p.shade,[[49+t,40+b],[52+t,40+b],[54+t,42+b],[54+t,45+b],[51+t,45+b],[49+t,43+b]]);line(ctx,p.metal,[49+t,41+b],[53+t,41+b]);rect(ctx,p.gold,53+t,43+b);
  const hand=s.nearHand,brace=[Math.round((hand[0]+s.nearElbow[0])/2),Math.round((hand[1]+s.nearElbow[1])/2)];line(ctx,p.leather,brace,hand,5);line(ctx,p.skin,[brace[0]-2,brace[1]],[hand[0]-2,hand[1]],1);rect(ctx,p.ink,hand[0]-2,hand[1]-1,5,5);rect(ctx,p.skin,hand[0]-1,hand[1],3,3);rect(ctx,p.shine,hand[0],hand[1],2,1);
  if(s.lantern)lantern(ctx,p,hand[0]+1,hand[1]+3,f);
  else{
    lantern(ctx,p,29+t,58+b,f);
    const tip=[hand[0]+s.sword[0],hand[1]+s.sword[1]];
    line(ctx,p.ink,hand,tip,4);line(ctx,p.metal,hand,tip,2);line(ctx,p.glow,[hand[0]+1,hand[1]],tip,1);line(ctx,p.gold,[hand[0]-4,hand[1]+1],[hand[0]+4,hand[1]-1],2);
    if(f===3)poly(ctx,p.edge,[[67,9],[81,15],[90,26],[92,36],[89,32],[84,23],[75,16]]);
    if(f===4)poly(ctx,p.edge,[[91,36],[92,48],[88,59],[78,67],[70,70],[79,63],[86,53]]);
  }
  (robot?courierHead:keeperHead)(ctx,p,s,f);
  poly(ctx,p.ink,[[38+t,34+b],[49+t,34+b],[52+t,36+b],[49+t,39+b],[38+t,39+b],[35+t,36+b]]);rect(ctx,p.scarf,38+t,35+b,11,3);rect(ctx,p.red,39+t,35+b,8,1);rect(ctx,p.gold,47+t,36+b,2,1);
  if(action==='hurt'&&f===1){line(ctx,p.glow,[61,23],[66,19]);line(ctx,p.red,[64,30],[68,30]);}
  if(action==='celebrate'&&(f===2||f===3||f===4)){rect(ctx,p.glow,75,19,1,5);rect(ctx,p.glow,73,21,5,1);rect(ctx,p.gold,24,25,1,3);rect(ctx,p.gold,23,26,3,1);}
}
export function createDemo(kind,makeCanvas=()=>document.createElement('canvas')){
  const canvas=makeCanvas();canvas.width=FRAME_SIZE*8;canvas.height=FRAME_SIZE*ANIMATIONS.length;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  ANIMATIONS.forEach((action,row)=>{for(let f=0;f<8;f++){ctx.save();ctx.translate(f*FRAME_SIZE,row*FRAME_SIZE);ctx.beginPath();ctx.rect(0,0,FRAME_SIZE,FRAME_SIZE);ctx.clip();character(ctx,kind,action.id,f);ctx.restore();}});
  return {image:canvas,name:kind==='courier'?'Copper courier':'Lantern keeper',frameSize:FRAME_SIZE,animations:ANIMATIONS,kind};
}
export function atlasFor(kind){
  return {name:kind==='courier'?'Copper courier':'Lantern keeper',image:`${kind}-sheet.png`,frameWidth:96,frameHeight:96,columns:8,rows:8,origin:'top-left',groundY:88,pivot:{x:48,y:88},padding:0,
    animations:Object.fromEntries(ANIMATIONS.map((a,row)=>[a.id,{row:row+1,fps:a.fps,loop:a.loop,frames:Array.from({length:8},(_,f)=>({x:f*96,y:row*96,width:96,height:96,duration:Math.round(1000/a.fps)}))}]))};
}
