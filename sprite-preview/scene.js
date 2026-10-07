// A quiet pixel-art stage. This layer is preview-only and never enters asset exports.
export function drawForest(ctx,width,height,ground){
  const p=4;
  const box=(c,x,y,w,h)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x/p)*p,Math.round(y/p)*p,Math.ceil(w/p)*p,Math.ceil(h/p)*p);};
  box('#102a2d',0,0,width,height);
  // Distant moonlight and vertical tree silhouettes.
  for(let y=0;y<height;y+=p){const t=y/height;box(t<.3?'#17373a':t<.6?'#183a39':'#1b403a',0,y,width,p);}
  for(let i=0;i<12;i++){
    const x=(i*97+21)%Math.max(width,1),h=height*(.68+(i%3)*.05);
    box('#1d4240',x,ground-h,12+(i%4)*4,h);box('#204842',x+8,ground-h*.75,4,h*.75);
    for(let j=0;j<3;j++)box('#1d4240',x-18-j*4,ground-h+j*38,30,8);
  }
  // Broken arch on the left, interrupted masonry and patches of moss.
  const ax=width*.16,ay=ground-190;
  for(let i=0;i<6;i++){box('#294d46',ax,ay+i*28,36,24);box('#3b6253',ax,ay+i*28,32,4);box('#183a37',ax+32,ay+i*28,4,24);}
  for(let i=0;i<4;i++){box('#294d46',ax+112,ay+56+i*28,32,24);box('#3b6253',ax+112,ay+56+i*28,28,4);}
  box('#294d46',ax+24,ay-20,40,24);box('#3b6253',ax+28,ay-20,32,4);box('#294d46',ax+60,ay-36,40,24);box('#3b6253',ax+64,ay-36,32,4);box('#294d46',ax+96,ay-12,32,24);
  box('#497054',ax-4,ay+24,16,4);box('#5c805e',ax,ay+28,12,4);box('#497054',ax+112,ay+112,20,4);
  // An old tree and ferns balance the arch at the opposite side.
  const tx=width*.84;
  box('#102e31',tx,50,40,ground-50);box('#234740',tx+4,60,8,ground-60);box('#2a5044',tx+16,110,4,ground-110);
  box('#102e31',tx-28,96,32,16);box('#102e31',tx-52,72,28,16);box('#102e31',tx+36,152,36,16);box('#102e31',tx+64,124,24,16);
  box('#274e43',tx-12,ground-16,70,20);
  // Ground remains aligned with the character's foot pivot at every preview zoom.
  box('#4e7052',0,ground,width,8);box('#29453d',0,ground+8,width,height-ground);box('#789065',0,ground,width,4);
  for(let i=0;i<Math.ceil(width/68);i++){
    const x=i*68-12,y=ground+16+(i%2)*16;
    box('#345349',x,y,60,28);box('#496a55',x+4,y,52,4);box('#1d3b36',x+56,y+4,4,24);box('#1d3b36',x,y+24,60,4);
    if(i%3===0){box('#5d7d58',x+4,ground-4,16,4);box('#91a371',x+8,ground-8,4,4);}
  }
  for(const [fx,fy] of [[.12,.24],[.31,.43],[.73,.19],[.88,.51],[.62,.34]]){box('#60896b',width*fx,height*fy,8,8);box('#d0c991',width*fx+4,height*fy,4,4);}
}
