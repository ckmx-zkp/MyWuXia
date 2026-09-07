export const BASICS = { fist: '基本拳脚', blade: '基本兵器', internal: '基本内功', dodge: '基本轻功', parry: '基本招架' };
export const WEAPONS = {
  hands: { name: '徒手', type: 'fist', price: 0, attack: 0 },
  practice: { name: '练功木剑', type: 'blade', price: 15, attack: 2 },
  steel: { name: '青钢剑', type: 'blade', price: 65, attack: 5 },
};
export const LESSONS = {
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
  medicine: { name: '一车救命药', start: 'request', nodes: {
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
};
