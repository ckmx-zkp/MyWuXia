export const FATE_NPCS = { qiaofeng: '乔峰 · 北丐帮帮主', hongqigong: '洪七公 · 东丐帮帮主', shihuolong: '史火龙 · 西丐帮帮主' };
export const FATES = {
  locked: { name: '三帮风声', scene: '杏子林风波未定，三帮的信使尚在等候消息。', choices: [] },
  dispute: {
    name: '一封三印书', zones: [0, 2], window: 900, timeout: 'conflict',
    scene: '杏子林事后，一批赈粮在交接处失踪。三封钤着不同帮印的书信送到你手中，彼此指认对方改了押运路线。',
    dialogues: [['乔峰', '北帮押粮弟子尚未归来。先寻人，再辨是非。'], ['洪七公', '饥民等不得，老叫花却也不肯拿无凭的话定罪。'], ['史火龙', '西帮认得自己的印信。这一笔账，须三家对过。']],
    hearsay: '茶棚间传开了三帮失粮的消息，往来镖师都放慢了脚步。',
    choices: [
      {id:'sect_truce',text:'兑现武当担保，请三帮先撤卡赈济',condition:{ref:'fact:xingzi_mediated',op:'eq',value:true,reason:'须在杏子林以师门药路担保停争'},next:'truce',effect:{flag:{three_bangs:'truce'},factionRelations:{north_east:10,north_west:10,east_west:10},npcStates:{qiaofeng:'接受药路担保，暂缓争执',hongqigong:'先行赈济，保留查账',shihuolong:'暂撤粮卡，仍待证据'}},outcome:'三帮认了山门的担保，先撤卡赈济。只有停争之约，没有未经查实的盟誓。'},
      {id:'guard_relief',text:'先护伤者与民间粮车，不代三帮断案',condition:{ref:'fact:xingzi_protected',op:'eq',value:true,reason:'须在杏子林真正守住伤者退路'},next:'conflict_end',effect:{flag:{three_bangs:'conflict',civilian_relief:true},factionRelations:{north_east:-20,north_west:-20,east_west:-10},npcStates:{qiaofeng:'护伤者退避，三帮嫌隙未解',hongqigong:'照料饥民，尚未互认粮签',shihuolong:'保留粮卡，未参与民间护送'}},outcome:'你保住民间粮车，三帮却未能互认底账。伤者有了退路，封粮造成的药价与通行压力仍在。'},
      { id:'shelter',text:'凭回春堂与武当的安置，请证人带原簿赴会',next:'council',condition:{all:[{ref:'fact:witness_sheltered',op:'eq',value:true,reason:'须先安置证人'},{ref:'fact:medicine_wudang',op:'eq',value:true,reason:'须打通武当药路'}]},effect:{flag:{grain_evidence:true,witness_alive:true},npcStates:{grain_witness:'药路接济下带原簿赴会'}},outcome:'药铺与山门各出一人护送，证人带着原簿赴会，不必再次支付药资。' },
      { id: 'trace', text: '赴荆襄寻找押粮人', next: 'evidence', cost: 20, effect: { flag: { grain_inquiry: true } }, outcome: '你付清舟钱，循旧驿道去查交接底簿。三帮暂缓问罪，仍只肯给你片刻工夫。' },
      { id: 'mediate', text: '请三位帮主在中原对账', next: 'council', cost: 30, effect: {}, outcome: '三封请帖送出。没有实证，这场会面只能先求止争。' },
      { id: 'north', text: '公开支持北帮，承担护粮之责', next: 'conflict', effect: { flag: { backed_north: true }, favor: { '乔峰': 10 }, factionRelations: { north_east: -30, north_west: -30, east_west: 0 } }, outcome: '乔峰谢你仗义，洪七公与史火龙却不肯接受未审先判。三帮各设粮卡，争端愈烈。' },
    ],
  },
  evidence: {
    name: '汉水旧账', zones: [1], window: 600, timeout: 'conflict',
    scene: '汉水驿亭的账房被人翻过，押粮人躲在空船底。一本湿透的底簿记着陌生货栈的私印。',
    dialogues: [['押粮人', '有人拿三家的名帖催我改道。我认得那人靴上红泥，绝非帮里兄弟。']],
    hearsay: '荆襄渡口有人说，失粮案里另有商栈做手脚。',
    choices: [
      { id: 'protect', text: '付药资护送证人，共赴中原', next: 'council', cost: 15, effect: { flag: { grain_evidence: true, witness_alive: true }, npcStates: { grain_witness: '在三帮护送下作证' } }, outcome: '伤者服药缓过气来，带着底簿与你同行。三帮将得到同一份证词。' },
      { id: 'copy', text: '抄下账目，让证人自行离去', next: 'council', effect: { flag: { grain_evidence: true, witness_alive: false }, npcStates: { grain_witness: '隐姓离开，无法当面对质' } }, outcome: '你保住了账页，证人却消失在渡口人流中。纸证尚可止争，彻底互信仍需更多担保。' },
    ],
  },
  council: {
    name: '三帮会审', zones: [2], window: 600, timeout: 'conflict',
    scene: '中原茶棚外，三根竹杖并排靠着墙。乔峰、洪七公、史火龙各携一名执事，等你将事实摆上桌面。',
    dialogues: [['洪七公', '把同一份账摆在同一张桌上，谁也别藏半页。'], ['史火龙', '若是外人作局，西帮愿出力追粮；若只有空话，我不能拿弟子的命去赌。'], ['乔峰', '证人若在，乔某担保无人逼供。']],
    hearsay: '三位帮主罕见地同坐一席，中原帮众都在等棚里传出话来。',
    choices: [
      { id: 'alliance', text: '让证人与账簿当面对质，议定联运盟约', next: 'alliance', requires: { grain_evidence: true, witness_alive: true }, effect: { flag: { three_bangs: 'alliance' }, factionRelations: { north_east: 60, north_west: 60, east_west: 60 }, npcStates: { qiaofeng: '北丐帮帮主，与东、西两帮结盟', hongqigong: '东丐帮帮主，主持三帮联运', shihuolong: '西丐帮帮主，共保粮路' }, rep: 30 }, outcome: '证词与三家底账严丝合缝。三位帮主各留一道印信，从此粮路互认，纠纷三方共审。' },
      { id: 'truce', text: '各退一步，先给饥民放粮', next: 'truce', effect: { flag: { three_bangs: 'truce' }, factionRelations: { north_east: 10, north_west: 10, east_west: 10 }, npcStates: { qiaofeng: '北丐帮帮主，守约停争', hongqigong: '东丐帮帮主，独立赈济', shihuolong: '西丐帮帮主，保留疑虑' }, rep: 10 }, outcome: '三帮撤去粮卡，各自赈济。误会并未尽消，至少百姓不必为此挨饿。' },
    ],
  },
  alliance: {
    name: '三印通行', zones: [1, 2, 8], scene: '三帮粮车第一次共用一路。你的名号写在护运簿上，各家弟子都肯交给你同一份路引。',
    dialogues: [['联运执事', '这是三位帮主共同签押的差事，请你送第一程。']], hearsay: '三帮结盟后，荆襄、中原、关中的粮路相继恢复。',
    choices: [{ id: 'escort', text: '护送首批联运粮车', next: 'alliance_end', effect: { silver: 60, exp: 80, flag: { grain_route_open: true } }, outcome: '粮车平安抵站。三帮共同记下你的功劳，联运约定成为日后的通例。' }],
  },
  truce: {
    name: '各守一程', zones: [0, 1, 2], scene: '帮众收起路卡，却仍各走各的粮道。一批无人照管的流民停在交界。',
    dialogues: [['赈济执事', '三帮不再动手，余下的事还得有人肯做。']], hearsay: '粮路暂安，三帮仍分头行事。',
    choices: [{ id: 'relief', text: '出资安置流民', cost: 10, next: 'truce_end', effect: { exp: 40, rep: 15 }, outcome: '你搭起粥棚。三帮各送来一车粮，却没有再次合印。停争的约定就此留下。' }],
  },
  conflict: {
    name: '三路封粮', zones: [0, 2, 8], scene: '查证期限已过，或偏袒之言先行传开。三帮各封一段粮道，帮众互不通行。',
    dialogues: [['洪七公', '争的是脸面，苦的是吃不饱的人。肯回头补救，总还来得及。'], ['史火龙', '西帮会听证据，却不会听一面之词。']], hearsay: '三帮公开失和，镖车纷纷绕道。',
    choices: [
      { id: 'repair', text: '赔付损粮，重请三方查账', cost: 60, next: 'evidence', effect: { flag: { backed_north: false } }, outcome: '赔粮送到各家，三帮再给一次查证机会。旧账还须你赴汉水亲查。' },
      { id: 'neutral', text: '不再担保结盟，另开民间赈济', cost: 10, next: 'conflict_end', effect: { rep: 8, flag: { three_bangs: 'conflict', civilian_relief: true } }, outcome: '百姓得到了救济，三帮却各自为政。你保住一条民间粮路，未能挽回三方关系。' },
    ],
  },
  alliance_end: { name: '三帮同盟', terminal: true, scene: '三印共护粮路，三帮互认盟约。', choices: [] },
  truce_end: { name: '停争未盟', terminal: true, scene: '三帮守住停争之约，各自赈济，彼此仍有戒心。', choices: [] },
  conflict_end: { name: '江湖分途', terminal: true, scene: '三帮仍然失和。民间赈路留存，却没有三帮共同的印信。', choices: [] },
};

// Shelter proves a safe journey, not a ledger: require the separately checked record.
FATES.dispute.choices.find(c=>c.id==='shelter').condition.all.push({ref:'fact:yanzi_ready',op:'eq',value:true,reason:'还须亲自核对太湖往来簿，接济不能代替证据'});
