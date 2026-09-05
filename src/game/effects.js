const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
export function applyEff(n, e = {}) {
  const m = n.devMult || 1;
  if (e.hp) n.hp = clamp(n.hp + e.hp);
  if (e.silver) n.silver = Math.max(0, n.silver + (e.silver > 0 ? e.silver * m : e.silver));
  if (e.exp) n.expTotal += e.exp * m;
  if (e.rep) n.rep = (n.rep || 0) + e.rep;
  if (e.favor) { n.favor = { ...n.favor }; for (const [k, d] of Object.entries(e.favor)) n.favor[k] = (n.favor[k] || 0) + d; }
  if (e.items) { n.items = { ...n.items }; for (const [k, d] of Object.entries(e.items)) n.items[k] = (n.items[k] || 0) + d; }
  if (e.rumors) n.rumors = [...(n.rumors || []), ...e.rumors.filter(r => !(n.rumors || []).includes(r))];
  if (e.letters) n.letters = [...(n.letters || []), ...e.letters];
  if (e.flag) n.flag = { ...n.flag, ...e.flag };
  if (e.npcStates) n.npcStates = { ...n.npcStates, ...e.npcStates };
  return n;
}
