import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {TextEncoder,TextDecoder} from 'node:util';
import {gzipSync,gunzipSync} from 'node:zlib';
const root = new URL('../', import.meta.url);
const source = await fs.readFile(new URL('dogoni_app.js', root), 'utf8');
const mathSource=await fs.readFile(new URL('dogoni_math.js',root),'utf8');
new vm.Script(mathSource);
const html = await fs.readFile(new URL('index.html', root), 'utf8');
new vm.Script(source);
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(x => x[1]));
for (const [, id] of source.matchAll(/el\('([^']+)'\)/g)) {
  assert.ok(ids.has(id) || ['hero', 'enemy', 'obstacleList'].includes(id), `Missing element ${id}`);
}
function element() {
  return {style: {}, dataset: {}, classList: {add(){},remove(){},toggle(){}}, textContent:'', value:'', setAttribute(){},focus(){},addEventListener(){},querySelectorAll(){return [];},offsetWidth:90,offsetHeight:30,clientHeight:480};
}
const elements = new Map();
const document = {
  getElementById(id) {if (!elements.has(id)) elements.set(id, {...element(),clientWidth:800}); return elements.get(id);},
  querySelectorAll(){return [];},addEventListener(){},
};
const storage = new Map();
const sandbox = {document, window:{addEventListener(){}},TextEncoder,TextDecoder,performance:{now:()=>0}, console,
  setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},
  localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},
};
vm.createContext(sandbox);
vm.runInContext(mathSource,sandbox);
const expose = `window.api={def,normalize,syncTasks,heroBox,intersects,bonusY,step,jump,wireAnswer,persist,standalone,sceneryTiles,heroTransform,validateTask,events,titleStyle,screenHTML,taskHTML,embeddedProject,exportGame,start,openTask,setLanguage,tr,fonts,fillLanguage,changed,resetHistory,restoreHistory,
  stubHistoryViews(){fill=()=>{};assets=()=>{};},
  stubStartup(){scene=()=>{};position=()=>{};hud=()=>{};markSelection=()=>{};applyAppearance=()=>{};},
  stubViews(){taskList=()=>{};renderPreview=()=>{};},
  setup(p,r){P=p;rt=r;test=true;hold={left:false,right:false,down:false};},
  hold, getP:()=>P,getRT:()=>rt,right(v){hold.right=v;},left(v){hold.left=v;},selection:()=>sel,setDB(v){db=v;},setPrepared(v){preparedExport=v;},prepared:()=>preparedExport, stop(){test=false;}};`;
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
sandbox.fetch=async url=>({ok:true,text:async()=>url.startsWith('dogoni_app.css')?css:url.startsWith('dogoni_math.js')?mathSource:source});
p=api.def();for(const key of Object.keys(p.a))p.a[key]='data:image/webp;base64,AA==';p.starts.hero={x:345,y:78};p.uiPositions.hLives={x:.4,y:.25};p.hudStyle.hLives.bg='#123456';p.controlStyle.shape='square';p.ts.title='Title </script><script>alert(1)</script>';api.setup(p,state());
const clone={className:'',querySelectorAll:()=>[],querySelector:()=>({replaceChildren(){}}),outerHTML:'<div id="game"></div>'};
document.getElementById('game').cloneNode=()=>clone;
const exported=await api.standalone();
const scripts=[...exported.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2,'Export safely embeds project and runtime');
const exportedState={window:{}};vm.runInNewContext(scripts[0][1],exportedState);assert.equal(exportedState.window.DOGONI_PROJECT.starts.hero.x,345);assert.equal(exportedState.window.DOGONI_PROJECT.uiPositions.hLives.x,.4);assert.equal(exportedState.window.DOGONI_PROJECT.hudStyle.hLives.bg,'#123456');assert.equal(exportedState.window.DOGONI_PROJECT.controlStyle.shape,'square');assert.ok(scripts[1][1].includes('window.DogoniMath'),'Math renderer is embedded offline');
for(const [,script] of scripts)new vm.Script(script);
assert.ok(!exported.includes('<script src='));
assert.ok(exported.includes('data:image/webp;base64,AA=='));
assert.ok((await api.standalone(true)).length<exported.length,'Compact export reduces size');
// Exercise the actual event handlers against a minimal DOM adapter.
api.stubViews();api.events();api.stop();
p=api.def();api.setup(p,state());api.stop();api.syncTasks();
assert.equal(p.obs.length,p.tasks.length,'One obstacle per task');
const get=id=>document.getElementById(id);
for(const [id,value] of Object.entries({taskType:'text',taskQ:'Сколько будет 2 + 2?',taskOpt:'',taskOk:'4',taskFb:'Правильно'}))get(id).value=value;
await get('saveTask').onclick();
assert.equal(JSON.parse(storage.get('dogoniProject')).tasks[0].ok,'4');
assert.match(get('taskStatus').textContent,/сохранено/,'Save button has adjacent feedback');
for(let i=0;i<3;i++)await get('delTask').onclick();
assert.equal(p.tasks.length,0,'Last task can be deleted');assert.equal(p.bonusCount,0);assert.equal(p.obs.length,0);
get('addTask').onclick();assert.equal(p.tasks.length,1);assert.equal(p.obs.length,1);assert.equal(p.bonusCount,1);
await api.persist();assert.equal(JSON.parse(storage.get('dogoniProject')).tasks.length,1);
assert.match(get('taskStatus').textContent,/Добавлено/);
assert.ok(api.validateTask({type:'order',q:'Order',options:['A','B','C'],ok:'1,2'}));
assert.equal(api.validateTask({type:'order',q:'Order',options:['A','B','C'],ok:'3,1,2'}),'');
// Failed persistence must not claim success next to the save button.
const write=sandbox.localStorage.setItem;sandbox.localStorage.setItem=()=>{throw Error('quota');};
get('taskType').value='text';get('taskQ').value='Question';get('taskOk').value='answer';await get('saveTask').onclick();
assert.match(get('taskStatus').textContent,/Не удалось/);sandbox.localStorage.setItem=write;
p=api.def();p.bonusCount=0;p.obs=[];p.sound=false;r=state(800);api.setup(p,r);api.left(true);for(let i=0;i<40;i++)api.step(1/120);
assert.ok(r.x<800,'Hero can return to a missed bonus');assert.equal(r.facing,-1);assert.match(api.heroTransform(),/scaleX\(-1\)/);p.heroFlip=true;assert.match(api.heroTransform(),/scaleX\(1\)/);
for(const cam of [0,500,4000,20000]){const tiles=api.sceneryTiles(800,480,cam,3);assert.ok(tiles[0].left<=0);assert.ok(tiles[2].left+tiles[2].width>=800);for(let i=0;i<2;i++){assert.ok(tiles[i].left+tiles[i].width>=tiles[i+1].left,'No gap between scenery tiles');assert.equal(tiles[i].flip,-tiles[i+1].flip,'Matching mirrored edges');}}
p=api.normalize({ts:{bg:'#abcdef',border:'#123456',borderWidth:4,titleFont:'Georgia',textFont:'Verdana',titleSize:48,textSize:22,titleColor:'#112233',textColor:'#445566'},d:{qFont:'Georgia',aFont:'Verdana'}});api.setup(p,state());
const titleCard=element();api.titleStyle(titleCard);assert.equal(titleCard.style.background,'#abcdef');assert.equal(titleCard.style.border,'4px solid #123456');
assert.match(api.screenHTML(p.ts,'title'),/font-family:Georgia, serif;font-size:48px;color:#112233/);assert.match(api.screenHTML(p.ts,'title'),/font-family:Verdana, sans-serif;font-size:22px;color:#445566/);
assert.match(api.taskHTML(p.tasks[0]),/font-family:Georgia/);assert.match(api.taskHTML(p.tasks[0]),/font-family:Verdana/);
const old=p.ts.title;const rebuilt=api.normalize(JSON.parse(JSON.stringify(p)));assert.equal(rebuilt.ts.titleFont,'Georgia');assert.equal(rebuilt.d.aFont,'Verdana');
assert.ok(!html.includes('class="ground"'),'No artificial ground stripe');
// Compression is lossless and preserves animated image data.
for(const k of Object.keys(p.a))p.a[k]='data:image/webp;base64,AA==';p.ts.img='data:image/gif;base64,GIF89a';
const compactProject=await api.embeddedProject(true);assert.equal(compactProject.ts.img,p.ts.img);assert.equal(compactProject.a.bm,'');assert.equal(compactProject.a.bn,'');
sandbox.CompressionStream=class{};sandbox.DecompressionStream=class{};
sandbox.Blob=class{constructor(parts){this.parts=parts;}stream(){return{pipeThrough:()=>({buffer:gzipSync(this.parts.join(''))})};}};
sandbox.Response=class{constructor(stream){this.stream=stream;}async arrayBuffer(){const a=this.stream.buffer;return a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength);}};
sandbox.btoa=b=>Buffer.from(b,'binary').toString('base64');
const packed=await api.standalone(true);const payload=packed.match(/atob\("([A-Za-z0-9+/=]+)"\)/)[1];
const unpacked=gunzipSync(Buffer.from(payload,'base64')).toString('utf8');assert.ok(unpacked.includes('data:image/gif;base64,GIF89a'));assert.ok(packed.length<unpacked.length*.75,'Compression materially reduces embedded code');
for(const [,script] of unpacked.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script);
// The prepared compact payload is used by the Genially copy action.
let copied='';sandbox.navigator={clipboard:{writeText:async s=>{copied=s;}}};
api.stop();await api.exportGame('mini');assert.ok(api.prepared().compact);await get('copyBtn').onclick();assert.equal(copied,api.prepared().iframe);assert.ok(copied.length>0);
get('taskQ').value='Edited after export';await get('taskQ').oninput();assert.equal(api.prepared(),null,'Edits invalidate previously prepared code');
console.log('PASS: syntax, DOM IDs, movement, braking, obstacle collision/jump, bonus height, five answer types, migration, persistence and standalone export');

