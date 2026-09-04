import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

/* ================= 音效 ================= */
const SOUND = { click: '/audio/wood-pluck.wav', quest: '/audio/quest-complete.wav', bell: '/audio/breath-bell.wav' };
function play(src, mute) {
  if (mute) return;
  try { const a = new Audio(src); a.volume = 1.0; a.play().catch(() => {}); } catch (e) { /* 浏览器未解锁音频时忽略 */ }
}

/* ================= BGM：13 区主题曲（docs/gdd/05，切区交叉淡化） ================= */
const BGM = [
  '/audio/bgm/zone/T01-jiangnan-rain.mp3', '/audio/bgm/zone/T02-jingxiang-drums.mp3',
  '/audio/bgm/zone/T03-zhongyuan-meet.mp3', '/audio/bgm/zone/T04-yanyun-frost.mp3',
  '/audio/bgm/zone/T05-saibei-longsong.mp3', '/audio/bgm/zone/T06-liaodong-cavalry.mp3',
  '/audio/bgm/zone/T07-baishan-forest.mp3', '/audio/bgm/zone/T08-xixia-desert.mp3',
  '/audio/bgm/zone/T09-guanzhong-sword.mp3', '/audio/bgm/zone/T10-bashu-plankroad.mp3',
  '/audio/bgm/zone/T11-yungui-teahorse.mp3', '/audio/bgm/zone/T12-dali-chant.mp3',
  '/audio/bgm/zone/T13-donghai-waves.mp3',
];
const BGM_VOLUME = 0.5;
let bgmCur = null;   // 当前播放的 Audio
let bgmSrc = null;   // 当前曲目路径
function fadeTo(a, target, ms, done) {
  const step = 50, dv = (target - a.volume) / (ms / step);
  const t = setInterval(() => {
    a.volume = Math.max(0, Math.min(1, a.volume + dv));
    if ((dv > 0 && a.volume >= target) || (dv < 0 && a.volume <= target)) {
      clearInterval(t);
      if (done) done();
    }
  }, step);
}
function bgmSwitch(zoneIdx, mute) {
  try {
    const src = BGM[zoneIdx];
    if (mute) { if (bgmCur) bgmCur.pause(); return; }
    if (bgmSrc === src) {
      /* 同曲：首次自动播放被拦截或暂停时恢复，并补淡入（修复音量停在 0 的问题） */
      if (bgmCur) {
        if (bgmCur.paused) bgmCur.play().catch(() => {});
        if (bgmCur.volume < BGM_VOLUME) fadeTo(bgmCur, BGM_VOLUME, 800);
      }
      return;
    }
    bgmSrc = src;
    if (bgmCur) { const old = bgmCur; fadeTo(old, 0, 400, () => { old.pause(); old.src = ''; }); }
    const next = new Audio(src);
    next.loop = true;
    next.volume = 0;
    next.play().then(() => fadeTo(next, BGM_VOLUME, 1200)).catch(() => { /* 首次交互前被浏览器拦截，下次点击重试 */ });
    bgmCur = next;
  } catch (e) { /* 忽略 */ }
}

