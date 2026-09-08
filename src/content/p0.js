import { PACK_EVENTS } from './side-packs.js';
import { CAUSAL_EVENTS } from './causal-events.js';
import { WUDANG_EVENTS } from './wudang.js';
export const BASICS = { fist: '基本拳脚', blade: '基本兵器', internal: '基本内功', dodge: '基本轻功', parry: '基本招架' };
export const WEAPONS = {
  hands: { name: '徒手', type: 'fist', price: 0, attack: 0 },
  practice: { name: '练功木剑', type: 'blade', price: 15, attack: 2 },
  steel: { name: '青钢剑', type: 'blade', price: 65, attack: 5 },
};
export const LESSONS = {
  chunyang: {name:'纯阳无极功入门篇',kind:'internal',target:'chunyang',basic:'internal',room:'wudang-hall',silver:0,potential:60,contribution:20,sect:true,rank:2,cap:3600},
  taizu: { name: '太祖长拳', kind: 'style', target: '太祖长拳', basic: 'fist', room: 'gym', silver: 12, potential: 10, cap: 900 },
  liuhe: { name: '六合刀', kind: 'style', target: '六合刀', basic: 'blade', room: 'gym', silver: 20, potential: 15, cap: 900 },
  luohan: { name: '罗汉伏魔功', kind: 'internal', target: 'luohan', basic: 'internal', room: 'gym', silver: 15, potential: 15, cap: 900 },
  mianzhang: { name: '武当绵掌', kind: 'style', target: '武当绵掌', basic: 'fist', room: 'wudang-yard', silver: 0, potential: 20, contribution: 10, sect: true, cap: 1600 },
  quanzhen: { name: '全真心法', kind: 'internal', target: 'quanzhen', basic: 'internal', room: 'wudang-yard', silver: 0, potential: 20, contribution: 10, sect: true, cap: 1600 },
  huashan: { name: '华山剑法', kind: 'style', target: '华山剑法', basic: 'blade', room: 'gym', silver: 40, potential: 35, flag: 'medicine_complete', cap: 1600 },
};
const room = (name, exits, scene, npcs, facility) => ({ name, exits, scene, npcs, facility, zone: 0 });
export const ROOMS = {
  gate: room('临安城门', ['street', 'outskirts'], '城门下车马缓行，守卒正替挑担老人扶起散落的柴束。', [['守卒', '进城谋生，先到御街看看。莫要空着肚子逞强。']]),
  street: room('御街', ['gate', 'inn', 'market', 'gym', 'court'], '青石路上水痕未干，卖浆的小贩把竹凳搬到檐下。', [['挑夫', '码头常缺人手。识字的，也可去书肆帮忙。']]),
  inn: room('水乡客栈', ['street', 'alley'], '灶上热粥微响，掌柜在灯下核对往来客人的路引。', [['掌柜', '先安顿下来。回春堂正愁药车无人照应。']], 'inn'),
  market: room('市集', ['street', 'pharmacy', 'smith', 'bookshop'], '药草与新铁的气味混在晨风里，摊主们已支好棚。', [['商贩', '兵器合手，比外表光鲜要紧。']]),
  pharmacy: room('回春堂', ['market'], '药童伏案包药，墙角的药箱留着新鲜的刀痕。', [['沈药师', '城外病人等着药。我缺的不是货，是一条平安的路。']], 'pharmacy'),
  smith: room('铁匠铺', ['market'], '炉火映着一排普通青钢剑，铁匠逐一校直剑脊。', [['铁匠', '木剑练手，钢剑护身。天下至宝可不是我这小炉子能造的。']], 'smith'),
  gym: room('城南武馆', ['street', 'dock'], '院中木桩留下层层掌印，教习正给少年纠正步子。', [['教习', '打稳根基，再谈招式。我这里教功夫，也给散人留一条路。']], 'teacher'),
  dock: room('钱塘码头', ['gym', 'outskirts'], '船夫合力推来药车，车轴在湿木板上吱呀作响。', [['船夫', '卸货挣的是力气钱，护药车靠的可是真功夫。']], 'work'),
  alley: room('背街暗巷', ['inn', 'home'], '矮墙边落着半张药签，尽头有人匆匆收起包袱。', [['街坊', '别见人跑就动刀，先问清他为何而来。']]),
  court: room('府衙门前', ['street'], '告示旁挤着递状纸的人，书吏把每一桩来历记在册上。', [['书吏', '告人须凭证据。若有人受伤，先送医。']]),
  home: room('城南民居', ['alley'], '屋里飘出淡淡米香，老者将空药碗收在床头。', [['老者', '药若能送到，大家都会记得护车的人。']]),
  outskirts: room('临安城郊', ['gate', 'dock', 'bookshop'], '山路旁长着常见草药，凉亭下有一块干净石台。', [['采药人', '辨不明白的草，宁可不采。累了就在亭子里歇歇。']], 'herbs'),
  bookshop: room('旧书肆', ['market', 'outskirts'], '纸页晒在窗边，一本草木小录夹着前人的批注。', [['书肆老人', '愿意静下心读书，药性、账目都能慢慢认得。']], 'books'),
  'wudang-gate': { ...room('武当山门', ['wudang-yard'], '松影落在石阶上，道童扫净路边落叶。', [['道童', '愿学武的先修心，肯担差事的，进院说话。']], 'sect'), zone: 1 },
  'wudang-yard': { ...room('武当练功院', ['wudang-gate', 'wudang-hall'], '教习以木杖点地，弟子们随呼吸缓缓推掌。', [['外门教习', '拳掌与吐纳互为表里，差事做好，再来请教。']], 'teacher'), zone: 1 },
  'wudang-hall': { ...room('武当静室', ['wudang-yard'], '香灰平整，案边放着外门考核的名册。', [['执事', '绵掌练熟、差事做稳，便可来试一试身手。']], 'exam'), zone: 1 },
};
export const ACTIVITIES = {
  work: { name: '码头帮工', rooms: ['dock'], seconds: 15, silver: 6, potential: 4, text: '船夫：把这几篓货稳稳搬进棚，工钱不会少你。' },
  herbs: { name: '城郊采药', rooms: ['outskirts'], seconds: 20, herbs: 1, potential: 3, text: '采药人：只采认得的青叶草，留根，来年还能长。' },
  duty: { name: '武当洒扫', rooms: ['wudang-yard'], seconds: 20, potential: 6, contribution: 2, sect: true, text: '执事：扫净石阶，再替师兄弟提一桶水。' },
  read: { name: '研读草木小录', rooms: ['bookshop'], seconds: 20, knowledge: 1, text: '书肆老人：读懂一页，再翻下一页。' },
  rest: { name: '静养调息', seconds: 5, hp: 2, mp: 3, text: '你寻了清静处坐定，气息渐渐平稳。' },
  basic: { name: '演练基本功', seconds: 5, train: 5, text: '一招一式拆开重练，劲力从足下贯至指尖。' },
  style: { name: '修炼招式', seconds: 5, train: 5, text: '你反复体会所学招式，去掉出手时多余的迟疑。' },
  internal: { name: '修炼内功', seconds: 5, train: 5, text: '吐纳有节，内息沿熟悉的脉路缓缓运转。' },
};
export const SIDE_EVENTS = {
  ...WUDANG_EVENTS,
  ...CAUSAL_EVENTS,
  wudang_exam: { name: '武当外门考核', version: 1, start: 'test', requires: { all: [{ ref: 'sect', op: 'eq', value: 'wudang' }, { ref: 'rank', op: 'eq', value: 0 }] }, nodes: {
    test: { room: 'wudang-hall', scene: '执事翻开名册，教习将木杖放在廊下，示意你站稳脚步。', dialogues: [['执事', '差事做得稳，还须看你能否收放自如。失手也无妨，回院修习再来。']], hearsay: '武当外门弟子可凭差事与绵掌修为参加考核。', choices: [
      { id: 'test', text: '行礼，请教习考校绵掌', requires: { all: [{ ref: 'resource:contribution', op: 'gte', value: 10, reason: '需贡献十点，可在练功院洒扫' }, { ref: 'style:武当绵掌', op: 'gte', value: 100, reason: '需绵掌心得一百，先请教并修炼' }] }, combat: { opponent: 'student', danger: 25 }, next: 'end', failNext: 'retry', retreatNext: 'retry', effects: [{ op: 'add', ref: 'resource:potential', value: 30 }, { op: 'add', ref: 'resource:exp', value: 60 }, { op: 'set', ref: 'rank', value: 1 }, { op: 'teaching', ref: '武当绵掌', value: 3600 }], outcome: '考核通过，晋为入室弟子。绵掌教学上限提高至三千六百，得潜能三十。', failText: '教习收势指出你运劲未稳，回院修养练习后仍可再试。' },
    ] },
    retry: { room: 'wudang-hall', scene: '执事仍将你的名页留在案上，并未划去。', dialogues: [['执事', '胜负只是一时。养好伤，再来走这一趟。']], hearsay: '武当考核不以一败拒人。', choices: [{ id: 'return', text: '重新报名，待准备妥当再交手', next: 'test', effects: {}, outcome: '执事重新摆好名册，等你示意。' }] },
    end: { terminal: true, scene: '你已晋为入室弟子，练功院仍可洒扫、请教和修炼。', dialogues: [], hearsay: '武当又有弟子通过考核，教习允其进修绵掌。', choices: [] },
  } },
  jiangnan_letter: { name: '查清江南密信的主人', version: 1, requires:{not:{ref:'quest:0:0',op:'eq',value:true}}, start: 'inquiry', nodes: {
    inquiry: { zone: 0, scene: '客栈掌柜把那封沾着茶渍的信放在灯下，信角依稀留着盐号印泥。', dialogues: [['掌柜', '像是扬州盐号的封记。我认得一个跑船的，你若肯等我问一句，也能找到去处。']], hearsay: '临安有人拿着旧信寻主，线索指向扬州盐号。', choices: [
      { id: 'ask', text: '托掌柜询问旧识', next: 'end', effects: [{ op:'completeQuest',ref:'0:0',value:true }, { op:'set',ref:'fact:letter_contact',value:true }, { op:'add',ref:'resource:silver',value:45 }, { op:'add',ref:'resource:exp',value:30 }], outcome: '船夫认出盐号，写下账房的称呼。你可继续拜访扬州盐商，也可在扬州打听小宝的消息。' },
      { id: 'read', text: '借书肆所学，细辨印记', requires: { ref:'resource:knowledge',op:'gte',value:3,reason:'草木学识需三点，可去书肆研读' }, next: 'end', effects: [{ op:'completeQuest',ref:'0:0',value:true }, { op:'set',ref:'fact:letter_contact',value:true }, { op:'set',ref:'fact:letter_read',value:true }, { op:'add',ref:'resource:silver',value:45 }, { op:'add',ref:'resource:exp',value:30 }, { op:'add',ref:'resource:potential',value:5 }], outcome: '你辨出印泥中的草木纤维，又核对盐号的旧记，记下了线索。掌柜愿替你引见跑船人。' },
    ] },
    end: { terminal:true, scene:'盐号的线索已记下，扬州的人与事可以继续追查。',dialogues:[],hearsay:'问信的外乡人已寻到盐号的门路。',choices:[] },
  } },
  medicine_return: { name: '药路回信', version: 1, start: 'letter', requires: { ref:'fact:medicine_complete',op:'eq',value:true }, nodes: {
    letter: { room:'pharmacy',scene:'沈药师将一封回信压在药秤下，信上提到汉水沿岸也有伤者缺药。',dialogues:[['沈药师','你已护过一程。武当常照应伤者，可否替我问一声？不急着拔剑，把话带到便好。']],hearsay:'回春堂收到汉水来信，想找熟识的护药人传话。',choices:[
      {id:'carry',text:'收下回信，往荆襄武当问讯',next:'visit',effects:{flag:{medicine_northbound:true}},outcome:'药师写明来历。你可从江南启程到荆襄，去武当山门找道童。'},
    ]},
    visit:{room:'wudang-gate',scene:'道童读过药师的来信，将它收进竹筒，招呼你在石阶边歇脚。',dialogues:[['道童','路上辛苦。汉水伤兵须有人照料，你也可进院学些护身本领。']],hearsay:'江南药师与武当有了往来，送信人获许回程领取备药。',choices:[
      {id:'deliver',text:'交代沿途见闻，带回武当口信',next:'return',effects:{potential:15,flag:{medicine_wudang:true}},outcome:'道童谢过你，托你回告药师：山门愿照应往来的药车。回春堂为你留有谢礼。'},
    ]},
    return:{room:'pharmacy',scene:'药师听完口信，把一小包青叶草推到你面前。',dialogues:[['沈药师','路走通了，比多卖几包药要紧。留着这些，日后也能救急。']],hearsay:'江南与汉水间多了一条互相照应的药路。',choices:[
      {id:'finish',text:'交清口信，收下备药',next:'end',effects:{herbs:3,potential:15,flag:{medicine_returned:true},npc:{shen:'托你联络过武当，愿继续收购草药'}},outcome:'你收好备药。回春堂仍按五两收草药，武馆的引荐也一直有效。'},
    ]},
    end:{terminal:true,scene:'药路口信往返已成，回春堂与武当记得你的来往。',dialogues:[],hearsay:'护药人的足迹从城南走到了汉水。',choices:[]},
  } },
  medicine: { name: '一车救命药', version: 1, start: 'request', nodes: {
    request: { room: 'pharmacy', scene: '沈药师将封好的药箱推到门口，迟迟找不到肯押车的人。', dialogues: [['沈药师', '药要送去城南。护住车，便是救人，不必追着拦路人分生死。']], hearsay: '回春堂在找人护送城南的药车。', choices: [
      { id: 'accept', text: '应下护送，去码头接车', next: 'road', effects: {}, outcome: '药师把路引交给你，约好在钱塘码头接车。' },
      { id: 'prepare', text: '先帮忙备药，再接护送', next: 'gather', effects: {}, outcome: '你先问清缺少的药材，准备从城郊补齐。' },
    ] },
    gather: { room: 'pharmacy', scene: '药童留出三个空纸包，等你送来青叶草。', dialogues: [['药童', '三份就够，不必毁了整片草坡。']], hearsay: '城郊采药人愿意教外乡人辨认草药。', choices: [
      { id: 'deliver', text: '交付三份青叶草', cost: { herbs: 3 }, next: 'road', effects: { potential: 12, flag: { medicine_prepared: true } }, outcome: '药童仔细包好备用药，药车多了一份保障。' },
      { id: 'escort', text: '先护送现有药材', next: 'road', effects: {}, outcome: '药师点头，先送急需的药，余下再补。' },
    ] },
    road: { room: 'dock', scene: '药车刚到码头，一名持刀汉子拦住去路，目光却一直追着药箱。', dialogues: [['拦路汉子', '留下药！我家中也有人病着。'], ['船夫', '若都抢来抢去，这车药谁也送不到。']], hearsay: '钱塘码头有人截药，未必只是图财。', choices: [
      { id: 'fight', text: '护住车夫，出手挡开刀客', combat: { opponent: 'bandit', danger: 20 }, next: 'delivered', failNext: 'repair', effects: { flag: { medicine_safe: true } }, outcome: '你挡开刀锋，药车得以通过。', failText: '你带着车夫退回药铺，损坏的药箱仍可补好。' },
      { id: 'reason', text: '辨明病症，分出备用药劝他让路', requires: { knowledge: 3 }, cost: { herbs: 2 }, next: 'delivered', effects: { flag: { medicine_safe: true, medicine_mercy: true } }, outcome: '你按所学辨明药性。汉子抱药退到一旁，替你扶正车辕。' },
    ] },
    repair: { room: 'pharmacy', scene: '药师捡起破裂的木板，将余下的药重新清点。', dialogues: [['沈药师', '人平安就好。补齐药材，还能再走一趟。']], hearsay: '护车人虽受了挫，仍把车夫平安带回。', choices: [
      { id: 'herbs', text: '补上两份草药，重新护送', cost: { herbs: 2 }, next: 'road', effects: {}, outcome: '药箱补好。你记住上次的教训，再赴码头。' },
      { id: 'pay', text: '付十两修补药箱', cost: { silver: 10 }, next: 'road', effects: {}, outcome: '木匠收好工钱，钉紧药箱，船夫愿与你再走一程。' },
    ] },
    delivered: { room: 'home', scene: '城南老人接过药包，邻居端来热水，屋里终于有人松了口气。', dialogues: [['老者', '记住送药的人，往后路上也好照应。']], hearsay: '城南病户收到了药，回春堂愿为护车人作保。', choices: [
      { id: 'finish', text: '交回路引，收下酬劳与引荐', next: 'end', effects: { silver: 45, potential: 35, exp: 50, flag: { medicine_complete: true }, npc: { shen: '愿为你引荐武馆师傅' } }, outcome: '药师付清酬劳，又写下一封引荐信。武馆愿向你传授更深的剑路。' },
    ] },
    end: { terminal: true, scene: '救命药已送达，城南人家记下这份恩情。', dialogues: [], hearsay: '护药旧事在街坊口中传开。', choices: [] },
  } },
  ...PACK_EVENTS,
};

