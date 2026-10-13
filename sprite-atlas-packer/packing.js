/* Deterministic shelf packing. Shared by the browser UI and Node tests. */
(function (root) {
  'use strict';
  function pack(items, width, padding, maxHeight = 4096) {
    if (!Number.isInteger(width) || width < 1 || width > 4096 || !Number.isInteger(padding) || padding < 0 || padding > 32) throw new Error('Invalid packing settings.');
    const ordered = items.map(item => {
      if (!Number.isInteger(item.width) || !Number.isInteger(item.height) || item.width < 1 || item.height < 1) throw new Error('Invalid sprite dimensions.');
      return {...item};
    }).sort((a, b) => b.height - a.height || b.width - a.width || String(a.id).localeCompare(String(b.id)));
    let x = padding, y = padding, shelfHeight = 0;
    const frames = [];
    for (const item of ordered) {
      if (item.width + padding * 2 > width) throw new Error(`${item.name || item.id} is wider than the atlas. Increase atlas width.`);
      if (x + item.width + padding > width) { x = padding; y += shelfHeight + padding; shelfHeight = 0; }
      if (y + item.height + padding > maxHeight) throw new Error(`Atlas exceeds ${maxHeight}px height. Increase width or reduce the batch.`);
      frames.push({...item, x, y});
      x += item.width + padding;
      shelfHeight = Math.max(shelfHeight, item.height);
    }
    return {width, height: frames.length ? y + shelfHeight + padding : 1, frames};
  }
  function metadata(result, image = 'atlas.png') {
    const frames = {};
    for (const item of result.frames) {
      if (Object.hasOwn(frames, item.name)) throw new Error('Duplicate frame name.');
      Object.defineProperty(frames, item.name, {enumerable: true, value: {
        frame: {x: item.x, y: item.y, w: item.width, h: item.height},
        rotated: false, trimmed: false,
        spriteSourceSize: {x: 0, y: 0, w: item.width, h: item.height},
        sourceSize: {w: item.width, h: item.height}
      }});
    }
    return {frames, meta: {app: 'Wild Strokes Atlas Packer', version: '1.0', image, format: 'RGBA8888', size: {w: result.width, h: result.height}, scale: '1'}};
  }
  const api = {pack, metadata};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtlasPacking = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
