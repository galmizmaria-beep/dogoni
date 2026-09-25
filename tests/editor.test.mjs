import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const source = await fs.readFile(new URL('dogoni_app.js', root), 'utf8');
const html = await fs.readFile(new URL('index.html', root), 'utf8');
new vm.Script(source);
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(x => x[1]));
for (const [, id] of source.matchAll(/el\('([^']+)'\)/g)) {
  assert.ok(ids.has(id) || ['hero', 'enemy', 'obstacleList'].includes(id), `Missing element ${id}`);
}
function element() {
  return {style: {}, dataset: {}, classList: {add(){},remove(){},toggle(){}}, textContent:'', value:'', setAttribute(){}};
}
const elements = new Map();
const document = {
  getElementById(id) {if (!elements.has(id)) elements.set(id, {...element(),clientWidth:800}); return elements.get(id);},
  querySelectorAll(){return [];},
};
const storage = new Map();
const sandbox = {document, window:{},performance:{now:()=>0}, console,
  setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},
  localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},
};
vm.createContext(sandbox);
const expose = `window.api={def,normalize,syncTasks,heroBox,intersects,bonusY,step,jump,wireAnswer,persist,standalone,
  setup(p,r){P=p;rt=r;test=true;hold={left:false,right:false,down:false};},
  hold, getP:()=>P,getRT:()=>rt,right(v){hold.right=v;}, stop(){test=false;}};`;
vm.runInContext(source.replace(/init\(\);\s*\}\)\(\);\s*$/,expose+'})();'),sandbox);
const api=sandbox.window.api;
const state=(x=220)=>({x,y:0,vx:0,vy:0,enemyX:-10000,cam:0,col:{},lives:3,time:60,run:true});
let p=api.def(),r=state();p.sound=false;p.bonusCount=0;p.obs=[];api.setup(p,r);api.right(true);
for(let i=0;i<60;i++)api.step(1/120);
assert.ok(r.x>330&&r.x<370,'Held movement advances smoothly');
api.right(false);for(let i=0;i<60;i++)api.step(1/120);
assert.ok(Math.abs(r.vx)<.1,'Movement decelerates after release');
p=api.def();p.sound=false;p.bonusCount=0;p.obs=[{x:400,w:78,h:80}];r=state(280);api.setup(p,r);api.right(true);
for(let i=0;i<100;i++)api.step(1/120);
assert.ok(r.x+p.heroSize*.8<=400.01,'Ground collision blocks obstacle');
r=state(280);api.setup(p,r);api.right(true);api.jump();let maxY=0;
for(let i=0;i<135;i++){api.step(1/120);maxY=Math.max(maxY,r.y);}
assert.ok(maxY>180,'Jump clears obstacle');assert.ok(r.x>478,'Hero crosses obstacle');
for(const size of [50,104,180]){p=api.def();p.heroSize=size;api.setup(p,state());assert.ok(api.bonusY()>api.heroBox(0,0).h,'Bonus requires jumping at every hero size');assert.ok(api.intersects(api.heroBox(480,120),{x:480,y:api.bonusY(),w:54,h:54}),'Bonus reachable in jump');}
function answer(type,correct,selected,text=''){
  const feedback=element(),check=element(),input={value:text};
  const buttons=['1','2','3'].map(v=>({...element(),dataset:{a:v},querySelector:()=>element()}));
  const card={querySelector:s=>({'.feedback':feedback,'.check':check,'.text-answer':input}[s]),querySelectorAll:()=>buttons};
  let result=null;
  api.wireAnswer(card,{type,ok:correct,fb:''},ok=>result=ok);
  selected.forEach(i=>buttons[i-1].onclick());check.onclick();check.onclick();return result;
}
assert.equal(answer('single','2',[2]),true);
assert.equal(answer('single','2',[1]),false);
assert.equal(answer('multiple','1,3',[3,1]),true);
assert.equal(answer('multiple','1,3',[1]),false);
assert.equal(answer('order','1,2,3',[1,3,2]),false);
assert.equal(answer('order','1,2,3',[1,2,3]),true);
assert.equal(answer('text','Ответ',[],' ответ '),true);
assert.equal(answer('oral','',[]),true);
assert.equal(answer('single','1',[]),null,'Empty answer does not consume life');
p=api.normalize({bonusCount:4,tasks:[],a:{hero:'javascript:alert(1)'},lives:-2});api.setup(p,state());api.syncTasks();assert.equal(p.tasks.length,4);assert.equal(p.lives,1);assert.ok(!p.a.hero.startsWith('javascript:'));
await api.persist();assert.equal(JSON.parse(storage.get('dogoniProject')).tasks.length,4,'Project persists tasks');
assert.ok(!html.includes('dogoni_patch.js'),'Broken legacy patch is disconnected');
const css=await fs.readFile(new URL('dogoni_app.css',root),'utf8');
sandbox.fetch=async url=>({ok:true,text:async()=>url.startsWith('dogoni_app.css')?css:source});
p=api.def();for(const key of Object.keys(p.a))p.a[key]='data:image/png;base64,AA==';p.ts.title='Title </script><script>alert(1)</script>';api.setup(p,state());
const clone={className:'',querySelectorAll:()=>[],querySelector:()=>({replaceChildren(){}}),outerHTML:'<div id="game"></div>'};
document.getElementById('game').cloneNode=()=>clone;
const exported=await api.standalone();
const scripts=[...exported.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2,'Export safely embeds project and runtime');
for(const [,script] of scripts)new vm.Script(script);
assert.ok(!exported.includes('<script src='));
assert.ok(exported.includes('data:image/png;base64,AA=='));
assert.ok((await api.standalone(true)).length<exported.length,'Compact export reduces size');
console.log('PASS: syntax, DOM IDs, movement, braking, obstacle collision/jump, bonus height, five answer types, migration, persistence and standalone export');
