import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadMinimaxKey(path = process.env.JIANGHU_KEY_PATH || join(ROOT, 'Key.txt')) {
  if (process.env.MINIMAX_API_KEY) return process.env.MINIMAX_API_KEY.trim();
  if (!existsSync(path)) return '';
  const raw = readFileSync(path, 'utf8');
  const line = raw.split(/\r?\n/).map(text => text.trim()).find(text => text && !text.startsWith('#'));
  if (!line) return '';
  if (line.includes('=')) {
    const [, value = ''] = line.split(/=(.*)/s);
    return value.trim().replace(/^["']|["']$/g, '');
  }
  return line;
}
