import { encodeGif } from './gif.js?v=2';
self.onmessage=event=>{
  try {
    const {frames,width,height,fps,loop}=event.data;
    const bytes=encodeGif(frames,width,height,fps,(done,total)=>self.postMessage({progress:[done,total]}),loop);
    self.postMessage({bytes},[bytes.buffer]);
  } catch(error) { self.postMessage({error:error.message || 'GIF encoding failed.'}); }
};