// Fixed variants are content, selected by the same world query used for choices.
ROOMS.pharmacy.variants = [{ priority:20, when:{ref:'fact:medicine_returned',op:'eq',value:true}, dialogues:[['沈药师','汉水的回话我收到了。草药仍按五两一份收，路上遇见伤者，多留一份心。']] }, { priority:10,when:{ref:'fact:medicine_complete',op:'eq',value:true},dialogues:[['沈药师','城南的药送到了。草药我按五两收，另有一封汉水回信想托你。']] }];
ROOMS.gym.variants = [{ priority:10,when:{ref:'fact:medicine_complete',op:'eq',value:true},dialogues:[['教习','药师的引荐我收到了，你若有意，可来学华山剑法。']] }];
ROOMS.home.variants = [{ priority:10,when:{ref:'fact:medicine_mercy',op:'eq',value:true},dialogues:[['老者','听说你还分药救了拦车人的家眷。往后大家总有照应。']] },{priority:5,when:{ref:'fact:medicine_complete',op:'eq',value:true},dialogues:[['老者','多亏你护住药车，街坊们记着这份情。']]}];
ACTIVITIES.errand = { name:'行脚差事',seconds:12,silver:8,potential:5,text:'行脚掌柜：递信、认路、照看行李，做满一趟结一趟的工钱。' };
ACTIVITIES.grain_work = {name:'三帮联运理货',rooms:['dock'],seconds:12,silver:10,potential:6,requires:{ref:'world:grain_route_open',op:'eq',value:true,reason:'须先在三帮结盟后完成首批联运'},text:'联运执事：三家合印后货路稳了，理货的工钱与见识也比从前多一分。'};
ACTIVITIES.relief_work = {name:'民间粥棚帮手',rooms:['dock'],seconds:20,silver:4,potential:10,requires:{ref:'world:civilian_relief',op:'eq',value:true,reason:'须先在三帮分途时保全民间赈济'},text:'粥棚管事：这里工钱不多，分药、认人、照料伤者，却能学到许多。'};

