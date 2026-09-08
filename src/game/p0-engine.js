import { ACTIVITIES, BASICS, LESSONS, ROOMS, SIDE_EVENTS, WEAPONS } from '../content/p0.js';
import { beginProgression, trainingCap, ownsStyle } from './progression.js';
import { normalizeLoadout, STYLES } from '../content/combat.js';
import { lessonRequirements, transact, testCondition } from './world-rules.js';
import { startCombat } from './combat.js';
import { directionReason, worldConsequences } from './story-director.js';
import { growthSnapshot } from './growth-guide.js';
import { requirementReason, spend, sideChoiceReason, settleSideEvent, recordExperience, applyWorldEffects, atEventNode, eventReason } from './side-events.js';

export const OFFLINE_CAP = 8 * 60 * 60 * 1000;
const note = (s, text) => ({ ...s, log: [text, ...s.log].slice(0, 8) });
export const currentRoom = s => ROOMS[s.p0?.room]?.zone === s.loc ? s.p0.room : s.loc === 0 ? 'gate' : s.loc === 1 ? 'wudang-gate' : null;
export function activityReason(s, id, target) {
  const a = ACTIVITIES[id];
  if (!a) return '活动不存在';
  if (s.action || s.battle) return '先了结当前行动';
  if (a.rooms && !a.rooms.includes(currentRoom(s))) return '请先前往相应地点';
  if (a.sect && s.p0.sect !== 'wudang') return '需拜入武当';
  if(a.requires && !testCondition(s,a.requires)) return requirementReason(s,a.requires);
  if (id === 'basic' && !Object.hasOwn(BASICS, target)) return '请选择基本功';
  if (id === 'style' && (!Object.hasOwn(STYLES, target) || !ownsStyle(s, target))) return '尚未学会这门武学';
  if (id === 'internal' && !Object.hasOwn(s.p0.internals, target)) return '尚未学会这门内功';
  if (a.train && s.p0.potential < a.train) return '潜能不足，可先承接生活差事';
  const kind = id === 'style' ? 'styles' : 'internals';
  if (a.train && id !== 'basic' && (s.training[kind][target] || 0) >= trainingCap(s, kind, target)) return '已达当前上限，需演练基本功或向师傅进修';
  if (id === 'basic' && s.p0.basics[target] >= 8100) return '基本功已臻圆满';
  return '';
}
export function settleActivity(s, now, report = false) {
  const a = s.p0?.activity;
  if (!a || !Number.isFinite(now)) return s;
  if (now < a.settledAt) return note(s, '计时未前进，本次不结算修炼。');
  const definition = ACTIVITIES[a.id];
  if (s.action || s.battle) return { ...s, p0: { ...s.p0, activity: null } };
  const elapsed = Math.min(now - a.settledAt, OFFLINE_CAP);
  const total = elapsed + a.remainder;
  let units = Math.floor(total / (definition.seconds * 1000));
  let n = { ...s, p0: { ...s.p0, activity: { ...a, settledAt: now, remainder: total % (definition.seconds * 1000) } } };
  let earned = {};
  if (definition.train) {
    const kind = a.id === 'style' ? 'styles' : 'internals';
    const before = a.id === 'basic' ? s.p0.basics[a.target] : s.training[kind][a.target] || 0;
    const cap = a.id === 'basic' ? 8100 : trainingCap(s, kind, a.target);
    units = Math.min(units, Math.floor(s.p0.potential / definition.train));
    const gain = Math.min(units * definition.train, Math.max(0, cap - before));
    n.p0.potential -= gain;
    if (a.id === 'basic') n.p0.basics = { ...s.p0.basics, [a.target]: before + gain };
    else n.training = { ...s.training, [kind]: { ...s.training[kind], [a.target]: before + gain } };
    earned = { training: gain, potential: -gain };
    if (before + gain >= cap || n.p0.potential < definition.train) n.p0.activity = null;
  } else {
    for (const key of ['silver', 'potential', 'herbs', 'contribution']) if (definition[key]) earned[key] = units * definition[key];
    n = applyWorldEffects(n, earned);
    if (definition.knowledge) { earned.knowledge = Math.min(100, s.p0.knowledge + units) - s.p0.knowledge; n.p0.knowledge += earned.knowledge; }
    if (definition.hp) { n.hp = Math.min(100, s.hp + units * definition.hp); earned.hp = n.hp - s.hp; }
    if (definition.mp) { n.mp = Math.min(100, s.mp + units * definition.mp); earned.mp = n.mp - s.mp; }
    if ((a.id === 'rest' && n.hp === 100 && n.mp === 100) || (a.id === 'read' && n.p0.knowledge >= 100)) n.p0.activity = null;
  }
  const summary={elapsed:Math.min(28800000,(a.summary?.elapsed || 0)+elapsed),earned:{...a.summary?.earned},before:a.summary?.before || growthSnapshot(s)};
  for(const [key,value] of Object.entries(earned)) summary.earned[key]=(summary.earned[key] || 0)+value;
  if(n.p0.activity) n.p0.activity={...n.p0.activity,summary};
  if ((report && elapsed >= 1000 && Object.values(earned).some(value=>value!==0)) || (units>0 && !n.p0.activity)) {
    const reason=n.p0.activity?'仍在继续':definition.train?(n.p0.potential<definition.train?'潜能不足，可先谋生或担师门差事':'已达基本功或师承上限，须先演练基本功或通过考核'):'气息已平或书中所学已尽';
    n.p0.report = { id: a.id, target: a.target, seconds: Math.floor((report?elapsed:summary.elapsed) / 1000), earned:report?earned:summary.earned, capped: now - a.settledAt > OFFLINE_CAP, stopped: !n.p0.activity, reason, before:report?growthSnapshot(s):summary.before,after:growthSnapshot(n) };
  }
  return n;
}

