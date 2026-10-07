export class Camera{
  constructor(){this.x=0;this.y=0;this.targetX=0;this.targetY=0;this.zoom=1;this.targetZoom=1;}
  pan(dx,dy){this.targetX=Math.max(-270,Math.min(270,this.targetX+dx));this.targetY=Math.max(-170,Math.min(170,this.targetY+dy));}
  setZoom(delta){this.targetZoom=Math.max(.7,Math.min(1.6,this.targetZoom+delta));}
  reset(){this.targetX=this.targetY=0;this.targetZoom=1;}
  tick(dt){const a=1-Math.exp(-dt*12);this.x+=(this.targetX-this.x)*a;this.y+=(this.targetY-this.y)*a;this.zoom+=(this.targetZoom-this.zoom)*a;}
  screen(x,y){return{x:480+(x-480)*this.zoom+this.x,y:300+(y-300)*this.zoom+this.y};}
  world(x,y){return{x:480+(x-480-this.x)/this.zoom,y:300+(y-300-this.y)/this.zoom};}
}
