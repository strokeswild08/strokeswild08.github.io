import { encodeGif } from './gif.js';
self.onmessage=event=>{
  try {
    const {frames,width,height,fps}=event.data;
    const bytes=encodeGif(frames,width,height,fps,(done,total)=>self.postMessage({progress:[done,total]}));
    self.postMessage({bytes},[bytes.buffer]);
  } catch(error) { self.postMessage({error:error.message || 'GIF encoding failed.'}); }
};