/* ================= 语音（docs/gdd/05：对白期间 BGM duck） ================= */
let voiceCur = null;
function stopVoice() {
  if (voiceCur) { try { voiceCur.pause(); } catch (e) { /* 忽略 */ } voiceCur = null; }
  if (bgmCur && !bgmCur.paused) fadeTo(bgmCur, BGM_VOLUME, 600);
}
function playVoice(src, mute) {
  if (mute || !src) return;
  try {
    stopVoice();
    const a = new Audio(src);
    a.volume = 1.0;
    if (bgmCur && !bgmCur.paused) fadeTo(bgmCur, BGM_VOLUME * 0.3, 300);
    a.onended = () => { voiceCur = null; if (bgmCur && !bgmCur.paused) fadeTo(bgmCur, BGM_VOLUME, 800); };
    a.play().catch(() => { if (bgmCur && !bgmCur.paused) fadeTo(bgmCur, BGM_VOLUME, 600); });
    voiceCur = a;
  } catch (e) { /* 忽略 */ }
}
/* ================= 世界数据 ================= */
const ZONES = [
  {
    name: '江南东南', faction: '大宋', danger: 20, cities: '临安、扬州、苏州、嘉兴、福州',
    desc: '天下最繁华之地。楼台烟雨之下，天地会、丐帮与姑苏慕容的暗流交织，一封密信足以搅动整个江南。',
    quests: [
      { name: '查清江南密信的主人', kind: 'main', text: '循着密信上的茶渍与印泥，在临安的酒楼画舫间寻访幕后之人。' },
      { name: '拜访扬州盐商', kind: 'side', text: '盐商的账房里藏着半张字条，需与精明的账房先生周旋。' },
      { name: '太湖追查失镖', kind: 'side', text: '失镖的下落，藏在太湖十二寨酒桌的闲话里。', item: 'jinchuang' },
      { name: '福州镖局送信', kind: 'side', text: '一封加急书信，要赶在潮信之前送到福州镖局。' },
    ],
    trees: [
      {
        id: 'YZ-01', name: '市井小宝与丽春深澜', where: '扬州',
        nodes: [
          {
            name: '赌场老千与石灰粉少年',
            scene: '扬州聚宝赌场侧厅，乌烟瘴气。一个扎着歪斜冲天辫的瘦小少年踩在长凳上狂喊通杀，庄家揭开骰盅，赫然真是一色三个六。两名满脸横肉的打手已按住了少年的肩膀，尖刀钉在桌上。',
            dialogues: [
              ['赌场恶霸', '小兔崽子，骰子落地声音发闷，分明灌了铅！把你换骰子的右手剁下来抵债！'],
              ['韦小宝', '哎哟喂！两位大爷明察秋毫，分明是关二爷显灵！要不小的把赢的钱全孝敬您二位买酒喝？'],
            ],
            choices: [
              {
                text: '掷石救人：暗器打落凶刀，搅乱赌场', diff: 12,
                ok: { text: '你指尖一弹，碎石破空将凶刀击飞，直刺入房梁。赌场顿时大乱。韦小宝大喜过望：“多谢好汉相救！小宝来世变牛变马结草衔环！”', exp: 15, favor: { 韦小宝: 10 } },
                fail: { text: '你出手慢了半分，小宝自己抓出一把石灰兜头泼在打手脸上，扯着你的衣角狂奔：“发什么呆！扯呼啊！”', exp: 8 },
              },
              {
                text: '按官府规矩：掏出二十两银子平事', cost: { silver: 20 },
                ok: { text: '你排众而出丢下碎银：“城中正搜捕大盗，闹出人命引来官府，谁也讨不了好。”打手掂了掂银子，啐了一口散去。', exp: 12, rep: 2, favor: { 韦小宝: 5 } },
              },
            ],
          },
          {
            name: '丽春院密室与血染金刀',
            scene: '丽春院后院柴房，脂粉香背后弥漫着刺鼻血腥味。稻草堆里靠着个满脸虬髯、胸膛缠着染血麻布的粗豪大汉，掌中死死握着一柄带血单刀。',
            dialogues: [
              ['茅十八', '小宝……这是何人？莫非是鞑子鹰犬？老子茅十八堂堂汉子，死也不受鸟气！'],
              ['韦小宝', '好汉，他是我屋里藏着的真正的大英雄，但他快不行了……'],
            ],
            choices: [
              {
                text: '运功止血：消耗金创药为其疗伤', cost: { item: 'jinchuang' },
                ok: { text: '你并指点住他胸前大穴，敷上金创药，掌心抵住后心注入温和真气。茅十八脸色由白转红，抱拳慨然：“在下茅十八，有眼不识泰山！这条命往后就是少侠的！”', exp: 20, favor: { 茅十八: 15 } },
              },
              {
                text: '警惕盘问：先查清他的身份与官非',
                ok: { text: '你横剑冷声盘问。茅十八怒斥：“老子杀的是逼良为娼的八旗鹰犬，砍的是欺压汉民的满清官差！若是贪生怕死之徒，一刀剁了我去领赏！”', exp: 12, rep: 2, favor: { 茅十八: 3 } },
              },
            ],
          },
          {
            name: '盐枭围截与史松鹰爪',
            scene: '扬州北门破庙外，夜幕低垂，暴雨将至。黑甲官差与清廷大内鹰爪已将废庙团团包围，火把照得林间如同白昼。',
            dialogues: [
              ['史松', '茅十八，你逃了三千里，今日扬州便是你的葬身之地！交出天地会逆贼名册，本官留你一个全尸！'],
              ['韦小宝', '英雄哥哥，那穿官袍的家伙最神气，必定是头领。你正面上，我从后头给丫下绊子！'],
            ],
            choices: [
              {
                text: '正义诛凶：联手茅十八，正面对决史松', diff: 22,
                ok: { text: '你身法展动化解钢鞭攻势，茅十八单刀怒斩其左臂。史松惊骇之际，小宝飞出一块烂瓦片正中其面门，打得他狼狈逃窜！', exp: 25, silver: 120, rep: 5, favor: { 茅十八: 5 } },
                fail: { text: '史松的九节钢鞭着实厉害，你肩头中了一鞭，幸得小宝的胡椒面撒得及时，三人才踉跄冲出重围。', exp: 10, hp: -25 },
              },
              {
                text: '声东击西：引燃破庙稻草，趁乱突围', diff: 15,
                ok: { text: '火光冲天，浓烟裹着胡椒粉呛得官兵连连咳嗽。你提着虚弱的茅十八，小宝牵着顺来的快马，三人直奔运河码头。', exp: 20 },
                fail: { text: '突围时你被乱军冲散，挨了两记闷棍，才在码头边追上小宝的快船。', exp: 8, hp: -15 },
              },
            ],
          },
          {
            name: '扬州古渡，千里入燕京',
            scene: '残月倒映江流，摇橹声咿呀。扬州城的灯火渐渐隐没于晨雾。茅十八伤势已稳，韦小宝披着宽大的皮袄，满眼是对北方天地的向往。',
            dialogues: [
              ['茅十八', '少侠，此去燕京风云莫测。若日后在北方落脚，持我这把单刀寻至天地会青木堂，天下群雄见刀如见兄弟！'],
              ['韦小宝', '这是我从小带在身上的白玉骰子。以后你在赌场输光了裤衩，亮出它，扬州城里的地头蛇都得给我三分薄面！'],
            ],
            choices: [
              { text: '登船相送一程，把酒话别', ok: { text: '江风浩荡，茅十八把粗瓷碗一碰而尽，小宝在船头学着大人的模样朗声念着现编的歪诗。', exp: 20 } },
              { text: '叮嘱小宝：江湖险恶，好自为之', ok: { text: '小宝难得收起嬉皮笑脸，用力点了点头：“英雄哥哥的话，小宝记下了。”', exp: 15, favor: { 韦小宝: 5 } } },
            ],
          },
        ],
        reward: {
          silver: 120, exp: 150, rep: 20, favor: { 韦小宝: 10, 茅十八: 10 }, items: { yudiao: 1, qingmu: 1 },
          rumors: ['天地会正在江南暗中聚义，青木堂香主行踪诡秘。【天地会】', '听闻大清禁宫在征选小太监，扬州已有孩童被带往北方。【禁宫流言】'],
          letters: [{ from: '韦小宝', text: '英雄哥哥！北京城真他娘的大！宫里的事儿回头再细说。骰子拿好，别弄丢了！' }],
          text: '韦小宝与茅十八已乘船北上，燕京皇城埋下伏笔。你获得【六阳白玉骰】与【青木堂暗记】。',
        },
      },
      {
        id: 'FZ-01', name: '福威血夜与辟邪遗恨', where: '福州',
        nodes: [
          {
            name: '官道酒肆与血气初现',
            scene: '福州郊外十里铺小酒家，官道黄土弥漫。少镖头林平之意气奋发，肩头停着猎鹰；角落里两个头缠白布的川蜀汉子冷笑连连，扮作酒保的老翁低头擦碗，呼吸却绵长极深。',
            dialogues: [
              ['川汉贾人达', '龟儿子好大的排场！屁大点地方，也敢叫什么“福威天下”？老子看是“狗彘升天”！'],
              ['林平之', '放肆！哪来的狂徒，敢辱我福威镖局威名？！'],
            ],
            choices: [
              {
                text: '按剑戒备：暗中观察两拨人马的武学底细', diff: 30,
                ok: { text: '你目光掠过川汉的步法与腰间青钢短剑，心中一凛——这是青城派“摧心掌”的发劲姿势；而那酒保老翁内力极深，分明是华山派隐匿在此！', exp: 20 },
                fail: { text: '你未能看出众人路数，只觉酒肆中杀机四伏，掌心微微出汗。', exp: 8 },
              },
              {
                text: '拔刀相助：替林平之拦下青城弟子的毒手', diff: 35,
                ok: { text: '林平之剑法华丽却少内劲，险些被踢断手腕；你横剑一架震退贾人达。他怨毒地瞪你一眼，翻身上马遁走：“多管闲事的杂碎，连你一起收拾！”', exp: 20, favor: { 林平之: 15 } },
                fail: { text: '你仗剑上前，却被贾人达一脚扫中下盘，狼狈滚翻在地。林平之趁乱拉住了马头。', exp: 8, hp: -20 },
              },
            ],
          },
          {
            name: '总镖局血线之谜',
            scene: '福威总镖局正门外青石坪，夜幕森冷，大雨滂沱。石阶前一道三丈长的血线散发腐臭——凡踏出此线三步之人，两个时辰内必脏腑碎裂而亡。',
            dialogues: [
              ['林震南', '林某走南闯北三十年，从未见过如此阴毒的索命手段！史镖头、钱镖头，皆死得不明不白！'],
              ['王夫人', '定是四川青城派余矮子！当年长青子败在辟邪剑下，如今他们是来寻仇夺经的！'],
            ],
            choices: [
              {
                text: '验尸辨伤：详查猝死镖师的创口', diff: 40,
                ok: { text: '死者胸前皮肤完好，肋下却有青黑掌印，心脉寸寸震裂——摧心掌！掌力透过皮肉专震心室。林震南骇然失色：“余沧海……竟真亲临福州？！”', exp: 25, silver: 200 },
                fail: { text: '你辨不出掌力来历，误作剧毒处置，白白耗费了一副好药，只推断出敌人夜里潜伏在屋顶。', exp: 10, hp: -10 },
              },
              {
                text: '夜巡屋瓦：跃上飞檐搜捕暗哨', diff: 45,
                ok: { text: '暴雨之中，三道青衣人影踩着屋瓦疾掠而过。你掷出暗器截下一片带血青布——包围已成铁桶之势。', exp: 25 },
                fail: { text: '瓦面湿滑，你一脚踩空摔下檐角，惊得暗哨四散，只瞥见几道远去的背影。', exp: 10, hp: -15 },
              },
            ],
          },
          {
            name: '总堂陷落与血战突围',
            scene: '火光冲天，火箭破空射入内宅，惨叫与骨骼碎裂声响彻雨夜。青城四秀已率众破门而入，林震南口吐鲜血，死死护着妻儿退向后巷马厩。',
            dialogues: [
              ['侯人英', '林震南！交出七十二路辟邪剑谱原本，余观主尚可留你林家一条血脉！敢说半个“不”字，今夜福威镖局八十四口鸡犬不留！'],
              ['林平之', '我跟你们拼了！！'],
            ],
            choices: [
              {
                text: '殿后死守：替林家截杀青城弟子', diff: 65,
                ok: { text: '你在狭窄夹道中施展毕生所学，逼得青城弟子难越雷池。洪人雄被你一剑震退，气急败坏：“哪来的野小子，敢管我青城派的大事？！”林家夫妇趁机将林平之推上快马。', exp: 35, rep: 20 },
                fail: { text: '洪人雄的松风剑法远胜你所料，你且战且退，身中两剑，总算撑到马蹄声远去。', exp: 12, hp: -35 },
              },
              {
                text: '暗道脱困：掀开马厩暗门掩护林平之潜逃', diff: 40,
                ok: { text: '你掀开干草堆下的暗门，将林平之塞入排水暗沟：“往西门烂泥塘爬，千万别回头！”', exp: 30, favor: { 林平之: 10 } },
                fail: { text: '暗沟里积水没膝，你们摸到一半便被巡哨发觉，拼着挨了两刀才翻出城墙。', exp: 10, hp: -20 },
              },
            ],
          },
          {
            name: '向阳巷老宅的幽影',
            scene: '向阳巷林家老宅，蛛网密布，残垣断壁。佛堂屋顶破了一角，月光直射达摩画像的袈裟。林平之跪在远图公遗像前，双眼布满血丝。',
            dialogues: [
              ['林平之', '青城派……余沧海……若我林平之大难不死，纵使化作厉鬼，也要将青城上下屠戮殆尽！！'],
              ['林平之', '恩公，我欲前往华山拜师复仇。岳掌门乃君子剑，必能容我！'],
            ],
            choices: [
              { text: '劝他珍重：复仇之外，先保住性命', ok: { text: '林平之死死咬住嘴唇，鲜血长流，终是缓缓点了点头，把复仇二字咽回心底。', exp: 20, favor: { 林平之: 5 } } },
              { text: '赠银二十两，助他北行拜师', cost: { silver: 20 }, ok: { text: '他接过银两，向你重重磕了三个响头，转身没入雨夜。屋顶瓦砾轻响，几道暗中窥伺的气息也随之散去。', exp: 25, favor: { 林平之: 10 } } },
            ],
          },
        ],
        reward: {
          silver: 300, exp: 150, rep: 100, favor: { 林平之: 10 }, items: { fantian: 1 },
          rumors: ['塞北明驼木高峰离了瀚海，一路南下。【木高峰】', '华山派弟子现身福州，救孤之举令人费猜。【华山救孤】', '向阳巷佛堂达摩画像的袈裟上，似留有剑诀暗记。【袈裟暗记】'],
          letters: [{ from: '林平之', text: '恩公亲启：平之已至华山脚下。血海深仇，不敢或忘。他日若有所成，必报此恩。' }],
          text: '林震南夫妇被青城派押解西行，林平之转入流亡复仇之路。你获得【翻天掌要诀】。',
        },
      },
      {
        id: 'JX-01', name: '醉仙楼十八年之约', where: '嘉兴',
        nodes: [
          {
            name: '长街遇异人与朱聪的钱袋',
            scene: '嘉兴南湖长街，细雨如织。一名衣衫褴褛、手摇油腻破折扇的中年书生与你错身而过，冷不防撞在你肩头。',
            dialogues: [
              ['邋遢书生', '哎哟哟！这位小哥恕罪，小生昨夜多饮了两杯，一时失足失足！'],
            ],
            choices: [
              {
                text: '敏锐察觉：反手搭住其手腕', diff: 45,
                ok: { text: '你下意识按住腰囊，果然空空如也！反手扣住书生腕脉。书生双眼一亮，抚须大笑：“好敏锐的身手！小生‘妙手书生’朱聪走南闯北，少见你这般眼尖的年轻人！原物奉还，多送你两钱碎银！”', exp: 25, favor: { 朱聪: 10 } },
                fail: { text: '你只当寻常醉汉，摆手放行。半柱香后才发觉盘缠不翼而飞，唯留一张油腻草纸：“借银打酒，醉仙楼奉还。”', exp: 10, silver: -50 },
              },
              {
                text: '不动声色：暗中尾随，探其行踪', diff: 40,
                ok: { text: '你悄然提气缀在其身后。书生轻车熟路拐过三条窄巷，径直踏入南湖边气势最恢弘的三层酒楼——醉仙楼。', exp: 20 },
                fail: { text: '长街人流如织，你在第二个巷口便跟丢了人，只得循着酒香自己寻去。', exp: 8 },
              },
            ],
          },
          {
            name: '醉仙楼群英汇聚',
            scene: '醉仙楼二楼不设闲客，正堂摆着一口数百斤的生铁大酒缸。临窗一席坐着形态各异的六男一女：盲眼老者拄着生铁降魔杖，矮壮大汉大嚼牛肉，鹅黄绸衫的女子低头拭剑。',
            dialogues: [
              ['柯镇恶', '丘处机仗着全真剑法目中无人！今日他若倚强凌弱，我江南七怪纵使血溅当场，也叫他知晓江南武林不可轻辱！'],
              ['全金发', '哪来的生面孔？今日醉仙楼被包下了，不待闲客！'],
            ],
            choices: [
              {
                text: '抱拳见礼：道出法华寺一事的疑点', diff: 50,
                ok: { text: '“晚辈在城门曾见一伙溃兵押着妇孺往法华寺后山去，带的竟是北方禁军兵刃——此事恐有奸人挑拨！”南希仁神色微动：“……此话有理。”柯镇恶微微蹙眉：“你这小辈莫非知道内情？”', exp: 25, favor: { 江南七怪: 5 } },
                fail: { text: '你支吾难言其详，全金发秤砣一转便要逐客。亏得朱聪替你圆场，才在末座讨了个位置。', exp: 10 },
              },
              {
                text: '向朱聪讨还被“借”走的盘缠',
                ok: { text: '江南七怪哄然大笑。张阿生拍着肚皮：“二哥，你又在街上胡闹！”朱聪大笑着将钱袋掷回，赞你胆色过人。', exp: 15, silver: 50, favor: { 朱聪: 3 } },
              },
            ],
          },
          {
            name: '道袍如云，铜钟破空',
            scene: '长街骤起烈风，细雨被浑厚内力逼散。一名长须道人左手单臂托着千斤铜钟大步登楼，钟内盛满高粱酒，酒水激荡却无一滴溅出——正是长春子丘处机。',
            dialogues: [
              ['丘处机', '贫道千里追凶，特来请诸位痛饮此钟，莫要听信宵小之言，替恶徒强出头！'],
              ['柯镇恶', '丘道长好大的煞气！你这钟酒，我们喝得下！'],
            ],
            choices: [
              {
                text: '舍身助势：助韩宝驹、张阿生稳住铜钟', diff: 70,
                ok: { text: '你暴喝一声踏步上前，与二人同时抵住钟沿。排山倒海的巨力涌入经脉，你运起丹田真气硬生生卸力压钟，青砖寸寸龟裂，酒水未翻！丘处机眼中异彩大放：“好后生！江南武林果真藏龙卧虎！”', exp: 40, favor: { 江南七怪: 10, 丘处机: 5 } },
                fail: { text: '你出掌触到钟沿，立刻被纯阳真气震得倒飞三丈，背脊撞碎屏风，一口逆血喷出。张阿生一把托住你：“小兄弟快退，这牛鼻子内力邪门得很！”', exp: 15, hp: -40 },
              },
              {
                text: '飞箸取酒：以轻灵身法化解拼斗戾气', diff: 60,
                ok: { text: '你抄起两根象牙长箸，身形如白鹤展翅，筷子探入钟内轻灵一绞，凌空引出一道酒泉落入口中：“好烈的好酒！道长好内功！”满座喝彩。', exp: 30, rep: 5 },
                fail: { text: '你跃至半空箸尖一滑，酒水泼了满头满脸，惹得韩宝驹哈哈大笑，好歹把这场拼斗的笑闹搅了过去。', exp: 12, hp: -10 },
              },
            ],
          },
          {
            name: '法华血局与真凶段天德',
            scene: '法华寺后山竹林。禅房浓烟滚滚，焦木和尚横尸禅床；竹林外马蹄如雷，官府溃兵簇拥着一辆蒙布马车亡命狂奔。',
            dialogues: [
              ['丘处机', '焦木大师……竟真不是同谋！是段天德！那狗贼杀了大师灭口，劫了郭杨两家的遗孀逃了！'],
              ['韩宝驹', '追！不能让这狗官逃出江南地界！'],
            ],
            choices: [
              {
                text: '突袭后阵：轻功绕后，斩断挽马缰绳', diff: 75,
                ok: { text: '你飞身越过竹梢，剑刃斩断套马皮索。马车侧翻，车内滚出一名惊恐的孕妇——正是李萍。段天德弃车连滚带爬逃入烂泥沼泽。', exp: 35, silver: 80, rep: 15 },
                fail: { text: '禁军长枪阵密不透风，你三次抢攻都被逼回，肩头中了一箭。幸而韩宝驹的马队已从侧翼杀到。', exp: 12, hp: -30 },
              },
              {
                text: '破阵先锋：与韩小莹双剑合璧硬撕铁甲', diff: 75,
                ok: { text: '你与越女剑并肩冲杀，剑光如匹练撕裂重甲。段天德吓得魂飞魄散，借着亲卫死挡，仓皇跳上小舟顺江北逃。', exp: 40, favor: { 韩小莹: 10 } },
                fail: { text: '铁甲枪阵层层推压，你与韩小莹且战且退，臂上各添一道血口，总算护住了身后的孕妇。', exp: 12, hp: -30 },
              },
            ],
          },
          {
            name: '醉仙楼十八年之誓',
            scene: '法华寺大雄宝殿前，雨过天晴，晚霞如血。丘处机道袍染血，与江南七怪相对肃立，神情悲壮。',
            dialogues: [
              ['柯镇恶', '你去寻杨家之后，我七怪舍了性命远赴塞外寻访郭家后人！十八年后的今日，仍在这醉仙楼上，让两家孩子比剑定胜负！'],
              ['丘处机', '一言为定！江南七怪果真义重泰山！十八年后，醉仙楼不见不散！'],
              ['朱聪', '少侠，他日江湖必有你的名号。若有一日踏足塞北草原，记着替老叫化带一壶江南的花雕酒！'],
            ],
            choices: [
              { text: '肃立见证这一诺千金的盟誓', ok: { text: '你将这一幕牢牢记在心里。十八年后的醉仙楼之约，从此也有你一份见证。', exp: 30 } },
              { text: '沽一壶花雕，敬七怪与道长', cost: { silver: 10 }, ok: { text: '烈酒入喉，柯镇恶以杖顿地：“好酒！小娃娃，这杯酒我记下了。”', exp: 30, favor: { 江南七怪: 5, 朱聪: 5 } } },
            ],
          },
        ],
        reward: {
          silver: 500, exp: 300, rep: 50, favor: { 江南七怪: 10, 丘处机: 5 },
          rumors: ['塞北草原有少年铁木真驯雕逐狼，日渐成名。【草原雄鹰】', '全真教丘处机已启程北归，似有重诺在身。【全真北归】'],
          letters: [{ from: '朱聪', text: '少侠：花雕已收到心坎里。十八年后醉仙楼，你若在场，替老叫化看看那两个孩子的剑。' }],
          text: '史诗见证达成：醉仙楼十八年之约。你获得特质【烟雨证侠】的名望，南湖码头自此有船直航塞北与中原。',
        },
      },
    ],
  },
  {
    name: '荆襄前线', faction: '宋明争夺', danger: 60, cities: '襄阳、江陵、武昌、武当',
    desc: '汉水之畔的最大战区。守城、粮道与军情在此日夜角力，武当山门静静俯瞰烽火。',
    quests: [
      { name: '守住汉水军情', kind: 'main', text: '敌军探子已潜入渡口，必须在开船前截下那份军情。' },
      { name: '护送伤兵入城', kind: 'side', text: '抬着担架穿过箭楼与吊桥，把伤兵送进襄阳城。' },
      { name: '探访武当山道', kind: 'side', text: '沿七十二峰的石阶而上，拜访武当掌门的道童。' },
      { name: '查验渡口粮船', kind: 'side', text: '粮船的吃水线不对，舱底似乎藏着别的东西。', item: 'canye' },
    ],
  },
  {
    name: '中原腹地', faction: '天下中枢', danger: 90, cities: '洛阳、开封、嵩山、少林',
    desc: '武林的中心，也是旧案的中心。门派、世家与会盟在此交错，谁也不能独占中原。',
    quests: [
      { name: '化解洛阳会盟风波', kind: 'main', text: '会盟在即，一封伪造的盟帖却让各派剑拔弩张。' },
      { name: '送达少林请帖', kind: 'side', text: '将法会请帖送上少室山，山门前先过知客僧的考校。' },
      { name: '开封查访军镇', kind: 'side', text: '军镇与豪族暗中交易粮草，去樊楼的酒客口中套话。' },
      { name: '嵩山辨认剑痕', kind: 'side', text: '绝壁上的剑痕，是二十年前那一场夜战留下的。' },
    ],
  },
  {
    name: '河朔燕云', faction: '大辽', danger: 130, cities: '燕京、大同、幽州、雁门关',
    desc: '汉化已深的契丹强国。南院大王的旌旗下，边军、士族与牧马人各怀心事。',
    quests: [
      { name: '查明雁门关旧案', kind: 'main', text: '雁门关外的石壁字迹犹在，当年的旧事却人人讳言。' },
      { name: '救治边军斥候', kind: 'side', text: '一名中箭的斥候倒在烽燧下，先拔箭，再问话。' },
      { name: '拜访幽州士族', kind: 'side', text: '汉人世族在辽廷与江湖之间走钢丝，言辞皆是机锋。' },
      { name: '追踪草原快马', kind: 'side', text: '一匹无主的快马驮着密信，一路向北去了。' },
    ],
  },
  {
    name: '塞北草原', faction: '部族边疆', danger: 170, cities: '张家口、草原王庭、诸营',
    desc: '诸部逐水草而居，白狼旗与雄鹰旗此消彼长。商队与马贼，走着同一条路。',
    quests: [
      { name: '寻回草原军图', kind: 'main', text: '半张军图在部族易手中流转，追它的人不止你一路。' },
      { name: '学习骑射', kind: 'side', text: '弯弓、纵马、回头一箭——草原的规矩要在马背上学的。' },
      { name: '调停牧场争端', kind: 'side', text: '两部为一片冬牧场对峙，说和不成便是见血。' },
      { name: '追踪白狼旗', kind: 'side', text: '白狼旗的骑兵昨夜掠过营边，只留下一串浅蹄印。' },
    ],
  },
  {
    name: '辽东大金', faction: '女真旧国', danger: 210, cities: '上京、辽阳、沈州、长白南麓',
    desc: '老牌女真帝国，贵族仍按旧制演武。长白山的参客与军营的号角互不打扰。',
    quests: [
      { name: '阻止辽阳兵变', kind: 'main', text: '兵变的密约就缝在一名信使的衣领里，先找到他。' },
      { name: '查验军械', kind: 'side', text: '武库登记的弓弩少了三十副，账册上却天衣无缝。' },
      { name: '拜会金国旧臣', kind: 'side', text: '老臣府上的茶凉了三次，话里有话的试探才刚开始。' },
      { name: '长白南麓采药', kind: 'side', text: '老参把头的规矩：进山先祭山，抬参先喊山。', item: 'jiedu' },
    ],
  },
  {
    name: '白山黑水', faction: '满清', danger: 260, cities: '盛京、赫图阿拉、宁古塔',
    desc: '从金国体系中分裂出的新兴强权。谍报、流放与龙脉之说，在此地同样锋利。',
    quests: [
      { name: '截获宁古塔密令', kind: 'main', text: '流人北上的队伍中藏着一道密令，收信人无人知晓。' },
      { name: '盛京寻访旧部', kind: 'side', text: '旧部改换了姓氏与旗籍，要凭一枚旧腰牌相认。' },
      { name: '护送流人北行', kind: 'side', text: '风雪官道上，流人、押差与探子同行一路。' },
      { name: '长白山追踪密使', kind: 'side', text: '密使熟悉雪原，只在背风的雪窝子里过夜。' },
    ],
  },
  {
    name: '西北西夏', faction: '西域门户', danger: 240, cities: '兴庆府、河西走廊、贺兰山',
    desc: '一品堂的招揽帖发往天下，河西商路的驼铃昼夜不息，贺兰山有密道通往山后。',
    quests: [
      { name: '打通河西商路', kind: 'main', text: '商路断绝三月，各处马贼背后似乎站着同一个人。' },
      { name: '贺兰山寻人', kind: 'side', text: '进山的采玉人只回来了一个，嘴里反复念着“白骆驼”。' },
      { name: '兴庆府换情报', kind: 'side', text: '一品堂以情报易情报，先想好你能拿出什么。' },
      { name: '护送西域商队', kind: 'side', text: '驼队里有香料、玉石，还有一位不肯露面的客人。' },
    ],
  },
  {
    name: '关中秦地', faction: '天下枢纽', danger: 200, cities: '长安、华山、终南山、潼关',
    desc: '四塞之国，天下交通的咽喉。华山的剑、终南的墓、潼关的兵马，皆有来历。',
    quests: [
      { name: '平息潼关三方对峙', kind: 'main', text: '官军、义军与商会在潼关粮道对峙，谁先动手谁输。' },
      { name: '华山问剑', kind: 'side', text: '思过崖的石刻剑痕前，问剑者需先自省三问。' },
      { name: '终南山访道', kind: 'side', text: '活死人墓外只有蜂群与石碑，机缘二字急不得。' },
      { name: '风陵渡救人', kind: 'side', text: '渡船将沉，先救落水者，再查是谁凿的船。', item: 'canye' },
    ],
  },
  {
    name: '巴蜀西南', faction: '山地江湖', danger: 260, cities: '成都、重庆、峨眉、青城、剑门',
    desc: '蜀道之难养出独行的门派。峨眉的灯、青城的阵、剑门的栈道，各是一段江湖。',
    quests: [
      { name: '重开剑门古道', kind: 'main', text: '栈道塌了三处，山里却有人不愿它被修好。' },
      { name: '峨眉送药', kind: 'side', text: '金顶的太师傅等着这服药，山中猴群也盯着你的药篓。' },
      { name: '青城破阵', kind: 'side', text: '青城的剑阵以守为攻，破阵先破其心。', item: 'canye' },
      { name: '重庆夜查盐船', kind: 'side', text: '夜泊的盐船往下游放着空船，船去了哪里？' },
    ],
  },
  {
    name: '云贵大明', faction: '明境腹地', danger: 300, cities: '昆明、贵阳、云南府',
    desc: '西南汉人王朝的腹地，沐王府的仪仗与茶马古道的马帮走在同一条街上。',
    quests: [
      { name: '辨明云南遗诏真伪', kind: 'main', text: '一纸遗诏惊动朝野，墨迹、印泥与人心都要验。' },
      { name: '昆明探旧臣', kind: 'side', text: '旧臣在茶花深处闭门谢客，门环上的灰却新擦过。' },
      { name: '贵阳护商队', kind: 'side', text: '茶马道上瘴气与劫道一样多，镖旗比刀剑管用。' },
      { name: '查明教旧址', kind: 'side', text: '明教旧坛石壁上的火焰纹，近年被人重新描过。' },
    ],
  },
  {
    name: '大理诸国', faction: '西南异域', danger: 340, cities: '大理、无量山、万劫谷、点苍山',
    desc: '佛国与皇族共治，无量山剑湖宫的旧事未远，万劫谷中“恶贯满盈”四字犹在。',
    quests: [
      { name: '寻回无量山信物', kind: 'main', text: '剑湖宫下遗失的信物，牵扯无量剑派两宗的旧怨。' },
      { name: '万劫谷寻药', kind: 'side', text: '谷口石碑写着入谷者死，谷里的药却能活人。', item: 'jiedu' },
      { name: '大理城会使者', kind: 'side', text: '使者要在三杯茶内，分辨你的来意是江湖还是庙堂。' },
      { name: '点苍山救行客', kind: 'side', text: '山道塌方，有行客被困在十九峰的云雾里。' },
    ],
    trees: [
      {
        id: 'DL-01', name: '无量山风波', where: '无量山',
        nodes: [
          {
            name: '剑湖观剑',
            scene: '无量山剑湖宫正殿，四角铜炉焚着松柏香。东西二宗五年一届的比剑已至第五局，东宗掌门左子穆端坐太师椅，指间摩挲茶盏。场中剑风激荡，观礼长廊角落里，一名湖绿绸衫的贵气书生忽然“噗嗤”笑出了声。',
            dialogues: [
              ['左子穆', '容师侄这招“顺水推舟”虽未至化境，倒也深得本门精要。这一局，西宗可愿认下？', '/audio/voice/DL-01_Q01_zuo_zimu.mp3'],
              ['辛双清', '左师兄高兴得太早。出剑轻浮躁进，下盘空虚如朽木，若遇名家，不过自取其辱！', '/audio/voice/DL-01_Q01_xin_shuangqing.mp3'],
              ['段誉', '（以折扇掩面，低声自语）明明是自己重心不稳向前跌了个趔趄，偏要叫什么“顺水推舟”……', '/audio/voice/DL-01_Q01_duan_yu.mp3'],
              ['左子穆', '哪来的狂妄小辈！本门百年剑法，岂容你这手无缚鸡之力的后生胡言乱语？左右，给我拿下！'],
            ],
            choices: [
              {
                text: '拔剑干预：横剑挡开两名东宗弟子', diff: 15,
                ok: { text: '你足尖轻点，剑鞘疾探，“当当”两声将两柄长剑震偏三寸。段誉惊叹：“这位兄台好俊的功夫！在下大理段誉，多谢仗义出手！”', exp: 20, favor: { 段誉: 5, 无量剑派: -3 } },
                fail: { text: '你仓促跃出，虽撞偏了剑势，肩头却被剑风带过，划出一道血口。段誉急忙扶住你：“这位兄台何苦为我以身犯险！”', exp: 8, hp: -20, favor: { 段誉: 5 } },
              },
              {
                text: '冷眼旁观：按兵不动，静观其变',
                ok: { text: '你稳立柱后未动。眼看剑刃将至段誉额前三寸，横梁之上忽然传来一声娇俏的斥责：“堂堂大男人，欺负一个不会武功的书呆子，不要脸！”', exp: 10 },
              },
            ],
          },
          {
            name: '梁上少女与剧毒之影',
            scene: '殿梁之上微风飒然，一名十六七岁的少女晃着翠绿绣花小鞋，手捧瓜子嗑得正欢。中年武师纵身去抓她脚踝，一道白影却电射而出，在他手腕一沾即走——整条右臂瞬间爬满青黑。',
            dialogues: [
              ['钟灵', '你们无量剑派恼羞成怒还要杀人，真是不害臊！小乖乖，有人欺负你家主人，去尝尝他的滋味！', '/audio/voice/DL-01_Q02_zhong_ling.mp3'],
              ['场中宾客', '剧毒！是剧毒毒兽！'],
            ],
            choices: [
              {
                text: '疾速辨药：封穴救人，查验貂毒', diff: 20,
                ok: { text: '“这是南疆奇兽闪电貂的齿毒！”你出手封住伤者肩井、曲池二穴，喂下一颗解毒药。辛双清肃容道：“多谢少侠见多识广，无量派欠你一个人情。”', exp: 20, favor: { 无量剑派: 5 } },
                fail: { text: '你上前辨识，却被毒血散发的腥气冲得头晕目眩，只得退开由无量派弟子将人抬下。', exp: 8, hp: -10 },
              },
              {
                text: '戒备钟灵：退开身形，防备毒兽',
                ok: { text: '你疾滑至殿角暗扣防具。梁上少女向你做了个鬼脸：“这位朋友反应倒快，放心吧，我的闪电貂不咬明事理的人！”', exp: 15 },
              },
            ],
          },
          {
            name: '闪电貂乱与神农惊变',
            scene: '殿内剑拔弩张之际，山外响起凄厉竹哨。数名浴血的无量守门弟子跌撞奔入，两道火箭射破殿顶瓦片，浓烟中满是硫磺与草药的焦臭——神农帮杀上来了。',
            dialogues: [
              ['无量门人', '掌门！神农帮封死了后山泉水，四处洒了断肠散和毒蛇……山门弟子全死绝了！'],
              ['段誉', '为何好端端的要杀人？大家坐下来讲和不行么？在下去劝劝那神农帮主！', '/audio/voice/DL-01_Q03_duan_yu.mp3'],
              ['钟灵', '呆哥哥你疯啦！司空玄杀人不眨眼，你连武功都不会，去了就是送死！', '/audio/voice/DL-01_Q03_zhong_ling.mp3'],
            ],
            choices: [
              {
                text: '护卫撤离：掩护段誉与钟灵退往后山', diff: 25,
                ok: { text: '你长剑挥洒斩断两柄淬毒弯刀，拉着段誉从侧门突围：“往后山走，前山毒烟封死了！”', exp: 25, favor: { 段誉: 5, 钟灵: 5 } },
                fail: { text: '突围途中一名毒番手缠住了你，待你摆脱贫身，手臂已多了一道乌青的刀痕。', exp: 10, hp: -15 },
              },
              {
                text: '协助御敌：随无量剑派正面迎击', diff: 25,
                ok: { text: '你杀入前殿庭院，从神农帮番子尸首上搜出一副烧焦的药方草纸。回头望去，后山火起，段誉与钟灵已在混乱中走失。', exp: 25, favor: { 无量剑派: 5 } },
                fail: { text: '混战中你被一杆药叉扫中腰肋，借着浓烟滚入沟壑，才堪堪避过追兵。', exp: 10, hp: -20 },
              },
            ],
          },
          {
            name: '后山寻踪与钟灵受难',
            scene: '后山密林断崖旁，暮色四合，白雾中弥漫着腥甜的毒烟味。段誉失魂落魄地跌坐在碎石堆旁，官靴跑丢了一只。',
            dialogues: [
              ['段誉', '钟姑娘为了救我，放出闪电貂去咬司空玄……谁知他早备了药囊，用捕蛇网罩住了灵儿！他们逼我回大理借“通天草”换人，三日不归，就要将灵儿剁成肉酱抛入万劫谷喂蛇啊！', '/audio/voice/DL-01_Q04_duan_yu.mp3'],
              ['段誉', '山道全被封死，我方才脚滑险些坠下悬崖……兄台，求你救救钟姑娘！', '/audio/voice/DL-01_Q04_duan_yu_cry.mp3'],
            ],
            choices: [
              {
                text: '冷静谋划：先采蛇胆草与七星叶防毒', diff: 30,
                ok: { text: '你按住段誉肩头沉声道：“慌乱无用。营地遍布毒瘴，这般闯进去唯有一死。先随我采药备妥香囊。”段誉渐渐定下心神。', exp: 30 },
                fail: { text: '崖下的蛇胆草生在毒瘴边缘，你采药时吸入了些许瘴气，只得以袖掩鼻草草配成香囊。', exp: 10, hp: -10 },
              },
              {
                text: '授其轻功：助段誉脱险，兵分两路', diff: 35,
                ok: { text: '你将基础提气法门简述与段誉，助他翻过峭壁：“你脚程轻快，速去搬救兵；在下去探扣押钟姑娘的帐幕。”段誉拱手长揖：“恩公大德，段誉此生难忘！”', exp: 30, favor: { 段誉: 5 } },
                fail: { text: '段誉于武学一窍不通，提气法门讲得他云里雾里，你们只得仍循一条险径同往下游。', exp: 10 },
              },
            ],
          },
          {
            name: '夜探神农营地',
            scene: '山脚神农帮驻地，兽皮大帐依山而建，中央篝火上架着铜锅熬煮墨绿药汁，毒蛇盘绕在木桩之上。中军帐前，司空玄剧烈咳嗽，面色铁青。',
            dialogues: [
              ['司空玄', '抓紧调配断肠散！灵鹫宫的生死符只剩半月就要发作……夺不下剑湖宫的奇草，老夫要这满山上下死得干干净净！', '/audio/voice/DL-01_Q05_si_kong_xuan.mp3'],
              ['巡逻弟子', '帮主，那姓钟的小娘皮咬舌也不肯交出闪电貂的解药，弟子已把她锁在东面水牢木笼里了。'],
            ],
            choices: [
              {
                text: '夜伏潜行：绕开明哨，暗撬木笼', diff: 45,
                ok: { text: '你潜至后营，铁丝轻旋卸下铜锁。钟灵见到你，乌溜溜的大眼险些落下泪来：“好少侠，快带我走！”', exp: 35, favor: { 钟灵: 5 } },
                fail: { text: '脚下枯枝碎裂，铜锣骤响——“有刺客！”你被迫连斩三名刀客、逼退一名药师，才破开木笼将人背出。', exp: 12, hp: -30 },
              },
              {
                text: '下毒纵火：买硝磺引燃草药库（银两 30）', cost: { silver: 30 },
                ok: { text: '浓烟混着辛辣的毒草焦味冲天而起，营地炸开了锅。众弟子慌忙救火，你趁乱劈碎水牢木栅，将钟灵背负而出！', exp: 35, favor: { 神农帮: -15 } },
              },
            ],
          },
          {
            name: '逃出生天与万劫谷伏笔',
            scene: '无量山南麓古茶树下，月朗星稀，大火已被抛在数里之外。钟灵坐在大青石上，从靴帮里掏出一枚雕着奇门八卦纹路的青铜小锁。',
            dialogues: [
              ['钟灵', '这次若不是你仗义相救，本姑娘真要被那秃头司空玄炼成毒人了。那个呆里呆气的段哥哥……不知道逃出来没有。', '/audio/voice/DL-01_Q06_zhong_ling.mp3'],
              ['钟灵', '这是我万劫谷的入谷信物。顺着澜沧江往下走，寻到九株并排的大榕树，向左转三步，在石壁上敲响铜锁，就能避开谷口的陷阱和“见骨散”毒雾。', '/audio/voice/DL-01_Q06_zhong_ling_thanks.mp3'],
            ],
            choices: [
              { text: '护送钟灵安全下山', ok: { text: '山道崎岖，钟灵一路叽叽喳喳说个没完，临别时冲你用力挥了挥手：“下次来万劫谷，我让娘亲给你煮好茶！”', exp: 30, favor: { 钟灵: 5 } } },
              { text: '细问万劫谷的地形与禁忌', ok: { text: '钟灵蹲在地上，拿树枝把九株大榕树与谷口迷阵画了个大概，又反复叮嘱了三次“千万别碰石碑后的白线”。', exp: 20 } },
            ],
          },
        ],
        reward: {
          silver: 150, exp: 200, rep: 10, favor: { 钟灵: 10 }, items: { wanjie: 1, jinchuang: 2, jiedu: 3 },
          rumors: ['澜沧江畔出现一位黑衣女侠的踪迹，坐骑蹄声如墨夜疾雨。【黑衣女侠】', '神农帮颁下全境搜山令，无量山一带风声鹤唳。【搜山令】'],
          letters: [{ from: '钟灵', text: '呆哥哥掉下崖去了，娘说他命大。你若来万劫谷，记得先在石壁上敲铜锁。——灵儿' }],
          text: '段誉已跌落无量山悬崖，机缘已启，不可逆转。你获得【万劫铜锁】，万劫谷之路自此而开。',
        },
      },
    ],
  },
  {
    name: '东海海外', faction: '海洋世界', danger: 400, cities: '桃花岛、侠客岛、神龙岛、灵蛇岛',
    desc: '没有朝廷的海上世界。赏善罚恶令、桃花岛奇门与神龙岛的毒，自成一方天地。',
    quests: [
      { name: '解开海外群岛之谜', kind: 'main', text: '各岛之间互不通航，却流传着同一句谜语。', item: 'canye' },
      { name: '桃花岛寻航图', kind: 'side', text: '桃花阵中的航图，走错一步便困到潮落。' },
      { name: '侠客岛送信', kind: 'side', text: '赏善罚恶使者的船不等人，送信要赶潮汐。' },
      { name: '神龙岛查海盗', kind: 'side', text: '海盗的旗语里混着神龙岛的暗号，事情不只是劫财。' },
    ],
  },
];

