import {blankMap} from './core.js';
export const TILE_SIZE = 32;
export const tiles = [
  ['Meadow','ground'],['Dark grass','ground'],['Wildflowers','ground'],['Earth','ground'],['Cobblestone','ground'],['Sand','ground'],['Water','ground',true],['Deep water','ground',true],
  ['Shore · north','ground',true],['Shore · south','ground',true],['Shore · west','ground',true],['Shore · east','ground',true],['Timber deck','ground'],['Floor stone','ground'],['Mossy floor','ground'],['Gravel','ground'],
  ['Pine','objects',true],['Oak','objects',true],['Bush','objects',true],['Stone','objects',true],['Wall','objects',true],['Mossy wall','objects',true],['Pillar','objects',true],['Wooden fence','objects',true],
  ['Lantern','objects',true],['Crate','objects',true],['Well','objects',true],['Campfire','objects',true],['Signpost','objects',true],['Stump','objects',true],['Flowers','objects'],['Lilies','objects']
].map(([name,layer,solid = false],id) => ({id,name,layer,solid}));
export function createTileset(factory = () => document.createElement('canvas')) {
  const sheet = factory(); sheet.width = 256; sheet.height = 128; const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false;
  const rect = (x,y,w,h,color) => {c.fillStyle = color; c.fillRect(x,y,w,h);};
  const poly = (pts,color) => {c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  function specks(seed, color, count=15) {for(let i=0;i<count;i++){const x=(i*13+seed*7)%29+1,y=(i*19+seed*11)%29+1;rect(x,y,2,i%3===0?2:1,color);}}
  for (const t of tiles) {
    c.save(); c.translate((t.id%8)*32,Math.floor(t.id/8)*32);
    if(t.id<16){
      const bases=['#779454','#536e46','#779454','#b79763','#929286','#cab682','#4f8790','#3c6578','#4f8790','#4f8790','#4f8790','#4f8790','#986e46','#9e9d8c','#899179','#8e8975'];rect(0,0,32,32,bases[t.id]);
      if(t.id<=2){specks(t.id,'#a0b56a');specks(t.id+3,'#657e49',12);if(t.id===2){for(const [x,y] of [[8,7],[22,19],[6,25]]){rect(x,y,1,4,'#405b3c');rect(x-1,y-1,3,2,'#e5be78');rect(x,y-2,1,1,'#fff0bf');}}}
      if([3,5,15].includes(t.id)){specks(t.id,'#dac398');specks(t.id+2,'#80694e',9);}
      if([4,13,14].includes(t.id)){for(let y=0;y<32;y+=8)for(let x=-8;x<32;x+=16){let xx=x+(y%16?8:0);rect(xx,y,15,7,t.id===14?'#717e65':'#7b7d73');rect(xx+1,y+1,13,5,t.id===4?'#a3a493':'#b0ad99');rect(xx+2,y+1,10,1,'#c3bea7');}if(t.id===14)specks(6,'#5e7b47',28);}
      if(t.id>=6&&t.id<=11){for(let y=4;y<32;y+=9){rect((y*7)%23,y,8,1,'#73a8a8');rect((y*3+13)%25,y+3,5,1,'#3d747f');}if(t.id===8){rect(0,0,32,6,'#c7b47f');rect(0,0,32,3,'#7c9657');rect(0,6,32,2,'#8ac0b4');}if(t.id===9){rect(0,26,32,6,'#c7b47f');rect(0,29,32,3,'#7c9657');rect(0,24,32,2,'#8ac0b4');}if(t.id===10){rect(0,0,6,32,'#c7b47f');rect(0,0,3,32,'#7c9657');rect(6,0,2,32,'#8ac0b4');}if(t.id===11){rect(26,0,6,32,'#c7b47f');rect(29,0,3,32,'#7c9657');rect(24,0,2,32,'#8ac0b4');}}
      if(t.id===12){for(let x=0;x<32;x+=8){rect(x,0,1,32,'#5e4c37');rect(x+1,0,1,32,'#c29962');rect(x+3,4,3,1,'#b48853');rect(x+2,25,4,1,'#745239');}rect(1,2,1,1,'#ded0a8');rect(25,29,1,1,'#ded0a8');}
    }else{
      if(![30,31].includes(t.id)){rect(6,26,22,4,'#253f383e');}
      if([16,17].includes(t.id)){
        rect(14,19,5,11,'#5b493a');rect(15,20,2,10,'#9f7850');
        if(t.id===16){poly([[16,1],[4,18],[9,18],[2,26],[30,26],[23,18],[28,18]],'#324e40');poly([[16,3],[7,17],[13,16],[6,23],[22,23],[19,17],[24,17]],'#57754d');poly([[16,4],[11,13],[18,12]],'#819453');rect(8,23,10,2,'#688552');}
        else{poly([[8,5],[22,3],[29,10],[29,20],[22,25],[6,23],[2,16],[4,8]],'#365542');poly([[9,5],[22,5],[27,11],[24,19],[7,19],[4,13]],'#63834d');poly([[10,5],[19,5],[23,9],[12,11],[6,15],[6,9]],'#879c5a');rect(23,17,3,3,'#456a45');}
      }
      if(t.id===18){poly([[4,16],[10,10],[23,11],[29,20],[26,27],[6,27],[2,22]],'#3d6043');poly([[6,16],[12,12],[22,13],[26,19],[5,22]],'#72934e');rect(10,15,3,2,'#a4b163');rect(21,20,2,2,'#af6e52');}
      if(t.id===19){poly([[6,13],[14,7],[24,10],[29,24],[22,28],[4,26],[2,20]],'#616e69');poly([[7,13],[14,9],[22,11],[24,20],[5,20]],'#a9ada0');poly([[15,10],[22,12],[23,17],[12,17]],'#c0c2ac');rect(7,24,9,2,'#476c49');}
      if([20,21].includes(t.id)){rect(0,7,32,22,'#515e56');rect(0,3,32,5,'#b5b29b');for(let y=9;y<29;y+=9)for(let x=-8;x<32;x+=16){const xx=x+(y%2?8:0);rect(xx,y,15,7,'#909487');rect(xx+1,y,13,1,'#b8b8a3');}rect(0,29,32,3,'#3c5047');if(t.id===21){rect(0,3,10,3,'#7c9755');rect(4,6,4,8,'#526e42');rect(21,19,10,3,'#739455');rect(26,22,4,7,'#526e42');}}
      if(t.id===22){rect(9,5,14,23,'#717c70');rect(7,3,18,5,'#c1c0a8');rect(7,26,18,4,'#8c9583');rect(11,8,3,17,'#a7ac98');rect(19,8,2,17,'#55675d');rect(8,3,16,1,'#ddd4b6');}
      if(t.id===23){rect(0,13,32,4,'#aa8251');rect(0,22,32,3,'#74573f');for(const x of [2,24]){rect(x,7,5,24,'#72573d');rect(x,7,4,2,'#c6a16b');rect(x+1,9,1,20,'#b3915e');}rect(8,13,14,1,'#d0ad70');}
      if(t.id===24){rect(14,9,3,21,'#534a3b');rect(11,28,9,2,'#665a40');rect(10,7,11,11,'#4b4f42');rect(12,9,7,7,'#ffdf88');rect(14,10,3,5,'#fff2bc');rect(9,6,13,2,'#8e7950');rect(13,3,5,3,'#867955');}
      if(t.id===25){rect(5,8,23,21,'#664f38');rect(6,7,21,20,'#b18753');rect(8,9,17,16,'#86613e');rect(8,9,17,2,'#d5ab6b');poly([[8,12],[11,10],[25,23],[22,25]],'#bf965d');rect(6,24,21,3,'#c09a65');for(const x of [7,25]){rect(x,9,1,1,'#433c32');rect(x,25,1,1,'#433c32');}}
      if(t.id===26){rect(4,14,25,15,'#6b7972');rect(6,18,21,9,'#a6aa97');rect(5,12,23,6,'#c3bda0');rect(9,14,15,4,'#344f50');rect(5,2,2,12,'#7a5e41');rect(26,2,2,12,'#7a5e41');poly([[3,4],[16,0],[30,4],[30,7],[3,7]],'#b88751');rect(7,20,8,1,'#ccd0b7');rect(17,24,9,1,'#697a70');}
      if(t.id===27){for(const [x,y]of [[5,24],[12,27],[23,24],[22,18],[7,18]])rect(x,y,5,3,'#9e9f8c');poly([[15,6],[18,14],[22,15],[20,24],[10,24],[8,18],[13,16]],'#dc8c48');poly([[16,11],[18,18],[17,23],[12,23],[13,18]],'#f3c56c');rect(14,19,2,4,'#fff1a8');rect(11,25,11,2,'#694b39');}
      if(t.id===28){rect(14,7,4,24,'#74563c');rect(5,7,23,9,'#b38c56');rect(7,8,19,1,'#e0b876');rect(9,11,11,1,'#6b573c');rect(18,10,3,3,'#66543c');}
      if(t.id===29){rect(9,16,17,13,'#72523a');rect(7,14,20,6,'#af8753');rect(10,15,14,3,'#d3af75');rect(13,16,7,1,'#876644');rect(12,20,2,8,'#a2794b');rect(23,19,2,8,'#4c4935');}
      if(t.id===30){for(const [x,y]of [[7,13],[15,9],[24,19]]){rect(x,y,1,10,'#4a6942');rect(x-2,y,5,3,'#bd7957');rect(x,y-2,1,6,'#e8b778');rect(x,y+1,1,1,'#f9e8ae');rect(x+1,y+5,3,1,'#7b964e');}}
      if(t.id===31){for(const [x,y]of [[6,8],[20,21]]){rect(x,y,10,3,'#769357');rect(x+2,y-2,6,7,'#8fa76a');rect(x+6,y,4,1,'#466951');rect(x+3,y-1,2,2,'#e0c595');}}
    }
    c.restore();
  }
  return sheet;
}
export function starterMap() {
  const m = blankMap(28,20,'The old lantern garden');const set=(l,x,y,t)=>m.layers[l][y*m.width+x]=t;
  for(let y=0;y<20;y++)for(let x=0;x<28;x++){set('ground',x,y,(x*7+y*13)%19===0?2:(x*3+y*5)%23===0?1:0);}
  // Paths connect the entrance, ruin and small timber crossing.
  for(let y=0;y<20;y++)for(let x=0;x<28;x++)if((y===9||y===10)&&x>=2&&x<=24 || (x===9||x===10)&&y>=4&&y<=16)set('ground',x,y,3);
  for(let y=3;y<=8;y++)for(let x=17;x<=24;x++){set('ground',x,y,y===3?8:y===8?9:x===17?10:x===24?11:6);set('collision',x,y,1);}
  for(let x=17;x<=24;x++){set('ground',x,6,12);set('collision',x,6,0);}
  for(let y=3;y<=7;y++)for(let x=5;x<=13;x++)set('ground',x,y,14);
  for(let x=5;x<=13;x++){set('objects',x,3,x%3?21:20);set('collision',x,3,1);}
  for(let y=4;y<=7;y++)for(const x of [5,13]){set('objects',x,y,y%2?22:21);set('collision',x,y,1);}
  for(const [x,y,t]of [[7,5,26],[11,5,25],[7,7,24],[11,7,24],[20,5,31],[22,7,31],[20,13,27],[19,13,29],[22,13,25],[24,10,28],[14,15,19],[6,14,30],[4,8,18],[3,12,18],[23,15,19],[16,4,30],[15,8,19]]){set('objects',x,y,t);if(tiles[t].solid)set('collision',x,y,1);}
  for(let x=0;x<28;x++)for(const y of [0,19]){set('objects',x,y,x%3===0?17:16);set('collision',x,y,1);}
  for(let y=1;y<19;y++)for(const x of [0,27]){set('objects',x,y,y%4===0?17:16);set('collision',x,y,1);}
  for(const [x,y]of [[2,2],[3,3],[24,2],[25,3],[2,16],[3,17],[24,17],[25,16],[15,2],[16,16],[7,17]]){set('objects',x,y,16);set('collision',x,y,1);}
  m.spawn={x:9,y:12};return m;
}
