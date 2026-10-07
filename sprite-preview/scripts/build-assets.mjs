// Rebuild original sheets, machine-readable atlases and presentation previews.
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createDemo,atlasFor,ANIMATIONS,FRAME_SIZE} from '../demos.js';
import {encodeGif} from '../gif.js';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
const root=dirname(dirname(fileURLToPath(import.meta.url))),out=join(root,'assets');
mkdirSync(out,{recursive:true});
const board=createCanvas(1900,1080),b=board.getContext('2d');
b.fillStyle='#eae4d8';b.fillRect(0,0,1900,1080);b.imageSmoothingEnabled=false;
for(const [i,kind] of ['keeper','courier'].entries()){
 const d=createDemo(kind,()=>createCanvas(1,1));
 writeFileSync(join(out,`${kind}-sheet.png`),d.image.toBuffer('image/png'));
 writeFileSync(join(out,`${kind}-atlas.json`),JSON.stringify(atlasFor(kind),null,2)+'\n');
 const x=42+i*950;
 b.fillStyle='#29483d';b.font='24px Georgia';b.fillText(d.name,x,46);
 b.fillStyle='#69746b';b.font='13px Arial';b.fillText('96 PX  /  64 FRAMES  /  8 ACTIONS  /  TRANSPARENT PNG',x,73);
 for(let row=0;row<8;row++){
  const a=ANIMATIONS[row],frames=[],y=112+row*116;
  b.font='12px Arial';b.fillStyle='#53675d';b.fillText(a.name.toUpperCase(),x,y+43);
  for(let f=0;f<8;f++){
   const c=createCanvas(384,384),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
   ctx.drawImage(d.image,f*FRAME_SIZE,row*FRAME_SIZE,FRAME_SIZE,FRAME_SIZE,0,0,384,384);
   frames.push(ctx.getImageData(0,0,384,384).data);
   b.fillStyle=f%2?'#e4e5da':'#dcded3';b.fillRect(x+85+f*96,y,96,96);
   b.drawImage(d.image,f*96,row*96,96,96,x+85+f*96,y,96,96);
  }
  writeFileSync(join(out,`${kind}-${a.id}.gif`),encodeGif(frames,384,384,a.fps,()=>{},a.loop));
 }
}
writeFileSync(join(out,'character-sheets-preview.png'),board.toBuffer('image/png'));
const pack=spawnSync('python3',[join(root,'scripts','build-packs.py')],{stdio:'inherit'});
if(pack.status!==0)process.exit(pack.status??1);
console.log('Two character sheets, complete atlases, 16 GIFs and two ZIP packs rebuilt.');
