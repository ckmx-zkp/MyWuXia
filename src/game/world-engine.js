import { ZONES } from '../content/world.js';
import { QUEST_COMBATS } from '../content/combat.js';
import { startCombat, advanceCombat } from './combat.js';
import { createEncounterSettlement } from './encounter-settlement.js';
import { nextRandom } from './random.js';
import { applyEff } from './effects.js';

export function createWorldEngine({ ability, questReward, clamp, ITEMS, ROAD, FAC, FAC_DEFAULT, levelUpLog }) {
  const treeKey = (zone, id) => `${zone}:${id}`;
  function resolveQuest(s, combatResult, rng) {
    const { zone, idx } = s.action;
    const z = ZONES[zone], q = z.quests[idx], main = q.kind === 'main';
    const r = questReward(z, main);
    const arr = (s.done[zone] || [false, false, false, false]).slice();
    const n = { ...s, action: null, fx: null, done: { ...s.done, [zone]: arr } };
    const ab = ability(s);
    const p = main ? 1 : Math.max(0.25, Math.min(0.95, 0.45 + (ab / z.danger) * 0.55));
    if (combatResult === undefined ? rng() < p : combatResult || main) {
      const m = s.devMult || 1;
      arr[idx] = true;
      n.silver += r.silver * m;
      n.expTotal += r.exp * m;
      if (combatResult === undefined) n.hp = clamp(n.hp + r.hp);
      let gain = `银两 +${r.silver * m}、历练 +${r.exp * m}`;
      if (q.item) {
        n.items = { ...n.items, [q.item]: (n.items[q.item] || 0) + 1 };
        gain += `、${ITEMS[q.item].name} ×1`;
      }
      let msg = `完成${main ? '小主线' : '支线'}「${q.name}」，${gain}。`;
      if (main && (combatResult === false || ab < z.danger)) msg = '有高人暗中相助，' + msg;
      n.fx = 'quest';
      n.log = [msg, ...s.log];
    } else {
      if (combatResult === undefined) n.hp = clamp(n.hp - 12);
      n.expTotal += 5 * (s.devMult || 1);
      n.fx = 'click';
      n.log = [`「${q.name}」行事受挫，带伤而返，仅得历练 5。养足气血或提升实力再来。`, ...s.log];
    }
    n.log = n.log.slice(0, 8);
    return n;
  }
  function resolveTravel(s, combatResult, rng) {
    const to = s.action.to;
    const n = { ...s, action: null, fx: 'bell', loc: to, log: [`抵达${ZONES[to].name}。`, ...s.log] };
    if (!(s.visited || []).includes(to)) n.visited = [...(s.visited || [0]), to];
    if (combatResult !== undefined) {
      n.silver = Math.max(0, n.silver + (combatResult ? 15 * (s.battle?.rewardMult || s.devMult || 1) : -10));
      n.log = [combatResult ? '你逼退拦路山贼，收回被劫的盘缠，继续赶路。' : '你舍下少许盘缠脱身，带伤走完余下路程。', ...n.log].slice(0, 8);
      return n;
    }
    const roll = rng();
    if (roll < 0.45) {
      const event = Math.floor(roll * 1000) % (ROAD.length + 1);
      if (event === 0) return startCombat({ ...s, action: null }, { opponent: 'bandit', danger: ZONES[to].danger,
        place: `${ZONES[s.loc].name}至${ZONES[to].name}途中`, context: { kind: 'travel', to } });
      const [text, patch] = ROAD[event - 1](n, ZONES[to]);
      Object.assign(n, patch);
      n.hp = clamp(n.hp);
      n.log = [text, ...n.log];
    }
    n.log = n.log.slice(0, 8);
    return n;
  }
  const settleStory = createEncounterSettlement({ ZONES, treeKey, applyEff, resolveQuest, resolveTravel });
  function tick(s) {
    if (s.action?.type === 'combat') return levelUpLog(advanceCombat(s, settleStory), s);
    if (s.action?.type === 'spar') {
      const ready = { ...s, action: null };
      return startCombat(ready, { danger: ZONES[s.action.zone].danger, place: (FAC[s.action.zone] || FAC_DEFAULT).gym });
    }
    if (s.action) {
      const a = { ...s.action, left: s.action.left - 1 };
      const n = { ...s, action: a };
      if (a.left <= 0) {
        const opponent = a.type === 'quest' && QUEST_COMBATS[ZONES[a.zone].quests[a.idx].name];
        if (opponent) return startCombat({ ...n, action: null }, { opponent, danger: ZONES[a.zone].danger,
          place: ZONES[a.zone].quests[a.idx].name, context: { kind: 'quest', zone: a.zone, idx: a.idx } });
        const random = nextRandom(n.rngState);
        const seeded = { ...n, rngState: random.seed };
        return levelUpLog(a.type === 'quest' ? resolveQuest(seeded, undefined, () => random.value) : resolveTravel(seeded, undefined, () => random.value), s);
      }
      return n;
    }
    return s.fx ? { ...s, fx: null } : s;
  }

  return { tick, settleStory, resolveQuest, resolveTravel };
}
