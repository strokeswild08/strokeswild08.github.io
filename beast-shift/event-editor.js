'use strict';
(function () {
  const api = AnimationEvents, get = id => document.getElementById(id);
  const KEY = 'wild-strokes.beast-shift.events.v1';
  let events = [], audio = null, lastFrame = 0, storageWarning = false, flashTimer;
  function message(text) { get('eventMessage').textContent = text; }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(api.exportData(events))); storageWarning = false; }
    catch (_) { storageWarning = true; message('Browser storage is unavailable. Export JSON to keep your markers.'); }
  }
  function button(text, label, action) {
    const b = document.createElement('button'); b.textContent = text;
    b.setAttribute('aria-label', label); b.onclick = action; return b;
  }
  function redraw() {
    const list = get('eventList'), lane = get('eventLane'); list.replaceChildren(); lane.replaceChildren();
    get('eventCount').textContent = `${events.length} ${events.length === 1 ? 'marker' : 'markers'}`;
    get('emptyEvents').hidden = events.length > 0;
    events.forEach((e, index) => {
      const row = document.createElement('div'); row.className = 'event-row';
      row.append(button(String(e.frame).padStart(3, '0'), `Jump to ${e.name}, frame ${e.frame}`, () => seek(e.frame - 1)));
      const detail = document.createElement('div'), title = document.createElement('strong'), meta = document.createElement('span');
      title.textContent = e.name; meta.textContent = `${e.type.replace('_', ' ')} · ${((e.frame - 1) / 10).toFixed(1)}s`;
      detail.append(title, meta); row.append(detail);
      row.append(button('Edit', `Edit ${e.name}`, () => {
        seek(e.frame - 1); get('eventName').value = e.name; get('eventType').value = e.type;
        get('eventFrame').value = e.frame; get('eventEdit').value = index;
        get('saveEvent').textContent = 'Save changes'; get('cancelEdit').hidden = false; get('eventName').focus();
      }));
      row.append(button('×', `Remove ${e.name}`, () => { events.splice(index, 1); cancelEdit(); save(); redraw(); }));
      list.append(row);
      const marker = button('◆', `${e.name}: ${e.type}, frame ${e.frame}`, () => seek(e.frame - 1));
      marker.title = `${e.name} · frame ${e.frame}`; marker.className = `event-marker ${e.type}`;
      marker.style.left = `${(e.frame - 1) / 101 * 100}%`; lane.append(marker);
    });
  }
  function cancelEdit() {
    get('eventEdit').value = ''; get('saveEvent').textContent = 'Add marker'; get('cancelEdit').hidden = true;
  }
  get('eventForm').onsubmit = e => {
    e.preventDefault();
    try {
      const candidate = { name: get('eventName').value, type: get('eventType').value, frame: Number(get('eventFrame').value) };
      const next = [...events], editing = get('eventEdit').value;
      if (editing === '') next.push(candidate); else next[Number(editing)] = candidate;
      events = api.normalize(next); cancelEdit(); save(); redraw();
      if (!storageWarning) message('Marker saved. Play the animation to preview its timing.');
    } catch (error) { message(error.message); }
  };
  get('cancelEdit').onclick = cancelEdit;
  get('useFrame').onclick = () => { get('eventFrame').value = lastFrame + 1; };
  get('sampleEvents').onclick = () => {
    const sample = [{ frame: 32, type: 'sound', name: 'Transformation cue' },
      { frame: 51, type: 'screen_shake', name: 'Shift shake' }, { frame: 62, type: 'impact', name: 'Creature reveal' }];
    try {
      events = api.normalize([...events, ...sample.filter(s => !events.some(e => e.frame === s.frame && e.type === s.type && e.name === s.name))]);
      cancelEdit(); save(); redraw(); if (!storageWarning) message('Sample timings added. Adjust them to suit your animation.');
    } catch (error) { message(error.message); }
  };
  get('exportEvents').onclick = () => {
    const blob = new Blob([JSON.stringify(api.exportData(events), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'beast-shift-events.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); message('Event JSON exported.');
  };
  get('importEvents').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 250000) throw new Error('Choose a JSON file smaller than 250 KB.');
      const imported = api.importData(JSON.parse(await file.text()));
      events = imported; cancelEdit(); save(); redraw(); if (!storageWarning) message('Imported markers replaced the current list.');
    } catch (error) { message(`Import failed: ${error.message} Current markers were kept.`); }
    finally { e.target.value = ''; }
  };
  function prepareAudio() {
    if (!get('soundPreview').checked) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => message('Audio preview is unavailable. Visual markers still work.'));
    } catch (_) { get('soundPreview').checked = false; message('This browser does not support audio preview.'); }
  }
  get('soundPreview').onchange = prepareAudio;
  function tone(type) {
    if (!get('soundPreview').checked || !audio || audio.state !== 'running') return;
    const osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    osc.type = type === 'impact' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(type === 'impact' ? 110 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(type === 'impact' ? 40 : 220, now + .12);
    gain.gain.setValueAtTime(.12, now); gain.gain.exponentialRampToValueAtTime(.001, now + .15);
    osc.connect(gain); gain.connect(audio.destination); osc.start(now); osc.stop(now + .16);
  }
  window.EventDesk = {
    onView(index) { lastFrame = index; get('eventCursor').style.left = `${index / 101 * 100}%`; },
    prepareAudio,
    onFrame(index) {
      const hits = api.atFrame(events, index);
      for (const event of hits) {
        get('eventPulse').textContent = `${event.name} · frame ${event.frame}`;
        clearTimeout(flashTimer); get('eventPulse').classList.add('firing');
        flashTimer = setTimeout(() => get('eventPulse').classList.remove('firing'), 450);
        if (event.type === 'screen_shake' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          canvas.animate([{ transform: 'translate(0)' }, { transform: 'translate(-5px, 2px)' },
            { transform: 'translate(5px, -2px)' }, { transform: 'translate(0)' }], { duration: 180 });
        }
        if (event.type === 'sound' || event.type === 'impact') tone(event.type);
      }
    }
  };
  try { const saved = localStorage.getItem(KEY); if (saved) events = api.importData(JSON.parse(saved)); }
  catch (_) { message('Saved markers could not be loaded. Import a JSON backup or add new markers.'); }
  redraw();
})();