/* 道路连通关系（索引对应 ZONES） */
const LINKS = { 0: [1, 12], 1: [0, 2, 9], 2: [1, 3, 8], 3: [2, 4, 5], 4: [3], 5: [3, 6], 6: [5], 7: [8], 8: [2, 7, 9], 9: [1, 8, 10], 10: [9, 11], 11: [10], 12: [0] };

const WORLD_INTRO = '五朝并立，三大缓冲区烽烟不息，四大边疆与海外自成江湖。你是一名无门无派的行侠者，一卷《天下舆图》在身——走到哪里，哪里便是你的江湖。道路相连处皆可前往，越是深处，越是凶险。';

/* ================= 物品 / 武学 ================= */
const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
const ITEMS = {
  jinchuang: { name: '金创药', text: '外敷止血，气血 +25。', apply: s => ({ hp: clamp(s.hp + 25) }) },
  jiedu: { name: '解毒丸', text: '化解百毒，气血 +10。', apply: s => ({ hp: clamp(s.hp + 10) }) },
  canye: { name: '武学残页', text: '参悟片刻，历练 +20。', apply: s => ({ expTotal: s.expTotal + 20 }) },
  fantian: { name: '翻天掌要诀', text: '稀有身法秘籍残卷，参悟后历练 +40。', apply: s => ({ expTotal: s.expTotal + 40 }) },
  yudiao: { name: '六阳白玉骰', text: '韦小宝的贴身信物。赌场亮出它，扬州地头蛇皆给三分薄面。', lore: true },
  qingmu: { name: '青木堂暗记', text: '天地会青木堂联络信物，见记如见兄弟。', lore: true },
  wanjie: { name: '万劫铜锁', text: '钟灵所赠的入谷信物，可避开万劫谷口的陷阱与毒雾。', lore: true },
};
const SKILLS = [
  { name: '基本拳脚', lv: 1, bonus: 0, text: '江湖人的立身之本，拳脚即道理。' },
  { name: '太祖长拳', lv: 15, bonus: 5, text: '大开大阖，拳风所向披靡。' },
  { name: '六合刀', lv: 30, bonus: 10, text: '刀走六合，攻守兼备。' },
  { name: '武当绵掌', lv: 55, bonus: 18, text: '绵里藏针，后发先至。' },
  { name: '华山剑法', lv: 85, bonus: 30, text: '奇正相生，剑出如虹。' },
  { name: '少林擒拿手', lv: 120, bonus: 45, text: '分筋错骨，近身无敌。' },
  { name: '六脉残谱', lv: 180, bonus: 70, text: '剑气无形，隔空伤敌。' },
  { name: '太玄经影', lv: 260, bonus: 110, text: '石壁蝌蚪文，悟者自成宗师。' },
];

