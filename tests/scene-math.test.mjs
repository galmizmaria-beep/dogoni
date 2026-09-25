import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const source=await fs.readFile(new URL('dogoni_app.js',root),'utf8');
const math=await fs.readFile(new URL('dogoni_math.js',root),'utf8');
const elements=new Map(),listeners=new Map(),gameListeners=new Map();
const cls=()=>{const set=new Set();return{add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x)};};
function element(id){return{id,style:{},dataset:{},value:'',type:'',classList:cls(),clientWidth:800,clientHeight:480,offsetWidth:100,offsetHeight:40,textContent:'',setAttribute(){},querySelectorAll(){return [];},focus(){},getBoundingClientRect(){return{left:0,top:0,width:this.offsetWidth,height:this.offsetHeight};},addEventListener(){}};}
const el=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id);};
const objects=['hero','enemy','hLives','hTime','hBon','movementControls'].map(id=>{const e=el(id);e.dataset.object=id==='movementControls'?'controls':id;return e;});
const buttons=['left','right','down','up'].map(k=>({...element(k),dataset:{k}}));el('movementControls').querySelectorAll=()=>buttons;
const game=el('game');game.querySelectorAll=()=>objects;game.addEventListener=(name,fn)=>gameListeners.set(name,fn);game.setPointerCapture=id=>game.capture=id;game.hasPointerCapture=id=>game.capture===id;game.releasePointerCapture=()=>game.capture=null;game.getBoundingClientRect=()=>({left:0,top:0,width:800,height:480});
el('hero').offsetWidth=104;el('hero').offsetHeight=104;el('hero').getBoundingClientRect=()=>({left:parseFloat(el('hero').style.left)||220,top:480-(parseFloat(el('hero').style.bottom)||0)-104,width:104,height:104});
const saved=new Map();const context={document:{getElementById:el,querySelectorAll:()=>[],addEventListener:(k,fn)=>listeners.set(k,fn)},window:{addEventListener(){}},performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},console,localStorage:{setItem:(k,v)=>saved.set(k,v)},};
vm.createContext(context);vm.runInContext(math,context);
const expose=`window.api={def,normalize,syncTasks,syncObstacles,advanceEnemy,moveBody,bodyBox,intersects,bonusAt,persist,editorInteractions,applyAppearance,clampWorldPoint,grounded,jump,worldPoint,applyCardPosition,scene,
 setup(p,r=null){P=p;rt=r;test=!!r;}, getP:()=>P,getRT:()=>rt, setCam(v){editorCam=v;},setTab(v){tab=v;}, stub(){renderPreview=()=>{};}, select:()=>selectedObject};`;
