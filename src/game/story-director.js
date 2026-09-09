import { STORY_ARCS } from '../content/story-arcs.js';
import { testCondition } from './world-rules.js';
import { PACK_POLICY } from '../content/pack-policy.js';

// Archives stay readable for accepted saves; only causally grounded packs start anew.
export const CURATED_PACKS = Object.fromEntries(Object.entries(PACK_POLICY).map(([id,p])=>[id,p.arc]));
export function directionReason(s,id,event) {
  if (s.p0?.quests[id] && !event.arcId) return ''; // Preserve old accepted contracts.
  if (/^(bxj|ldj|tlb|xajh)_/.test(id)) {
    const arc=STORY_ARCS[CURATED_PACKS[id]];
    if (!arc) return '此篇旧闻暂未接入当前人物因果';
    if (!s.flag[`${arc.zone}:${CURATED_PACKS[id]}:complete`]) return '须先经历相关人物主线';
    if(s.p0?.facts[PACK_POLICY[id].world]) return '相关安置已有着落，不再重复招徕同类委托';
  }
  if (event.expiresWhen && testCondition(s,event.expiresWhen)) return '人物已进入下一阶段，此时的介入已不适用';
  if (event.window && s.p0?.quests[id]?.startedAt !== undefined && s.worldTime-s.p0.quests[id].startedAt>=event.window) return '会面约期已过';
  return '';
}
export function reconcileStories(s,events) {
  if (!s.p0 || s.battle || s.action) return s;
  let n=s;
  for (const [id,q] of Object.entries(s.p0.quests)) {
    const event=events[id];
    if(q.done || !event?.timeout || !directionReason(n,id,event)) continue;
    const arc=STORY_ARCS[event.arcId];
    n={...n,p0:{...n.p0,quests:{...n.p0.quests,[id]:{...q,node:event.timeout,done:true,pending:null}},facts:{...n.p0.facts,[`${arc.id}_expired`]:true}},log:[`【${event.name}】约期或人物阶段已变，可处理错过之后的安置。`,...n.log].slice(0,8)};
  }
  return n;
}
export function worldConsequences(s) {
  const f=s.p0?.facts || {}, allied=['alliance','alliance_end'].includes(s.fate?.node), conflict=['conflict','conflict_end'].includes(s.fate?.node);
  const clinic=s.loc===1 && s.p0?.room==='hanshui-clinic', hanshuiSafe=f.hanshui_joint || f.hanshui_staged;
  return {
    medicinePrice:clinic && (hanshuiSafe || f.hanshui_relief) ? (f.hanshui_joint?6:f.hanshui_staged?8:9) : f.taoyuan_shelter || f.shennong_truce ? 7 : conflict && !f.witness_sheltered ? 15 : 10,
    herbPrice:f.shennong_truce ? 7 : f.medicine_complete ? 5 : 3,
    escortDanger:s.loc===1 && hanshuiSafe ? (f.hanshui_joint?10:20) : allied || f.witness_sheltered ? 15 : conflict ? 45 : 25,
    travelToll:conflict && !f.witness_sheltered && !f.family_shelter && !f.canal_shelter ? 5 : 0,
    teachingDiscount:f.fuwei_refuge || f.meizhuang_survivors ? 10 : 0,
    safeSea:!!(f.lake_passage || f.meizhuang_survivors || f.meizhuang_refuge),
    notices:[allied?'三帮互认粮签，护送风险降低。':conflict?'三帮封粮，北行需付过路盘缠；接济关系可作保。':['truce','truce_end'].includes(s.fate?.node)?'三帮暂撤粮卡，各自赈济；停争并非结盟，护送仍需当心。':'三帮粮路尚未定局。',
      f.xingzi_mediated && s.fate?.node==='dispute'?'你以武当人情换来会面余地。可在命运页兑现担保，先求停争。':null,
      f.xingzi_protected && s.fate?.node==='dispute'?'你护住了杏子林伤者，仍未查明粮案。可先护民间粮车，也可继续汉水查账。':null,
      f.hanshui_joint?'汉水共同底账已立：当地护送危险度十，诊棚疗伤六两，渡口开放联运核货。':f.hanshui_staged?'汉水分段交接已立：当地护送危险度二十，诊棚疗伤八两，渡口开放交接差事。':f.hanshui_relief?'汉水民间接济已立：诊棚疗伤九两，开放分药帮手；三帮关系与正渡风险仍按原约。':null,
      f.shennong_truce?'神农药路保全，药价下降、草药收购价提高。':null,
      f.fuwei_refuge?'镖户安置成，武馆愿减免十两学费。':null,
      f.meizhuang_survivors?'梅庄旧人获救，海船愿为你担保。':null].filter(Boolean),
  };
}
export function actorStates(s) {
  return Object.entries(STORY_ARCS).filter(([id,a])=>s.treeDone[`${a.zone}:${id}`]).map(([id,a])=>({
    name:a.actor, zone:id==='DL-02' || (id==='HZ-01' && !s.p0?.facts.meizhuang_changed) ? a.zone : s.flag[`${a.zone}:${id}:complete`]?a.destination:a.zone,
    stage:(s.flag[`${a.zone}:${id}:complete`] && s.npcStates[a.actor] || (s.p0?.facts[`${a.id}_changed`]?a.outcome:s.flag[`${a.zone}:${id}:complete`]?a.stage:'身在旧事之中，等待下一次抉择'))+(s.p0?.facts[`${a.id}_returned`]?' 后续接济已落实。':s.p0?.facts[`${a.id}_informed`]?' 口信已送达，各自处理后事。':''),
    relation:s.favor[a.actor] || 0,goal:a.motive,
  }));
}
