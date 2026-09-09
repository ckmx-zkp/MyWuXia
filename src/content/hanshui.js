const flag = (id,reason) => ({ref:`fact:${id}`,op:'eq',value:true,reason});
const set = id => ({op:'set',ref:`fact:${id}`,value:true});
const end = scene => ({terminal:true,scene,dialogues:[],hearsay:scene,choices:[]});
const node = (room,scene,dialogues,hearsay,choices,variants=[]) => ({room,scene,dialogues,hearsay,choices,variants});
export const HANSHUI_EVENTS = {
  hanshui_supply:{name:'第二章 · 汉水药粮',role:'consequence',priority:80,start:'invitation',requires:{any:['alliance_end','truce_end','conflict_end'].map(value=>({ref:'fate',op:'eq',value}))},nodes:{
    invitation:node('hanshui-wharf','汉水渡口的药箱与粮袋堆在一处，船户迟迟不肯解缆。先前的三帮约定，到了交接时便露出不同的难处。',[['渡口船户','盟约归盟约，谁接货、谁记账，今夜须说清楚。']],'汉水要重接药粮运输，船户在等经历过三帮旧案的人。',[
      {id:'alliance',text:'持三印路引核对联运底账',requires:{ref:'fate',op:'eq',value:'alliance_end',reason:'须完成三帮联运首程'},next:'audit',effects:[set('hanshui_alliance')],outcome:'三家肯同桌对账，却都不肯独担短缺。你接下核对交接数目的责任。'},
      {id:'truce',text:'按停争约定安排分段交接',requires:{ref:'fate',op:'eq',value:'truce_end',reason:'须先完成停争后的安置'},next:'handoff',effects:[set('hanshui_truce')],outcome:'各帮只认自己守的一程。你得另找一个各家都愿见的交接人。'},
      {id:'civilian',text:'绕开帮卡，筹措民间药粮',requires:{ref:'fate',op:'eq',value:'conflict_end',reason:'须先了结三帮分途的民间善后'},next:'supplies',effects:[set('hanshui_civilian')],outcome:'三帮并未和好。船户愿开自己的小船，但病户的药材须先凑齐。'},
      {id:'decline',text:'说明无暇承担，请船户另找帮手',next:'declined',effects:{},outcome:'你没有留下空头承诺，船户另去求人；这次药粮接济不记在你的名下。'},
    ]),
    audit:node('hanshui-ledger','三份账册写着不同的到货日，一枚雨水晕开的印记压在页角。',[['三帮执事','若只赔钱平账，下回还是会少货。请把谁收了什么核实。']],'联运虽有盟约，责任仍须凭交接记录查实。',[
      {id:'compare',text:'辨印核数，查出被挪用的交接页',requires:{ref:'resource:knowledge',op:'gte',value:3,reason:'需学识三点，可回江南书肆研读'},next:'road',effects:[set('hanshui_accounts')],outcome:'你对齐了日期与印泥，发现一批药被错记成军粮，三家同意更正并出具凭据。'},
      {id:'advance',text:'先垫二十两补缺，留下待查的账',cost:{silver:20},next:'road',effects:[set('hanshui_unchecked')],outcome:'病户不用等账查完，但账上的责任仍未厘清，这一趟只能先保民间接济。'},
    ]),
    handoff:node('hanshui-ledger','各帮路引摆在桌子的三个角上，中间空着，谁也不肯先落印。',[['交接执事','有可信的人站在交界，两边才肯放手；无需替三帮强订盟约。']],'分段交接需要山门信用或独立船户的担保。',[
      {id:'sect',text:'请武当派弟子见证交接（贡献十）',requires:{all:[{ref:'sect',op:'eq',value:'wudang',reason:'需武当身份'},{ref:'rank',op:'gte',value:1,reason:'需入室资格'},{ref:'relation:武当教习',op:'gte',value:15,reason:'与教习交情需十五；也可请船户见证'}]},cost:{contribution:10},next:'road',effects:[set('hanshui_handoff')],outcome:'山门只替到货数目作证，不代三帮许诺结盟。分段交接由此有了凭据。'},
      {id:'ferry',text:'请独立船户见证，付二十两船资',cost:{silver:20},next:'road',effects:[set('hanshui_handoff')],outcome:'船户按批验货，收下两边路引。他是交接人，不是哪一帮的附庸。'},
    ]),
    supplies:node('hanshui-clinic','诊棚里的药碗渐渐空了，老船户将自己的口粮倒进公锅。',[['汉水药师','不必等帮主们握手。三份青叶草，先够沿岸几户人家熬过今夜。']],'民间赈路需要实在的药材，声明立场不能替人治病。',[
      {id:'herbs',text:'交付三份青叶草',cost:{herbs:3},next:'road',effects:[set('hanshui_supplies')],outcome:'药师把药材分装到小船上，留下分药的户册。'},
      {id:'purchase',text:'付三十两购买沿岸现存药材',cost:{silver:30},next:'road',effects:[set('hanshui_supplies')],outcome:'你付清药资，药师当面验过药包；这笔钱只购药，不替三帮消除嫌隙。'},
    ]),
    road:node('hanshui-wharf','药船将离岸，有人持械拦住跳板，说船上夹带了不明来路的货。',[['拦船人','有实据就拿出来，没实据别想从这里过。'],['渡口船户','保住人和药便好，切莫追上岸把事情闹大。']],'带着可核实账据可以交涉，交手护船也须守住退路。',[
      {id:'evidence',text:'出示查实的底账，请执事当面对验',requires:flag('hanshui_accounts','须先核实三家底账'),next:'receipt',effects:[set('hanshui_intact')],outcome:'执事当面对验印记，拦船人收起兵器。药粮整批过了渡口。'},
      {id:'guard',text:'守住跳板八招，护船离岸',combat:{opponent:'hanshui_guard',danger:30},next:'receipt',failNext:'repair',retreatNext:'repair',effects:[set('hanshui_intact')],outcome:'你守到船户收起跳板，药船驶离争执处。拦船人未必服气，药粮却保全了。',failText:'你带船户退回诊棚，部分药包落水；人还在，补齐药便可改走浅汊。'},
      {id:'detour',text:'以轻功探浅汊，分载绕行',requires:{ref:'basic:dodge',op:'gte',value:400,reason:'基本轻功需四百心得，可先演练'},next:'receipt',effects:[set('hanshui_detour')],outcome:'你探明浅汊的落脚处，带船户分载绕行。药到了，却没有取得正渡的通行认可。'},
    ],[{priority:10,when:flag('hanshui_civilian'),dialogues:[['拦船人','没有帮印的船，怎能走正渡？'],['渡口船户','病户认得我们的脸。守得住便开船，守不住就退，别逞强。']]}]),
    repair:node('hanshui-clinic','药师将浸湿的药包逐个摊开，船户把裂了的船板钉好。',[['汉水药师','补上两份药，我请熟路的人带你绕浅汊。败了这一回，也不必拿人命补面子。']],'失利后可补药绕行，不能冒领正渡护送成功。',[
      {id:'herbs',text:'补两份草药，请熟路人带船',cost:{herbs:2},next:'receipt',effects:[set('hanshui_detour')],outcome:'药包补齐，老船户带船绕过正渡。留下的通行争议仍待以后处理。'},
      {id:'pay',text:'付十五两补药，请熟路人带船',cost:{silver:15},next:'receipt',effects:[set('hanshui_detour')],outcome:'你付清补药的钱，跟着老船户分载绕行。'},
      {id:'withdraw',text:'如实交回余货，不再承担',next:'declined',effects:{},outcome:'你交清剩余药粮，没有冒领护送功劳。药师另找帮手。'},
    ]),
    receipt:node('hanshui-clinic','病户按户册领走药，交接执事在空箱上摊开收据。',[['汉水药师','药到了。往后怎么接，还须你把这次做成与没做成的事说清。']],'送达后的交代决定留下联运制度、分段约定还是民间小路。',[
      {id:'joint',text:'将核实底账与正渡收据交三帮共管',requires:{all:[flag('hanshui_alliance','此次须由联运盟约承接'),flag('hanshui_accounts','须有查实底账'),flag('hanshui_intact','须保全正渡整批运输')]},next:'joint_end',effects:[set('hanshui_joint'),{op:'add',ref:'resource:silver',value:50},{op:'add',ref:'resource:potential',value:30},{op:'add',ref:'relation:汉水药师',value:10}],outcome:'三帮各留一份更正账，约定共同核验。汉水诊棚接上了稳定药粮，正渡的重复盘查减少。'},
      {id:'staged',text:'按见证人的分段收据立约',requires:{all:[flag('hanshui_truce','此次须由停争后的交接承接'),flag('hanshui_handoff','须先安排交接见证'),flag('hanshui_intact','须保全正渡整批运输')]},next:'staged_end',effects:[set('hanshui_staged'),{op:'add',ref:'resource:silver',value:35},{op:'add',ref:'resource:potential',value:40},{op:'add',ref:'relation:汉水药师',value:10}],outcome:'各帮各认一段，交界由见证人验货。三帮没有结盟，药粮却能按期交接。'},
      {id:'civilian',text:'只落实病户与船户之间的民间接济',next:'civilian_end',effects:[set('hanshui_relief'),{op:'add',ref:'resource:silver',value:15},{op:'add',ref:'resource:potential',value:55},{op:'add',ref:'relation:汉水药师',value:15}],outcome:'病户与船户记下彼此的名字。诊棚可自行接药，但三帮关系与正渡争议没有因此被改写。'},
    ]),joint_end:end('汉水药粮按共同底账联运。'),staged_end:end('汉水药粮按见证人的分段收据交接。'),civilian_end:end('汉水诊棚保住了民间接济。'),declined:end('药粮责任已如实交还，未建立新的运输约定。'),
  }},
};
