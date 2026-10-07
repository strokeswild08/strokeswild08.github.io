export const LIMITS = { fileBytes: 10*1024*1024, imageSide: 4096, frames: 4096, clip: 120, gifSide: 512, gifPixels: 8_000_000, pngSide: 2048 };

export function layoutFor(width,height,frameWidth,frameHeight) {
  for (const number of [width,height,frameWidth,frameHeight]) if (!Number.isInteger(number) || number < 1) throw new Error('Enter whole numbers greater than zero for the frame size.');
  if (frameWidth > 2048 || frameHeight > 2048) throw new Error('A frame can be up to 2,048 × 2,048 pixels.');
  if (frameWidth > width || frameHeight > height) throw new Error('A frame cannot be bigger than the sprite sheet.');
  const columns = Math.floor(width/frameWidth), rows = Math.floor(height/frameHeight);
  if (columns*rows > LIMITS.frames) throw new Error('That grid has over 4,096 frames. Increase the frame size.');
  return { width,height,frameWidth,frameHeight,columns,rows,total:columns*rows,hasRemainder:width%frameWidth !== 0 || height%frameHeight !== 0 };
}

export function clipFor(layout,row,first,last) {
  if (![row,first,last].every(Number.isInteger)) throw new Error('Use whole numbers for the row and clip range.');
  if (row < 1 || row > layout.rows) throw new Error(`Choose a row between 1 and ${layout.rows}.`);
  if (first < 1 || last > layout.columns || first > last) throw new Error(`Choose a valid first/last frame between 1 and ${layout.columns}.`);
  if (last-first+1 > LIMITS.clip) throw new Error('A clip can contain up to 120 frames. Choose a shorter range.');
  const offset = (row-1)*layout.columns;
  return Array.from({length:last-first+1},(_,index)=>offset+first-1+index);
}

export function sequenceFor(frames,mode) {
  if (mode === 'reverse') return [...frames].reverse();
  if (mode === 'pingpong' && frames.length > 2) return [...frames,...frames.slice(1,-1).reverse()];
  return [...frames];
}

export function frameRect(layout,index) {
  if (!Number.isInteger(index) || index < 0 || index >= layout.total) throw new Error('Frame is outside the sheet.');
  return { x:(index%layout.columns)*layout.frameWidth,y:Math.floor(index/layout.columns)*layout.frameHeight,width:layout.frameWidth,height:layout.frameHeight };
}

export function advance(index,elapsed,delta,fps,length) {
  const interval = 1/fps;
  const time = elapsed+delta;
  const steps = Math.floor((time+1e-9)/interval);
  return { index:(index+steps)%length,elapsed:Math.max(0,time-steps*interval) };
}

export function validateImageSize(width,height) {
  if (width < 1 || height < 1 || width > LIMITS.imageSide || height > LIMITS.imageSide) throw new Error('Use an image no larger than 4,096 × 4,096 pixels.');
}

export function validateImageFile(file) {
  if (!/\.(png|webp)$/i.test(file.name)) throw new Error('Choose a static PNG or WebP sprite sheet.');
  if (file.size > LIMITS.fileBytes) throw new Error('That sheet is over 10 MB. Try a smaller PNG or WebP.');
  if (!file.size) throw new Error('That image file is empty.');
}

export function validateGif(width,height,count) {
  if (width > LIMITS.gifSide || height > LIMITS.gifSide) throw new Error('GIF frames can be up to 512 × 512 px. Choose a lower export scale.');
  if (width*height*count > LIMITS.gifPixels) throw new Error('That GIF is too large for this workbench. Lower the scale or shorten the clip.');
}
