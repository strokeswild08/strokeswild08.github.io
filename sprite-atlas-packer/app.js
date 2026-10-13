'use strict';
const $ = id => document.getElementById(id);
let sprites = [], packed = null, selected = null, busy = false, nextId = 0;
const MAX_PIXELS = 16000000;
const canvas = $('atlas'), context = canvas.getContext('2d');
const status = message => { $('status').textContent = message; };
function lock(value) { busy = value; for (const id of ['sample','clear','width','padding','files']) $(id).disabled = value; }
function uniqueName(name, used) {
  const clean = name.replace(/\.png$/i, '') || 'sprite';
  let result = clean, suffix = 2;
  while (used.has(result)) result = `${clean}_${suffix++}`;
  used.add(result); return result;
}
function addSprite(image, name, used) {
  const preview = document.createElement('canvas'); preview.width = image.width; preview.height = image.height; preview.getContext('2d').drawImage(image,0,0);
  sprites.push({id: String(nextId++), name: uniqueName(name, used), width: image.width, height: image.height, image, thumbnail: preview.toDataURL()});
}
async function loadFiles(files) {
  if (busy) return;
  const batch = Array.from(files);
  if (sprites.length + batch.length > 60) return status('Maximum 60 sprites. Clear the pack or choose fewer files.');
  lock(true);
  let loaded = 0; const errors = [], used = new Set(sprites.map(s => s.name));
  let pixels = sprites.reduce((n,s) => n + s.width*s.height, 0);
  try {
    for (const file of batch) {
      try {
        if (!/\.png$/i.test(file.name)) throw new Error('Choose a PNG file');
        if (file.size > 8*1024*1024) throw new Error('File exceeds 8 MB');
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (bytes.length < 33 || [137,80,78,71,13,10,26,10].some((v,i) => bytes[i] !== v) || new TextDecoder().decode(bytes.slice(12,16)) !== 'IHDR') throw new Error('Invalid PNG header');
        const view = new DataView(buffer), w = view.getUint32(16), h = view.getUint32(20);
        if (!w || !h || w > 4096 || h > 4096 || pixels + w*h > MAX_PIXELS) throw new Error('Image dimensions or total pixel budget exceeded');
        const url = URL.createObjectURL(new Blob([buffer], {type:'image/png'}));
        try {
          const image = new Image(); image.src = url;
          await image.decode();
          if (image.width !== w || image.height !== h) throw new Error('Decoded dimensions do not match header');
          addSprite(image, file.name, used); pixels += w*h; loaded++;
        } finally { URL.revokeObjectURL(url); }
      } catch (error) { errors.push(`${file.name}: ${error.message}`); }
    }
    refresh();
    status(`${loaded} sprites added.${errors.length ? ' Skipped: '+errors.join('; ') : ''}${!packed && sprites.length ? ' Adjust settings to fit the sprites.' : ''}`);
  } finally { lock(false); }
}
function refresh() {
  $('count').textContent = `${sprites.length} files`;
  $('empty').hidden = sprites.length > 0;
  $('list').replaceChildren();
  for (const sprite of sprites) {
    const button = document.createElement('button'); button.className = 'sprite-row'; button.dataset.id = sprite.id;
    const thumbnail = document.createElement('img'); thumbnail.src = sprite.thumbnail; thumbnail.alt = '';
    const name = document.createElement('span'); name.textContent = sprite.name;
    const size = document.createElement('small'); size.textContent = `${sprite.width}×${sprite.height}`;
    button.append(thumbnail,name,size); button.onclick = () => select(sprite.id); $('list').append(button);
  }
  packed = null;
  $('png').disabled = $('json').disabled = true;
  const padding = Number($('padding').value);
  try {
    if (sprites.length) packed = AtlasPacking.pack(sprites, Number($('width').value), padding);
    draw();
    $('png').disabled = $('json').disabled = !packed;
    if (packed) status(`Packed ${sprites.length} sprites. Export PNG and JSON together.`);
  } catch (error) {
    selected = null; context.clearRect(0,0,canvas.width,canvas.height);
    $('dimensions').textContent = $('usage').textContent = '—'; $('selected').textContent = 'None';
    $('detail').textContent = error.message; status(error.message);
  }
}
function draw() {
  canvas.width = packed ? packed.width : 512; canvas.height = packed ? packed.height : 256;
  context.imageSmoothingEnabled = false;
  if (!packed) { $('dimensions').textContent = $('usage').textContent = '—'; select(null, false); return; }
  for (const frame of packed.frames) {
    context.drawImage(frame.image, frame.x, frame.y);
    if ($('bounds').checked || frame.id === selected) {
      context.strokeStyle = frame.id === selected ? '#bcf06c' : '#76a2ad';
      context.lineWidth = 1; context.strokeRect(frame.x+.5, frame.y+.5, Math.max(0,frame.width-1), Math.max(0,frame.height-1));
    }
  }
  $('dimensions').textContent = `${packed.width} × ${packed.height}`;
  $('usage').textContent = (100*sprites.reduce((n,s)=>n+s.width*s.height,0)/(packed.width*packed.height)).toFixed(1)+'%';
  select(selected, false);
}
function select(id, redraw = true) {
  selected = id;
  const frame = packed?.frames.find(f => f.id === id);
  $('selected').textContent = frame?.name || 'None';
  $('detail').textContent = frame ? `${frame.name} · x: ${frame.x}, y: ${frame.y}, width: ${frame.width}, height: ${frame.height}` : 'Select a sprite to inspect its exported frame coordinates.';
  for (const row of $('list').children) row.classList.toggle('active', row.dataset.id === id);
  if (redraw) draw();
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 30000);
}
$('png').onclick = () => {
  if (!packed) return;
  const clean = document.createElement('canvas'); clean.width = packed.width; clean.height = packed.height;
  const ctx = clean.getContext('2d'); ctx.imageSmoothingEnabled = false;
  for (const frame of packed.frames) ctx.drawImage(frame.image,frame.x,frame.y);
  clean.toBlob(blob => { if (blob) {download(blob,'atlas.png'); status('PNG exported without preview outlines. Export its matching JSON too.');} else status('PNG export failed.'); },'image/png');
};
$('json').onclick = () => { if (packed) {download(new Blob([JSON.stringify(AtlasPacking.metadata(packed),null,2)],{type:'application/json'}),'atlas.json'); status('Frame JSON exported. Keep it beside atlas.png.');} };
$('files').onchange = event => {loadFiles(event.target.files); event.target.value = '';};
$('drop').onkeydown = e => {if ((e.key === 'Enter' || e.key === ' ') && !busy) {e.preventDefault();$('files').click();}};
for (const name of ['dragenter','dragover']) $('drop').addEventListener(name,event=>{event.preventDefault();$('drop').classList.add('drag');});
for (const name of ['dragleave','drop']) $('drop').addEventListener(name,event=>{event.preventDefault();$('drop').classList.remove('drag');});
$('drop').addEventListener('drop',event=>loadFiles(event.dataTransfer.files));
window.addEventListener('dragover',e=>e.preventDefault()); window.addEventListener('drop',e=>e.preventDefault());
$('clear').onclick = () => {sprites=[];selected=null;refresh();status('Pack cleared.');};
$('width').onchange = $('padding').onchange = refresh;
$('bounds').onchange = draw;
canvas.onclick = event => {
  if (!packed) return; const rect=canvas.getBoundingClientRect();
  const x=(event.clientX-rect.left)*canvas.width/rect.width, y=(event.clientY-rect.top)*canvas.height/rect.height;
  select(packed.frames.find(f=>x>=f.x&&x<f.x+f.width&&y>=f.y&&y<f.y+f.height)?.id || null);
};
$('sample').onclick = () => {
  if (busy) return; sprites=[];selected=null;const used=new Set();
  const patterns=[['moss_slime',24,20,'#7acb67'],['lantern',16,28,'#f1be54'],['ruby',16,16,'#e16b79'],['blue_potion',16,24,'#70badd'],['coin',16,16,'#e1cb69'],['wood_crate',32,32,'#a27a55'],['forest_leaf',20,20,'#66b28b'],['stone_key',28,12,'#b4b9c8'],['heart',20,16,'#df7381'],['moon',20,24,'#c1b7ee'],['blade',12,32,'#9ecfd5'],['scroll',24,28,'#e0cca0']];
  for (let i=0;i<patterns.length;i++) {
    const [name,w,h,colour]=patterns[i], image=document.createElement('canvas');image.width=w;image.height=h;
    const c=image.getContext('2d'); c.fillStyle='#283540';c.fillRect(2,2,w-4,h-4);c.fillStyle=colour;
    if(name==='coin'||name==='ruby'||name==='heart') {c.fillRect(4,6,w-8,h-12);c.fillRect(6,4,w-12,h-8);} else {c.fillRect(4,4,w-8,h-8);}
    c.fillStyle='#ffffff88';c.fillRect(5,5,Math.max(2,w/3|0),2);c.fillStyle='#182731';c.fillRect(w-8,h-8,3,3);
    addSprite(image,name,used);
  }
  $('width').value='256';$('padding').value='2';refresh();status('12 original procedural sample sprites loaded. Choose a frame to inspect it.');
};
refresh();
