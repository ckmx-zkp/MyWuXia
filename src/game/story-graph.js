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
