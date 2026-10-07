import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {createTileset,starterMap} from '../tiles.js';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const sheet=createTileset(()=>createCanvas(256,128));
const map=starterMap(),out=createCanvas(map.width*32,map.height*32),c=out.getContext('2d');
c.imageSmoothingEnabled=false;
for(const layer of ['ground','objects'])for(let i=0;i<map.layers[layer].length;i++){const id=map.layers[layer][i];if(id>=0)c.drawImage(sheet,(id%8)*32,Math.floor(id/8)*32,32,32,(i%map.width)*32,Math.floor(i/map.width)*32,32,32);}
writeFileSync(new URL('../assets/tileset.png',import.meta.url),sheet.toBuffer('image/png'));
writeFileSync(new URL('../assets/lantern-garden.png',import.meta.url),out.toBuffer('image/png'));
writeFileSync(new URL('../assets/lantern-garden.json',import.meta.url),JSON.stringify(map,null,2));
console.log('Built tileset, garden PNG and matching project JSON.');
