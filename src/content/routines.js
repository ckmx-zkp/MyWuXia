const firstCity = zone => zone.cities.split('、')[0];

export function routinesForZone(zone) {
  const city = firstCity(zone);
  return [
    {
      id: 'practice', name: `${city}晨课练招`, kind: 'practice', time: 10,
      text: `在${city}寻一处清静场地，把当前武学与内功从起势到收功反复拆练。`,
      dialogue: ['武馆教习', '功夫不在一朝胜负。今日这一趟练熟了，明日出手便少一分迟疑。'],
      baseExp: 10, baseSilver: 2, training: 30, always: true,
    },
    {
      id: 'errand', name: `${city}行脚差事`, kind: 'errand', time: 12,
      text: `替本地商旅递信、认路、照看货物，在来往人情中磨炼眼力与脚力。`,
      dialogue: ['行脚掌柜', '路不算远，难的是认人、认门，也认得什么时候该开口。'],
      baseExp: 16, baseSilver: 8, training: 15,
    },
    {
      id: 'escort', name: `${city}护送药车`, kind: 'escort', time: 15,
      text: `护送一车药材穿过城外险路。沿途可能有人截车，须用当前武学护住车夫与药箱。`,
      dialogue: ['药行伙计', '车上都是救命药。真遇上拦路人，护住车便算成事，不必逞强追杀。'],
      baseExp: 22, baseSilver: 14, training: 20, opponent: 'bandit',
    },
  ];
}

export function routineReward(zone, routine, success = true) {
  const scale = Math.round(Math.sqrt(zone.danger));
  return success
    ? { exp: routine.baseExp + scale, silver: routine.baseSilver + Math.round(zone.danger / 20), training: routine.training }
    : { exp: 5 + Math.floor(scale / 3), silver: 0, training: 6 };
}
