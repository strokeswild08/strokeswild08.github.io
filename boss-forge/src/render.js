const TAU=Math.PI*2;
const colors=['#e8a080','#df8d9a','#dc6c90'];
export function draw(ctx,game,clock,reduced=false){
  const w=960,h=640,b=game.boss,p=game.player,accent=colors[game.phase];
  ctx.clearRect(0,0,w,h);ctx.save();
  if(game.shake&&!reduced)ctx.translate(Math.sin(clock*78)*game.shake*14,Math.cos(clock*93)*game.shake*12);
  const bg=ctx.createRadialGradient(480,300,30,480,320,550);bg.addColorStop(0,'#39293d');bg.addColorStop(1,'#1d1928');ctx.fillStyle=bg;ctx.fillRect(-10,-10,w+20,h+20);
  ctx.strokeStyle='#72536416';ctx.lineWidth=1;
  for(let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  // Inlaid circular arena and eight architectural anchors.
  for(const r of [275,281,254,187,108]){ctx.beginPath();ctx.arc(480,330,r,0,TAU);ctx.strokeStyle=r===275?'#c58d7766':'#a178831f';ctx.lineWidth=r===275?2:1;ctx.stroke();}
  for(let i=0;i<32;i++){const a=i/32*TAU;ctx.beginPath();ctx.moveTo(480+Math.cos(a)*259,330+Math.sin(a)*259);ctx.lineTo(480+Math.cos(a)*269,330+Math.sin(a)*269);ctx.strokeStyle='#c2937b38';ctx.stroke();}
  for(let i=0;i<8;i++){const a=i/8*TAU;ctx.save();ctx.translate(480+Math.cos(a)*307,330+Math.sin(a)*307);ctx.rotate(a);ctx.fillStyle='#302535';ctx.strokeStyle='#6a4a6038';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-11,-23);ctx.lineTo(16,-17);ctx.lineTo(23,15);ctx.lineTo(-17,23);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-2,-14);ctx.lineTo(3,13);ctx.strokeStyle='#c48d6a39';ctx.stroke();ctx.restore();}
  ctx.strokeStyle='#86616b2b';ctx.beginPath();ctx.moveTo(480,55);ctx.lineTo(480,605);ctx.moveTo(205,330);ctx.lineTo(755,330);ctx.stroke();
  if(game.cast){const c=game.cast,t=1-c.remaining/c.duration;ctx.save();ctx.translate(c.x,c.y);ctx.strokeStyle='#ee9c73';ctx.fillStyle='#e79e6917';ctx.lineWidth=2;
    if(c.attack.type==='fan'){ctx.rotate(c.target);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,440,-.75,.75);ctx.closePath();ctx.fill();ctx.setLineDash([7,9]);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(0,0,45+10*t,-.75,.75);ctx.lineWidth=4;ctx.stroke();}
    else{const r=c.attack.type==='pulse'?58+15*t:70;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.setLineDash([4,8]);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<Math.min(24,c.attack.count);i++){const a=i/Math.min(24,c.attack.count)*TAU;ctx.beginPath();ctx.moveTo(Math.cos(a)*(r+7),Math.sin(a)*(r+7));ctx.lineTo(Math.cos(a)*(r+18*t),Math.sin(a)*(r+18*t));ctx.stroke();}}
    ctx.beginPath();ctx.arc(0,0,48,-Math.PI/2,-Math.PI/2+TAU*t);ctx.strokeStyle='#ffc8a3';ctx.lineWidth=3;ctx.stroke();ctx.restore();
  }
  for(const ring of game.rings){if(ring.r<0)continue;ctx.beginPath();ctx.arc(ring.x,ring.y,ring.r,0,TAU);ctx.strokeStyle=accent+'b8';ctx.lineWidth=7;ctx.stroke();ctx.beginPath();ctx.arc(ring.x,ring.y,ring.r+8,0,TAU);ctx.strokeStyle=accent+'30';ctx.lineWidth=2;ctx.stroke();}
  // Brass Oracle: articulated angular wings, orbital crown and a luminous core.
  ctx.save();ctx.translate(b.x,b.y);const hover=reduced?0:Math.sin(clock*2)*3;ctx.translate(0,hover);
  ctx.fillStyle='#100d1880';ctx.beginPath();ctx.ellipse(0,45,61,14,0,0,TAU);ctx.fill();
  for(const side of [-1,1]){ctx.save();ctx.scale(side,1);ctx.rotate((reduced?0:Math.sin(clock*.9)*.04));ctx.beginPath();ctx.moveTo(25,-15);ctx.lineTo(60,-44);ctx.lineTo(96,-33);ctx.lineTo(74,-16);ctx.lineTo(109,6);ctx.lineTo(67,3);ctx.lineTo(83,39);ctx.lineTo(40,22);ctx.closePath();ctx.fillStyle='#664252';ctx.fill();ctx.strokeStyle='#b37d73';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(41,-8);ctx.lineTo(71,-25);ctx.lineTo(58,4);ctx.lineTo(75,25);ctx.strokeStyle='#e7ad8680';ctx.stroke();ctx.restore();}
  ctx.save();ctx.rotate(reduced?0:clock*.12);for(let i=0;i<8;i++){const a=i/8*TAU;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,-57);ctx.lineTo(5,-66);ctx.lineTo(0,-79);ctx.lineTo(-5,-66);ctx.closePath();ctx.fillStyle=i%2? '#765064':'#b47c70';ctx.fill();ctx.restore();}ctx.restore();
  ctx.beginPath();ctx.moveTo(0,-43);ctx.lineTo(33,-19);ctx.lineTo(29,22);ctx.lineTo(0,47);ctx.lineTo(-29,22);ctx.lineTo(-33,-19);ctx.closePath();ctx.fillStyle='#523145';ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(20,-13);ctx.lineTo(15,18);ctx.lineTo(0,32);ctx.lineTo(-15,18);ctx.lineTo(-20,-13);ctx.closePath();ctx.fillStyle='#382234';ctx.fill();ctx.strokeStyle='#c98d7955';ctx.stroke();
  const glow=ctx.createRadialGradient(0,0,1,0,0,35);glow.addColorStop(0,accent+'aa');glow.addColorStop(1,accent+'00');ctx.fillStyle=glow;ctx.fillRect(-35,-35,70,70);ctx.save();ctx.rotate(Math.PI/4);ctx.fillStyle='#ffe0b6';ctx.fillRect(-7,-7,14,14);ctx.restore();ctx.restore();
  for(const bullet of game.bullets){ctx.save();ctx.translate(bullet.x,bullet.y);ctx.rotate(Math.atan2(bullet.vy,bullet.vx));ctx.fillStyle=accent+'35';ctx.beginPath();ctx.ellipse(-5,0,13,bullet.r+2,0,0,TAU);ctx.fill();ctx.fillStyle=accent;ctx.beginPath();ctx.arc(0,0,bullet.r,0,TAU);ctx.fill();ctx.fillStyle='#ffe1b4';ctx.beginPath();ctx.arc(1,0,2,0,TAU);ctx.fill();ctx.restore();}
  for(const shot of game.shots){ctx.strokeStyle='#bde6cc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(shot.x,shot.y);ctx.lineTo(shot.x-shot.vx*.018,shot.y-shot.vy*.018);ctx.stroke();}
  ctx.save();ctx.translate(p.x,p.y);const playerAngle=Math.atan2(b.y-p.y,b.x-p.x)+Math.PI/2;ctx.rotate(playerAngle);ctx.globalAlpha=p.invulnerable>0?(Math.floor(clock*18)%2?.45:1):1;
  ctx.fillStyle='#11132180';ctx.beginPath();ctx.ellipse(0,8,17,12,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(13,13);ctx.lineTo(0,8);ctx.lineTo(-13,13);ctx.closePath();ctx.fillStyle='#7bbaa8';ctx.fill();ctx.strokeStyle='#d1efcb';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#e7dcc3';ctx.beginPath();ctx.arc(0,-5,5,0,TAU);ctx.fill();ctx.strokeStyle='#c7e8c7';ctx.beginPath();ctx.moveTo(13,-3);ctx.lineTo(13,-24);ctx.stroke();
  if(p.invulnerable>0){ctx.beginPath();ctx.arc(0,0,24,0,TAU);ctx.strokeStyle='#b9e0c488';ctx.lineWidth=2;ctx.stroke();}ctx.restore();
  for(const part of game.particles){ctx.globalAlpha=part.life/part.max;ctx.fillStyle=part.type==='hit'?'#f08b91':part.type==='cast'?accent:'#b7ddc7';ctx.fillRect(part.x-2,part.y-2,4,4);}ctx.globalAlpha=1;
  if(game.phaseFlash>0){ctx.fillStyle='#e59d7e'+Math.round(game.phaseFlash/1.2*15).toString(16).padStart(2,'0');ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='#e5b5a4';ctx.font='12px Arial';ctx.fillText(`PHASE ${game.phase+1} / ${game.config.phases[game.phase].name.toUpperCase()}`,480,414);}
  ctx.restore();
}
