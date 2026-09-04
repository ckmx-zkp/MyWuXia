import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = path.join(ROOT, 'Key.txt');
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'voice');
const API_BASE = (process.env.MINIMAX_API_BASE ?? 'https://api.minimax.chat').replace(/\/$/, '');
const MODEL = process.env.MINIMAX_MODEL ?? 'speech-2.8-turbo';
const CONCURRENCY = Number(process.env.MINIMAX_CONCURRENCY ?? 1);
const RETRY = Number(process.env.MINIMAX_RETRY ?? 3);
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const SAMPLE_RATE = Number(process.env.MINIMAX_SAMPLE_RATE ?? 32000);
const BITRATE = Number(process.env.MINIMAX_BITRATE ?? 128000);
const FORMAT = process.env.MINIMAX_FORMAT ?? 'mp3';

const VOICE = {
  narrator:        { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  duan_yu:         { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  zhong_ling:      { voice_id: 'female-shaonv',      speed: 1.05, pitch: 2, vol: 1.0 },
  zuo_zimu:        { voice_id: 'male-qn-jingying',   speed: 0.95, pitch: -1, vol: 1.0 },
  xin_shuangqing:  { voice_id: 'female-yujie',       speed: 0.95, pitch: 1, vol: 1.0 },
  duan_yu_q03:     { voice_id: 'male-qn-qingse',     speed: 1.05, pitch: 1, vol: 1.0 },
  zhong_ling_q03:  { voice_id: 'female-shaonv',      speed: 1.1,  pitch: 2, vol: 1.0 },
  zuo_zimu_q03:    { voice_id: 'male-qn-jingying',   speed: 1.0,  pitch: -2, vol: 1.05 },
  duan_yu_q04:     { voice_id: 'male-qn-qingse',     speed: 1.05, pitch: 1, vol: 1.0 },
  zhong_ling_q06:  { voice_id: 'female-shaonv',      speed: 1.0,  pitch: 1, vol: 1.0 },
  si_kong_xuan:    { voice_id: 'male-qn-badao',      speed: 0.9,  pitch: -3, vol: 1.1 },
  innkeeper:       { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  guo_jing:        { voice_id: 'male-qn-badao',      speed: 0.95, pitch: -2, vol: 1.05 },
  yi_deng:         { voice_id: 'male-qn-jingying',   speed: 0.9,  pitch: -1, vol: 1.0 },
  zhu_zi_liu:      { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 1, vol: 1.0 },
  zhu_zi_liu_praise:{ voice_id: 'male-qn-qingse',    speed: 1.05, pitch: 1, vol: 1.0 },
  tea_dao:         { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  ying_gu:         { voice_id: 'female-yujie',       speed: 1.0,  pitch: 0, vol: 1.0 },
  lin_ping_zhi:    { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  wang_furen:      { voice_id: 'female-yujie',       speed: 1.0,  pitch: 0, vol: 1.0 },
  lin_zhennan:     { voice_id: 'male-qn-badao',      speed: 0.95, pitch: -1, vol: 1.0 },
  hou_renying:     { voice_id: 'male-qn-badao',      speed: 1.0,  pitch: -2, vol: 1.0 },
  jia_renda:       { voice_id: 'male-qn-badao',      speed: 1.05, pitch: -1, vol: 1.0 },
  tea_oldman:      { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  huang_zhonggong: { voice_id: 'male-qn-jingying',   speed: 0.95, pitch: 0, vol: 1.0 },
  ding_jian:       { voice_id: 'male-qn-jingying',   speed: 0.95, pitch: -1, vol: 1.0 },
  xiang_wentian:   { voice_id: 'male-qn-badao',      speed: 1.0,  pitch: -1, vol: 1.05 },
  linghu_chong:    { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  dan_qingsheng:   { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  heibai_zi:       { voice_id: 'male-qn-jingying',   speed: 0.95, pitch: 0, vol: 1.0 },
  tuobiweng:       { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  ren_woxing:      { voice_id: 'male-qn-badao',      speed: 0.85, pitch: -4, vol: 1.15 },
  tea_farmer:      { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  a_bi:            { voice_id: 'female-shaonv',      speed: 1.0,  pitch: 1, vol: 1.0 },
  a_zhu_old:       { voice_id: 'female-yujie',       speed: 0.85, pitch: -2, vol: 1.0 },
  a_zhu:           { voice_id: 'female-shaonv',      speed: 1.05, pitch: 1, vol: 1.0 },
  bao_butong:      { voice_id: 'male-qn-jingying',   speed: 1.05, pitch: 1, vol: 1.0 },
  feng_bao:        { voice_id: 'male-qn-badao',      speed: 1.1,  pitch: -1, vol: 1.05 },
  waiter:          { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  qiao_feng:       { voice_id: 'male-qn-badao',      speed: 1.0,  pitch: -1, vol: 1.05 },
  xiao_feng:       { voice_id: 'male-qn-badao',      speed: 0.95, pitch: -2, vol: 1.05 },
  quanguan_qing:   { voice_id: 'male-qn-jingying',   speed: 1.05, pitch: -1, vol: 1.0 },
  xu_changlao:     { voice_id: 'male-qn-jingying',   speed: 0.85, pitch: -1, vol: 1.0 },
  kang_min:        { voice_id: 'female-yujie',       speed: 1.0,  pitch: 0, vol: 1.0 },
  wuxi_innkeeper:  { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  zhu_cong:        { voice_id: 'male-qn-jingying',   speed: 1.1,  pitch: 1, vol: 1.0 },
  ke_zhen_e:       { voice_id: 'male-qn-badao',      speed: 0.9,  pitch: -2, vol: 1.0 },
  qiu_chu_ji:      { voice_id: 'male-qn-jingying',   speed: 1.0,  pitch: -1, vol: 1.0 },
  han_xiao_ying:   { voice_id: 'female-shaonv',      speed: 1.0,  pitch: 0, vol: 1.0 },
  nan_xi_ren:      { voice_id: 'male-qn-badao',      speed: 0.9,  pitch: -2, vol: 1.0 },
  tea_passer:      { voice_id: 'male-qn-jingying',   speed: 1.0,  pitch: 0, vol: 1.0 },
  wei_xiaobao:     { voice_id: 'male-qn-qingse',     speed: 1.15, pitch: 3, vol: 1.0 },
  mao_shi_ba:      { voice_id: 'male-qn-badao',      speed: 0.95, pitch: -2, vol: 1.0 },
  shi_song:        { voice_id: 'male-qn-jingying',   speed: 0.95, pitch: -2, vol: 1.0 }
};

const DIALOGUES = [
  { id: 'DL-01_Q01_duan_yu',           role: 'duan_yu',         source: 'DL-01', text: '妙极，妙极！明明是自己重心不稳向前跌了个趔趄，偏要叫什么顺水推舟。若对手反手撩剑自下而上，他自己岂不是撞到剑尖上送死？' },
  { id: 'DL-01_Q01_xin_shuangqing',    role: 'xin_shuangqing',  source: 'DL-01', text: '左师兄未免高兴得太早。出剑轻浮躁进，下盘空虚如朽木，若遇名家，不过是自取其辱！' },
  { id: 'DL-01_Q01_zuo_zimu',          role: 'zuo_zimu',        source: 'DL-01', text: '龚师妹，五年前东宗胜了半招，这五年来我东宗弟子日夕苦练。容师侄这招顺水推舟虽未至化境，倒也深得本门精要。这一局，西宗可愿认下？' },
  { id: 'DL-01_Q02_zhong_ling',        role: 'zhong_ling',      source: 'DL-01', text: '你们无量剑派的剑法本就破绽百出，这位呆哥哥实话实说，你们恼羞成怒还要杀人，真是不害臊！' },
  { id: 'DL-01_Q03_duan_yu',           role: 'duan_yu_q03',     source: 'DL-01', text: '杀人……为何好端端的要杀人？大家坐下来讲和不行么？在下……在下去劝劝那神农帮主！' },
  { id: 'DL-01_Q03_zhong_ling',        role: 'zhong_ling_q03',  source: 'DL-01', text: '呆哥哥你疯啦！神农帮帮主司空玄杀人不眨眼，你连武功都不会，去了就是送死！' },
  { id: 'DL-01_Q03_zuo_zimu',          role: 'zuo_zimu_q03',    source: 'DL-01', text: '神农帮这帮杂碎欺人太甚！众弟子听令，结剑阵，随我杀出去！' },
  { id: 'DL-01_Q04_duan_yu',           role: 'duan_yu_q04',     source: 'DL-01', text: '兄台，求你救救钟姑娘！她为了救我，被神农帮那帮狗贼扣在万劫谷，三日不归就要剁成肉酱喂蛇啊！' },
  { id: 'DL-01_Q05_si_kong_xuan',      role: 'si_kong_xuan',    source: 'DL-01', text: '抓紧调配断肠散！灵鹫宫的天山童姥给老夫下的生死符只剩半月就要发作。若夺不下剑湖宫后山的奇草续命，老夫要让这满山上下死得干干净净！' },
  { id: 'DL-01_Q06_zhong_ling',        role: 'zhong_ling_q06',  source: 'DL-01', text: '这次若不是你仗义相救，本姑娘真要被那秃头司空玄炼成毒人了。那个呆里呆气的段哥哥……不知道逃出包围没有。' },
  { id: 'DL-01_inn_innkeeper',         role: 'innkeeper',       source: 'DL-01', text: '客官您打听无量山？哎哟，最近可别往剑湖宫凑！那东西两宗五年一度争夺山洞的比武就在这两日，左掌门脾气大得很，连外地的行脚商在山道上多看两眼都要被轰走。' },
  { id: 'DL-01_inn_tea_passer',        role: 'tea_passer',      source: 'DL-01', text: '听说大理无量剑派比武，来了一位手无缚鸡之力的贵气书生，当面笑话掌门的剑法，啧啧，这后生不知死字怎么写。' },

  { id: 'DL-02_inn_tea_dao',           role: 'tea_dao',         source: 'DL-02', text: '怪哉！前几日深山落暴雨，山道上走过两个北方打扮的年轻男女，那男的身背一匹汗血宝马，背上还负着一个面如金纸、只有出气没有进气的小姑娘，一路狂奔向点苍山最深处去，说是要找什么能活死人肉白骨的退位老皇帝。' },
  { id: 'DL-02_Q01_guo_jing',          role: 'guo_jing',        source: 'DL-02', text: '蓉儿，坚持住！洪七公师父说过，普天之下唯有大理段皇爷的一阳指神功能化解裘千仞铁掌帮的至阴阴毒掌力，纵有刀山火海，靖哥哥也一定带你上山！' },
  { id: 'DL-02_Q02_zhu_zi_liu',        role: 'zhu_zi_liu',      source: 'DL-02', text: '两位想要见家师？家师十年前便已退位出家，不见外客。我这里有一联，若对得出便放二位过去；若对不出，请自原路折返！' },
  { id: 'DL-02_Q02_zhu_zi_liu_praise', role: 'zhu_zi_liu_praise', source: 'DL-02', text: '妙！妙极！不仅平仄严丝合缝，更是字字诛心！在下狂妄，有眼不识泰山，三位快请进石梁！' },
  { id: 'DL-02_Q03_yi_deng',           role: 'yi_deng',         source: 'DL-02', text: '阿弥陀佛。善哉，善哉！上天有好生之德，贫僧虽已发愿不涉武林争端，但见此女命若悬丝，岂能坐视不理？' },
  { id: 'DL-02_Q03_ying_gu',           role: 'ying_gu',         source: 'DL-02', text: '段智兴！算你命大！这笔杀子血债，老身迟早要讨回来！' },
  { id: 'DL-02_Q04_yi_deng',           role: 'yi_deng',         source: 'DL-02', text: '此乃贫僧当年研习王重阳道兄先天功与大理本门武学的心得摘抄，名为枯荣禅经真意。赠予小友，望你常怀慈悲之心，兼济天下苍生。' },

  { id: 'FZ-01_inn_tea_oldman',        role: 'tea_oldman',      source: 'FZ-01', text: '客官您是北边来的？最近福州城不太平啊！福威镖局那面福威天下的大锦旗，前夜里不知被谁用利刃从中劈成了两半！总镖局大门外青石坪上，每天清晨都用鲜血画着一道猩红的血线，谁迈过那道线，当天夜里就准口吐白沫暴毙！' },
  { id: 'FZ-01_Q01_lin_ping_zhi',      role: 'lin_ping_zhi',    source: 'FZ-01', text: '店家！切五斤熟牛肉，打三角上等三白酒！打完野味，顺道回城给爹爹看我射下的这头白额雕！' },
  { id: 'FZ-01_Q01_jia_renda',         role: 'jia_renda',       source: 'FZ-01', text: '龟儿子好大的排场！屁大点地方，也敢叫什么福威天下？老子看是狗彘升天！' },
  { id: 'FZ-01_Q02_lin_zhennan',       role: 'lin_zhennan',     source: 'FZ-01', text: '这位少侠，林某走南闯北三十年，从未见过如此阴毒的索命手段！凡踏出这道血线三步之人，皆在两个时辰内脏腑碎裂而亡，连我那史镖头、钱镖头，皆死得不明不白！' },
  { id: 'FZ-01_Q02_wang_furen',        role: 'wang_furen',      source: 'FZ-01', text: '定是四川青城派余矮子！当年祖父远图公威震江湖，青城派长青子败在辟邪剑下，如今他们是来寻仇夺经的！' },
  { id: 'FZ-01_Q03_hou_renying',       role: 'hou_renying',     source: 'FZ-01', text: '林震南！交出七十二路辟邪剑谱原本，余观主尚可留你林家一条血脉！若敢说半个不字，今夜福威镖局八十四口鸡犬不留！' },
  { id: 'FZ-01_Q04_lin_ping_zhi',      role: 'lin_ping_zhi',    source: 'FZ-01', text: '爹……娘……平之无能！青城派余沧海，若我林平之大难不死，纵使化作厉鬼，也要将青城上下屠戮殆尽！' },
  { id: 'FZ-01_Q04_lin_ping_zhi_huashan', role: 'lin_ping_zhi', source: 'FZ-01', text: '恩公！青城派想要我林家的辟邪剑谱，我偏不让他们如愿！我听闻华山派名门正派，岳不群掌门乃君子剑，我欲前往华山拜师复仇！' },

  { id: 'HZ-01_inn_tea_farmer',        role: 'tea_farmer',      source: 'HZ-01', text: '客官您打听孤山梅庄？哎哟，那庄子邪性得很！庄门终年紧闭，四位庄主从不与武林中人往来，只痴迷琴棋书画。不过这两日，西湖边来了个身材极高、满脸络腮胡的白发老者，领着一个面色苍白却佩着长剑的落魄年轻人，手里捧着范宽的溪山行旅图真迹与广陵散残谱到处打听。' },
  { id: 'HZ-01_Q01_ding_jian',         role: 'ding_jian',       source: 'HZ-01', text: '童老先生，我家四位庄主早已不问世事二十年。若非天下无双的翰墨珍品或稀世广陵遗音，二位请回吧，休要扰了清修。' },
  { id: 'HZ-01_Q01_xiang_wentian',     role: 'xiang_wentian',   source: 'HZ-01', text: '天下何人不识梅庄四位前辈大名！在下费尽千辛万苦寻来嵇康广陵散琴谱真卷与刘仲甫呕血谱，若四位庄主不屑一顾，天下便再无通晓雅趣之人，在下只好一把火烧了这绝世孤本！' },
  { id: 'HZ-01_Q02_dan_qingsheng',     role: 'dan_qingsheng',   source: 'HZ-01', text: '风兄弟！童老哥说你剑法天下第一，只要在场有人能破你一招，这幅范宽真迹便归梅庄！老四我不才，先以这路泼墨披麻剑法领教风兄弟的高招！' },
  { id: 'HZ-01_Q02_huang_zhonggong',   role: 'huang_zhonggong', source: 'HZ-01', text: '天下当真有这等料敌先机、无招胜有招的剑法！老朽生平不服人，今日愿以七弦无形剑领教！' },
  { id: 'HZ-01_Q03_ren_woxing',        role: 'ren_woxing',      source: 'HZ-01', text: '哈哈哈哈哈！十二年！老夫被困这暗无天日的水底十二年！东方不败，你夺我教主之位，今日便是我任我行脱困重掌乾坤之时！' },
  { id: 'HZ-01_Q04_huang_zhonggong',   role: 'huang_zhonggong', source: 'HZ-01', text: '东方教主法令如山……我兄弟四人奉命看守重犯十二载，今日犯人脱困，黑木崖岂能容我等苟活？少侠，你非神教中人，快快乘船离去吧，莫要平白送了性命。' },
  { id: 'HZ-01_Q01_linghu_chong',      role: 'linghu_chong',    source: 'HZ-01', text: '前辈剑法如飞瀑泼墨，晚辈得罪了！' },

  { id: 'SZ-01_inn_waiter',            role: 'waiter',          source: 'SZ-01', text: '客官想雇船游太湖？劝您太阳落山前千万别往西山深处摇橹！那水域里芦苇荡比天还高，底下暗桩和吃人水草密密麻麻，没得引路人的红菱画舫，船底一准被凿漏！' },
  { id: 'SZ-01_Q01_a_bi',              role: 'a_bi',            source: 'SZ-01', text: '这位客官，太湖水路凶险，再往前划便是慕容家的水庄水域了。我家公子出门游历未归，庄上不便见客，不知客官循着曲子来，所为何事呀？' },
  { id: 'SZ-01_Q02_a_zhu_old',         role: 'a_zhu_old',       source: 'SZ-01', text: '老身慕容氏远房姑婆。这位少侠深夜造访燕子坞，莫不是听信了北方传言，以为少林玄悲大师、伏虎罗汉柯百岁是我家复儿所杀，特来兴师问罪的？' },
  { id: 'SZ-01_Q02_a_zhu',             role: 'a_zhu',           source: 'SZ-01', text: '好利落的眼力！姑苏慕容家好久没来这么精明的客人了！' },
  { id: 'SZ-01_Q03_feng_bao',          role: 'feng_bao',        source: 'SZ-01', text: '哈哈！又有外客登岛了！老子一天不打架浑身骨头就发痒！少侠，不管你是来奉茶还是问罪的，先接老风三十刀再说！' },
  { id: 'SZ-01_Q03_bao_butong',        role: 'bao_butong',      source: 'SZ-01', text: '非也，非也！四弟此言差矣！若是少林寺的大和尚来了，打死也罢；这位少侠面带清秀之气，怎可随随便便乱砍？要砍，也得先让我包三先生用言语把他驳得哑口无言，然后再砍！' },
  { id: 'SZ-01_Q04_a_zhu',             role: 'a_zhu',           source: 'SZ-01', text: '少侠仁厚通达，风四哥与包三哥极少如此佩服外客。还施水阁乃慕容家禁地，外客本不可入内；但阁外回廊上有一方百家剑理石壁，乃先祖慕容龙城所刻心得，少侠不妨在此参详半日。' },

  { id: 'WX-01_inn_wuxi_innkeeper',    role: 'wuxi_innkeeper',  source: 'WX-01', text: '怪事年年有，今年特别多！昨日那位威震天下的丐帮乔帮主，在二楼和一位大理来的白衣贵公子斗酒，两人一口气喝光了老夫窖藏三十年的三十坛上好花雕，面不改色！可今天一早，城外杏子林方向黑压压聚了上万名要饭的叫花子。' },
  { id: 'WX-01_Q01_qiao_feng',         role: 'qiao_feng',       source: 'WX-01', text: '痛快！段兄弟好酒量！那边的这位少侠，腰间佩刀气度沉稳，驻足凝视良久，莫非也是性情中人？若不嫌乔某是个粗鲁叫化，何不上来共饮三碗千日醉？！' },
  { id: 'WX-01_Q01_xiao_feng_toast',   role: 'xiao_feng',       source: 'WX-01', text: '久闻北乔峰英雄盖世，今日得见，三生有幸！' },
  { id: 'WX-01_Q02_quanguan_qing',     role: 'quanguan_qing',   source: 'WX-01', text: '众位兄弟！马副帮主死于他成名绝技锁喉擒拿手，天下谁人不知？那日姑苏慕容在场，乔帮主却处处偏袒燕子坞！更有甚者……乔帮主身上流的根本不是大宋汉民的血，他是个契丹狗鞑子！' },
  { id: 'WX-01_Q03_xu_changlao',       role: 'xu_changlao',     source: 'WX-01', text: '三十年前雁门关外，乱石谷前……带头大哥率中原二十一名武林名宿，截杀契丹武士……杀其母，擒其子。这婴孩胸膛刺有狼头青记，抱入少林抚养，授姓乔名峰……此子非我族类，若有异心，天下群雄共诛之！' },
  { id: 'WX-01_Q03_kang_min',          role: 'kang_min',        source: 'WX-01', text: '先夫临终有言，若他遇害，必与此信有关！徐长老年高德劭，请当众宣读汪老帮主亲笔遗命！' },
  { id: 'WX-01_Q04_xiao_feng',         role: 'xiao_feng',       source: 'WX-01', text: '从今往后，世上再无丐帮乔帮主！我乔峰不，我是契丹人萧峰！我必前往雁门关，查明杀我生母的带头大哥究竟是谁！' },
  { id: 'WX-01_Q01_duan_yu_xingzilin', role: 'duan_yu',         source: 'WX-01', text: '段誉先敬乔兄一坛！北乔峰之名，如雷贯耳，今日得与大哥共饮，不枉此生！' },

  { id: 'JX-01_Q01_zhu_cong',          role: 'zhu_cong',        source: 'JX-01', text: '哎哟哟！这位小哥恕罪，小生昨夜多饮了两杯，一时失足失足！多有得罪，多有得罪！' },
  { id: 'JX-01_Q02_zhu_cong',          role: 'zhu_cong',        source: 'JX-01', text: '大哥，长街上倒遇着个有意思的后生。不过城外法华寺那边探听清楚了，丘处机那老道果然带着一口大铁铜钟进城了！' },
  { id: 'JX-01_Q02_quan_jinfa',        role: 'wuxi_innkeeper',  source: 'JX-01', text: '哪来的生面孔？今日醉仙楼被包下了，不待闲客！' },
  { id: 'JX-01_Q03_ke_zhen_e',         role: 'ke_zhen_e',       source: 'JX-01', text: '丘道长好大的煞气！出家人动辄喊打喊杀，倒比绿林好汉还要威风！我江南七怪在此，你这钟酒，我们喝得下！' },
  { id: 'JX-01_Q03_qiu_chu_ji',        role: 'qiu_chu_ji',      source: 'JX-01', text: '贫道自北方千里追凶，焦木和尚藏匿大奸大恶，贫道本欲一把火烧了法华寺！' },
  { id: 'JX-01_Q03_nan_xi_ren',        role: 'nan_xi_ren',      source: 'JX-01', text: '此话有理。' },
  { id: 'JX-01_Q04_han_bao_ju',        role: 'qiao_feng',       source: 'JX-01', text: '追！不能让这狗官逃出江南地界！' },
  { id: 'JX-01_Q04_han_xiao_ying',     role: 'han_xiao_ying',   source: 'JX-01', text: '休要恋战，救人要紧！李萍腹中孩儿已受惊动，再耽搁就要一尸两命了！' },
  { id: 'JX-01_Q05_ke_zhen_e',         role: 'ke_zhen_e',       source: 'JX-01', text: '你去寻杨家之后，我七怪舍了这条性命远赴塞外草原，寻访郭家后人！十八年后的今日，仍在这嘉兴醉仙楼上，让两家孩子比剑定胜负！' },
  { id: 'JX-01_Q05_qiu_chu_ji',        role: 'qiu_chu_ji',      source: 'JX-01', text: '一言为定！江南七怪果真义重泰山！十八年后，醉仙楼不见不散！' },
  { id: 'JX-01_Q05_zhu_cong',          role: 'zhu_cong',        source: 'JX-01', text: '少侠，你心志坚毅，临危不惧，他日江湖必有你的名号。大漠黄沙万里，若有一日你也踏足塞北草原，记着替老叫化带一壶江南的花雕酒！' },
  { id: 'JX-01_inn_tea_passer',        role: 'tea_passer',      source: 'JX-01', text: '你听说没有？南湖边上那座三层的醉仙楼被人整整包了三天！楼上时不时飘出一股焦味和酒香。昨天黄昏，我亲眼看见七个怪模怪样的人扛着铜缸、扁担、秤砣进了楼。' },

  { id: 'YZ-01_inn_innkeeper',         role: 'innkeeper',       source: 'YZ-01', text: '客官打外地来？那可得护好您的腰包！西街丽春院那带最不消停，那院里韦春花的半大儿子叫小宝的，机灵鬼透顶，成天跟赌场那帮光棍混在一起。' },
  { id: 'YZ-01_Q01_wei_xiaobao',       role: 'wei_xiaobao',     source: 'YZ-01', text: '哎哟喂！两位大爷明察秋毫！小的哪敢出千？分明是关二爷显灵！要不小的把赢的钱全孝敬您二位买酒喝？' },
  { id: 'YZ-01_Q01_casino_bully',      role: 'shi_song',        source: 'YZ-01', text: '小兔崽子，毛都没长齐敢来聚宝坊出千？老子盯你半天了，这骰子落地声音发闷，分明灌了铅！把你偷摸换骰子的右手剁下来抵债！' },
  { id: 'YZ-01_Q02_wei_xiaobao',       role: 'wei_xiaobao',     source: 'YZ-01', text: '好汉，瞧你一身正气，定是个响当当的江湖好汉！实不相瞒，我屋里藏了位真正的大英雄，但他快不行了……' },
  { id: 'YZ-01_Q02_mao_shi_ba',        role: 'mao_shi_ba',      source: 'YZ-01', text: '小宝……这是何人？莫非……莫非是鞑子鹰犬？老子茅十八堂堂汉子，死也不受鸟气！' },
  { id: 'YZ-01_Q03_shi_song',          role: 'shi_song',        source: 'YZ-01', text: '茅十八，你逃了三千里，今日扬州便是你的葬身之地！识相的交出天地会逆贼名册，本官留你一个全尸！' },
  { id: 'YZ-01_Q03_wei_xiaobao',       role: 'wei_xiaobao',     source: 'YZ-01', text: '英雄哥哥，那穿官袍的家伙最神气，必定是头领。我兜里还有半包蒙汗药和胡椒面，你正面上，我从后头给丫下绊子！' },
  { id: 'YZ-01_Q04_mao_shi_ba',        role: 'mao_shi_ba',      source: 'YZ-01', text: '少侠，千言万语难表救命之恩！此去燕京风云莫测，若日后在北方落脚，持我这把单刀寻至天地会青木堂据点，天下群雄见刀如见兄弟！' },
  { id: 'YZ-01_Q04_wei_xiaobao',       role: 'wei_xiaobao',     source: 'YZ-01', text: '哈哈！老子总算离开这丽春院了！听说北京城大得没边，紫禁城里的太监吃的是烧鹅，拉的是金豆子，老子这次非去见识见识不可！' },

  { id: 'DL-02_Q01_guo_jing_kneel',    role: 'guo_jing',        source: 'DL-02', text: '多谢恩公仗义援手！郭靖铭感五内！' },
  { id: 'DL-02_Q02_zhu_zi_liu_duilian', role: 'zhu_zi_liu',      source: 'DL-02', text: '琴瑟琵琶，八大王一般头面。' },
  { id: 'DL-02_Q02_huang_rong_weak',    role: 'a_bi',            source: 'DL-02', text: '这位兄台好文采，倒省了我一番唇舌。' },
  { id: 'DL-02_Q03_yi_deng_nostalgia',  role: 'yi_deng',         source: 'DL-02', text: '因果循环，皆由宿怨。当年贫僧痴迷武学冷落深宫，种下恶因……今日能救得一命，纵使内力全失五年，亦是赎罪之乐。' },
  { id: 'DL-02_Q04_yi_deng_bless',      role: 'yi_deng',         source: 'DL-02', text: '郭少侠宅心仁厚，他日必成一代为国为民的侠之大者。这位同行的小友，你目光清澈，侠骨铮铮，沿途护持之功，贫僧尽知。' },

  { id: 'FZ-01_Q01_lin_ping_zhi_angry', role: 'lin_ping_zhi',    source: 'FZ-01', text: '放肆！哪来的狂徒，敢辱我福威镖局威名？！' },
  { id: 'FZ-01_Q02_lin_zhennan_despair', role: 'lin_zhennan',    source: 'FZ-01', text: '余沧海……这狗贼！我林家与他青城派素无冤仇，何故赶尽杀绝！' },
  { id: 'FZ-01_Q03_lin_ping_zhi_fury',  role: 'lin_ping_zhi',    source: 'FZ-01', text: '我跟你们拼了！！' },
  { id: 'FZ-01_inn_boss_raid',          role: 'jia_renda',       source: 'FZ-01', text: '龟儿子！那小子跑了！莫让他钻进城隍庙！追！' },

  { id: 'HZ-01_Q01_xiang_wentian_taunt', role: 'xiang_wentian',  source: 'HZ-01', text: '四位庄主若再不见客，这天下便再无通晓雅趣之人！' },
  { id: 'HZ-01_Q02_linghu_chong_bow',   role: 'linghu_chong',    source: 'HZ-01', text: '前辈剑法如飞瀑泼墨，晚辈独孤九剑本就以无招破有招，得罪了！' },
  { id: 'HZ-01_Q02_heibai_zi_offer',    role: 'heibai_zi',       source: 'HZ-01', text: '童先生这呕血谱与广陵散皆是江湖绝响，若庄主们肯拨出棋局一叙，黑白子愿以玄天指法相佐。' },
  { id: 'HZ-01_Q02_tuobiweng_ink',      role: 'tuobiweng',       source: 'HZ-01', text: '老朽秃笔翁以判官笔法领教！笔墨便是刀剑！' },
  { id: 'HZ-01_Q04_huang_zhonggong_gift', role: 'huang_zhonggong', source: 'HZ-01', text: '这是老朽毕生心血所校之琴谱。天下名利皆是过眼云烟，唯音律浩气长存。赠予知音，也不枉老朽在梅庄二十年隐居之乐。' },

  { id: 'SZ-01_Q01_a_bi_song',          role: 'a_bi',            source: 'SZ-01', text: '菡萏香连十顷陂，小姑贪戏采莲迟。晚来弄水船头湿，更脱红裙裹鸭儿。' },
  { id: 'SZ-01_Q03_bao_butong_defeat',  role: 'bao_butong',      source: 'SZ-01', text: '你……你……非也……这……好小子，嘴皮子比老子还刻薄！' },
  { id: 'SZ-01_Q03_feng_bao_praise',    role: 'feng_bao',        source: 'SZ-01', text: '痛快！当真痛快！年纪轻轻竟有如此硬手，老风服你！' },
  { id: 'SZ-01_Q02_a_zhu_serious',      role: 'a_zhu',           source: 'SZ-01', text: '多谢少侠报信！丐帮马副帮主离奇暴毙，天下群雄皆疑我家公子所为，燕子坞不可不防！' },
  { id: 'SZ-01_Q04_a_bi_farewell',      role: 'a_bi',            source: 'SZ-01', text: '公子出门时再三叮嘱，燕子坞虽是慕容家禁地，但若遇知音侠客，亦可奉茶待客。少侠若日后途经太湖，阿碧定当亲自摇橹来迎。' },

  { id: 'WX-01_Q02_qiao_feng_suicide',  role: 'qiao_feng',       source: 'WX-01', text: '四位长老随汪帮主出生入死，有大功于丐帮！今日违逆帮规之罪，由乔峰一力代受！' },
  { id: 'WX-01_Q03_qiao_feng_despair',  role: 'xiao_feng',       source: 'WX-01', text: '不可能！我是汉人！我爹是乔三槐，我是大宋良民！！你们骗我！你们都在骗我！！' },
  { id: 'WX-01_Q03_qiao_feng_gratitude', role: 'xiao_feng',      source: 'WX-01', text: '好兄弟！今日天下皆弃乔某，唯你与段兄弟视我为兄！天大地大，乔峰此生绝不负今日之言！' },
  { id: 'WX-01_Q04_xiao_feng_farewell', role: 'xiao_feng',       source: 'WX-01', text: '少侠，江湖凶险，莫要为了乔某一人与天下武林为敌。若你我有缘，他日雁门关外、塞北风雪之中，再痛饮千碗！' },

  { id: 'DL-01_Q03_duan_yu_sad',        role: 'duan_yu_q03',     source: 'DL-01', text: '杀人……为何好端端的要杀人？' },
  { id: 'DL-01_Q04_duan_yu_cry',        role: 'duan_yu_q04',     source: 'DL-01', text: '钟姑娘她为了救我，被神农帮那帮狗贼扣了！求你救救她啊！' },
  { id: 'DL-01_Q06_zhong_ling_thanks',  role: 'zhong_ling_q06',  source: 'DL-01', text: '我爹爹脾气古怪，最讨厌外人；但我娘亲甘宝宝最明事理。这是我万劫谷的入谷信物，你顺着澜沧江往下走就能避过见骨散毒雾。' },

  { id: 'YZ-01_Q02_mao_shi_ba_proud',   role: 'mao_shi_ba',      source: 'YZ-01', text: '在江洋大盗茅十八，天下谁人不知！老子这条命本就是捡来的，今日得少侠相救，这条命往后就是少侠的！' },
  { id: 'YZ-01_Q03_shi_song_threat',    role: 'shi_song',        source: 'YZ-01', text: '反贼！敢拒捕便是死罪！左右放箭！' },

  { id: 'SZ-01_inn_waiter_warning',     role: 'waiter',          source: 'SZ-01', text: '若是心怀不轨敢乱闯还施水阁，死在水底烂泥里的江湖好汉，可不止三五十个了！' }
];

async function loadKey() {
  const raw = await fs.readFile(KEY_PATH, 'utf8');
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
  if (!line) throw new Error(`Key.txt is empty.`);
  if (line.includes('=')) {
    const v = line.split('=', 2)[1].trim().replace(/^["']|["']$/g, '');
    if (!v) throw new Error(`Empty value in KEY=... line`);
    return v;
  }
  return line;
}

function buildBody(d) {
  const v = VOICE[d.role];
  return {
    model: MODEL,
    text: d.text,
    stream: false,
    output_format: 'url',
    voice_setting: {
      voice_id: v.voice_id,
      speed: v.speed,
      vol: v.vol,
      pitch: v.pitch
    },
    audio_setting: {
      sample_rate: SAMPLE_RATE,
      bitrate: BITRATE,
      format: FORMAT,
      channel: 1
    }
  };
}

async function synthesize(d, key) {
  const url = `${API_BASE}/v1/t2a_v2`;
  const body = buildBody(d);
  let lastErr;
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      lastErr = new Error(`HTTP ${r.status} ${txt.slice(0, 250)}`);
      if (r.status === 429 || r.status >= 500) {
        await new Promise(res => setTimeout(res, 2000 * attempt));
        continue;
      }
      throw lastErr;
    }
    const data = await r.json();
    const br = data?.base_resp;
    if (br && br.status_code !== 0) {
      if (br.status_code === 1002) {
        await new Promise(res => setTimeout(res, 3000 * attempt));
        lastErr = new Error(`rate-limited ${br.status_code}: ${br.status_msg}`);
        continue;
      }
      throw new Error(`api ${br.status_code}: ${br.status_msg}`);
    }
    if (data?.data?.status !== 2 || !data?.data?.audio) {
      throw new Error(`unexpected response: ${JSON.stringify(data).slice(0, 250)}`);
    }
    return data.data.audio;
  }
  throw lastErr ?? new Error('retry exhausted');
}

async function writeAudio(audio, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (audio.startsWith('http://') || audio.startsWith('https://')) {
    const r = await fetch(audio);
    if (!r.ok) throw new Error(`download ${audio} HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await fs.writeFile(dest, buf);
    return buf.length;
  }
  const buf = Buffer.from(audio, 'hex');
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function exists(p) {
  try { const s = await fs.stat(p); return s.size > 0; } catch { return false; }
}

async function runOne(d, key, outDir) {
  const dest = path.join(outDir, `${d.id}.${FORMAT}`);
  if (await exists(dest)) {
    console.log(`[skip] ${d.id} (exists)`);
    return { id: d.id, status: 'skip' };
  }
  process.stdout.write(`[gen ] ${d.id} (${d.role}) ... `);
  if (DRY_RUN) {
    console.log('dry-run');
    return { id: d.id, status: 'dry' };
  }
  try {
    const audio = await synthesize(d, key);
    const bytes = await writeAudio(audio, dest);
    console.log(`ok (${(bytes / 1024).toFixed(1)} KB)`);
    return { id: d.id, status: 'ok', path: dest };
  } catch (e) {
    console.log(`fail: ${e.message}`);
    return { id: d.id, status: 'fail', error: e.message };
  }
}

async function main() {
  const key = await loadKey();
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`[tts] output dir : ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`[tts] api base   : ${API_BASE}`);
  console.log(`[tts] model      : ${MODEL}`);
  console.log(`[tts] audio fmt  : ${FORMAT} ${SAMPLE_RATE}Hz ${BITRATE / 1000}kbps mono`);
  console.log(`[tts] dialogues  : ${DIALOGUES.length}`);

  const queue = ONLY.length ? DIALOGUES.filter(d => ONLY.includes(d.id)) : DIALOGUES;
  if (ONLY.length) console.log(`[tts] --only      : ${ONLY.join(', ')} (${queue.length}/${DIALOGUES.length})`);

  let cursor = 0;
  const tasks = queue.map(d => () => runOne(d, key, OUT_DIR));
  const workers = Array.from({ length: DRY_RUN ? 1 : CONCURRENCY }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= tasks.length) return;
      await tasks[i]();
    }
  });
  await Promise.all(workers);
  console.log('[tts] done');
}

main().catch(e => { console.error('[tts] fatal:', e.message); process.exit(1); });