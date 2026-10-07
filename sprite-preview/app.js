import { LIMITS,layoutFor,clipFor,sequenceFor,frameRect,advance,validateImageFile,validateImageSize,validateGif } from './core.js';
import { createDemo,atlasFor } from './demos.js?v=3';

import { drawForest } from './scene.js?v=1';

const ui=Object.fromEntries([...document.querySelectorAll('[id]')].map(element=>[element.id,element]));
const context=ui.preview.getContext('2d'),sheetContext=ui.sheet.getContext('2d');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const state={ image:null,name:'',layout:null,frames:[],sequence:[],index:0,elapsed:0,playing:!reducedMotion.matches,dirty:true,token:0,exporting:false,sheetTransform:null,demo:null };
let previous=performance.now(),pixelRatio=1,worker=null;

function status(message,error=false) { ui.status.textContent=message;ui.status.classList.toggle('error',error); }
function number(id) { return Number(ui[id].value); }
function filename(suffix) { return `flipbook-${state.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)}-${suffix}`; }
function currentFrame() { return state.sequence[state.index] ?? 0; }

function playState(playing) {
  if(playing && ui.mode.value === 'once' && state.index === state.sequence.length-1){state.index=0;state.dirty=true;updateFrameLabels();drawSheet();}
  state.playing=playing;state.elapsed=0;previous=performance.now();
  ui.play.textContent=playing ? 'Ⅱ' : '▶';
  ui.play.setAttribute('aria-label',playing ? 'Pause animation' : 'Play animation');
}

function updateSequence() {
  try {
    state.frames=clipFor(state.layout,number('row'),number('first'),number('last'));
    state.row=number('row');
    syncAnimationLabels();
    state.sequence=sequenceFor(state.frames,ui.mode.value);state.index=0;state.elapsed=0;
    ui.scrubber.max=state.sequence.length-1;state.dirty=true;updateFrameLabels();drawSheet();
    status(state.layout.hasRemainder ? 'Clip updated. Extra pixels at the right or bottom are outside the frame grid.' : 'Clip ready. Tune the speed or step through the frames.');
  } catch(error) { status(error.message,true); }
}

function applyLayout() {
  try {
    const layout=layoutFor(state.image.width,state.image.height,number('frame-width'),number('frame-height'));
    state.layout=layout;
    ui.row.max=layout.rows;ui.row.value=Math.min(Math.max(1,number('row')),layout.rows);
    ui['row-total'].textContent=`/ ${layout.rows}`;
    for(const id of ['first','last']) ui[id].max=layout.columns;
    ui.first.value=1;ui.last.value=Math.min(layout.columns,LIMITS.clip);
    ui['frame-size-label'].textContent=`${layout.frameWidth} × ${layout.frameHeight} PX`;
    ui['sheet-info'].textContent=`${layout.columns} columns × ${layout.rows} rows · ${layout.total} frames`;
    updateSequence();
  } catch(error) { status(error.message,true); }
}

function setSource(image,name,demo=null) {
  const old=state.image;
  state.demo=demo;
  let frameWidth=Math.min(demo?.frameSize || 32,image.width),frameHeight=Math.min(demo?.frameSize || 32,image.height);
  while(Math.floor(image.width/frameWidth)*Math.floor(image.height/frameHeight)>LIMITS.frames) {
    frameWidth=Math.min(frameWidth*2,image.width);frameHeight=Math.min(frameHeight*2,image.height);
  }
  state.image=image;state.name=name;
  ui['source-name'].textContent=name;ui['source-tag'].textContent=demo ? 'CHARACTER PACK · 64 FRAMES' : 'LOCAL SHEET';
  ui['frame-width'].value=frameWidth;ui['frame-height'].value=frameHeight;
  ui.row.value=demo ? 2 : 1;
  ui['animation-presets'].hidden=!demo;
  ui['download-pack'].hidden=!demo;
  if(demo)ui['download-pack'].href=`assets/${demo.kind}-character-pack.zip?v=3`;
  ui['download-atlas'].disabled=!demo;
  ui.zoom.value=demo?4:8;ui['zoom-label'].textContent=`${ui.zoom.value}×`;
  applyLayout();
  old?.close?.();
  state.dirty=true;
}

