// Procedural demo art: edit the small rectangles to change a pose or palette.
function rect(ctx,color,x,y,w,h) { ctx.fillStyle=color;ctx.fillRect(x,y,w,h); }

function keeper(ctx,frame,walk) {
  const cycle = [0,1,2,1,0,-1,-2,-1][frame];
  const bob = walk ? [0,0,-1,-1,0,0,-1,-1][frame] : (frame === 3 || frame === 4 ? -1 : 0);
  ctx.save();ctx.translate(0,bob);
  const ink='#283847',cloth='#4b8b82',light='#78b39d',shade='#356c6b',skin='#d3a87d',gold='#e5bc73';
  rect(ctx,ink,11,6,10,4);rect(ctx,ink,9,9,13,8);rect(ctx,cloth,11,7,9,3);rect(ctx,cloth,10,10,11,5);
  rect(ctx,shade,10,13,3,4);rect(ctx,light,12,8,6,2);rect(ctx,skin,14,11,6,5);rect(ctx,'#f0c494',15,11,5,2);rect(ctx,ink,18,13,2,1);
  rect(ctx,ink,11,16,11,8);rect(ctx,cloth,12,16,9,7);rect(ctx,light,13,17,2,4);rect(ctx,shade,19,17,2,6);
  rect(ctx,gold,13,16,9,2);rect(ctx,'#c69b55',20,18,2,5);rect(ctx,gold,21,19,2,3);
  rect(ctx,ink,9,17,3,6);rect(ctx,cloth,10,17,2,5);rect(ctx,skin,9,22,3,2);
  rect(ctx,ink,21,17,3,5);rect(ctx,cloth,21,17,2,4);rect(ctx,skin,22,21,3,2);
  rect(ctx,ink,12+(walk?cycle:0),23,4,5);rect(ctx,'#667071',13+(walk?cycle:0),23,2,3);rect(ctx,ink,17-(walk?cycle:0),23,4,5);rect(ctx,'#78827c',18-(walk?cycle:0),23,2,3);
  rect(ctx,ink,11+(walk?cycle:0),27,5,2);rect(ctx,ink,17-(walk?cycle:0),27,5,2);
  rect(ctx,'#a07948',24,22,1,2);rect(ctx,ink,23,24,4,4);rect(ctx,gold,24,24,2,3);rect(ctx,'#ffe2a0',24,25,1,1);
  ctx.restore();
}

function courier(ctx,frame,walk) {
  const stride = walk ? [0,1,2,1,0,-1,-2,-1][frame] : 0;
  const bob = walk ? (frame%4 < 2 ? 0 : -1) : (frame === 3 || frame === 4 ? -1 : 0);
  const ink='#33474d',copper='#b98457',highlight='#d5a16b',teal='#608d7c';
  ctx.save();ctx.translate(0,bob);
  rect(ctx,ink,16,3,1,4);rect(ctx,'#ebc875',15,2,3,2);
  rect(ctx,ink,9,7,14,10);rect(ctx,copper,10,8,12,8);rect(ctx,highlight,11,8,10,2);rect(ctx,'#8f684b',20,10,2,5);
  rect(ctx,'#39554f',11,11,9,4);rect(ctx,'#dce8a9',12,12,2,1);rect(ctx,'#dce8a9',17,12,2,1);rect(ctx,'#86afa0',14,14,3,1);
  rect(ctx,ink,10,17,12,8);rect(ctx,copper,11,18,10,6);rect(ctx,highlight,12,18,7,1);rect(ctx,teal,10,17,12,2);rect(ctx,teal,12,19,2,4);
  rect(ctx,'#476860',16,20,3,2);rect(ctx,'#cbd991',12,20,1,1);
  rect(ctx,ink,7,18,3,6);rect(ctx,copper,8,19,2,4);rect(ctx,highlight,7,23,3,2);
  rect(ctx,ink,22,18,3,6);rect(ctx,copper,22,19,2,4);rect(ctx,highlight,22,23,3,2);
  rect(ctx,ink,11+stride,25,4,4);rect(ctx,copper,12+stride,25,2,2);rect(ctx,ink,17-stride,25,4,4);rect(ctx,copper,18-stride,25,2,2);
  rect(ctx,'#597367',10+stride,28,5,2);rect(ctx,'#597367',17-stride,28,5,2);
  ctx.restore();
}

export function createDemo(kind,makeCanvas = () => document.createElement('canvas')) {
  const canvas=makeCanvas();canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let row=0;row<2;row++) for(let frame=0;frame<8;frame++) {
    ctx.save();ctx.translate(frame*32,row*32);
    (kind === 'courier' ? courier : keeper)(ctx,frame,row === 1);
    ctx.restore();
  }
  return { image:canvas,name:kind === 'courier' ? 'Copper courier' : 'Lantern keeper' };
}