/* ================= 开局：出身 / 家传武学 ================= */
const ORIGINS = [
  { id: 'hunter', name: '猎户之子', text: '山林长大，筋骨结实。', apply: { hp: 15 }, desc: '气血 +15' },
  { id: 'trader', name: '商贾子弟', text: '算盘打得好，盘缠也足。', apply: { silver: 150 }, desc: '银两 +150' },
  { id: 'soldier', name: '行伍弃卒', text: '军中厮杀过，拳脚带杀气。', apply: { ab: 6, hp: 5 }, desc: '能力 +6 · 气血 +5' },
  { id: 'scholar', name: '落魄书生', text: '读万卷书，胸中自有江湖。', apply: { exp: 120 }, desc: '历练 +120' },
];
const START_SKILLS = [
  { id: 'taizu', name: '太祖长拳', text: '大开大阖，拳出如山。', bonus: 5, desc: '能力 +5' },
  { id: 'luohan', name: '罗汉拳', text: '稳扎稳打，下盘生根。', hp: 12, desc: '气血 +12' },
  { id: 'luoye', name: '落叶剑法', text: '轻灵飘逸，剑随身走。', bonus: 2, exp: 50, desc: '能力 +2 · 历练 +50' },
];
const ALLOC_POINTS = 5;
const ALLOC_STATS = [['hp', '根骨', '气血 +5 / 点'], ['ab', '臂力', '能力 +2 / 点'], ['exp', '悟性', '历练 +15 / 点']];