function showDemo(kind) {
  state.token++;
  const demo=createDemo(kind);
  setSource(demo.image,demo.name,demo);
  ui.background.value='scene';ui.viewport.classList.remove('paper-backdrop');
  selectAnimation(1);
  document.querySelectorAll('[data-demo]').forEach(button=>{
    const active=button.dataset.demo === kind;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  });
  status(`${demo.name} · 96 × 96 px · 64 frames · 8 actions. Download the complete PNG + JSON pack for your game.`);
}

function syncAnimationLabels(){
  const action=state.demo?.animations[number('row')-1];
  ui['clip-name'].textContent=action?.name || `Row ${number('row')}`;
  document.querySelectorAll('[data-animation]').forEach(button=>button.setAttribute('aria-pressed',String(action?.id===button.dataset.animation)));
}
function selectAnimation(rowIndex){
  const action=state.demo?.animations[rowIndex];if(!action)return;
  if(number('frame-width')!==state.demo.frameSize||number('frame-height')!==state.demo.frameSize){ui['frame-width'].value=state.demo.frameSize;ui['frame-height'].value=state.demo.frameSize;applyLayout();}
  ui.row.value=rowIndex+1;ui.first.value=1;ui.last.value=8;
  ui.fps.value=action.fps;ui['fps-label'].textContent=`${action.fps} FPS`;
  ui.mode.value=action.loop?'forward':'once';
  updateSequence();playState(!reducedMotion.matches);
  status(`${action.name} · ${action.fps} FPS · ${action.loop?'seamless loop':'plays once; press Play to replay'}. All 8 poses share a 96 px cell.`);
}