SIDE_EVENTS.wudang_exam.nodes.test.choices[0].effects.push({op:'add',ref:'relation:武当教习',value:10});
const returned=SIDE_EVENTS.medicine_return.nodes.return.choices[0];
returned.effects=[{op:'add',ref:'resource:herbs',value:3},{op:'add',ref:'resource:potential',value:15},{op:'set',ref:'fact:medicine_returned',value:true},{op:'set',ref:'npc:shen',value:'托你联络过武当，愿继续收购草药'},{op:'add',ref:'relation:武当教习',value:5}];
returned.outcome='你收好备药，兑现了往返的约定，武当教习记下这份信用。草药按当前药路行情收购。';
ROOMS.pharmacy.variants.unshift({priority:40,when:{ref:'fact:shennong_truce',op:'eq',value:true},dialogues:[['沈药师','神农药路未断，青叶草按七两收，疗伤只取七两。保全药库的好处，病户都能分到。']]});
ROOMS['wudang-hall'].variants=[{priority:30,when:{ref:'rank',op:'gte',value:2},dialogues:[['武当教习','护道之许已经交给你。纯阳入门篇可来请教，内息仍须从根基练起。']]},{priority:20,when:{ref:'rank',op:'eq',value:1},dialogues:[['武当教习','入室之后，掌法与心法都要进修。送回药路口信，再来谈护道考校。']]}];
ROOMS['wudang-yard'].variants=[{priority:20,when:{ref:'fact:xingzi_mediated',op:'eq',value:true},dialogues:[['外门教习','你把山门人情用在了停争上。往后做事更须守信，莫让担保只剩空话。']]}];
ROOMS.dock.variants=[{priority:30,when:{ref:'world:grain_route_open',op:'eq',value:true},dialogues:[['船夫','三印粮车已经到站，新开的联运理货在这里领差事。']]},{priority:20,when:{ref:'world:civilian_relief',op:'eq',value:true},dialogues:[['粥棚管事','三帮还在封粮，幸而民间粥棚留住了。若愿帮手，就在码头分粥。']]},{priority:10,when:{ref:'world:three_bangs',op:'eq',value:'truce'},dialogues:[['船夫','粮卡撤了，可三家的簿子还没合；先照常押车，别误当已经结盟。']]}];
ROOMS.pharmacy.variants.unshift({priority:35,when:{all:[{ref:'world:three_bangs',op:'eq',value:'conflict'},{not:{ref:'fact:witness_sheltered',op:'eq',value:true}},{not:{ref:'fact:taoyuan_shelter',op:'eq',value:true}}]},dialogues:[['沈药师','三帮封路，进药多了盘缠，疗伤只好照眼前价收。重查粮案或打通接济，价钱才有转圜。']]});