/* 旅途随机事件：(state, zone) => [日志, 状态补丁] */
const ROAD = [
  (s, z) => ability(s) >= z.danger
    ? ['路遇山贼拦路，你三招两式将其击退，匪首丢下十五两银子逃了。', { silver: s.silver + 15 }]
    : ['路遇山贼拦路，寡不敌众，被劫去十两银子，挂彩而归。', { silver: Math.max(0, s.silver - 10), hp: clamp(s.hp - 12) }],
  s => ['与游方道人雨夜同宿，论剑半宿，获益匪浅（历练 +12）。', { expTotal: s.expTotal + 12 }],
  s => ['救起一名受伤镖师，他日镖局必有回报（银两 +20）。', { silver: s.silver + 20 }],
  s => ['暴雨阻路，在破庙歇息一夜，气血稍复。', { hp: clamp(s.hp + 5) }],
  s => ['与西行商队同行一程，赶车人赠你盘缠（银两 +12）。', { silver: s.silver + 12 }],
];

/* 城市设施风貌（同功能、异域皮肤，见 docs/gdd/06；未列区用通用名） */
const FAC_DEFAULT = { inn: '客栈', med: '药铺', gym: '武馆' };
const FAC = {
  0: { inn: '临安水乡大客栈', med: '回春堂中药馆', gym: '城南武馆' },
  1: { inn: '襄阳军营客舍', med: '随军医药棚', gym: '军营校场' },
  3: { inn: '汉辽驿馆', med: '北地参行', gym: '边军教场' },
  4: { inn: '部族毡帐', med: '萨满帐', gym: '部族擂台' },
  7: { inn: '丝路绿洲驿站', med: '西域异药香料行', gym: '一品堂演武场' },
  9: { inn: '山城吊脚客栈', med: '青城山药庐', gym: '峨眉演武坪' },
  11: { inn: '茶马古道客栈', med: '南疆百草堂', gym: '点苍武场' },
};
/* 客栈传闻池（打听消息解锁） */
const RUMORS = [
  '京城来了位提督大人，似乎在暗查一封密信。【京城密信】',
  '太湖深处有神秘慕容氏，庄中收藏天下武功图谱。【燕子坞传闻】',
  '嘉兴醉仙楼来了几位怪客，言谈间提起十八年前的旧约。【江南七怪线索】',
  '襄阳城近来夜夜点卯，汉水渡口盘查极严，怕是有大战将至。【襄阳烽火】',
  '福州福威镖局门口的石狮子，近日被人连夜描红了眼睛。【福威镖局】',
  '西夏一品堂广发英雄帖，许以高官厚禄招揽天下好手。【一品堂】',
  '扬州丽春院的小宝跟赌场那帮光棍混在一起，骰子里灌水银，滑溜得像泥鳅。【市井小宝】',
  '无量剑派东西二宗五年一度的比剑就在这两日，山下林子里总有一股怪草药味。【无量比剑】',
];

/* 各区任务对话（与 quests 顺序一致）：剧情卡片中的 NPC 台词 */
const CHATTER = {
  0: [
    ['线人老宋', '密信上的印泥是湖州贡品。用得起的，整个江南不超过五家。'],
    ['扬州盐商', '客官要的不是盐引，是消息吧？消息嘛……得看诚意。'],
    ['太湖寨主', '失镖？水里讨生活的人，谁没捡过几口箱子。'],
    ['福州镖头', '这信若误了潮信，你我的人头都得挂城楼。'],
  ],
  1: [
    ['渡口把总', '今夜开船之前，一只苍蝇也不许飞出渡口。'],
    ['伤兵', '多谢好汉……别管我了，先送弟兄们进城。'],
    ['武当道童', '掌门云游未归，施主请回吧——咦，你说山下有烽火？'],
    ['船老大', '吃水深了三分？胡说！……客官，有话好说。'],
  ],
  2: [
    ['会盟司仪', '盟帖用的松烟墨，是开封西纸马街的货色——可会盟诸派，没人用得起。'],
    ['少林知客僧', '阿弥陀佛。请帖要送上山，先答我：何为禅？'],
    ['樊楼酒客', '军镇的粮半夜出城？客官，这话我只说一遍。'],
    ['嵩山猎户', '剑痕入石三分，二十年风雨都没能磨平。使剑的，不是凡人。'],
  ],
  3: [
    ['守关老卒', '雁门关的旧案？哼，活人别问死人的事。'],
    ['边军斥候', '箭上淬了乌头……好汉，先拔箭，话我慢慢说。'],
    ['幽州士族', '我族在汉地与契丹之间活了三百年，靠的就是不把话说满。'],
    ['牧马人', '那匹马鞍上有南院的烙记，一路往北去了。'],
  ],
  4: [
    ['商队头领', '军图昨夜换了三次主人，每一次都有人掉脑袋。'],
    ['草原骑手', '弓拉满，眼放平，马比人先知道猎物在哪。'],
    ['两部长老', '冬牧场只有一片。老天爷不评理，只好你来评。'],
    ['斥候少年', '白狼旗的马不钉掌，蹄印浅得像风吹过——但我认得。'],
  ],
  5: [
    ['辽阳守将', '兵变？营里风平浪静。……你若查到什么，先来说与我听。'],
    ['武库司吏', '账册在此，一笔不少。至于库里少没少，那得问耗子。'],
    ['金国旧臣', '茶凉了可以续，话说过头，就收不回来了。'],
    ['老参把头', '进山大吉！喊山不响，人参不长——脚底下放轻些。'],
  ],
  6: [
    ['盛京细作', '密令缝在衣领里？不，缝在衣领里的，只是给官差看的。'],
    ['旧部遗老', '腰牌我认得，人也就认得了。进屋说话，外头风大。'],
    ['流放犯人', '宁古塔的冬天，连眼泪都能冻成刀子。'],
    ['雪原猎户', '在雪窝子里过夜的主儿，不是密使就是逃犯——反正都背着人命。'],
  ],
  7: [
    ['驼队掌柜', '商路断了三个月，马贼抢货不抢盐——你说怪不怪？'],
    ['采玉人', '白骆驼……白骆驼进了峡谷就没出来……别去，千万别去……'],
    ['一品堂使者', '我堂以情报易情报。阁下的命，值几条消息？'],
    ['西域商人', '香料、玉石都好说。那位客人么……他不是货，别打听。'],
  ],
  8: [
    ['潼关戍卒', '官军、义军、商会，三家堵着一条粮道，谁先动手谁就是靶子。'],
    ['华山弟子', '问剑先问己：为何拔剑？何时收剑？剑下留谁？'],
    ['终南樵夫', '活死人墓？蜂子多，碑文在。进去的活人——没见过出来的。'],
    ['风陵渡船夫', '船底是夜里被人凿的。救人要紧，仇先记下。'],
  ],
  9: [
    ['剑门栈工', '栈道是前夜塌的，塌得齐整，像被锯断的。'],
    ['峨眉女冠', '药篓背稳些。山上的猢狲抢药，比山贼还快。'],
    ['青城弟子', '剑阵无眼。破阵不靠剑快，靠看穿它护着什么。'],
    ['重庆更夫', '空船往下游放，放的是信，不是盐。'],
  ],
  10: [
    ['云南府书吏', '遗诏的墨是新墨，印泥却是旧藏。这就对不上了。'],
    ['昆明旧臣', '茶花开了，茶凉了，旧事就别再提了吧……你说门环？'],
    ['贵阳镖头', '瘴气里举镖旗，旗面得用药水泡过。跟紧了，别离队。'],
    ['采药山民', '火焰纹是明教的记认。有人描新了它，是想借旧名做新事。'],
  ],
  11: [
    ['无量弟子', '信物沉在剑湖底，东西二宗为此打了三十年。'],
    ['谷口药农', '入谷者死。可谷里的断肠草，也能救断肠人。'],
    ['大理使者', '三杯茶：第一杯敬客，第二杯探意，第三杯——送客。'],
    ['点苍猎户', '云起时别上山。已经有人困在十九峰了。'],
  ],
  12: [
    ['老船工', '群岛互不通航，可各岛的童谣里，藏着同一句谜语。'],
    ['桃花岛哑仆', '（以手比划）阵随潮汐开，走错一步，潮落你也出不来。'],
    ['侠客岛使者', '赏善罚恶，船不等人。信，今夜必须到。'],
    ['被俘水手', '海盗打的是神龙岛的暗号——劫财是假，找东西是真。'],
  ],
};

/* ================= 派生数值 ================= */
const lv = e => Math.floor(e / 100) + 1;
const grade = l => l < 20 ? '不堪一击' : l < 50 ? '初学乍练' : l < 80 ? '初出茅庐' : l < 150 ? '马马虎虎' : l < 300 ? '略有小成' : '已有大成';
const ability = s => Math.round(lv(s.expTotal) * (0.35 + s.hp / 100)) + SKILLS.filter(k => lv(s.expTotal) >= k.lv).reduce((a, k) => a + k.bonus, 0) + (s.attrAb || 0) + (s.bonusSkill?.bonus || 0);
const DANGER_TAGS = ['平和', '险恶', '凶险', '绝地'];
const dangerTag = d => d < 40 ? 0 : d < 120 ? 1 : d < 260 ? 2 : 3;
const questReward = (z, main) => main
  ? { silver: 40 + Math.round(z.danger / 4), exp: 30, hp: -10, time: 12 }
  : { silver: 16 + Math.round(z.danger / 8), exp: 15, hp: 4, time: 8 };
