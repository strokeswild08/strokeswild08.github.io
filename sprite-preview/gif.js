import { GIFEncoder,quantize,applyPalette } from './vendor/gifenc.js';
import { validateGif } from './core.js';

// Prefer an exact palette for pixel art. Quantize only when a clip contains
// more than 255 opaque colors; reserve index 0 for transparency.
export function encodeGif(frames,width,height,fps,onProgress = () => {},loop=true) {
  validateGif(width,height,frames.length);
  if (!frames.length || fps < 1 || fps > 60) throw new Error('The GIF clip or speed is invalid.');
  const palette=[[0,0,0,0]], colors=new Map();
  let exact=true;
  outer: for(const pixels of frames) {
    if (pixels.length !== width*height*4) throw new Error('The frame data does not match its dimensions.');
    for(let i=0;i<pixels.length;i+=4) {
      if (pixels[i+3] < 128) continue;
      const key=(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];
      if (!colors.has(key)) {
        if (palette.length === 256) { exact=false;break outer; }
        colors.set(key,palette.length);palette.push([pixels[i],pixels[i+1],pixels[i+2],255]);
      }
    }
  }
  let table=palette,transparentIndex=0;
  if (!exact) {
    const all=new Uint8Array(width*height*4*frames.length);
    frames.forEach((pixels,index)=>all.set(pixels,index*width*height*4));
    table=quantize(all,256,{format:'rgba4444',oneBitAlpha:true});
    transparentIndex=table.findIndex(color=>color[3] === 0);
  }
  const gif=GIFEncoder();
  frames.forEach((pixels,index)=>{
    let indexed;
    if (exact) {
      indexed=new Uint8Array(width*height);
      for(let i=0;i<pixels.length;i+=4) indexed[i/4]=pixels[i+3] < 128 ? 0 : colors.get((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);
    } else indexed=applyPalette(pixels,table,'rgba4444');
    gif.writeFrame(indexed,width,height,{palette:index === 0 ? table : undefined,delay:Math.max(20,Math.round(1000/fps/10)*10),repeat:loop?0:-1,transparent:transparentIndex >= 0,transparentIndex:Math.max(0,transparentIndex),dispose:2});
    if (index%8 === 0 || index === frames.length-1) onProgress(index+1,frames.length);
  });
  gif.finish();return gif.bytes();
}