vm.runInContext(source.replace(/init\(\);\s*\}\)\(\);\s*$/,expose+'})();'),context);const api=context.window.api,mathAPI=context.window.DogoniMath;
const formulas=[String.raw`a^2+b^2=c^2`,String.raw`\frac{a}{b}`,String.raw`\frac{x+1}{y-2}`,String.raw`\frac{3}{4}`,String.raw`x^2`,String.raw`x^{10}`,String.raw`a_n`,String.raw`a_{n+1}`,String.raw`x_1+x_2`,String.raw`\sqrt{x}`,String.raw`\sqrt{a+b}`,String.raw`\sqrt[n]{a}`,String.raw`\left(\frac{a}{b}\right)`,String.raw`\left[x+1\right]`,String.raw`\left|x\right|`,...['times','cdot','div','pm','neq','leq','geq','infty','pi','approx'].map(x=>'\\'+x),String.raw`\sum_{i=1}^{n} i`,String.raw`\lim_{x \to 0} f(x)`,String.raw`25\%`,String.raw`\angle ABC`,String.raw`90^\circ`,String.raw`\triangle ABC`,String.raw`a \parallel b`,String.raw`a \perp b`,String.raw`\overline{AB}`,String.raw`\text{см}`,String.raw`S=24\text{ см}^2`,String.raw`v=60\text{ км/ч}`,String.raw`t=3\text{ ч}`,String.raw`\frac{-b \pm \sqrt{b^2-4ac}}{2a}`,String.raw`ax^2+bx+c=0`,String.raw`S=ab`,String.raw`P=2(a+b)`,String.raw`V=abc`,String.raw`\begin{cases} x+y=5 \\ x-y=1 \end{cases}`];
for(const f of formulas){const html=mathAPI.render('$'+f+'$');assert.ok(html.includes('<math'),f);assert.ok(!html.includes('math-error'),f);}
assert.match(mathAPI.render('Решите $$\\frac{1}{2}$$'),/display="block"/);
assert.match(mathAPI.formula('\\sqrt[3]{8}'),/<mroot>/);
assert.match(mathAPI.formula('x_1^2'),/<msubsup>/);
assert.match(mathAPI.formula('\\sum_{i=1}^{3}i'),/<munderover>/);
assert.equal((mathAPI.formula('\\begin{cases}x=1\\\\y=2\\end{cases}').match(/<mtr>/g)||[]).length,2);
for(const bad of ['\\frac{1}','x^{2','\\unknown{x}','\\begin{cases}x=1'])assert.match(mathAPI.formula(bad),/math-error/);
assert.ok(!mathAPI.render('<img src=x onerror=alert(1)> $x^2$').includes('<img'));
assert.ok(!mathAPI.formula('\\text{<script>alert(1)</script>}').includes('<script>'));
for(const [a,b] of [['1/2','0,5'],['\\frac{1}{2}','0.5'],['\\sqrt{9}','3'],['\\sqrt[3]{-8}','-2'],['2^3','8'],['-2^2','-4'],['25\\%','0.25'],['Ответ',' ответ '],['$x^{2}$','x^2']])assert.equal(mathAPI.equal(a,b),true,a);
assert.equal(mathAPI.equal('x+x','2x'),false,'Does not claim symbolic equivalence');assert.equal(mathAPI.equal('1/0','0'),false);assert.equal(mathAPI.numeric('alert(1)'),null);
// Enemy detects and clears each supported obstacle size at low and high pursuit speeds.
for(const size of [30,78,160])for(const speed of [.1,.55,2.5]){
 const p=api.def();p.obstacleSize=size;p.enemySpeed=speed;p.bonusCount=1;p.obs=[{x:170,y:0,w:size,h:Math.round(size*.92)}];const r={enemyX:40,enemyY:0,enemyVy:0,enemyJumpVx:0};api.setup(p,r);let peak=0,jumped=false;
 for(let i=0;i<18000&&r.enemyX<170+size+4;i++){api.advanceEnemy(1/120);peak=Math.max(peak,r.enemyY);if(r.enemyY>1)jumped=true;assert.ok(!api.intersects(api.bodyBox(r.enemyX,r.enemyY,p.enemySize),{...p.obs[0],y:0}),`Enemy clips obstacle ${size}/${speed} at ${r.enemyX}/${r.enemyY}`);}
 assert.ok(jumped);assert.ok(peak>p.obs[0].h);assert.ok(r.enemyX>170+size,`Enemy failed to pass ${size}/${speed}`);
}
const p=api.def();p.bonusCount=2;api.setup(p);api.syncTasks();p.obs[0].x=225;p.obs[0].y=90;p.bonuses[0]={x:580,y:250};p.obstacleSize=140;api.syncObstacles();assert.equal(p.obs[0].x,225);assert.equal(p.obs[0].y,90);assert.equal(p.obs[0].w,140);assert.equal(p.bonuses[0].y,250);
const restored=api.normalize(JSON.parse(JSON.stringify(p)));api.setup(restored);api.syncTasks();assert.equal(api.getP().obs[0].y,90);assert.equal(api.bonusAt(0).x,580);
// Actual pointer handlers: click selects, drag writes game coordinates, cancel restores.
api.setup(api.def());api.syncTasks();api.stub();api.editorInteractions();
const target={closest:s=>s==='[data-object]'?el('hero'):null};const evt=(x,y,type='pointermove')=>({pointerId:1,button:0,clientX:x,clientY:y,target,preventDefault(){},type});
gameListeners.get('pointerdown')(evt(240,400,'pointerdown'));assert.equal(api.select(),'hero');assert.ok(el('hero').classList.contains('object-selected'));
gameListeners.get('pointermove')(evt(340,280));assert.equal(api.worldPoint('hero').x,320);assert.equal(api.worldPoint('hero').y,120);gameListeners.get('pointerup')(evt(340,280,'pointerup'));
await api.persist();const stored=JSON.parse(saved.get('dogoniProject'));assert.equal(stored.starts.hero.x,320);assert.equal(stored.starts.hero.y,120);
gameListeners.get('pointerdown')(evt(340,280,'pointerdown'));gameListeners.get('pointermove')(evt(400,200));gameListeners.get('pointercancel')(evt(400,200,'pointercancel'));assert.equal(api.worldPoint('hero').x,320);assert.equal(api.worldPoint('hero').y,120);
// Touch is handled through the same Pointer Events path, without a mouse button.
const touch=evt(340,280,'pointerdown');delete touch.button;touch.pointerType='touch';gameListeners.get('pointerdown')(touch);gameListeners.get('pointermove')(evt(-1000,-1000));assert.equal(api.worldPoint('hero').x,0);assert.equal(api.worldPoint('hero').y,376);gameListeners.get('pointerup')(evt(-1000,-1000,'pointerup'));
el('resetObject').onclick();assert.equal(api.worldPoint('hero').x,220);assert.equal(api.worldPoint('hero').y,0);
// Styling applies to live DOM properties, and UI placements use relative slide coordinates.
const styled=api.getP();styled.hudStyle.hLives={scale:150,bg:'#123456',color:'#fedcba'};styled.controlStyle={shape:'square',size:52,bg:'#abcdef',color:'#112233',jumpBg:'#aa2233',jumpColor:'#ffffff'};styled.uiPositions.hLives={x:.5,y:.5};api.applyAppearance();assert.equal(el('hLives').style.background,'#123456');assert.equal(el('hLives').style.fontSize,'18px');assert.equal(el('hLives').style.left,'350px');assert.equal(buttons[0].style.borderRadius,'2px');assert.equal(buttons[0].style.width,'52px');assert.equal(buttons[3].style.background,'#aa2233');
const uiTarget={closest:s=>s==='[data-object]'?el('hLives'):null};gameListeners.get('pointerdown')({...evt(10,10,'pointerdown'),target:uiTarget});gameListeners.get('pointermove')({...evt(210,110),target:uiTarget});gameListeners.get('pointerup')({...evt(210,110,'pointerup'),target:uiTarget});assert.ok(styled.uiPositions.hLives.x>0);assert.ok(styled.uiPositions.hLives.y>0);
game.clientWidth=1000;api.applyAppearance();assert.equal(el('hLives').style.left,styled.uiPositions.hLives.x*900+'px','Relative HUD placement adapts to new slide width');game.clientWidth=800;
const copied=api.normalize(JSON.parse(JSON.stringify(styled)));assert.equal(copied.hudStyle.hLives.scale,150);assert.equal(copied.controlStyle.shape,'square');assert.equal(copied.uiPositions.hLives.x,styled.uiPositions.hLives.x);
assert.equal(mathAPI.splitOptions('$\\begin{cases}x=1\\\\\ny=2\\end{cases}$\n$\\frac{1}{2}$').length,2,'Multiline system stays one answer option');
console.log(`PASS: ${formulas.length} PDF formulas, safe rendering, numeric answers, enemy jumps, pointer/touch placement, persistence, HUD/control styles`);