const treeKey = (zone, treeId) => `${zone}:${treeId}`;
/* 已完成的任务树数量 */
const treesFinished = s => Object.entries(s.treeDone || {}).filter(([k, c]) => {
  const [zi, id] = k.split(':');
  const t = (ZONES[+zi].trees || []).find(x => x.id === id);
  return t && c >= t.nodes.length;
}).length;
/* 成就：全部由存档派生，无需额外存储 */
const ACHIEVEMENTS = [
  { name: '初涉江湖', text: '等级达到 10 级', ok: s => lv(s.expTotal) >= 10 },
  { name: '初出茅庐', text: '等级达到 50 级', ok: s => lv(s.expTotal) >= 50 },
  { name: '身手不凡', text: '能力达到 100', ok: s => ability(s) >= 100 },
  { name: '富甲一方', text: '银两达到 500', ok: s => s.silver >= 500 },
  { name: '行万里路', text: '足迹踏过 5 个大区', ok: s => (s.visited || []).length >= 5 },
  { name: '博闻强识', text: '收集 8 条江湖传闻', ok: s => (s.rumors || []).length >= 8 },
  { name: '广结善缘', text: '与 5 位江湖人物结下交情', ok: s => Object.keys(s.favor || {}).length >= 5 },
  { name: '悬壶常备', text: '行囊里备有 3 份以上伤药', ok: s => ((s.items.jinchuang || 0) + (s.items.jiedu || 0)) >= 3 },
  { name: '首树告成', text: '完成一棵原著任务树', ok: s => treesFinished(s) >= 1 },
  { name: '史诗见证', text: '完成《醉仙楼十八年之约》', ok: s => (s.treeDone['0:JX-01'] || 0) >= 5 },
];
/* 江湖排行：由能力折算名次（纯展示） */
const rankOf = ab => Math.max(1, 5200 - ab * 38);
const rankTier = ab => ab >= 300 ? '天榜' : ab >= 120 ? '地榜' : '人榜';

/* ================= 存档 ================= */
const SAVE_KEY = 'jianghu-save-v1';
const initial = () => ({
  name: '沈孤鸿', attrAb: 0, bonusSkill: null,
  expTotal: 1251, hp: 79, silver: 168, loc: 0, idle: true, mute: false,
  done: {}, items: { jinchuang: 1 }, action: null, fx: null,
  rep: 0, favor: {}, rumors: [], treeDone: {},
  letters: [{ from: '无名氏', text: '江南密信已现端倪。若想查清主人，先去扬州寻那盐商一问。' }],
  visited: [0],
  log: ['江南密信已现端倪，下一步需寻访扬州盐商。'],
});
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return { ...initial(), ...JSON.parse(raw), fx: null, action: null };
  } catch (e) { return null; }
}

/* ================= 行动结算 ================= */
function levelUpLog(n, s) {
  if (lv(n.expTotal) > lv(s.expTotal)) {
    n.fx = 'bell';
    n.log = [`突破！等级升至 ${lv(n.expTotal)}，境界「${grade(lv(n.expTotal))}」。`, ...n.log];
  }
  return n;
}
/* 剧情效果统一结算（docs/gdd/07 判定与回响模块） */
function applyEff(n, e = {}) {
  if (e.hp) n.hp = clamp(n.hp + e.hp);
  if (e.silver) n.silver = Math.max(0, n.silver + e.silver);
  if (e.exp) n.expTotal += e.exp;
  if (e.rep) n.rep = (n.rep || 0) + e.rep;
  if (e.favor) { n.favor = { ...n.favor }; for (const [k, d] of Object.entries(e.favor)) n.favor[k] = (n.favor[k] || 0) + d; }
  if (e.items) { n.items = { ...n.items }; for (const [k, d] of Object.entries(e.items)) n.items[k] = (n.items[k] || 0) + d; }
  if (e.rumors) n.rumors = [...(n.rumors || []), ...e.rumors.filter(r => !(n.rumors || []).includes(r))];
  if (e.letters) n.letters = [...(n.letters || []), ...e.letters];
  return n;
}
function resolveQuest(s) {
  const { zone, idx } = s.action;
  const z = ZONES[zone], q = z.quests[idx], main = q.kind === 'main';
  const r = questReward(z, main);
  const arr = (s.done[zone] || [false, false, false, false]).slice();
  const n = { ...s, action: null, fx: null, done: { ...s.done, [zone]: arr } };
  const ab = ability(s);
  const p = main ? 1 : Math.max(0.25, Math.min(0.95, 0.45 + (ab / z.danger) * 0.55));
  if (Math.random() < p) {
    arr[idx] = true;
    n.silver += r.silver;
    n.expTotal += r.exp;
    n.hp = clamp(n.hp + r.hp);
    let gain = `银两 +${r.silver}、历练 +${r.exp}`;
    if (q.item) {
      n.items = { ...n.items, [q.item]: (n.items[q.item] || 0) + 1 };
      gain += `、${ITEMS[q.item].name} ×1`;
    }
    let msg = `完成${main ? '小主线' : '支线'}「${q.name}」，${gain}。`;
    if (main && ab < z.danger) msg = '有高人暗中相助，' + msg;
    n.fx = 'quest';
    n.log = [msg, ...s.log];
  } else {
    n.hp = clamp(n.hp - 12);
    n.expTotal += 5;
    n.fx = 'click';
    n.log = [`「${q.name}」行事受挫，带伤而返，仅得历练 5。养足气血或提升实力再来。`, ...s.log];
  }
  n.log = n.log.slice(0, 8);
  return levelUpLog(n, s);
}
function resolveTravel(s) {
  const to = s.action.to;
  const n = { ...s, action: null, fx: 'bell', loc: to, log: [`抵达${ZONES[to].name}。`, ...s.log] };
  if (!(s.visited || []).includes(to)) n.visited = [...(s.visited || [0]), to];
  const roll = Math.random();
  if (roll < 0.45) {
    const [text, patch] = ROAD[Math.floor(roll * 1000) % ROAD.length](n, ZONES[to]);
    Object.assign(n, patch);
    n.hp = clamp(n.hp);
    n.log = [text, ...n.log];
  }
  n.log = n.log.slice(0, 8);
  return levelUpLog(n, s);
}
/* 武馆切磋：无死亡惩罚，低等级升级保险机制（docs/gdd/06 武馆） */
function resolveSpar(s) {
  const fac = FAC[s.action.zone] || FAC_DEFAULT;
  const n = { ...s, action: null, fx: null };
  if (ability(s) >= ZONES[s.action.zone].danger * 0.6 + Math.random() * 20) {
    n.expTotal += 15;
    n.fx = 'quest';
    n.log = [`在${fac.gym}切磋获胜，历练 +15。`, ...s.log];
  } else {
    n.hp = Math.max(1, clamp(n.hp - 10));
    n.expTotal += 8;
    n.fx = 'click';
    n.log = [`在${fac.gym}切磋落败，只受了些皮肉伤（切磋不致重伤），历练 +8。`, ...s.log];
  }
  n.log = n.log.slice(0, 8);
  return levelUpLog(n, s);
}
function tick(s) {
  if (s.action) {
    const a = { ...s.action, left: s.action.left - 1 };
    const n = { ...s, action: a };
    if (a.left <= 0) return a.type === 'quest' ? resolveQuest(n) : a.type === 'travel' ? resolveTravel(n) : resolveSpar(n);
    return n;
  }
  if (!s.idle) return s.fx ? { ...s, fx: null } : s;
  const n = { ...s, fx: null, expTotal: s.expTotal + 2 };
  if (lv(n.expTotal) > lv(s.expTotal)) {
    n.fx = 'bell';
    n.log = [`突破！等级升至 ${lv(n.expTotal)}，境界「${grade(lv(n.expTotal))}」。`, ...s.log].slice(0, 8);
  }
  return n;
}

