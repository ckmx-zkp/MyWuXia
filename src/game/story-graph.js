import { STORY_ARCS } from '../content/story-arcs.js';
import { testCondition, conditionReason } from './world-rules.js';
export function compileStory(tree) {
  const arc=STORY_ARCS[tree.id];
  if (!arc || tree.graphVersion) return tree;
  const nodes=tree.nodes.map((n,i)=>({...n,id:`n${i}`,choices:n.choices.map((c,j)=>({...c,id:`c${j}`,next:i+1,failNext:i+1}))}));
  const required=[{ref:`fact:${arc.id}_ready`,op:'eq',value:true,reason:`先办妥「${arc.preparation}」`}];
  if(tree.id==='WX-01') required.push({ref:'fact:yanzi_ready',op:'eq',value:true,reason:'还需燕子坞线的太湖往来簿，不能仅凭一人口供'});
  nodes[arc.decision].choices.push({id:'causal',text:arc.alternative,requires:{all:required},next:nodes.length,failNext:arc.decision+1,
    ok:{text:arc.outcome,exp:30,favor:{[arc.actor]:10}},
    worldEffects:[{op:'set',ref:`fact:${arc.id}_changed`,value:true},{op:'set',ref:`fact:${arc.world}`,value:true}],
    ending:{text:arc.outcome,rumors:[arc.outcome],letters:[{from:arc.contact,text:arc.returnScene}]},
  });
  if(tree.id==='WX-01') {
    const ending=(text)=>({text,rumors:[text],letters:[{from:'杏子林执事',text:'粮案尚待查明，请到三帮会面处交代后事。'}]});
    const mediation='你以入室弟子身份担保药路接济，群丐暂且收杖，各留口供待查。没有当场定案，也没有替谁洗去嫌疑；山门的人情先用在了停争上。';
    const shelter='你守住伤者退路，撑到众人分开。乔峰得以带伤者离开争执中心，但账证仍散在各处；救人并不等于查清粮案。';
    nodes[arc.decision].choices.push(
      {id:'mediate',text:'以武当药路作保，先停争再查案（贡献二十）',requires:{all:[{ref:'rank',op:'gte',value:1,reason:'需先通过武当外门考核'},{ref:'sect',op:'eq',value:'wudang'},{ref:'fact:medicine_wudang',op:'eq',value:true,reason:'须亲自送达药路回信'},{ref:'resource:contribution',op:'gte',value:20,reason:'需贡献二十，担保后扣除'}]},next:nodes.length,failNext:arc.decision+1,ok:{text:mediation,exp:20},worldEffects:[{op:'add',ref:'resource:contribution',value:-20},{op:'set',ref:'fact:xingzi_mediated',value:true},{op:'add',ref:'relation:武当教习',value:-5}],ending:ending(mediation)},
      {id:'protect',text:'以绵掌护住伤者，守住六招后撤离',combat:'wudang_mentor',requires:{ref:'style:武当绵掌',op:'gte',value:100,reason:'绵掌需二重（一百心得），未备好可先离开修炼'},diff:25,next:nodes.length,failNext:arc.decision+1,ok:{text:shelter,exp:30},fail:{text:'你未能守稳退路，执事先将伤者扶走。证据未全，仍须面对随后身世争议。',exp:10},worldEffects:[{op:'set',ref:'fact:xingzi_protected',value:true}],ending:ending(shelter)},
    );
    nodes[arc.decision].choices.at(-1).combat='xingzi_guard';
  }
  return {...tree,graphVersion:1,nodes};
}
export function storyNode(s,tree,index) {
  const node=tree?.nodes[index]; if(!node) return node;
  const arc=STORY_ARCS[tree.id];
  if(!arc || !s.p0) return node;
  const prepared=s.p0.facts[`${arc.id}_ready`], declined=s.p0.facts[`${arc.id}_declined`];
  // Keep source choices stable; changed dialogue has no mismatched prerecorded voice.
  if(index!==arc.decision || (!prepared && !declined)) return node;
  return {...node,dialogues:[...node.dialogues,[arc.contact,prepared?arc.consequence:'上次没有备妥安置，这回只可依眼前局势行事。']]};
}
export function storyChoiceReason(s,choice) {
  return conditionReason(s,choice.requires) || (choice.visibleWhen && !testCondition(s,choice.visibleWhen)?'当前经历不适用':'');
}
export const storyNext = (tree,index,choice,success) => success ? choice.next ?? index+1 : choice.failNext ?? index+1;