// Auto-jumping also works on the enemy's raised track and lands back on it.
for(const floor of [65,180]){
 const project=api.def();project.starts.enemy.y=floor;project.enemySpeed=2.5;project.obs=[{x:170,y:floor,w:160,h:147}];const state={enemyX:40,enemyY:floor,enemyVy:0,enemyJumpVx:0};api.setup(project,state);let peak=floor;
 for(let i=0;i<1800;i++){api.advanceEnemy(1/120);peak=Math.max(peak,state.enemyY);assert.ok(state.enemyY>=floor);assert.ok(!api.intersects(api.bodyBox(state.enemyX,state.enemyY,project.enemySize),project.obs[0]));}
 assert.ok(peak>floor+147);assert.ok(state.enemyX>330);assert.equal(state.enemyY,floor);
}
console.log('PASS: enemy clears elevated obstacles and lands on its chosen level');

// Dragging a half-size preview still edits logical scene coordinates, not screen pixels.
api.setup(api.def());api.setCam(0);api.syncTasks();game.clientWidth=800;game.clientHeight=480;
game.getBoundingClientRect=()=>({left:10,top:20,width:400,height:240});
el('hero').getBoundingClientRect=()=>({left:120,top:208,width:52,height:52});
gameListeners.get('pointerdown')(evt(130,220,'pointerdown'));gameListeners.get('pointermove')(evt(180,190));gameListeners.get('pointerup')(evt(180,190,'pointerup'));
assert.equal(api.worldPoint('hero').x,320);assert.equal(api.worldPoint('hero').y,60);
const hudTarget={closest:s=>s==='[data-object]'?el('hLives'):null};el('hLives').getBoundingClientRect=()=>({left:20,top:30,width:50,height:20});
gameListeners.get('pointerdown')({...evt(30,40,'pointerdown'),target:hudTarget});gameListeners.get('pointermove')({...evt(80,70),target:hudTarget});gameListeners.get('pointerup')({...evt(80,70,'pointerup'),target:hudTarget});
assert.ok(Math.abs(api.getP().uiPositions.hLives.x-120/700)<1e-9);assert.ok(Math.abs(api.getP().uiPositions.hLives.y-80/440)<1e-9);
console.log('PASS: scaled pointer placement for actors and HUD');