/* ================= 界面 ================= */
function App() {
  const [s, setS] = useState(() => load() || initial());
  const [tab, setTab] = useState('武学');
  const [side, setSide] = useState('江湖');
  const [story, setStory] = useState(null);   // { zone, ti, ni }
  const [outcome, setOutcome] = useState(null); // 抉择回响文本
  const [panel, setPanel] = useState(null);     // attr | ach | let | rank | set
  const [questCard, setQuestCard] = useState(null); // 普通任务的剧情卡（任务索引）
  const [creating, setCreating] = useState(() => !load()); // 无存档则先创角
  const [cName, setCName] = useState('');
  const [origin, setOrigin] = useState('hunter');
  const [cSkill, setCSkill] = useState('taizu');
  const [alloc, setAlloc] = useState({ hp: 0, ab: 0, exp: 0 });
  const level = lv(s.expTotal), ab = ability(s), z = ZONES[s.loc];
  const inner = Math.round(80 + level * 18 + ab * 3);
  const fac = FAC[s.loc] || FAC_DEFAULT;
  const doneArr = s.done[s.loc] || [];
  const busy = !!s.action;

  useEffect(() => { const t = setInterval(() => setS(tick), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, fx: null })); } catch (e) { /* 忽略 */ } }, [s]);
  useEffect(() => { if (s.fx) play(SOUND[s.fx], s.mute); }, [s.fx, s.mute]);
  useEffect(() => { bgmSwitch(s.loc, s.mute); }, [s.loc, s.mute]);

  const click = () => { play(SOUND.click, s.mute); bgmSwitch(s.loc, s.mute); };
  const go = i => {
    click();
    if (busy || i === s.loc) return;
    if (!LINKS[s.loc].includes(i)) {
      setS(v => ({ ...v, log: [`道路不通：${ZONES[v.loc].name}与${ZONES[i].name}并不相邻，需经邻区辗转。`, ...v.log].slice(0, 8) }));
      return;
    }
    setS(v => ({ ...v, action: { type: 'travel', to: i, left: 10, total: 10 }, log: [`启程前往${ZONES[i].name}……`, ...v.log].slice(0, 8) }));
  };
  const startQuest = i => {
    if (busy) return;
    const q = z.quests[i], r = questReward(z, q.kind === 'main');
    setS(v => ({ ...v, action: { type: 'quest', zone: s.loc, idx: i, left: r.time, total: r.time }, log: [`着手「${q.name}」……`, ...v.log].slice(0, 8) }));
  };
  /* 普通任务：先出剧情卡，再动身 */
  const openQuestCard = i => {
    click();
    setQuestCard(i);
  };
  const startSpar = () => {
    click();
    if (busy) return;
    setS(v => ({ ...v, action: { type: 'spar', zone: s.loc, left: 8, total: 8 }, log: [`在${fac.gym}摆开架势，与教头切磋……`, ...v.log].slice(0, 8) }));
  };
  const askRumor = () => {
    click();
    if (s.silver < 2) return;
    if (s.loc === 11) playVoice('/audio/voice/DL-01_inn_innkeeper.mp3', s.mute);
    setS(v => {
      const unk = RUMORS.filter(r => !(v.rumors || []).includes(r));
      const got = unk.length ? unk[Math.floor(Math.random() * unk.length)] : null;
      return { ...v, silver: v.silver - 2, rumors: got ? [...(v.rumors || []), got] : v.rumors, log: [got ? `${fac.inn}中听闻：${got}` : '近日并无新鲜传闻。', ...v.log].slice(0, 8) };
    });
  };
  const buyItem = (id, cost) => {
    click();
    if (s.silver < cost) return;
    setS(v => ({ ...v, silver: v.silver - cost, items: { ...v.items, [id]: (v.items[id] || 0) + 1 }, log: [`在${fac.med}购得${ITEMS[id].name} ×1（银两 -${cost}）。`, ...v.log].slice(0, 8) }));
  };
  const useItem = id => {
    if (!(s.items[id] > 0)) return;
    play(SOUND.bell, s.mute);
    setS(v => ({ ...v, ...ITEMS[id].apply(v), items: { ...v.items, [id]: v.items[id] - 1 }, log: [`使用了${ITEMS[id].name}。`, ...v.log].slice(0, 8) }));
  };
  const rest = () => {
    if (s.silver < 5 || s.hp >= 100) return;
    play(SOUND.bell, s.mute);
    setS(v => ({ ...v, silver: v.silver - 5, hp: clamp(v.hp + 30), log: ['在客栈歇息半日，气血大复（银两 -5）。', ...v.log].slice(0, 8) }));
  };
  const claimIdle = () => { click(); setS(v => ({ ...v, silver: v.silver + 5, log: ['领取挂机收益：银两 +5。', ...v.log].slice(0, 8) })); };
  /* 剧情节点：打开场景弹窗 */
  const openStory = (ti, ni) => {
    click();
    setStory({ zone: s.loc, ti, ni });
    setOutcome(null);
    const first = ZONES[s.loc].trees[ti].nodes[ni].dialogues.find(d => d[2]);
    if (first) playVoice(first[2], s.mute);
  };
  /* 剧情抉择：检定（能力不足走软失败，主线不断），结算回响（docs/gdd/07） */
  const choose = c => {
    stopVoice();
    const { zone, ti, ni } = story;
    const t = ZONES[zone].trees[ti], node = t.nodes[ni];
    const ok = !c.diff || ability(s) >= c.diff;
    const eff = ok ? c.ok : c.fail;
    const last = ni === t.nodes.length - 1;
    play(ok ? SOUND.quest : SOUND.click, s.mute);
    setS(v => {
      let n = { ...v, fx: null };
      if (c.cost?.silver) n.silver = Math.max(0, n.silver - c.cost.silver);
      if (c.cost?.item) n.items = { ...n.items, [c.cost.item]: (n.items[c.cost.item] || 0) - 1 };
      n = applyEff(n, eff);
      const key = treeKey(zone, t.id);
      n.treeDone = { ...n.treeDone, [key]: (n.treeDone[key] || 0) + 1 };
      let msgs = [`【${t.name}】${node.name}，${c.diff ? (ok ? '顺利过关' : '带伤而过（软失败，主线不断）') : '事了'}。`];
      if (last) {
        n = applyEff(n, t.reward);
        n.fx = 'quest';
        msgs = [`任务树《${t.name}》完成！${t.reward.text}`, ...msgs];
      }
      n.log = [...msgs, ...n.log].slice(0, 8);
      return levelUpLog(n, v);
    });
    setOutcome(eff.text + (last ? `\n\n${t.reward.text}` : ''));
  };
  const reset = () => {
    if (!window.confirm('重开将清空全部江湖进度，确定？')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    stopVoice();
    setCName(''); setOrigin('hunter'); setCSkill('taizu'); setAlloc({ hp: 0, ab: 0, exp: 0 });
    setCreating(true);
  };
  /* 开局创角：名号 + 出身 + 天赋加点 + 家传武学 */
  const finishCreate = () => {
    click();
    const o = ORIGINS.find(x => x.id === origin), sk = START_SKILLS.find(x => x.id === cSkill);
    const name = cName.trim() || '沈孤鸿';
    const base = initial();
    setS({
      ...base,
      name,
      hp: clamp(base.hp + (o.apply.hp || 0) + alloc.hp * 5 + (sk.hp || 0)),
      silver: base.silver + (o.apply.silver || 0),
      expTotal: base.expTotal + (o.apply.exp || 0) + alloc.exp * 15 + (sk.exp || 0),
      attrAb: (o.apply.ab || 0) + alloc.ab * 2,
      bonusSkill: { name: sk.name, text: sk.text, bonus: sk.bonus || 0 },
      log: [`${name}踏入江湖。出身${o.name}，家传「${sk.name}」。`, ...base.log],
    });
    setCreating(false);
  };

  const st = story ? ZONES[story.zone].trees[story.ti] : null;
  const stNode = st ? st.nodes[story.ni] : null;

  return <main className="app">
    <header>
      <div className="brand"><small>THE LONG NIGHT OF</small><strong>江湖长夜</strong></div>
      <div className="currency"><span><i>◎</i>银两 <b>{s.silver}</b></span><span className="cultivate"><i>♨</i>修为 <b>{s.expTotal % 100}</b></span></div>
      <button className="hbtn" onClick={() => { setS(v => ({ ...v, mute: !v.mute })); }}>{s.mute ? '音效：关' : '音效：开'}</button>
      <button className="hbtn" onClick={reset}>重开</button>
    </header>
    <div className="layout">
      {/* 左栏：主导航；舆图在游历状态展开 */}
      <aside className="map-col">
        <nav className="primary-nav">{[['江湖','♟'],['行囊','♜'],['武学','▥'],['门派','⌂'],['游历','⌁']].map(([name,icon]) => <button key={name} className={side === name ? 'on' : ''} onClick={() => { click(); setSide(name); }}><i>{icon}</i><b>{name}</b></button>)}</nav>
        <div className="world"><h3>天下大势</h3><p>{WORLD_INTRO}</p></div>
        <div className="side-verse">风雨江湖路，且从眼前这一封密信走起。</div>
      </aside>
      {/* 中栏：当前区域与任务 */}
      <section>
        <article className="paper">
          {side === '游历' ? <>
            <div className="chapter">
              <small>江湖舆图 · 十三大区 · 道路相连处皆可前往</small>
              <h1>天下风物</h1>
              <p>{WORLD_INTRO}</p>
            </div>
            <div className="atlas">
              {ZONES.map((zn, i) => {
                const near = LINKS[s.loc].includes(i);
                const done = (s.done[i] || []).filter(Boolean).length;
                const t = dangerTag(zn.danger);
                return <button key={zn.name} disabled={busy || (i !== s.loc && !near)}
                  className={i === s.loc ? 'here' : near ? 'near' : 'far'} onClick={() => go(i)}>
                  <span>{zn.faction} · <em className={`tag t${t}`}>{DANGER_TAGS[t]}</em></span>
                  <b>{zn.name}</b>
                  <small>{zn.cities}</small>
                  <small>{i === s.loc ? '◈ 当前所在' : near ? '可前往（约十息）' : '道路不通，需经邻区辗转'} · 任务 {done}/4{(zn.trees || []).length ? ` · 剧情 ${zn.trees.length}` : ''}</small>
                </button>;
              })}
            </div>
          </> : side === '武学' ? <>
            <div className="chapter">
              <small>{s.name} · 等级 {level} · {grade(level)}</small>
              <h1>武学</h1>
              <p>武学随等级自行领悟，各加能力。当前能力 {ab}。</p>
            </div>
            <div className="page-list">
              {s.bonusSkill && <div className="page-item on"><b>{s.bonusSkill.name}</b><em>家传{s.bonusSkill.bonus ? ` · 能力 +${s.bonusSkill.bonus}` : ''}</em><small>{s.bonusSkill.text}</small></div>}
              {SKILLS.map(k => {
                const on = level >= k.lv;
                return <div key={k.name} className={`page-item ${on ? 'on' : ''}`}>
                  <b>{k.name}</b><em>{on ? `能力 +${k.bonus}` : `${k.lv} 级可悟`}</em>
                  <small>{on ? k.text : '……'}</small>
                </div>;
              })}
            </div>
          </> : side === '行囊' ? <>
            <div className="chapter">
              <small>随身之物 · 银两 {s.silver}</small>
              <h1>行囊</h1>
            </div>
            <div className="page-list">
              {Object.entries(ITEMS).map(([id, it]) => {
                const n = s.items[id] || 0;
                return <div key={id} className={`page-item ${n ? 'on' : ''}`}>
                  <b>{it.name} <em>×{n}</em></b>
                  <small>{it.text}</small>
                  {it.apply ? <button disabled={!n} onClick={() => useItem(id)}>使用</button> : null}
                </div>;
              })}
            </div>
          </> : side === '门派' ? <>
            <div className="chapter">
              <small>无门无派 · 自在行侠</small>
              <h1>门派</h1>
              <p>你尚未拜入任何门派。江湖传闻，少林、武当、华山、峨眉皆在收徒；也有人说，无门无派之人，才走得进所有的门。</p>
              <p className="hint">门派系统尚未开放。多去客栈打听消息，机缘自会到来。</p>
            </div>
          </> : <>
          <div className="chapter">
            <small>{z.faction} · {z.cities} · 凶险度 <em className={`tag t${dangerTag(z.danger)}`}>{DANGER_TAGS[dangerTag(z.danger)]}</em>（推荐能力 {z.danger}）</small>
            <h1>{z.name}</h1>
            <p>{z.desc}</p>
            <p className="hint">本区任务需按线索顺序完成；实力不足时支线可能受挫，小主线自有高人相助，不致卡关。{(z.trees || []).length > 0 && <b className="tree-hint">本区另有原著剧情 {z.trees.length} 桩：{z.trees.map(t => `《${t.name}》`).join('、')}，见下方「第X回」。</b>}</p>
          </div>
          <div className="mission-list">
            {z.quests.map((q, i) => {
              const complete = !!doneArr[i];
              const locked = i > 0 && !doneArr[i - 1];
              const active = s.action?.type === 'quest' && s.action.zone === s.loc && s.action.idx === i;
              const r = questReward(z, q.kind === 'main');
              return <button key={q.name} className={`mission ${complete ? 'done' : ''} ${active ? 'active' : ''}`}
                disabled={complete || locked || busy} onClick={() => openQuestCard(i)}>
                <span>{q.kind === 'main' ? '小主线' : '支线'}</span>
                <div className="qbody"><b>{q.name}</b><i>{q.text}</i></div>
                <small>{complete ? '已完成' : locked ? '待前置任务' : active ? `行动中 ${s.action.left}s` : `前往　历练 +${r.exp}`}</small>
              </button>;
            })}
          </div>
          {/* 原著任务树：剧情抉择（docs/gdd/07 框架） */}
          {(z.trees || []).map((t, ti) => {
            const count = s.treeDone[treeKey(s.loc, t.id)] || 0;
            const finished = count >= t.nodes.length;
            return <div key={t.id}>
              <div className="tree-head">
                <small>原著任务树 {t.id} · {t.where} · 线性剧情 · 软失败不断线</small>
                <h2>《{t.name}》{finished ? '（已完成）' : ''}</h2>
              </div>
              <div className="mission-list">
                {t.nodes.map((nd, ni) => {
                  const complete = ni < count;
                  const locked = ni > count;
                  return <button key={nd.name} className={`mission ${complete ? 'done' : ''}`}
                    disabled={complete || locked || busy} onClick={() => openStory(ti, ni)}>
                    <span>第{['一', '二', '三', '四', '五', '六', '七'][ni] || ni + 1}回</span>
                    <div className="qbody"><b>{nd.name}</b><i>{nd.scene.slice(0, 38)}……</i></div>
                    <small>{complete ? '已过' : locked ? '待前回' : '入戏'}</small>
                  </button>;
                })}
              </div>
            </div>;
          })}
          <div className="facilities">
            <h3>城中去处</h3>
            <div className="fac-grid">
              <button disabled={busy || s.silver < 2} onClick={askRumor}><b>{fac.inn}</b><small>打听消息 · 银两 -2</small></button>
              <button disabled={busy || s.silver < 20} onClick={() => buyItem('jinchuang', 20)}><b>{fac.med}</b><small>金创药 · 银两 -20</small></button>
              <button disabled={busy || s.silver < 15} onClick={() => buyItem('jiedu', 15)}><b>{fac.med}</b><small>解毒丸 · 银两 -15</small></button>
              <button disabled={busy} onClick={startSpar}><b>{fac.gym}</b><small>切磋 · 胜 +15 / 负 +8 历练</small></button>
            </div>
          </div>
          </>}
        </article>
        {s.action && <div className="actionbar">
          <b>{s.action.type === 'travel' ? `赶路 · ${ZONES[s.action.to].name}` : s.action.type === 'spar' ? `${fac.gym} · 切磋` : `行事 · ${z.quests[s.action.idx].name}`}</b>
          <i><em style={{ width: `${((s.action.total - s.action.left) / s.action.total) * 100}%` }} /></i>
          <span>{s.action.left}s</span>
        </div>}
        <div className="idle">
          <b>挂机修行</b>
          <i><em style={{ width: `${s.expTotal % 100}%` }} /></i>
          <button onClick={() => { click(); setS(v => ({ ...v, idle: !v.idle })); }}>{s.idle ? '暂停' : '继续'}</button>
          <button className="claim" onClick={claimIdle}>领取收益</button>
          <button className="rest" disabled={s.silver < 5 || s.hp >= 100} onClick={rest}>客栈歇息<br />银两 -5</button>
        </div>
      </section>
      {/* 右栏：角色 / 武学 / 行囊 / 传闻 */}
      <aside className="hero">
        <div className="portrait" />
        <h2>{s.name}</h2>
        <p>等级 {level}　·　{grade(level)}</p>
        <div className="stats"><div className="stat hp"><span>♥ 气血</span><i><em style={{ width: `${s.hp}%` }} /></i><b>{s.hp}/100</b></div><div className="stat qi"><span>☯ 内力</span><i><em style={{ width: '100%' }} /></i><b>{inner}/{inner}</b></div><div className="stat fame"><span>✥ 声望</span><i><em style={{ width: `${Math.min(100, (s.rep || 0) / 25)}%` }} /></i><b>{s.rep || 0}</b></div></div>
        <div className="ability">
          <small>侠客状态</small>
          <b>{s.hp > 70 ? '气息平稳' : s.hp > 40 ? '略有伤势' : '伤势沉重'}</b>
          <p>当前能力　<strong>{ab}</strong></p>
          <em>能力随等级、气血与武学变化</em>
        </div>
        <div className="rep">
          {Object.keys(s.favor || {}).length === 0 && <span className="dim">尚无江湖交情</span>}
          {Object.entries(s.favor || {}).map(([k, v]) => <span key={k}>{k} 好感 <b>{v}</b></span>)}
        </div>
        <button className="details" onClick={() => { click(); setPanel('attr'); }}>查看详细属性　›</button>
        <div className="htabs">
          {['武学', '行囊', '传闻'].map(x => <button key={x} className={tab === x ? 'on' : ''} onClick={() => { click(); setTab(x); }}>{x}</button>)}
        </div>
        <div className="quick-actions">{[['成就', 'ach'], ['信件', 'let'], ['排行', 'rank'], ['设置', 'set']].map(([x, p]) => <button key={x} onClick={() => { click(); setPanel(p); }}>{x}</button>)}</div>
        {tab === '武学' ? <div className="skills">
          {s.bonusSkill && <div className="skill on"><b>{s.bonusSkill.name}</b><em>家传{s.bonusSkill.bonus ? ` +${s.bonusSkill.bonus}` : ''}</em><small>{s.bonusSkill.text}</small></div>}
          {SKILLS.map(k => {
            const on = level >= k.lv;
            return <div key={k.name} className={`skill ${on ? 'on' : ''}`}>
              <b>{k.name}</b><em>{on ? `能力 +${k.bonus}` : `${k.lv} 级可悟`}</em>
              <small>{on ? k.text : '……'}</small>
            </div>;
          })}
        </div> : tab === '行囊' ? <div className="bag">
          {Object.entries(ITEMS).map(([id, it]) => {
            const n = s.items[id] || 0;
            return <div key={id} className="bag-item">
              <b>{it.name} <em>×{n}</em></b><small>{it.text}</small>
              {it.apply ? <button disabled={!n} onClick={() => useItem(id)}>使用</button> : <button disabled>信物</button>}
            </div>;
          })}
        </div> : <div className="rumors">
          {(s.rumors || []).length === 0 && <p className="empty">尚无传闻。去{fac.inn}花二两银子打听消息吧。</p>}
          {(s.rumors || []).map(r => <div key={r} className="rumor"><small>{r}</small></div>)}
        </div>}
      </aside>
    </div>
    <footer><strong>江<br />湖<br />日<br />志</strong><div className="log-lines">{s.log.slice(0, 5).map((x, i) => <span key={x}>[{['夜亥时','夜戌时','夜子时','夜丑时','夜寅时'][i]}]　{x}</span>)}</div><button onClick={() => { click(); setS(v => ({ ...v, log: ['翻阅了更早的江湖见闻。', ...v.log].slice(0, 8) })); }}>查看更多　⌃</button></footer>
    {/* 功能面板：详细属性 / 成就 / 信件 / 排行 / 设置 */}
    {panel && <div className="story-mask" onClick={() => setPanel(null)}>
      <div className="panel" onClick={e => e.stopPropagation()}>
        <button className="panel-x" onClick={() => { click(); setPanel(null); }}>✕</button>
        {panel === 'attr' && <>
          <h2>详细属性</h2>
          <div className="attr-grid">
            <div><small>等级</small><b>{level} · {grade(level)}</b></div>
            <div><small>气血</small><b>{s.hp}/100</b></div>
            <div><small>内力</small><b>{inner}</b></div>
            <div><small>银两</small><b>{s.silver}</b></div>
            <div><small>声望</small><b>{s.rep || 0}</b></div>
            <div><small>能力</small><b>{ab}（根基 {Math.round(level * (0.35 + s.hp / 100))} + 武学 {ab - Math.round(level * (0.35 + s.hp / 100))}）</b></div>
          </div>
          <h3>江湖履历</h3>
          <div className="attr-grid">
            <div><small>历练任务</small><b>{Object.values(s.done).reduce((a, arr) => a + arr.filter(Boolean).length, 0)} 件</b></div>
            <div><small>任务树</small><b>{treesFinished(s)} 棵完成</b></div>
            <div><small>传闻</small><b>{(s.rumors || []).length} 条</b></div>
            <div><small>足迹</small><b>{(s.visited || []).length}/13 区</b></div>
            <div><small>江湖交情</small><b>{Object.keys(s.favor || {}).length} 人</b></div>
          </div>
          {Object.keys(s.favor || {}).length > 0 && <>
            <h3>人物好感</h3>
            <div className="favor-list">{Object.entries(s.favor).map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}</div>
          </>}
        </>}
        {panel === 'ach' && <>
          <h2>成就 <small>{ACHIEVEMENTS.filter(a => a.ok(s)).length}/{ACHIEVEMENTS.length}</small></h2>
          <div className="ach-list">{ACHIEVEMENTS.map(a => <div key={a.name} className={`ach ${a.ok(s) ? 'on' : ''}`}><b>{a.ok(s) ? '◆ ' : '◇ '}{a.name}</b><small>{a.text}</small></div>)}</div>
        </>}
        {panel === 'let' && <>
          <h2>信件 <small>{(s.letters || []).length} 封</small></h2>
          <div className="letter-list">{(s.letters || []).map((l, i) => <div key={i} className="letter"><b>✉ {l.from}</b><p>{l.text}</p></div>)}</div>
        </>}
        {panel === 'rank' && <>
          <h2>江湖排行</h2>
          <p className="panel-p">天榜诸雄——乔峰、郭靖、令狐冲、张三丰之流，名次固若金汤，非你今日可望。</p>
          <p className="panel-p">以你当前能力 {ab}，位列{rankTier(ab)}第 <b className="rank-no">{rankOf(ab)}</b> 位。</p>
          <p className="panel-p dim">能力愈高，名次愈前。传闻、声望与任务树的功业，江湖自会记得。</p>
        </>}
        {panel === 'set' && <>
          <h2>设置</h2>
          <div className="set-row"><span>音效</span><button className="hbtn" onClick={() => setS(v => ({ ...v, mute: !v.mute }))}>{s.mute ? '关' : '开'}</button></div>
          <div className="set-row"><span>存档</span><small>自动保存在本地浏览器，关闭页面进度不丢失。</small></div>
          <div className="set-row"><span>重开</span><button className="hbtn" onClick={() => { setPanel(null); reset(); }}>清空进度重开</button></div>
        </>}
      </div>
    </div>}
    {/* 开局创角：名号 / 出身 / 天赋加点 / 家传武学 */}
    {creating && (() => {
      const left = ALLOC_POINTS - alloc.hp - alloc.ab - alloc.exp;
      return <div className="story-mask">
        <div className="story create">
          <small className="st-tag">江湖长夜 · 开局</small>
          <h2>创建侠客</h2>
          <div className="c-row">
            <span>名号</span>
            <input value={cName} onChange={e => setCName(e.target.value)} placeholder="沈孤鸿" maxLength={8} />
          </div>
          <h3 className="c-h">出身</h3>
          <div className="c-grid">
            {ORIGINS.map(o => <button key={o.id} className={origin === o.id ? 'on' : ''} onClick={() => { click(); setOrigin(o.id); }}>
              <b>{o.name}</b><small>{o.text}</small><em>{o.desc}</em>
            </button>)}
          </div>
          <h3 className="c-h">天赋（剩余 {left} 点）</h3>
          {ALLOC_STATS.map(([key, label, per]) => <div className="c-row" key={key}>
            <span>{label}</span>
            <div className="alloc">
              <button disabled={!alloc[key]} onClick={() => { click(); setAlloc(a => ({ ...a, [key]: a[key] - 1 })); }}>−</button>
              <b>{alloc[key]}</b>
              <button disabled={!left} onClick={() => { click(); setAlloc(a => ({ ...a, [key]: a[key] + 1 })); }}>＋</button>
            </div>
            <small>{per}</small>
          </div>)}
          <h3 className="c-h">家传武学</h3>
          <div className="c-grid">
            {START_SKILLS.map(k => <button key={k.id} className={cSkill === k.id ? 'on' : ''} onClick={() => { click(); setCSkill(k.id); }}>
              <b>{k.name}</b><small>{k.text}</small><em>{k.desc}</em>
            </button>)}
          </div>
          <button className="go-on" onClick={finishCreate}>踏入江湖</button>
        </div>
      </div>;
    })()}
    {/* 普通任务剧情卡：情境 + NPC 台词 + 动身 */}
    {questCard !== null && (() => {
      const q = z.quests[questCard], r = questReward(z, q.kind === 'main');
      const [who, line] = CHATTER[s.loc][questCard];
      return <div className="story-mask" onClick={() => setQuestCard(null)}>
        <div className="story" onClick={e => e.stopPropagation()}>
          <small className="st-tag">{q.kind === 'main' ? '小主线' : '支线'} · {z.name}</small>
          <h2>{q.name}</h2>
          <p className="scene">{q.text}</p>
          <p className="dlg"><b>{who}</b>{line}</p>
          <p className="hint" style={{ color: '#6d5a3c' }}>此行约需 {r.time} 息。酬劳：银两 +{r.silver}、历练 +{r.exp}{q.item ? `、${ITEMS[q.item].name}` : ''}。{q.kind === 'main' ? '小主线纵有不济，自有高人相助。' : '实力不足时可能受挫，养足气血再来。'}</p>
          <div className="choices">
            <button onClick={() => { startQuest(questCard); setQuestCard(null); }}>动身前往</button>
            <button onClick={() => { click(); setQuestCard(null); }}>暂且离开</button>
          </div>
        </div>
      </div>;
    })()}
    {/* 剧情弹窗（情境描摹 / NPC台词 / 交互抉择 / 判定回响） */}
    {story && stNode && <div className="story-mask" onClick={() => { if (outcome) { stopVoice(); setStory(null); setOutcome(null); } }}>
      <div className="story" onClick={e => e.stopPropagation()}>
        <small className="st-tag">【{st.name}】第{['一', '二', '三', '四', '五', '六', '七'][story.ni] || story.ni + 1}回 · {st.where}</small>
        <h2>{stNode.name}</h2>
        <p className="scene">{stNode.scene}</p>
        {stNode.dialogues.map(([who, line, voice]) => <p className="dlg" key={who + line.slice(0, 8)}>{voice && <button className="vbtn" title="播放语音" onClick={() => playVoice(voice, s.mute)}>♪</button>}<b>{who}</b>{line}</p>)}
        {outcome ? <>
          <p className="outcome">{outcome}</p>
          <button className="go-on" onClick={() => { click(); stopVoice(); setStory(null); setOutcome(null); }}>继续</button>
        </> : <div className="choices">
          {stNode.choices.map((c, ci) => {
            const noSilver = c.cost?.silver && s.silver < c.cost.silver;
            const noItem = c.cost?.item && !((s.items[c.cost.item] || 0) > 0);
            return <button key={ci} disabled={noSilver || noItem} onClick={() => choose(c)}>
              {c.text}
              {c.diff ? <small>需能力 {c.diff}（你 {ab}）</small> : null}
              {c.cost?.silver ? <small>银两 -{c.cost.silver}</small> : null}
              {c.cost?.item ? <small>消耗 {ITEMS[c.cost.item].name} ×1{noItem ? '（没有）' : ''}</small> : null}
            </button>;
          })}
        </div>}
      </div>
    </div>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
