import { ZONES } from '../src/content/world.js';
import { loadZoneQuests } from '../src/content/quest-loader.js';
await Promise.all(ZONES.map((_, i) => loadZoneQuests(i)));
