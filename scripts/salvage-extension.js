/* Standalone extraction systems layered over the supplied port renderer. */
(() => {
  'use strict';
  const KEY = 'salvage-port-v1';
  const ITEMS = [
    {name:'精密线路板',value:480,weight:1,grade:'common'},
    {name:'伺服驱动器',value:920,weight:2,grade:'rare'},
    {name:'光学传感器',value:1250,weight:2,grade:'rare'},
    {name:'加密核心',value:3200,weight:3,grade:'gold'},
    {name:'工业电池',value:640,weight:2,grade:'common'},
  ];
  let warehouse = {version:1,credits:0,extractions:0,items:0};
  try {
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved?.version===1) for(const k of ['credits','extractions','items'])
      if(Number.isSafeInteger(saved[k])&&saved[k]>=0) warehouse[k]=saved[k];
  } catch {}
  const format=n=>n.toLocaleString('zh-CN');
  const style=document.createElement('style');
  style.textContent=`
    .m-word{font-size:clamp(48px,8.4vw,126px)!important;line-height:1.1!important;letter-spacing:.06em!important;margin:20px 0!important}
    .m-subtitle{font-size:16px!important;letter-spacing:.5em!important;margin:16px 0!important;display:block}
    .m-title-main{max-width:780px}.m-title{padding-bottom:100px}.m-premise{max-width:540px;font-size:16px!important;line-height:1.8!important}
    .m-legend{position:absolute;left:5.5vw;right:4vw;bottom:25px;max-width:none!important}
    .m-eyebrow{font-size:11px;letter-spacing:.18em}.m-note{max-width:540px;line-height:1.7!important}
    .m-actions .btn{min-width:110px}.m-actions .primary{min-width:210px;background:#ffb347;color:#111}
    #salvage-hud{position:absolute;right:max(22px,env(safe-area-inset-right));top:24px;width:220px;display:none;text-align:right;text-shadow:0 2px 5px #000;pointer-events:none}
    #salvage-hud small{font-size:10px;letter-spacing:.2em;color:#b9c4c7}#salvage-hud b{display:block;font-size:26px;margin:6px 0;color:#ffcb83}
    #salvage-hud .capacity{font-size:12px;color:#d2d8d9}#salvage-hud progress{width:130px;height:3px;accent-color:#ffb347}
    #loot-prompt{display:none;position:absolute;left:50%;top:62%;transform:translateX(-50%);background:#0b0f13dc;border:1px solid #b89151;padding:14px 22px;text-align:center;font-size:13px;pointer-events:none;white-space:nowrap}
    #loot-prompt b{color:#ffd194}#loot-prompt small{display:block;margin-top:7px;color:#b7c3c7}
    #salvage-bag{display:none;position:absolute;inset:12% max(18px,8vw);z-index:65;overflow:auto;background:#0d1419f5;border:1px solid #465056;padding:clamp(20px,4vw,48px);box-shadow:0 20px 100px #000c;pointer-events:auto}
    #salvage-bag h2{font-size:28px;margin:0 0 10px;letter-spacing:.1em}#salvage-bag p{color:#9daeb5;font-size:13px;line-height:1.8}
    .bag-row{display:flex;justify-content:space-between;gap:12px;padding:17px 0;border-bottom:1px solid #ffffff16;font-size:14px}.bag-row.rare{color:#9ccee7}.bag-row.gold{color:#ffcb83}
    .bag-footer{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:25px;flex-wrap:wrap}
    .salvage-summary{margin:18px 0 4px;padding:16px 0;border-top:1px solid #ffffff25;color:#ffcb83;font-size:14px;line-height:1.9}
    #salvage-touch{display:none;position:absolute;right:16px;top:105px;z-index:20;gap:6px;pointer-events:auto}#salvage-touch button{padding:10px;background:#10191caa;border:1px solid #b7b4a85c;color:#e8e4da;font:12px system-ui}
    .salvage-hint{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);font-size:11px;letter-spacing:.08em;color:#c2c9cb;white-space:nowrap;pointer-events:none}
    @media(max-width:700px){.m-title{padding:70px 22px 155px!important}.m-word{font-size:clamp(42px,11vw,70px)!important}.m-premise{font-size:13px!important}.m-legend{left:22px;bottom:20px}.m-note{font-size:10px!important}.m-eyebrow{font-size:9px}.m-actions{gap:6px}.m-actions .btn{min-width:80px;padding:12px}.m-actions .primary{min-width:150px}#salvage-hud{right:14px;top:75px;width:165px}#salvage-hud b{font-size:20px}.salvage-hint{display:none}#loot-prompt{font-size:11px;padding:10px;max-width:90vw;white-space:normal}#salvage-bag{inset:7% 14px}.is-touch #salvage-hud{top:20px}.is-touch #salvage-touch{display:flex}}
    @media(max-height:550px){.m-title{padding-top:25px!important;padding-bottom:90px!important}.m-word{margin:5px 0!important;font-size:48px!important}.m-subtitle{margin:8px 0!important}.m-note{display:none}.m-premise{padding-top:8px!important}.m-actions{margin-top:10px}.m-legend{bottom:10px}}
  `;
  document.head.append(style);
  const interval=setInterval(()=>{
    if(!window.__ready||!window.__G?.game) return;
    clearInterval(interval);init(window.__G);
  },100);
  function init(G){
    const T=G.THREE,V=T.Vector3;
    const hud=document.createElement('div');hud.id='salvage-hud';
    const prompt=document.createElement('div');prompt.id='loot-prompt';
    const bag=document.createElement('section');bag.id='salvage-bag';bag.setAttribute('role','dialog');bag.setAttribute('aria-label','战利品背包');
    const touch=document.createElement('div');touch.id='salvage-touch';touch.innerHTML='<button type="button" data-loot>搜索</button><button type="button" data-bag>背包</button><button type="button" data-heal>急救</button>';
    const hint=document.createElement('div');hint.className='salvage-hint';hint.textContent='G 搜索物资  /  B 背包  /  H 急救包  /  长按 E 切断中继';
    document.querySelector('#ui').append(hud,prompt,bag,touch,hint);
    let inventory=[],sites=[],nearest=null,search=0,open=false,settled=false,kills=0,meds=2,medical=0,previous=G.game.state;
    let storageOK=true;
    function title(){
      const set=(selector,text)=>{const e=document.querySelector(selector);if(e)e.textContent=text;};
      set('.m-word','失落港区');
      const sub=document.createElement('span');sub.className='m-subtitle';sub.textContent='搜索 · 交战 · 撤离';document.querySelector('.m-word')?.append(sub);
      set('.m-eyebrow','SALVAGE  /  第四泊位  /  05:42');
      set('.m-premise','封锁港区的机械守卫仍在巡逻。搜集物资，切断三处中继，带着战利品登上撤离艇。');
      set('[data-act="deploy"]','部署行动');
      set('.m-note',`永久仓库 ¥ ${format(warehouse.credits)} · 成功撤离 ${warehouse.extractions} 次。阵亡将丢失本局物资。`);
      set('[data-pane="about"]','基于你提供的《几猫》HTML 港区引擎改作。新增搜刮、残骸掉落、容量背包、急救与永久仓库。所有敌人均为机械猎犬或无人机。实时 WebGL 光影、雨水材质和后期处理；这是浏览器可玩原型，非商业 3A 成品。操作：WASD 移动，鼠标瞄准，左键射击，右键瞄准，R 换弹，长按 E 切断中继，长按 G 搜索，B 背包，H 治疗。');
      const legend=document.querySelector('.m-legend');if(legend){const row=document.createElement('div');row.textContent='G 搜索物资 / B 战利品背包 / H 急救包（每局 2 个）';legend.prepend(row);}
      document.title='失落港区 · 第一人称搜打撤';
    }
    title();
    const weight=()=>inventory.reduce((a,x)=>a+x.weight,0);
    const value=()=>inventory.reduce((a,x)=>a+x.value,0);
    function updateHUD(){hud.innerHTML=`<small>本局战利品 / SALVAGE</small><b>¥ ${format(value())}</b><div class="capacity">${weight()} / 20 kg · ${inventory.length} 件 · 急救 ${meds}</div><progress value="${weight()}" max="20"></progress>`;}
    function persist(){try{localStorage.setItem(KEY,JSON.stringify(warehouse));}catch{storageOK=false;}}
    function makeSite(pos,item,index,drop=false){
      const root=new T.Group();root.position.copy(pos);root.position.y+=.12;
      const material=new T.MeshStandardMaterial({color:drop?0x303c45:0x30433e,metalness:.65,roughness:.34});
      const body=new T.Mesh(new T.BoxGeometry(.62,.36,.44),material);body.position.y=.18;body.castShadow=true;body.receiveShadow=true;root.add(body);
      const strip=new T.Mesh(new T.BoxGeometry(.5,.025,.46),new T.MeshBasicMaterial({color:item.grade==='gold'?0xffc365:0x8edac6}));strip.position.y=.34;root.add(strip);
      for(const x of [-.22,.22]){const clasp=new T.Mesh(new T.BoxGeometry(.055,.38,.46),G.mats.get('gunmetal'));clasp.position.set(x,.18,0);root.add(clasp);}
      const ring=new T.Mesh(new T.TorusGeometry(.43,.008,4,32),new T.MeshBasicMaterial({color:item.grade==='gold'?0xffc365:0x92d6c5,transparent:true,opacity:.5}));ring.rotation.x=Math.PI/2;ring.position.y=.02;root.add(ring);
      G.scene.add(root);
      const site={pos:root.position.clone(),item:{...item},root,strip,ring,taken:false,index,drop};sites.push(site);return site;
    }
    function reset(){
      for(const s of sites){G.scene.remove(s.root);s.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});s.root.children[0].material.dispose();s.strip.material.dispose();s.ring.material.dispose();}
      inventory=[];sites=[];kills=0;settled=false;meds=2;medical=0;search=0;open=false;bag.style.display='none';
      const start=G.level.playerStart.pos;
      // Valid walkable, visible positions around the deployment area and relay approaches.
      const anchors=[start,...G.level.objectives.map(o=>o.pos),G.level.extraction.pos];
      let idx=0;
      for(const anchor of anchors){
        let added=0;
        for(let j=0;j<24&&added<2;j++){
          const angle=j*2.39996,r=2.4+Math.floor(j/8)*1.3;
          const p=new V(anchor.x+Math.cos(angle)*r,anchor.y,anchor.z+Math.sin(angle)*r);
          if(G.physics.isWalkable&&!G.physics.isWalkable(p.x,p.z))continue;
          const from=anchor.clone();from.y+=1;const to=p.clone();to.y+=.5;
          if(!G.physics.lineOfSight(from,to))continue;
          makeSite(p,ITEMS[(idx*3+Math.floor(G.rng()*ITEMS.length))%ITEMS.length],idx++);added++;
        }
      }
      updateHUD();
    }
    function renderBag(){
      bag.innerHTML=`<h2>战利品背包</h2><p>容量 ${weight()} / 20 kg · 本局价值 ¥ ${format(value())}<br>只有成功登艇，战利品才会转入永久仓库。背包打开时暂停行动。</p><div>${inventory.length?inventory.map(x=>`<div class="bag-row ${x.grade}"><span>${x.name} <small> / ${x.weight} kg</small></span><strong>¥ ${format(x.value)}</strong></div>`).join(''):'<p>背包为空。靠近绿色标识物资箱或机器人残骸，长按 G 搜索。</p>'}</div><div class="bag-footer"><span>仓库余额 ¥ ${format(warehouse.credits)}</span><button type="button" class="btn primary" data-close-bag>返回行动 · B</button></div>`;
      bag.querySelector('[data-close-bag]').onclick=closeBag;
    }
    function closeBag(){if(!open)return;open=false;bag.style.display='none';G.game.resume();}
    function toggleBag(){if(open){closeBag();return;}if(G.game.state!=='playing')return;G.game.pause();open=true;renderBag();bag.style.display='block';bag.querySelector('button').focus();}
    const pressed=new Set();
    addEventListener('keydown',e=>{
      if(['KeyB','KeyG','KeyH'].includes(e.code))e.preventDefault();
      if(e.code==='KeyB'&&!e.repeat)toggleBag();
      if(e.code==='Escape'&&open){e.stopImmediatePropagation();closeBag();}
      if(e.code==='KeyH'&&!e.repeat&&G.game.state==='playing')heal();
      pressed.add(e.code);
    },true);
    addEventListener('keyup',e=>pressed.delete(e.code));
    addEventListener('blur',()=>pressed.clear());
    touch.querySelector('[data-bag]').onclick=toggleBag;
    touch.querySelector('[data-heal]').onclick=heal;
    const lootButton=touch.querySelector('[data-loot]');
    lootButton.onpointerdown=e=>{e.preventDefault();lootButton.setPointerCapture(e.pointerId);pressed.add('KeyG');};
    lootButton.onpointerup=lootButton.onpointercancel=()=>pressed.delete('KeyG');
    function heal(){if(meds<=0)return G.hud.message('急救包已用尽',2);if(G.player.health>=G.player.maxHealth)return G.hud.message('生命值已满',2);if(medical>0)return;meds--;G.player.heal(45);medical=6;G.hud.message('使用急救包 · 恢复 45 生命值',2.5);updateHUD();}
    G.events.on('enemy:killed',e=>{
      kills++;const pos=e.pos||e.enemy?.pos;if(!pos)return;
      const p=new V(pos.x,pos.y+.5,pos.z);
      const floor=G.physics.raycast(p,new V(0,-1,0),40);
      if(floor?.point)p.copy(floor.point);else p.y=G.level.playerStart.pos.y;
      makeSite(p,ITEMS[kills%ITEMS.length],sites.length,true);
    });
    G.events.on('game:state',e=>{
      if(e.state==='intro'||(e.state==='playing'&&['title','dead','complete'].includes(e.prev)))reset();
      if(['dead','complete'].includes(e.state)){
        if(settled)return;settled=true;const amount=value();
        if(e.state==='complete'){warehouse.credits+=amount;warehouse.extractions++;warehouse.items+=inventory.length;persist();}
        const screen=document.querySelector(`[data-s="${e.state}"]`);
        screen?.querySelector('.salvage-summary')?.remove();const summary=document.createElement('div');summary.className='salvage-summary';
        summary.textContent=e.state==='complete'?`战利品已入库：${inventory.length} 件 / ¥ ${format(amount)}。仓库总额 ¥ ${format(warehouse.credits)}。${storageOK?'':'浏览器禁止存储，关闭页面后仓库将无法保留。'}`:`行动失败 · 丢失 ${inventory.length} 件战利品 / ¥ ${format(amount)}。永久仓库不受影响。`;
        screen?.insertBefore(summary,screen.querySelector('.m-actions'));inventory=[];updateHUD();
      }
    });
    const baseUpdate=G.game.update.bind(G.game);
    G.game.update=dt=>{
      const result=baseUpdate(dt);const active=G.game.state==='playing';
      hud.style.display=active?'block':'none';hint.style.display=active?'':'none';touch.style.visibility=active?'visible':'hidden';prompt.style.display='none';
      if(!active){search=0;pressed.delete('KeyG');return result;}
      medical=Math.max(0,medical-dt);
      let target=null,distance=3;
      for(const s of sites){if(s.taken)continue;s.ring.material.opacity=.3+Math.sin(G.time.t*3+s.index)*.2;
        const d=G.player.pos.distanceTo(s.pos);if(d>distance)continue;
        const eye=G.player.eye,targetPos=s.pos.clone();targetPos.y+=.3;
        if(!G.physics.lineOfSight(eye,targetPos))continue;
        target=s;distance=d;
      }
      if(target!==nearest)search=0;nearest=target;
      if(target){
        prompt.style.display='block';const full=weight()+target.item.weight>20;
        if(pressed.has('KeyG')&&!full){search+=dt;if(search>=1.1){target.taken=true;target.root.visible=false;inventory.push({...target.item});G.hud.message(`获得 ${target.item.name} · ¥ ${format(target.item.value)}`,2);search=0;updateHUD();prompt.style.display='none';}}
        else search=0;
        prompt.innerHTML=`<b>${target.drop?'回收残骸':'物资箱'} · ${target.item.name}</b><small>${full?'背包容量不足':`长按 G 搜索 ${Math.floor(Math.min(1,search/1.1)*100)}%`} / ${target.item.weight} kg / ¥ ${format(target.item.value)}</small>`;
      }else search=0;
      previous=G.game.state;return result;
    };
    // Read-only diagnostics for reproducible QA, never used to determine game outcomes.
    window.salvageStatus=()=>({state:G.game.state,sites:sites.map(s=>({pos:s.pos.toArray(),taken:s.taken,item:s.item.name})),inventory:inventory.map(x=>({...x})),weight:weight(),value:value(),warehouse:{...warehouse},meds,bagOpen:open});
    if(G.game.state==='playing')reset();updateHUD();
  }
})();
