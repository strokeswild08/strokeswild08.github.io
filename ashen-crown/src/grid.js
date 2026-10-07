export const SIZE=10;
export const key=(x,y)=>`${x},${y}`;
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<SIZE&&y<SIZE;
export function makeGrid(){
  const blocked=new Map([[3,3,'wall'],[6,3,'pillar'],[6,4,'wall'],[3,5,'wall'],[2,5,'wall'],[8,7,'crate'],[8,8,'pillar'],[2,2,'crate'],[3,2,'pillar'],[5,5,'crate']].map(([x,y,prop])=>[key(x,y),prop]));
  return Array.from({length:SIZE*SIZE},(_,i)=>{const x=i%SIZE,y=Math.floor(i/SIZE),edge=x===0||y===0||x===9||y===9;return{x,y,terrain:edge?'rim':x>=4&&x<=8&&y<=4?'stone':x===4||y===7?'path':(x*7+y*11)%9===0?'cracked':'grass',height:x>=5&&x<=8&&y>=1&&y<=3?1:0,blocked:edge||blocked.has(key(x,y)),prop:blocked.get(key(x,y))||(edge?((x+y)%3===0?'ruin':'bush'):(x===4&&y===3?'stairs':x===1&&y===4?'banner':x===7&&y===8?'torch':x===4&&y===1?'torch':x===1&&y===6?'bush':null))};});
}
export const tile=(state,x,y)=>inside(x,y)?state.grid[y*SIZE+x]:null;
export function unitAt(state,x,y){return state.units.find(u=>u.hp>0&&u.x===x&&u.y===y)||null;}
export function walkable(state,x,y,id=null){const t=tile(state,x,y);return !!t&&!t.blocked&&!(state.crystal.x===x&&state.crystal.y===y)&&!state.units.some(u=>u.id!==id&&u.hp>0&&u.x===x&&u.y===y);}
export function reachable(state,unit,budget=unit.remaining){
  const start=key(unit.x,unit.y),cost=new Map([[start,0]]),parents=new Map(),queue=[{x:unit.x,y:unit.y}];
  for(let i=0;i<queue.length;i++){const p=queue[i],n=cost.get(key(p.x,p.y));if(n>=budget)continue;for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(!cost.has(k)&&walkable(state,x,y,unit.id)){cost.set(k,n+1);parents.set(k,p);queue.push({x,y});}}}
  return{cost,parents};
}
export function pathTo(state,unit,goal,budget=unit.remaining){const {cost,parents}=reachable(state,unit,budget);if(!cost.has(key(goal.x,goal.y)))return null;let p=goal,path=[];while(p.x!==unit.x||p.y!==unit.y){path.push({...p});p=parents.get(key(p.x,p.y));}return path.reverse();}
export function ray(a,b){let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=-Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,error=dx+dy,points=[];while(true){points.push({x,y});if(x===b.x&&y===b.y)return points;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}}
export function lineOfSight(state,a,b){return ray(a,b).slice(1,-1).every(p=>!tile(state,p.x,p.y)?.blocked);}
export function inCover(state,u){return [[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>['wall','crate','pillar','ruin'].includes(tile(state,u.x+x,u.y+y)?.prop));}
