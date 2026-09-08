import { STORY_ARCS, arcFact } from './story-arcs.js';
const fact = name => ({ ref:`fact:${name}`, op:'eq', value:true });
const set = name => ({ op:'set', ref:`fact:${name}`, value:true });
const node = (zone, scene, who, line, hearsay, choices) => ({ zone, scene, dialogues:[[who,line]], hearsay, choices });
const end = text => ({ terminal:true, scene:text, dialogues:[], hearsay:text, choices:[] });
export const CAUSAL_EVENTS = {};
for (const [treeId, arc] of Object.entries(STORY_ARCS)) {
  const ready = arcFact(arc,'ready'), declined = arcFact(arc,'declined');
  const progress = {ref:`tree:${arc.zone}:${treeId}`,op:'gte',value:arc.trigger};
  const unresolved = {not:{ref:`tree:${arc.zone}:${treeId}`,op:'gt',value:arc.decision}};
  CAUSAL_EVENTS[`${arc.id}_preparation`] = {
    name:arc.preparation, arcId:treeId, role:'preparation', actors:[arc.actor], priority:90,
    requires:{all:[progress,unresolved]}, expiresWhen:{not:unresolved}, window:900, timeout:'expired', start:'request',
    nodes:{
      request:node(arc.zone,arc.scene,arc.contact,arc.motive,arc.motive,[
        {id:'investigate',text:'问清缺少的凭据与退路',next:'arrange',effects:{},outcome:`对方说明眼前所缺，建议你${arc.help}；若没有这份人情，也可自行筹措。`},
        {id:'decline',text:'暂不承担，请他们另寻援手',next:'declined',effects:[set(declined)],outcome:'对方收好来历，自去求援。你仍可介入原来的主线，但不会凭空获得这份准备。'},
      ]),
      arrange:node(arc.zone,arc.scene,arc.contact,arc.help,'相关凭据与退路尚待落实。',[
        {id:'support',text:arc.help,requires:{...fact(arc.support),reason:`尚缺相应人情：${arc.help}`},next:'end',effects:[set(ready),set(arc.repairWorld || arc.world)],outcome:arc.consequence},
        {id:'provide',text:'自备盘缠二十两，留下安置人手',cost:{silver:20},next:'end',effects:[set(ready)],outcome:arc.consequence+' 你自付盘缠，这次尚未建立跨地协作。'},
        {id:'withdraw',text:'办不到，告知对方另作安排',next:'declined',effects:[set(declined)],outcome:'你说明难处，没有留下无法兑现的承诺。'},
        {id:'wait',text:'放弃本次窗口，待事后补救',next:'expired',effects:{},outcome:'当下的会面未能安排，你记下了事后还可帮忙的人。'},
      ]),
      end:end(arc.consequence), declined:end('准备未成，人物将依眼前处境继续行动。'), expired:end('当时的介入机会已过，尚可处理遗留的安置与善后。'),
    },
  };
  CAUSAL_EVENTS[`${arc.id}_aftermath`] = {
    name:arc.echo, arcId:treeId,role:'consequence',actors:[arc.actor],priority:70,start:'visit',
    requires:{ref:`world:${arc.zone}:${treeId}:complete`,op:'eq',value:true},
    nodes:{
      visit:node(arc.destination,arc.returnScene,arc.contact,'先问清上回留下了什么，再决定这次帮谁。',arc.returnScene,[
        {id:'keep',text:'兑现先前约定，维持接济与通行',requires:{...fact(arcFact(arc,'changed')),reason:'上回未采用备好的路线，可另行补办安置'},next:'end',effects:[set(arc.world),set(arcFact(arc,'returned')),{op:'add',ref:`relation:${arc.actor}`,value:10}],outcome:arc.outcome+' 往来的接济与通行从此有了固定人手。'},
        {id:'repair',text:'为受波及的人补办安置，交付十两',cost:{silver:10},next:'end',effects:[set(arc.repairWorld || arc.world),set(arcFact(arc,'returned'))],outcome:'你补上盘缠与落脚处。发生过的事不会倒转，余下的人有了继续生活的路。'},
        {id:'leave',text:'只交清消息，让当事人自行决定',next:'closed',effects:[set(arcFact(arc,'informed'))],outcome:'口信如实交到，双方自行安排后事。你没有代许一份新承诺。'},
      ]), end:end('旧事留下了可持续的接济与通行。'),closed:end('消息已送达，这次没有增设接济。'),
    },
  };
  CAUSAL_EVENTS[`${arc.id}_recovery`] = {
    name:`${arc.preparation} · 错过之后`,arcId:treeId,role:'recovery',actors:[arc.actor],priority:65,start:'visit',
    requires:fact(arcFact(arc,'expired')),
    nodes:{visit:node(arc.zone,arc.scene,arc.contact,'当时的时机已过，还愿不愿照看留下的人？','错过干预仍可善后；善后不重开过去的主线。',[
      {id:'repair',text:'付十两补办安置',cost:{silver:10},next:'end',effects:[set(arc.repairWorld || arc.world)],outcome:'留下的人获了安置。过去的窗口不会重开，这份照应会影响以后的道路。'},
      {id:'close',text:'交还凭据，不再承诺',next:'end',effects:{},outcome:'你将原物交清，没有把旧事再拖成一个空头约定。'},
    ]),end:end('过期的约定已收尾。')},
  };
}

// A shipping record must be checked, not purchased. Preserve the old choice id for saves.
Object.assign(CAUSAL_EVENTS.yanzi_preparation.nodes.arrange.choices.find(c=>c.id==='provide'), {
  text:'核对三处船期与印泥，自己查验往来簿',cost:{},
  requires:{ref:'resource:knowledge',op:'gte',value:3,reason:'需草木学识三点辨认印泥，可先到书肆研读'},
  outcome:'你对照船期与印泥，剔除了抄错的一页，留下能互相核实的渡簿。盘缠买不来这份证据。',
});
