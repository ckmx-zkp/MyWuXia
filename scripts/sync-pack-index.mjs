import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../src/content/packs/', import.meta.url);
const files = [];
const ids = new Set();
for (const name of readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
  const pack = JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
  if (!pack.id || !pack.event?.nodes?.[pack.event.start]) {
    console.warn(`跳过结构不完整的包 ${name}`);
    continue;
  }
  const nodes = pack.event.nodes;
  const hasTerminal = Object.values(nodes).some(node => node.terminal);
  if (!hasTerminal) {
    console.warn(`跳过无终局的包 ${name}`);
    continue;
  }
  if (ids.has(pack.id)) throw new Error(`${name}: duplicate id ${pack.id}`);
  ids.add(pack.id);
  files.push(name);
}
const imports = files.map((name, i) => `import p${i} from './packs/${name}' with { type: 'json' };`).join('\n');
const output = `${imports}
const packs = [${files.map((_, i) => `p${i}`).join(', ')}];
export const PACK_EVENTS = Object.fromEntries(packs.map(p => [p.id, {
  name: p.event.name, start: p.event.start, requires: p.event.requires || {}, version: p.event.version || 1, nodes: p.event.nodes,
}]));
`;
const path = new URL('../src/content/side-packs.js', import.meta.url);
if (process.argv.includes('--check')) {
  const current = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  if (current !== output) throw new Error('Pack index is stale. Run npm run content:index.');
} else writeFileSync(path, output, 'utf8');