export function p0Command(input, command, now) {
  let s = beginProgression(input);
  if (command.type === 'HEARTBEAT') return settleActivity(s, now);
  if (command.type === 'RESUME') return settleActivity(s, now, true);
  if (command.type === 'DISMISS_REPORT') return { ...s, p0: { ...s.p0, report: null } };
  s = settleActivity(s, now);
  const roomId = currentRoom(s), p = s.p0;
  if (s.action || s.battle) return note(s, '先了结当前行动，再作安排。');
  const stop = value => ({ ...value, p0: { ...value.p0, activity: null } });
  switch (command.type) {
    case 'START_ACTIVITY': {
      const reason = activityReason(s, command.id, command.target);
      if (reason) return note(s, reason);
      return note({ ...s, p0: { ...p, activity: { id: command.id, target: command.target || '', settledAt: now, remainder: 0, summary:{elapsed:0,earned:{},before:growthSnapshot(s)} } } }, ACTIVITIES[command.id].text);
    }
    case 'STOP_ACTIVITY': return stop(s);
    case 'MOVE_ROOM': {
      const target = ROOMS[command.id];
      if (!target || !ROOMS[roomId]?.exits.includes(command.id) || target.zone !== s.loc) return note(s, '此路不通。');
      return note(stop({ ...s, p0: { ...p, room: command.id, discovered: [...new Set([...p.discovered, command.id])] } }), `来到${target.name}。`);
    }
    case 'DISCOVER_EVENT': {
      const event = SIDE_EVENTS[command.id];
      if (!event || directionReason(s,command.id,event) || !atEventNode({ ...s, p0: { ...p, room: roomId } }, event.nodes[event.start]) || eventReason(s, event) || p.quests[command.id]) return s;
      return recordExperience(stop({ ...s, p0: { ...p, quests: { ...p.quests, [command.id]: { node: event.start, pending: null, done: false, startedAt:s.worldTime } } } }), command.id, event.start, 'discover', 'discovered', event.nodes[event.start].hearsay);
    }
    case 'CHOOSE_EVENT': {
      const reason = sideChoiceReason({ ...s, p0: { ...p, room: roomId } }, command.id, command.choice);
      if (reason) return note(s, reason);
      const progress = p.quests[command.id], choice = SIDE_EVENTS[command.id].nodes[progress.node].choices.find(c => c.id === command.choice);
      s = stop(transact(s, { requires: choice.requires, cost: choice.cost }).state);
      const context = { kind: 'side', eventId: command.id, nodeId: progress.node, choiceId: choice.id };
      if (choice.combat) {
        s.p0 = { ...s.p0, quests: { ...s.p0.quests, [command.id]: { ...progress, pending: choice.id } } };
        return startCombat(s, { ...choice.combat, place: ROOMS[roomId]?.name || SIDE_EVENTS[command.id].name, context });
      }
      return settleSideEvent(s, context, true);
    }
    case 'LEARN_SKILL': {
      const baseLesson = LESSONS[command.id];
      const lesson = baseLesson && {...baseLesson,silver:Math.max(0,baseLesson.silver-worldConsequences(s).teachingDiscount)};
      if (!lesson || lesson.room !== roomId) return note(s, '请先找到传授此功的师傅。');
      const kind = lesson.kind === 'style' ? 'styles' : 'internals';
      if (p[kind][lesson.target]) return note(s, '此功已经学过。');
      const reason = requirementReason(s, lessonRequirements(lesson));
      if (reason) return note(s, reason);
      s = stop(spend(s, { silver: lesson.silver, potential: lesson.potential, contribution: lesson.contribution || 0 }));
      s.p0 = { ...s.p0, [kind]: { ...s.p0[kind], [lesson.target]: { cap: lesson.cap, source: ROOMS[roomId].name } } };
      return recordExperience(s, 'teaching', command.id, 'learn', 'success', `师傅传授${lesson.name}，此后可自行修炼。`);
    }
    case 'JOIN_SECT': {
      if (roomId !== 'wudang-gate' || p.sect) return s;
      return p0Command(s, {type:'DISCOVER_EVENT',id:'wudang_entry'}, now);
    }
    case 'EXAM': {
      s = p0Command(s, { type: 'DISCOVER_EVENT', id: 'wudang_exam' }, now);
      return p0Command(s, { type: 'CHOOSE_EVENT', id: 'wudang_exam', choice: 'test' }, now);
    }
    case 'BUY_WEAPON': {
      const weapon = WEAPONS[command.id];
      if (roomId !== 'smith' || !weapon || p.weapons.includes(command.id) || s.silver < weapon.price) return s;
      return note({ ...s, silver: s.silver - weapon.price, p0: { ...p, weapons: [...p.weapons, command.id] } }, `购得${weapon.name}。`);
    }
    case 'EQUIP_WEAPON': {
      if (!p.weapons.includes(command.id)) return s;
      const n = stop({ ...s, p0: { ...p, weapon: command.id } });
      return { ...n, loadout: normalizeLoadout(n) };
    }
    case 'EQUIP_LOADOUT': return stop({ ...s, loadout: normalizeLoadout(s, command.loadout) });
    case 'SELL_HERBS': {
      if (roomId !== 'pharmacy' || p.materials.herbs < 1) return s;
      return applyWorldEffects(s, { herbs: -1, silver: worldConsequences(s).herbPrice });
    }
    case 'BUY_MEDICINE': {
      if (roomId !== 'pharmacy' || s.silver < worldConsequences(s).medicinePrice) return s;
      return { ...s, silver: s.silver - worldConsequences(s).medicinePrice, hp: Math.min(100, s.hp + 30) };
    }
    case 'INN_REST': {
      if (roomId !== 'inn' || s.silver < 5 || s.hp===100 && s.mp===100) return s;
      return stop({ ...s, silver: s.silver - 5, hp: 100, mp: 100 });
    }
    default: return s;
  }
}
export function settleP0Combat(s, context, won) {
  if (context.kind === 'side') return settleSideEvent(s, context, won);
  // v1-v6 examination battles resume through the same event contract.
  if (context.kind !== 'exam' || s.p0.rank > 0) return s;
  const bridged = { ...s, p0: { ...s.p0, quests: { ...s.p0.quests, wudang_exam: { node: 'test', pending: 'test', done: false } } } };
  return settleSideEvent(bridged, { kind: 'side', eventId: 'wudang_exam', nodeId: 'test', choiceId: 'test' }, won);
}
