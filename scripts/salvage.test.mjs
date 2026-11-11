import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./salvage-extension.js',import.meta.url),'utf8');
function harness(saved){
  class Node{constructor(){this.style={};this.children=[];this.innerHTML='';this.textContent='';}append(...x){this.children.push(...x);}setAttribute(){}querySelector(){return new Node();}prepend(){}insertBefore(x){this.children.push(x);}remove(){}focus(){}setPointerCapture(){}}
  class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}clone(){return new V(this.x,this.y,this.z);}copy(p){Object.assign(this,p);return this;}set(x,y,z){Object.assign(this,{x,y,z});return this;}toArray(){return[this.x,this.y,this.z];}distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}}
  class Obj{constructor(geometry,material){this.geometry=geometry;this.material=material;this.position=new V();this.rotation={};this.children=[];}add(o){this.children.push(o);}traverse(cb){cb(this);this.children.forEach(x=>x.traverse(cb));}}
  class Resource{constructor(p){Object.assign(this,p);}dispose(){}}
  const listeners={},eventHandlers={},elements=new Map(),storage=new Map();if(saved)storage.set('salvage-port-v1',JSON.stringify(saved));
  const document={head:new Node(),createElement:()=>new Node(),querySelector:q=>{if(!elements.has(q))elements.set(q,new Node());return elements.get(q);}};
  const events={on:(k,f)=>(eventHandlers[k]??=[]).push(f),emit:(k,e)=>eventHandlers[k]?.forEach(f=>f(e))};
  const G={THREE:{Vector3:V,Group:Obj,Mesh:Obj,MeshStandardMaterial:Resource,MeshBasicMaterial:Resource,BoxGeometry:Resource,TorusGeometry:Resource},scene:{add(){},remove(){}},mats:{get:()=>new Resource()},level:{playerStart:{pos:new V()},objectives:[{pos:new V(20,0,0)}],extraction:{pos:new V(40,0,0)}},physics:{isWalkable:()=>true,lineOfSight:()=>true,raycast:()=>({point:new V(4,0,4)})},rng:()=>.25,time:{t:0},player:{pos:new V(),eye:new V(0,1.7,0),health:40,maxHealth:100,heal(n){this.health=Math.min(100,this.health+n);}},hud:{message(){}},events};
  G.game={state:'title',update:()=>true,pause(){this.state='paused';},resume(){this.state='playing';}};
  let boot;
  const window={__ready:true,__G:G};
  const context=vm.createContext({window,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setInterval:f=>{boot=f;return 1;},clearInterval(){},addEventListener:(k,f)=>(listeners[k]??=[]).push(f),console});
  vm.runInContext(source,context);boot();
  const key=(code,type='keydown')=>listeners[type]?.forEach(f=>f({code,repeat:false,preventDefault(){},stopImmediatePropagation(){}}));
  const state=(next,prev=G.game.state)=>{G.game.state=next;events.emit('game:state',{state:next,prev});};
  const tick=(n=1)=>{for(let j=0;j<n;j++){G.time.t+=.05;G.game.update(.05);}};
  const status=()=>window.salvageStatus();
  const collect=()=>{const s=status().sites.find(s=>!s.taken);G.player.pos.set(...s.pos);key('KeyG');tick(24);key('KeyG','keyup');};
  state('intro');state('playing');return{G,key,state,tick,status,collect,storage};
}
test('search requires proximity and time; leaving interrupts progress',()=>{const h=harness();h.key('KeyG');h.tick(5);h.key('KeyG','keyup');assert.equal(h.status().inventory.length,0);h.G.player.pos.set(1000,0,1000);h.key('KeyG');h.tick(30);assert.equal(h.status().inventory.length,0);h.key('KeyG','keyup');h.collect();assert.equal(h.status().inventory.length,1);assert.ok(h.status().value>0);});
test('extraction banks loot once and warehouse survives reload',()=>{const h=harness();h.collect();const value=h.status().value;h.state('complete');h.state('complete');assert.equal(h.status().warehouse.credits,value);assert.equal(h.status().warehouse.extractions,1);assert.equal(h.status().inventory.length,0);const saved=JSON.parse(h.storage.get('salvage-port-v1'));assert.equal(harness(saved).status().warehouse.credits,value);});
test('death loses carried loot; retry resets containers and medkits',()=>{const h=harness();h.collect();h.state('dead');assert.equal(h.status().value,0);assert.equal(h.status().warehouse.credits,0);h.state('intro');h.state('playing');assert.ok(h.status().sites.every(s=>!s.taken));assert.equal(h.status().meds,2);});
test('bag pauses and resumes; healing has cooldown and finite uses',()=>{const h=harness();h.key('KeyB');assert.equal(h.G.game.state,'paused');assert.equal(h.status().bagOpen,true);h.key('KeyB');assert.equal(h.G.game.state,'playing');h.key('KeyH');assert.equal(h.G.player.health,85);assert.equal(h.status().meds,1);h.key('KeyH');assert.equal(h.status().meds,1);h.tick(122);h.key('KeyH');assert.equal(h.G.player.health,100);assert.equal(h.status().meds,0);});
test('capacity never exceeds 20 kg; drone wreck loot lands on ground',()=>{const h=harness();for(let j=0;j<18;j++){h.G.events.emit('enemy:killed',{pos:{x:4,y:9,z:4}});}assert.equal(h.status().sites.at(-1).pos[1],.12);for(let j=0;j<24;j++)h.collect();assert.ok(h.status().weight<=20);assert.ok(h.status().weight>0);});
test('invalid warehouse numbers are ignored',()=>{const h=harness({version:1,credits:-100,extractions:'9',items:Infinity});assert.equal(h.status().warehouse.credits,0);assert.equal(h.status().warehouse.extractions,0);});