// A raised placement is the actor's own landing level, including actual start/replay.
api.stubStartup();p=api.def();p.sound=false;p.ts.on=false;p.timer=0;p.starts.hero={x:345,y:160};p.starts.enemy={x:30,y:75};p.obs=[];api.setup(p,state());api.start(true);r=api.getRT();
assert.equal(r.x,345);assert.equal(r.y,160);assert.equal(r.enemyX,30);assert.equal(r.enemyY,75);
p.bonusCount=0;for(let i=0;i<120;i++)api.step(1/120);
assert.equal(r.y,160,'Hero does not fall from its chosen height');assert.equal(r.enemyY,75,'Enemy has an independent landing level');assert.equal(r.cam,0,'Camera does not shift the placed hero when starting');
api.right(true);api.jump();let raisedPeak=r.y;for(let i=0;i<240;i++){api.step(1/120);raisedPeak=Math.max(raisedPeak,r.y);assert.ok(r.y>=160);}
assert.ok(raisedPeak>320);assert.equal(r.y,160,'Hero lands at its editor height after jumping');assert.ok(r.x>500);
p.bonusCount=3;api.start(true);assert.equal(api.getRT().y,160,'Replay uses saved placement');assert.equal(api.getRT().enemyY,75);
// Incorrect answers also return the hero to its own floor.
const taskFeedback=element(),taskCheck=element(),taskInput={value:'wrong'};
get('taskCard').querySelector=s=>({'.feedback':taskFeedback,'.check':taskCheck,'.text-answer':taskInput}[s]);
p.tasks[0]={type:'text',q:'2 + 2',ok:'4',fb:'',options:[]};api.openTask(0);taskCheck.onclick();taskCheck.onclick();assert.equal(api.getRT().y,160);assert.equal(api.getRT().lives,2);
api.stop();
// Language changes translate system UI/default screens, preserve authored text and export.
p=api.def();api.setup(p,state());api.stop();p.ts.text='Авторское описание';p.tasks[0].q='Мой вопрос $x^2$';
for(const [lang,button,taskLabel] of [['en','Start game','TASK'],['es','Jugar','TAREA'],['fr','Commencer','EXERCICE'],['de','Spiel starten','AUFGABE'],['ru','Начать игру','ЗАДАНИЕ']]){
 api.setLanguage(lang);assert.equal(p.ts.btn,button);assert.equal(p.ts.text,'Авторское описание');assert.equal(p.tasks[0].q,'Мой вопрос $x^2$');assert.ok(api.taskHTML(p.tasks[0]).includes(taskLabel));assert.equal(api.normalize(JSON.parse(JSON.stringify(p))).language,lang);
}
api.setLanguage('en');api.fillLanguage();assert.equal(get('language').value,'en');assert.ok(Object.keys(api.fonts).length>=16);assert.ok(get('qFont').innerHTML.includes('Baskerville'));
for(const name of Object.keys(api.fonts)){const project=api.normalize({ts:{titleFont:name,textFont:name},d:{qFont:name,aFont:name}});assert.equal(project.ts.titleFont,name);assert.equal(project.d.aFont,name);}
for(const k of Object.keys(p.a))p.a[k]='data:image/webp;base64,AA==';
const englishExport=await api.standalone();assert.match(englishExport,/<html lang="en">/);assert.ok(englishExport.includes('"language":"en"'));
// Toolbar undo/redo restores whole edits and drops redo after a new edit.
api.stubHistoryViews();api.resetHistory();const beforeHistory=JSON.stringify(p);p.starts.hero.y=190;api.changed();p.tasks.splice(0,1);p.bonusCount=2;api.syncTasks();api.changed();
assert.equal(get('undoBtn').disabled,false);assert.equal(get('redoBtn').disabled,true);
get('undoBtn').onclick();assert.equal(api.getP().tasks.length,3);assert.equal(api.getP().starts.hero.y,190);
get('undoBtn').onclick();assert.equal(JSON.stringify(api.getP()),beforeHistory);assert.equal(get('undoBtn').disabled,true);
get('redoBtn').onclick();assert.equal(api.getP().starts.hero.y,190);assert.equal(get('redoBtn').disabled,false);
api.getP().hudStyle.hLives.bg='#abcdef';api.changed();assert.equal(get('redoBtn').disabled,true);assert.equal(api.restoreHistory(1),false);
await api.persist();assert.equal(JSON.parse(storage.get('dogoniProject')).hudStyle.hLives.bg,'#abcdef');
console.log('PASS: raised start/replay/jump/wrong-answer placement, five languages, font choices, localized export, undo/redo and branching history');
