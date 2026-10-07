export class AudioBus{
  constructor(){this.enabled=false;this.context=null;}
  async toggle(){this.enabled=!this.enabled;if(this.enabled){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();await this.context.resume();this.play('select');}catch{this.enabled=false;}}return this.enabled;}
  play(type){if(!this.enabled||!this.context)return;const c=this.context,t=c.currentTime,tones={select:[390,580,.07],step:[100,80,.055],slash:[170,55,.18],arrow:[580,230,.15],fire:[140,440,.32],hit:[110,45,.2],shield:[440,660,.35],cry:[120,70,.4],victory:[330,660,.7],defeat:[110,55,.8]},[start,end,length]=tones[type]||tones.select;
    const o=c.createOscillator(),g=c.createGain();o.type=['fire','hit','cry','slash'].includes(type)?'triangle':'sine';o.frequency.setValueAtTime(start,t);o.frequency.exponentialRampToValueAtTime(end,t+length);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.11,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+length+.03);
  }
}
