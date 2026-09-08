const at = (ref, value, reason) => ({ref,op:'gte',value,reason});
const end = text => ({terminal:true,scene:text,dialogues:[],hearsay:text,choices:[]});
export const SECT_RANKS = ['外门弟子','入室弟子','护道弟子'];
export const WUDANG_EVENTS = {
  wudang_entry: {name:'山门问心',start:'ask',requires:{not:{ref:'sect',op:'eq',value:'wudang'}},nodes:{
    ask:{room:'wudang-gate',scene:'道童将名册合上，先问你为何上山，又将木剑搁在石阶边。',dialogues:[['道童','山门不收买路钱。护药有来历的，凭回信入院；没有引荐，也可请师兄试试你的收放。']],hearsay:'武当以护药引荐或山门试招接纳新人。',choices:[
      {id:'letter',text:'交出护药往来回信，请道童核实',requires:{ref:'fact:medicine_wudang',op:'eq',value:true,reason:'先护药，再将回春堂来信送到山门'},next:'end',effects:[{op:'set',ref:'sect',value:'wudang'},{op:'add',ref:'relation:武当教习',value:10}],outcome:'道童查明回信，将你记入外门名册。教习愿从拳掌与吐纳教起。'},
      {id:'trial',text:'持木剑行礼，请师兄试招',combat:{opponent:'student',danger:15},next:'end',failNext:'retry',retreatNext:'retry',effects:[{op:'set',ref:'sect',value:'wudang'},{op:'add',ref:'relation:武当教习',value:5}],outcome:'师兄收剑，道童记下你的名字。你可入院担差事、学拳掌。',failText:'师兄扶你站稳，名册未封。养好伤、练稳基本功后再来。'},
    ]},
    retry:{room:'wudang-gate',scene:'木剑仍在石阶边，道童递来一碗清水。',dialogues:[['道童','不急于一时。可先护药求引荐，也可再试。']],hearsay:'山门试招失手仍可再来。',choices:[{id:'again',text:'重新问讯入门办法',next:'ask',effects:{},outcome:'道童重新打开名册。'}]},end:end('武当外门名册已有你的名字。'),
  }},
  wudang_master: {name:'护道考校',start:'ask',requires:{all:[{ref:'sect',op:'eq',value:'wudang'},{ref:'rank',op:'eq',value:1}]},nodes:{
    ask:{room:'wudang-hall',scene:'教习把护药人的往来簿放在蒲团旁，自己走到庭中。',dialogues:[['武当教习','招式练熟，还得肯替别人留路。将绵掌与心法练到三重，再来守我几招。']],hearsay:'入室弟子可凭护药经历、修为和师门交情参加护道考校。',choices:[
      {id:'trial',text:'请师傅考校掌法与护持之心',requires:{all:[at('style:武当绵掌',400,'绵掌需三重（心得四百）'),at('internal:quanzhen',400,'全真心法需三重（心得四百）'),at('resource:contribution',30,'留足贡献三十'),at('relation:武当教习',15,'师门交情需十五，可参加外门考核并传回药路口信'),{ref:'fact:medicine_returned',op:'eq',value:true,reason:'须将武当口信送回回春堂，兑现往返之约'}]},combat:{opponent:'wudang_mentor',danger:25},next:'end',failNext:'retry',retreatNext:'retry',effects:[{op:'set',ref:'rank',value:2},{op:'add',ref:'resource:contribution',value:-30},{op:'add',ref:'relation:武当教习',value:10},{op:'teaching',ref:'武当绵掌',value:6400},{op:'set',ref:'fact:wudang_guardian',value:true}],outcome:'师傅收势，许你以护道弟子身份行走。绵掌可进修至六千四百心得，纯阳无极功入门篇可来请教。',failText:'师傅指出护身与护人的步子尚未接稳；不扣贡献，养伤后可再试。'},
    ]},retry:{room:'wudang-hall',scene:'师傅将蒲团挪到廊下，留出调息的地方。',dialogues:[['武当教习','此番指出的破绽，回院慢慢拆解。']],hearsay:'护道考校以收放为先，不以一败定终身。',choices:[{id:'again',text:'记下指点，再作准备',next:'ask',effects:{},outcome:'名页仍留在案上。'}]},end:end('你已获护道行走之许，可继续进修并替山门照看药路。'),
  }},
};
