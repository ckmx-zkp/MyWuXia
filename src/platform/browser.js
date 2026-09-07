// Browser implementation of the platform boundary. Game rules receive time explicitly.
export const browserPlatform = {
  now: () => Date.now(),
  hidden: () => document.hidden,
  seed: () => crypto.getRandomValues(new Uint32Array(1))[0] || 1,
  storage: {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key,value) => window.localStorage.setItem(key,value),
    removeItem: key => window.localStorage.removeItem(key),
  },
  every(fn,ms) { const id = setInterval(fn,ms); return () => clearInterval(id); },
  lifecycle({save,visibility}) {
    window.addEventListener('beforeunload',save); window.addEventListener('pagehide',save);
    document.addEventListener('visibilitychange',visibility);
    return () => { window.removeEventListener('beforeunload',save); window.removeEventListener('pagehide',save); document.removeEventListener('visibilitychange',visibility); };
  },
  audio: { create: src => new Audio(src), interval: (fn,ms) => setInterval(fn,ms), clearInterval: id => clearInterval(id), timeout: (fn,ms) => setTimeout(fn,ms), clearTimeout: id => clearTimeout(id) },
  exportSave(text) {
    const url = URL.createObjectURL(new Blob([text], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = `jianghu-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  },
};
