import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutFor,clipFor,sequenceFor,frameRect,advance,validateImageFile,validateImageSize,validateGif,LIMITS } from '../core.js';
import { encodeGif } from '../gif.js';

test('sheet rows and frame rectangles use left-to-right ordering',()=>{
  const layout=layoutFor(256,64,32,32);
  assert.equal(layout.total,16);assert.equal(layout.columns,8);assert.equal(layout.rows,2);
  assert.deepEqual(frameRect(layout,10),{x:64,y:32,width:32,height:32});
  assert.deepEqual(clipFor(layout,2,2,4),[9,10,11]);
});

test('incomplete edge cells are excluded from the grid',()=>{
  const layout=layoutFor(100,70,32,32);
  assert.equal(layout.total,6);assert.equal(layout.hasRemainder,true);
});

test('bad sizes and out-of-range clips produce actionable errors',()=>{
  for(const size of [0,-1,1.5,NaN]) assert.throws(()=>layoutFor(256,64,size,32),/whole numbers/);
  assert.throws(()=>layoutFor(32,32,64,32),/bigger/);
  assert.throws(()=>layoutFor(4096,4096,1,1),/4,096 frames/);
  const layout=layoutFor(256,64,32,32);
  for(const args of [[0,1,8],[3,1,8],[1,5,2],[1,1,9],[1,1.5,2]]) assert.throws(()=>clipFor(layout,...args));
  assert.throws(()=>frameRect(layout,16),/outside/);
  assert.throws(()=>clipFor(layoutFor(4096,32,16,32),1,1,121),/120 frames/);
});

test('loop modes do not mutate the clip or double-hold ping-pong endpoints',()=>{
  const frames=[4,5,6,7];
  assert.deepEqual(sequenceFor(frames,'forward'),[4,5,6,7]);
  assert.deepEqual(sequenceFor(frames,'reverse'),[7,6,5,4]);
  assert.deepEqual(sequenceFor(frames,'pingpong'),[4,5,6,7,6,5]);
  assert.deepEqual(sequenceFor([1,2],'pingpong'),[1,2]);
  assert.deepEqual(sequenceFor([1],'pingpong'),[1]);
  assert.deepEqual(frames,[4,5,6,7]);
});

test('playback accumulates sub-frame time, wraps and handles variable refresh rates',()=>{
  let state={index:0,elapsed:0};
  for(let i=0;i<60;i++) state=advance(state.index,state.elapsed,1/60,10,8);
  assert.equal(state.index,2);assert.ok(state.elapsed<1e-7);
  assert.equal(advance(7,0,.1,10,8).index,0);
  assert.equal(advance(0,0,.25,20,8).index,5);
});

test('image and export bounds reject unsuitable inputs before allocating exports',()=>{
  assert.throws(()=>validateImageFile({name:'sprite.gif',size:10}),/static PNG/);
  assert.throws(()=>validateImageFile({name:'sprite.png',size:LIMITS.fileBytes+1}),/10 MB/);
  assert.throws(()=>validateImageFile({name:'sprite.png',size:0}),/empty/);
  assert.doesNotThrow(()=>validateImageFile({name:'SPRITE.WEBP',size:1000}));
  assert.throws(()=>validateImageSize(5000,32),/4,096/);
  assert.throws(()=>validateGif(1024,32,8),/512/);
  assert.throws(()=>validateGif(512,512,120),/too large/);
});

function inspectGif(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const paletteSize=bytes[10]&128 ? 2**((bytes[10]&7)+1)*3 : 0;
  let position=13+paletteSize,control=null;
  const frames=[];
  const skipBlocks=()=>{while(bytes[position]){position+=bytes[position]+1;}position++;};
  while(position<bytes.length) {
    const type=bytes[position++];
    if(type === 0x3b) break;
    if(type === 0x21) {
      const label=bytes[position++];
      if(label === 0xf9) {assert.equal(bytes[position],4);control={packed:bytes[position+1],delay:view.getUint16(position+2,true),transparentIndex:bytes[position+4]};}
      skipBlocks();
    } else if(type === 0x2c) {
      const width=view.getUint16(position+4,true),height=view.getUint16(position+6,true),packed=bytes[position+8];position+=9;
      if(packed&128) position+=2**((packed&7)+1)*3;
      position++;skipBlocks();frames.push({width,height,...control});
    } else throw new Error(`Unexpected GIF block ${type}`);
  }
  return {width:view.getUint16(6,true),height:view.getUint16(8,true),frames,palette:bytes.slice(13,13+paletteSize)};
}

test('GIF output contains looping frames, exact colors, disposal and correct timing',()=>{
  const first=new Uint8ClampedArray([0,0,0,0,0,0,0,255,243,184,137,255,0,0,0,0]);
  const second=new Uint8ClampedArray([243,184,137,255,0,0,0,0,0,0,0,255,0,0,0,0]);
  const bytes=encodeGif([first,second],2,2,10);
  assert.equal(new TextDecoder().decode(bytes.slice(0,6)),'GIF89a');assert.equal(bytes.at(-1),0x3b);
  const info=inspectGif(bytes);assert.equal(info.width,2);assert.equal(info.height,2);assert.equal(info.frames.length,2);
  for(const frame of info.frames){assert.equal(frame.delay,10);assert.equal(frame.packed&1,1);assert.equal((frame.packed>>2)&7,2);assert.equal(frame.transparentIndex,0);}
  assert.deepEqual([...info.palette.slice(6,9)],[243,184,137]);
});

test('many-color and fully-transparent GIF frames encode successfully',()=>{
  const pixels=new Uint8ClampedArray(20*20*4);
  for(let i=0;i<400;i++) pixels.set([i%256,Math.floor(i/256)*100,(i*71)%256,i%5 ? 255 : 0],i*4);
  assert.equal(inspectGif(encodeGif([pixels],20,20,60)).frames[0].delay,2);
  assert.equal(inspectGif(encodeGif([new Uint8ClampedArray(16)],2,2,1)).frames.length,1);
});
