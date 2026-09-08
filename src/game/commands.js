import { beginProgression } from './progression.js';
import { p0Command, settleActivity } from './p0-engine.js';
import { startCombat, retreatCombat } from './combat.js';
import { advanceFate, resolveFateChoice } from './fate-engine.js';
import { routinesForZone } from '../content/routines.js';
import { nextRandom } from './random.js';
import { claimIdleRewards } from './training.js';
import { initial } from './state.js';
import { restAtInn } from './vitals.js';
import { newSaveId } from './save-id.js';
import { SIDE_EVENTS } from '../content/p0.js';
import { reconcileStories, worldConsequences } from './story-director.js';

export function createGameReducer({ tick, settleStory, levelUpLog, ZONES, LINKS, ITEMS, RUMORS, ORIGINS, START_SKILLS, questReward, clamp, ability }) {
  const log = (s, text) => ({ ...s, log: [text, ...s.log].slice(0, 8) });
  const immediate = (s, action, seconds) => tick({ ...advanceFate(s, seconds), idle:false, p0: s.p0 ? { ...s.p0, activity:null } : s.p0, action: { ...action, left:1, total:1 } });
  const resume = s => s.action && s.action.type !== 'combat' ? immediate(s, s.action, s.action.left || 0) : s;
  function reduce(input, command, now) {
    if (command.type === 'LOAD') return resume(p0Command(beginProgression(command.state, true), { type: 'RESUME' }, now));
    if (command.type === 'RESET') return beginProgression({ ...initial(), saveId: newSaveId() });
    if (command.type === 'ENSURE_SAVE_ID') return input.saveId ? input : { ...input, saveId: newSaveId() };
    if (command.type === 'CREATE') {
      const base = initial(), origin = ORIGINS.find(x => x.id === command.origin), skill = START_SKILLS.find(x => x.id === command.skill);
      const alloc = command.alloc;
      if (!origin || !skill || !alloc || !['hp', 'ab', 'exp'].every(k => Number.isInteger(alloc[k]) && alloc[k] >= 0) || Object.values(alloc).reduce((a, b) => a + b, 0) > 5) return input;
      const name = (command.name || '').trim().slice(0, 40) || '沈孤鸿';
      return beginProgression({ ...base, saveId: newSaveId(), name, hp: clamp(base.hp + (origin.apply.hp || 0) + alloc.hp * 5 + (skill.hp || 0)),
        silver: base.silver + (origin.apply.silver || 0), expTotal: base.expTotal + (origin.apply.exp || 0) + alloc.exp * 15 + (skill.exp || 0),
        attrAb: (origin.apply.ab || 0) + alloc.ab * 2, bonusSkill: { name: skill.name, text: skill.text, bonus: skill.bonus || 0 },
        loadout: { ...base.loadout, style: skill.name }, rngState: command.seed || 1,
        log: [`${name}踏入江湖。出身${origin.name}，家传「${skill.name}」。`, ...base.log] });
    }
    if (command.type === 'HEARTBEAT') return advanceFate(tick(p0Command(input, command, now)));
    if (command.type === 'RESUME') return resume(p0Command(input, command, now));
    let s = settleActivity(input, now);
    const busy = !!s.action || !!s.battle;
    let n;
    switch (command.type) {
      case 'AUDIO': return ['muteBgm', 'muteSfx', 'muteVoice'].includes(command.key) ? { ...s, [command.key]: !s[command.key] } : s;
      case 'MULTIPLIER': return log({ ...s, devMult: s.devMult === 10 ? 1 : 10 }, `管理员：战斗测试收益调整为 ×${s.devMult === 10 ? 1 : 10}。`);
      case 'TRAVEL': {
        if (busy || !LINKS[s.loc].includes(command.to)) return s;
        const toll = [1,2,8].includes(command.to) ? worldConsequences(s).travelToll : 0;
        if(s.silver<toll) return log(s,`粮路封卡，需盘缠 ${toll} 两；可谋生或建立民间接济作保。`);
        s={...s,silver:s.silver-toll};
        n = immediate(s, { type:'travel', to:command.to }, 10); break;
      }
      case 'QUEST': {
        if (busy || !ZONES[s.loc].quests[command.index] || s.done[s.loc]?.[command.index] || (command.index > 0 && !s.done[s.loc]?.[command.index - 1])) return s;
        if (s.loc === 0 && command.index === 0) return p0Command(s, { type:'DISCOVER_EVENT', id:'jiangnan_letter' }, now);
        const q = ZONES[s.loc].quests[command.index], r = questReward(ZONES[s.loc], q.kind === 'main');
        n = immediate(s, { type:'quest', zone:s.loc, idx:command.index }, r.time); break;
      }
      case 'ROUTINE': {
        const r = routinesForZone(ZONES[s.loc]).find(x => x.id === command.id);
        if (busy || !r) return s;
        if (r.id === 'errand') return p0Command(s, { type:'START_ACTIVITY', id:'errand' }, now);
        if (r.id === 'practice') return p0Command(s, { type:'START_ACTIVITY', id:'basic', target:'fist' }, now);
        n = immediate(s, { type:'routine', zone:s.loc, id:r.id }, r.time); break;
      }
      case 'COMBAT': n = startCombat({ ...s, loadout: command.config.loadout }, command.config); break;
      case 'RETREAT': n = levelUpLog(retreatCombat(s, settleStory), s); break;
      case 'CLOSE_COMBAT': return s.battle?.settled ? { ...s, battle: null } : s;
      case 'FATE': n = resolveFateChoice(s, command.node, command.choice); break;
      case 'STORY': {
        if (busy) return s;
        const c = command.context, choice = ZONES[c.zone]?.trees[c.ti]?.nodes[c.ni]?.choices[c.ci];
        if (!choice || c.zone !== s.loc || choice.combat) return s;
        n = levelUpLog(settleStory(s, c, !choice.diff || ability(s) >= choice.diff), s); break;
      }
      case 'RUMOR': {
        if (busy || s.silver < 2) return s;
        const unknown = RUMORS.filter(r => !s.rumors.includes(r)), random = nextRandom(s.rngState);
        const rumor = unknown[Math.floor(random.value * unknown.length)];
        return log({ ...s, silver: s.silver - 2, rngState: random.seed, rumors: rumor ? [...s.rumors, rumor] : s.rumors }, rumor || '近日并无新鲜传闻。');
      }
      case 'BUY_ITEM': {
        const price = { jinchuang: 20, jiedu: 15 }[command.id];
        if (busy || !price || !ITEMS[command.id] || s.silver < price) return s;
        return log({ ...s, silver: s.silver - price, items: { ...s.items, [command.id]: (s.items[command.id] || 0) + 1 } }, `购得${ITEMS[command.id].name}。`);
      }
      case 'USE_ITEM': {
        if (busy || !s.items[command.id] || !ITEMS[command.id]?.apply) return s;
        return log({ ...s, ...ITEMS[command.id].apply(s), items: { ...s.items, [command.id]: s.items[command.id] - 1 } }, `使用了${ITEMS[command.id].name}。`);
      }
      case 'REST': return busy ? s : restAtInn(s);
      case 'CLAIM_LEGACY': return claimIdleRewards(s);
      default: {
        const next = p0Command(s, command, now);
        const moved = command.type === 'MOVE_ROOM' && next.p0.room !== s.p0.room;
        const chose = command.type === 'CHOOSE_EVENT' && next.p0.quests[command.id] !== s.p0.quests[command.id];
        return moved || chose ? advanceFate(next, moved ? 1 : 2) : next;
      }
    }
    if (n.p0 && (n.action || n.battle)) n = { ...n, idle: false, p0: { ...n.p0, activity: null } };
    return n;
  }
  return (input,command,now) => reconcileStories(reduce(reconcileStories(input,SIDE_EVENTS),command,now),SIDE_EVENTS);
}
