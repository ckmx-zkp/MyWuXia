import { canResolveChoice } from './quest-guards.js';
import { settleP0Combat } from './p0-engine.js';
import { storyNext } from './story-graph.js';
import { applyEffects } from './world-rules.js';
import { STORY_ARCS } from '../content/story-arcs.js';

export function createEncounterSettlement({ ZONES, treeKey, applyEff, resolveQuest, resolveTravel, resolveRoutine }) {
  return function settleStory(s, context, success) {
    if (context.kind === 'side' || context.kind === 'exam') return settleP0Combat(s, context, success);
    if (context.kind === 'quest') {
      const next = resolveQuest({ ...s, action: { type: 'quest', zone: context.zone, idx: context.idx } }, success);
      next.battle = { ...next.battle, result: `${next.battle.result}\n\n${next.log[0]}` };
      return next;
    }
    if (context.kind === 'travel') {
      const next = resolveTravel({ ...s, action: { type: 'travel', to: context.to } }, success);
      next.battle = { ...next.battle, result: `${next.battle.result}\n\n${next.log[0]} 抵达${ZONES[context.to].name}。` };
      return next;
    }
    if (context.kind === 'routine') {
      const next = resolveRoutine({ ...s, action: { type: 'routine', zone: context.zone, id: context.id } }, success);
      next.battle = { ...next.battle, result: `${next.battle.result}\n\n${next.log[0]}` };
      return next;
    }
    if (context.failedCheck) success = false;
    const { zone, ti, ni, ci } = context;
    const tree = ZONES[zone]?.trees?.[ti], node = tree?.nodes[ni], choice = node?.choices[ci];
    const key = treeKey(zone, tree?.id);
    if (!choice || !canResolveChoice(s, key, ni, choice)) return s;
    const effect = success ? choice.ok : choice.fail || choice.ok;
    let next = { ...s, fx: null };
    if (choice.cost?.silver) next.silver -= choice.cost.silver;
    if (choice.cost?.item) next.items = { ...next.items, [choice.cost.item]: next.items[choice.cost.item] - 1 };
    // 战斗伤势已结算，避免剧情再次重复扣血。
    next = applyEff(next, s.battle?.context ? { ...effect, hp: 0 } : effect);
    const nextNode = storyNext(tree,ni,choice,success);
    if(success && choice.worldEffects && next.p0) next=applyEffects(next,choice.worldEffects);
    next.treeDone = { ...next.treeDone, [key]: nextNode };
    next.questChoices = { ...next.questChoices, [key]: { ...next.questChoices[key], [ni]: { choice: ci, success } } };
    next.flag = { ...next.flag, [`${key}:${ni}`]: success ? 'success' : 'soft-failure' };
    const last = nextNode === tree.nodes.length;
    const reward = success && choice.ending ? {...tree.reward,...choice.ending} : tree.reward;
    if (last) {
      next = applyEff(next, reward);
      next.flag = { ...next.flag, [`${key}:complete`]: true };
      const arc=STORY_ARCS[tree.id];
      if(arc) next.npcStates={...next.npcStates,[arc.actor]:success && choice.ending?choice.ending.text:arc.stage};
    }
    const aftermath = effect.text + (last && reward.text!==effect.text ? `\n\n${reward.text}` : '') + (node.hearsay ? `\n\n江湖传闻：${node.hearsay}` : '');
    if (s.battle?.context) next.battle = { ...next.battle, result: `${next.battle.result}\n\n${aftermath}` };
    next.log = [`【${tree.name}】${node.name}，${success ? '事成' : '受挫脱身，后事仍待你行走'}。`, ...next.log].slice(0, 8);
    return next;
  }
}
