import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await fs.readFile(new URL('../dogoni_app.js',import.meta.url),'utf8');
const listeners=new Map(),windowListeners=new Map(),elements=new Map();
const add=(map,key,fn)=>map.set(key,[...(map.get(key)||[]),fn]);
let document;
function element(id='',tagName='DIV'){
 const events=new Map(),classes=new Set();
 return {id,tagName,style:{},dataset:{},textContent:'',innerHTML:'',value:'',clientWidth:1200,clientHeight:675,offsetWidth:440,offsetHeight:360,
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,v)=>v?classes.add(x):classes.delete(x)},
 setAttribute(){},focus(){document.activeElement=this;},setPointerCapture(){},addEventListener:(k,fn)=>add(events,k,fn),
 dispatch(k,e){for(const fn of events.get(k)||[])fn(e);},querySelectorAll:()=>[],querySelector:s=>get(id+s)};
}
const get=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id);};
const arrows=['left','right','down','up'].map(k=>{const b=element(k,'BUTTON');b.dataset.k=k;return b;});
document={activeElement:null,getElementById:get,addEventListener:(k,fn)=>add(listeners,k,fn),querySelectorAll:s=>s==='.controls button'?arrows:[]};
const project={};const sandbox={document,window:{DOGONI_PROJECT:project,addEventListener:(k,fn)=>add(windowListeners,k,fn)},performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},console};
vm.createContext(sandbox);
const expose=`window.api={def,init,start,run,step,openTask,finish,getRT:()=>rt,getP:()=>P,held:()=>hold};scene=()=>{};position=()=>{};hud=()=>{};applyAppearance=()=>{};markSelection=()=>{};setupStage=()=>{};`;
vm.runInContext(source.replace(/init\(\);\s*\}\)\(\);\s*$/,expose+'})();'),sandbox);
const api=sandbox.window.api;
Object.assign(project,api.def());project.sound=false;project.timerEnabled=false;project.obs=[];project.bonuses=[{x:10000,y:120},{x:11000,y:120},{x:12000,y:120}];
const key=(code,options={})=>{const e={code,key:code,target:document.activeElement||get('body'),repeat:false,preventDefault(){this.prevented=true;},stopPropagation(){},...options};for(const fn of listeners.get('keydown')||[])fn(e);return e;};
const release=code=>{for(const fn of listeners.get('keyup')||[])fn({code,key:code});};
await api.init();
assert.equal(api.getRT().run,false,'Title screen waits for Play');
get('titleCardbutton').focus();get('titleCardbutton').onclick();
assert.equal(document.activeElement,get('game'),'Play transfers keyboard focus to the game synchronously');
assert.equal(api.getRT().enemyWait,3);
let r=api.getRT(),x=r.x,enemyX=r.enemyX;
assert.equal(key('ArrowRight').prevented,true);api.step(1/120);
assert.ok(r.x>x,'The first keyboard event moves the hero on the first physics step');assert.equal(r.enemyX,enemyX);assert.ok(r.enemyWait>2.9);
release('ArrowRight');assert.equal(api.held().right,false);
key('Space');assert.ok(r.vy>0,'Jump also responds during opponent delay');
// Long delays affect only the opponent, including runs without a title screen.
api.getP().enemyDelay=15;api.getP().ts.on=false;get('outside').focus();api.start();r=api.getRT();x=r.x;enemyX=r.enemyX;
assert.equal(document.activeElement,get('game'));key('ArrowRight');api.step(1/120);assert.ok(r.x>x);assert.equal(r.enemyX,enemyX);assert.ok(r.enemyWait>14.9);
// Touch controls focus the frame immediately and do not wait for the opponent.
release('ArrowRight');get('outside').focus();arrows[1].onpointerdown({pointerId:1,preventDefault(){}});x=r.x;api.step(1/120);assert.ok(r.x>x);assert.equal(document.activeElement,get('game'));arrows[1].onpointerup();assert.equal(api.held().right,false);
get('outside').focus();get('game').dispatch('pointerdown',{target:get('game')});assert.equal(document.activeElement,get('game'));
// Text entry is not intercepted. Continue then restores keyboard focus and input immediately.
api.getP().tasks[0]={type:'text',q:'Question',ok:'yes',fb:'',options:[]};api.openTask(0);
const input=get('taskCard.text-answer');input.tagName='INPUT';input.focus();input.value='yes';assert.notEqual(key('ArrowRight').prevented,true);assert.equal(document.activeElement,input);
get('taskCard.check').onclick();get('taskCard.check').onclick();assert.equal(document.activeElement,get('game'));assert.equal(r.run,true);x=r.x;key('ArrowRight');api.step(1/120);assert.ok(r.x>x);assert.ok(r.enemyWait>14);
// Replay also restores keyboard focus; losing focus releases held movement.
api.finish(false);get('endCard.play').focus();get('endCard.play').onclick();r=api.getRT();x=r.x;assert.equal(document.activeElement,get('game'));key('ArrowRight');api.step(1/120);assert.ok(r.x>x);assert.ok(r.enemyWait>14);
for(const fn of windowListeners.get('blur')||[])fn();assert.equal(api.held().right,false);
console.log('PASS: embedded startup, first-frame keyboard movement/jump, 15-second opponent-only delay, touch focus, text entry, Continue and replay focus');