async function openImage(file) {
  if (!file) return;
  const token=++state.token;
  let image;
  try {
    validateImageFile(file);
    status('Opening the sheet locally…');
    // Reject oversized PNG dimensions before the browser decodes the pixels.
    if (/\.png$/i.test(file.name)) {
      const header=new DataView(await file.slice(0,24).arrayBuffer());
      if (header.byteLength >= 24 && header.getUint32(0) === 0x89504e47) validateImageSize(header.getUint32(16),header.getUint32(20));
    }
    image=await createImageBitmap(file);
    validateImageSize(image.width,image.height);
    if (token !== state.token) { image.close();return; }
    setSource(image,file.name.replace(/\.(png|webp)$/i,''));
    document.querySelectorAll('[data-demo]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
    status(`${file.name} opened locally. Set the size of one frame to match your sheet.`);
  } catch(error) {
    if (image && image !== state.image) image.close();
    if (token === state.token) status(error.name === 'InvalidStateError' ? 'This image could not be decoded. Choose a valid PNG or WebP.' : error.message || 'The image could not be opened.',true);
  } finally { if (token === state.token) ui['image-file'].value=''; }
}

function checker(ctx,width,height,size=18,light='#29323e',dark='#242c37') {
  ctx.fillStyle=dark;ctx.fillRect(0,0,width,height);ctx.fillStyle=light;
  for(let y=0;y<height;y+=size) for(let x=0;x<width;x+=size) if ((x/size+y/size)%2 < 1) ctx.fillRect(x,y,size,size);
}

function drawFrame(ctx,index,x,y,scale,alpha=1) {
  const frame=frameRect(state.layout,index);
  ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(state.image,frame.x,frame.y,frame.width,frame.height,x,y,frame.width*scale,frame.height*scale);ctx.restore();
}

function render() {
  const width=ui.viewport.clientWidth,height=ui.viewport.clientHeight;
  context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  if (ui.background.value === 'checker') checker(context,width,height);
  else {context.fillStyle=ui.background.value === 'paper' ? '#eae5d8' : '#1c2531';context.fillRect(0,0,width,height);}
  const frame=state.layout;
  const fit=Math.max(.1,Math.min((width-58)/frame.frameWidth,(height-80)/frame.frameHeight));
  const wanted=number('zoom');
  const scale=Math.min(wanted,fit >= 1 ? Math.floor(fit) : fit);
  const x=Math.round((width-frame.frameWidth*scale)/2),y=Math.round((height-frame.frameHeight*scale)/2);
  if(ui.background.value==='scene')drawForest(context,width,height,y+(state.demo?90:frame.frameHeight)*scale);
  if (ui.onion.checked && state.sequence.length > 1) drawFrame(context,state.sequence[(state.index-1+state.sequence.length)%state.sequence.length],x,y,scale,.18);
  drawFrame(context,currentFrame(),x,y,scale);
  if (ui['pixel-grid'].checked && scale >= 4) {
    context.strokeStyle=ui.background.value === 'paper' ? '#33412f24' : '#c4d4e924';context.lineWidth=1;context.beginPath();
    for(let col=0;col<=frame.frameWidth;col++){context.moveTo(x+col*scale+.5,y);context.lineTo(x+col*scale+.5,y+frame.frameHeight*scale);}
    for(let row=0;row<=frame.frameHeight;row++){context.moveTo(x,y+row*scale+.5);context.lineTo(x+frame.frameWidth*scale,y+row*scale+.5);}context.stroke();
  }
  ui['actual-zoom'].textContent=`${Number(scale.toFixed(1))}×${scale < wanted ? ' FIT' : ''}`;
  state.dirty=false;
}

function drawSheet() {
  if (!state.layout) return;
  const width=1024,height=state.demo?900:200;ui.sheet.width=width;ui.sheet.height=height;
  checker(sheetContext,width,height,12);
  const margin=state.demo?100:20;
  const scale=Math.min((width-margin)/state.image.width,(height-30)/state.image.height);
  const x=state.demo?92:(width-state.image.width*scale)/2,y=(height-state.image.height*scale)/2;
  if(state.demo){sheetContext.font='11px Arial';sheetContext.fillStyle='#b6c4ce';sheetContext.textAlign='right';state.demo.animations.forEach((a,row)=>sheetContext.fillText(a.name.toUpperCase(),x-12,y+(row+.5)*state.demo.frameSize*scale+4));}
  state.sheetTransform={x,y,scale};
  sheetContext.imageSmoothingEnabled=false;sheetContext.drawImage(state.image,x,y,state.image.width*scale,state.image.height*scale);
  sheetContext.strokeStyle='#65758a88';sheetContext.lineWidth=1;sheetContext.beginPath();
  for(let col=0;col<=state.layout.columns;col++){sheetContext.moveTo(x+col*state.layout.frameWidth*scale,y);sheetContext.lineTo(x+col*state.layout.frameWidth*scale,y+state.layout.rows*state.layout.frameHeight*scale);}
  for(let row=0;row<=state.layout.rows;row++){sheetContext.moveTo(x,y+row*state.layout.frameHeight*scale);sheetContext.lineTo(x+state.layout.columns*state.layout.frameWidth*scale,y+row*state.layout.frameHeight*scale);}sheetContext.stroke();
  if (!state.frames.length) return;
  const start=frameRect(state.layout,state.frames[0]);
  sheetContext.strokeStyle='#f3b889';sheetContext.lineWidth=2;sheetContext.strokeRect(x+start.x*scale+1,y+start.y*scale+1,start.width*state.frames.length*scale-2,start.height*scale-2);
  const current=frameRect(state.layout,currentFrame());
  sheetContext.fillStyle='#f3b88918';sheetContext.fillRect(x+current.x*scale,y+current.y*scale,current.width*scale,current.height*scale);
  sheetContext.strokeStyle='#f4dcc1';sheetContext.lineWidth=2;sheetContext.strokeRect(x+current.x*scale+3,y+current.y*scale+3,current.width*scale-6,current.height*scale-6);
}

function updateFrameLabels() {
  ui.scrubber.value=state.index;
  ui['frame-counter'].textContent=`${String(state.index+1).padStart(2,'0')} / ${String(state.sequence.length).padStart(2,'0')}`;
}

function step(direction) {
  playState(false);state.index=(state.index+direction+state.sequence.length)%state.sequence.length;
  state.dirty=true;updateFrameLabels();drawSheet();
}

function resize() {
  pixelRatio=Math.min(devicePixelRatio || 1,2);
  ui.preview.width=Math.round(ui.viewport.clientWidth*pixelRatio);ui.preview.height=Math.round(ui.viewport.clientHeight*pixelRatio);
  state.dirty=true;
}

function exportCanvas(index,scale) {
  const frame=frameRect(state.layout,index),canvas=document.createElement('canvas');
  canvas.width=frame.width*scale;canvas.height=frame.height*scale;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  ctx.drawImage(state.image,frame.x,frame.y,frame.width,frame.height,0,0,canvas.width,canvas.height);
  return canvas;
}

function download(blob,name) {
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function exportPng() {
  const scale=number('export-scale');
  if (state.layout.frameWidth*scale > LIMITS.pngSide || state.layout.frameHeight*scale > LIMITS.pngSide) return status('PNG frames can be up to 2,048 × 2,048 px. Choose a lower scale.',true);
  const canvas=exportCanvas(currentFrame(),scale),name=filename(`frame-${currentFrame()+1}.png`);
  canvas.toBlob(blob=>{if (!blob) return status('The PNG could not be created.',true);download(blob,name);status(`Saved ${canvas.width} × ${canvas.height} PNG with transparency.`);},'image/png');
}

function exportGif() {
  if (state.exporting) return;
  const scale=number('export-scale'),width=state.layout.frameWidth*scale,height=state.layout.frameHeight*scale;
  try {validateGif(width,height,state.sequence.length);} catch(error) {return status(error.message,true);}
  const name=filename(`row-${state.row}.gif`),fps=number('fps'),loop=ui.mode.value!=='once';
  const frames=state.sequence.map(index=>new Uint8ClampedArray(exportCanvas(index,scale).getContext('2d').getImageData(0,0,width,height).data));
  state.exporting=true;ui['export-gif'].disabled=true;ui['export-png'].disabled=true;ui['export-gif'].textContent='Encoding…';status('Building the GIF in a background worker…');
  function finish() {worker?.terminate();worker=null;state.exporting=false;ui['export-gif'].disabled=false;ui['export-png'].disabled=false;ui['export-gif'].textContent='Clip GIF ↓';}
  try {
    worker=new Worker(new URL('./export-worker.js?v=2',import.meta.url),{type:'module'});
    worker.onmessage=event=>{
      if (event.data.progress) {status(`Encoding GIF: ${event.data.progress[0]} / ${event.data.progress[1]} frames…`);return;}
      if (event.data.error) {status(event.data.error,true);finish();return;}
      download(new Blob([event.data.bytes],{type:'image/gif'}),name);finish();status(`Saved ${width} × ${height} ${loop?'looping':'single-play'} GIF. GIF timing is rounded to 10 ms steps.`);
    };
    worker.onerror=()=>{status('The GIF worker could not run. Reload the page and try again.',true);finish();};
    worker.postMessage({frames,width,height,fps,loop},frames.map(frame=>frame.buffer));
  } catch {status('GIF export is unavailable in this browser.',true);finish();}
}

function bindEvents() {
  document.querySelectorAll('[data-animation]').forEach(button=>button.addEventListener('click',()=>selectAnimation(Number(button.dataset.row))));
  ui['download-atlas'].addEventListener('click',()=>{if(state.demo){download(new Blob([JSON.stringify(atlasFor(state.demo.kind),null,2)],{type:'application/json'}),`${state.demo.kind}-atlas.json`);status('Animation JSON saved with all frame rectangles, timings and pivots.');}});
  document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>showDemo(button.dataset.demo)));
  ui['image-file'].addEventListener('change',()=>openImage(ui['image-file'].files[0]));
  for(const id of ['frame-width','frame-height']) ui[id].addEventListener('change',applyLayout);
  for(const id of ['row','first','last','mode']) ui[id].addEventListener('change',updateSequence);
  ui.fps.addEventListener('input',()=>{ui['fps-label'].textContent=`${ui.fps.value} FPS`;state.elapsed=0;});
  ui.zoom.addEventListener('input',()=>{ui['zoom-label'].textContent=`${ui.zoom.value}×`;state.dirty=true;});
  for(const id of ['background','onion','pixel-grid']) ui[id].addEventListener('change',()=>{state.dirty=true;ui.viewport.classList.toggle('paper-backdrop',ui.background.value === 'paper');});
  ui.play.addEventListener('click',()=>playState(!state.playing));ui.previous.addEventListener('click',()=>step(-1));ui.next.addEventListener('click',()=>step(1));
  ui.scrubber.addEventListener('input',()=>{playState(false);state.index=number('scrubber');state.dirty=true;updateFrameLabels();drawSheet();});
  ui['export-png'].addEventListener('click',exportPng);ui['export-gif'].addEventListener('click',exportGif);
  ui['download-sheet'].addEventListener('click',()=>{const canvas=document.createElement('canvas');canvas.width=state.image.width;canvas.height=state.image.height;canvas.getContext('2d').drawImage(state.image,0,0);canvas.toBlob(blob=>{if(blob){download(blob,filename('sheet.png'));status('Sprite sheet saved as a PNG.');}},'image/png');});
  ui.sheet.addEventListener('click',event=>{
    const bounds=ui.sheet.getBoundingClientRect(),transform=state.sheetTransform;
    const x=((event.clientX-bounds.left)*ui.sheet.width/bounds.width-transform.x)/transform.scale;
    const y=((event.clientY-bounds.top)*ui.sheet.height/bounds.height-transform.y)/transform.scale;
    const column=Math.floor(x/state.layout.frameWidth)+1,row=Math.floor(y/state.layout.frameHeight)+1;
    if (column<1 || row<1 || column>state.layout.columns || row>state.layout.rows) return;
    ui.row.value=row;ui.first.value=column > LIMITS.clip ? column-LIMITS.clip+1 : 1;ui.last.value=Math.min(state.layout.columns,Math.max(column,LIMITS.clip));updateSequence();
    const target=(row-1)*state.layout.columns+column-1;state.index=Math.max(0,state.sequence.indexOf(target));playState(false);state.dirty=true;updateFrameLabels();drawSheet();
  });
  ui.viewport.addEventListener('keydown',event=>{
    if (event.code === 'Space') {event.preventDefault();playState(!state.playing);}
    if (event.key === 'ArrowLeft') {event.preventDefault();step(-1);}
    if (event.key === 'ArrowRight') {event.preventDefault();step(1);}
  });
  let dragDepth=0;
  ui.viewport.addEventListener('dragenter',event=>{event.preventDefault();dragDepth++;ui.viewport.classList.add('dragging');});
  ui.viewport.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';});
  ui.viewport.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)ui.viewport.classList.remove('dragging');});
  ui.viewport.addEventListener('drop',event=>{event.preventDefault();dragDepth=0;ui.viewport.classList.remove('dragging');if(event.dataTransfer.files.length !== 1)return status('Drop one sprite sheet at a time.',true);openImage(event.dataTransfer.files[0]);});
  window.addEventListener('dragover',event=>{if([...event.dataTransfer.types].includes('Files'))event.preventDefault();});
  window.addEventListener('drop',event=>{if(event.dataTransfer.files.length)event.preventDefault();});
  document.addEventListener('visibilitychange',()=>{previous=performance.now();state.elapsed=0;});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)playState(false);});
  new ResizeObserver(resize).observe(ui.viewport);
}

bindEvents();showDemo('keeper');resize();playState(state.playing);
function tick(time) {
  requestAnimationFrame(tick);
  const delta=Math.min((time-previous)/1000,.25);previous=time;
  if(document.hidden)return;
  if(state.playing) {
    const passed=Math.floor((state.elapsed+delta)*number('fps')+1e-8);
    const next=advance(state.index,state.elapsed,delta,number('fps'),state.sequence.length);state.elapsed=next.elapsed;
    if(ui.mode.value==='once' && state.index+passed>=state.sequence.length){state.index=state.sequence.length-1;playState(false);state.dirty=true;updateFrameLabels();drawSheet();}
    else if(next.index !== state.index){state.index=next.index;state.dirty=true;updateFrameLabels();drawSheet();}
  }
  if(state.dirty)render();
}
requestAnimationFrame(tick);
