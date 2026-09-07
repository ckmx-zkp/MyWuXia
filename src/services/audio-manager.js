import { BGM } from '../content/audio.js';

export function createAudioManager(platform) {
  const pool = new Map(), fades = new Map(), tracks = new Set(), delays = new Set();
  let current = null, source = null, voice = null, generation = 0, line = () => {}, speaking = false;
  const target = () => speaking ? .15 : .5;
  const cancelFade = a => { if (fades.has(a)) platform.clearInterval(fades.get(a)); fades.delete(a); };
  const release = a => { cancelFade(a); a.pause(); a.src = ''; tracks.delete(a); };
  function fade(a, volume, ms, done) {
    cancelFade(a);
    if (a.volume === volume) { done?.(); return; }
    const start = a.volume, steps = Math.max(1, Math.ceil(ms / 50)); let step = 0;
    fades.set(a,platform.interval(() => {
      a.volume = Math.max(0,Math.min(1,start + (volume - start) * ++step / steps));
      if (step >= steps) { cancelFade(a); done?.(); }
    },50));
  }
  function later(fn,ms) {
    const id = platform.timeout(() => { delays.delete(id); fn(); },ms); delays.add(id);
  }
  function halt() {
    generation++;
    for (const id of delays) platform.clearTimeout(id); delays.clear();
    if (voice) { voice.onended = null; voice.onerror = null; release(voice); voice = null; }
  }
  function stopVoice() {
    halt(); speaking = false; line(-1);
    if (current && !current.paused) fade(current,target(),600);
  }
  function bgmSwitch(zone,mute) {
    try {
      if (mute) { if (current) { cancelFade(current); current.pause(); } return; }
      const src = BGM[zone];
      if (source === src && current) {
        const a = current;
        if (a.paused) a.play().then(() => { if (current === a) fade(a,target(),800); }).catch(() => {});
        return;
      }
      if (current) { const old = current; fade(old,0,400,() => release(old)); }
      source = src; const a = platform.create(src); current = a; tracks.add(a); a.loop = true; a.volume = 0;
      a.play().then(() => { if (current === a && !a.paused) fade(a,target(),1200); }).catch(() => {});
    } catch { /* An unavailable audio device must not block a game command. */ }
  }
  function play(src,mute) {
    if (mute) return;
    try { if (!pool.has(src)) pool.set(src,platform.create(src)); const a = pool.get(src); a.volume = 1; a.currentTime = 0; a.play().catch(() => {}); } catch { /* Optional output. */ }
  }
  function queue(srcs,mute,indices = []) {
    if (mute || !srcs.length) return;
    halt(); speaking = true; const token = generation; let index = 0;
    if (current && !current.paused) fade(current,target(),300);
    const next = () => {
      if (token !== generation) return;
      if (voice) { voice.onended = null; voice.onerror = null; release(voice); voice = null; }
      if (index >= srcs.length) { stopVoice(); return; }
      const i = index++; line(indices[i] ?? -1);
      try {
        const a = platform.create(srcs[i]); voice = a; tracks.add(a); a.volume = 1;
        let finished = false;
        const finish = ms => { if (!finished && token === generation) { finished = true; later(next,ms); } };
        a.onended = () => finish(420); a.onerror = () => finish(80); a.play().catch(() => finish(80));
      } catch { later(next,80); }
    };
    next();
  }
  function dispose() {
    halt(); speaking = false; line(-1);
    for (const a of [...tracks]) release(a);
    for (const a of pool.values()) { a.pause(); a.src = ''; } pool.clear();
    current = null; source = null;
  }
  return { play, bgmSwitch, stopVoice, dispose, onLine: callback => { line = callback; },
    playVoice: (src,mute) => queue(src ? [src] : [],mute),
    playDialogues(dialogues,mute,from = 0) { const rows = (dialogues || []).map((d,i) => ({src:d[2],i})).filter(d => d.src && d.i >= from); queue(rows.map(d => d.src),mute,rows.map(d => d.i)); },
  };
}
