/* LaTeX subset used by Shpargalka.pdf, rendered as native MathML. No eval or network. */
(()=>{'use strict';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols={times:'×',cdot:'·',div:'÷',pm:'±',neq:'≠',ne:'≠',leq:'≤',le:'≤',geq:'≥',ge:'≥',infty:'∞',pi:'π',approx:'≈',to:'→',rightarrow:'→',angle:'∠',triangle:'△',parallel:'∥',perp:'⊥',circ:'∘',sum:'∑',alpha:'α',beta:'β',gamma:'γ',delta:'δ',theta:'θ',lambda:'λ',mu:'μ',sigma:'σ',omega:'ω'};
const tag=(name,body,attrs='')=>'<'+name+attrs+'>'+body+'</'+name+'>';
function latex(source){
 if(source.length>12000)throw Error('Формула слишком длинная');
 let i=0,depth=0;
 const skip=()=>{while(/\s/.test(source[i]||'')&&i<source.length)i++;};
 function rawGroup(){skip();if(source[i++]!=='{')throw Error('Нужны фигурные скобки');let start=i,n=1;while(i<source.length&&n){if(source[i]==='{')n++;if(source[i]==='}')n--;i++;}if(n)throw Error('Закройте фигурные скобки');return source.slice(start,i-1);}
 function group(){skip();if(source[i]==='{'){i++;const r=row('}');if(source[i++]!=='}')throw Error('Закройте фигурные скобки');return r;}return atom();}
 function atom(){skip();if(++depth>80)throw Error('Слишком много вложенных скобок');try{
   const c=source[i++];if(!c)throw Error('Незаконченная формула');if(c==='{'){i--;return group();}if(c==='}')throw Error('Лишняя закрывающая скобка');
   if(c==='\\'){
    const m=/^[A-Za-z]+/.exec(source.slice(i));const cmd=m?m[0]:source[i++];if(m)i+=cmd.length;
    if(cmd==='frac'||cmd==='dfrac'||cmd==='tfrac')return tag('mfrac',group()+group());
    if(cmd==='sqrt'){skip();let index='';if(source[i]==='['){i++;index=row(']');if(source[i++]!==']')throw Error('Закройте индекс корня');}const value=group();return index?tag('mroot',value+index):tag('msqrt',value);}
    if(cmd==='text'||cmd==='mathrm')return tag('mtext',escape(rawGroup()).replace(/ /g,'&#160;'));
    if(cmd==='overline')return tag('mover',group()+tag('mo','¯',' stretchy="true"'),' accent="true"');
    if(cmd==='left'||cmd==='right'){skip();let d=source[i++];if(d==='\\')d=source[i++];return d==='.'?tag('mrow',''):tag('mo',escape(d),' stretchy="true"');}
    if(cmd==='begin'){const env=rawGroup();if(env!=='cases')throw Error('Поддерживается окружение cases');const end=source.indexOf('\\end{cases}',i);if(end<0)throw Error('Добавьте \\end{cases}');const rows=source.slice(i,end).split(/\\\\/);i=end+11;return tag('mrow',tag('mo','{',' stretchy="true"')+tag('mtable',rows.map(r=>tag('mtr',r.split('&').map(cell=>tag('mtd',latex(cell))).join(''))).join(''),' columnalign="left"'));}
    if(cmd==='lim'||['sin','cos','tan','log','ln'].includes(cmd))return tag('mi',cmd,' mathvariant="normal"');
    if(Object.hasOwn(symbols,cmd))return tag(cmd==='pi'?'mi':'mo',symbols[cmd]);
    if(['%', '{','}','|','_','$'].includes(cmd))return tag('mo',escape(cmd));
    if([',',';','!',' '].includes(cmd)||cmd==='quad')return '<mspace width="0.25em"></mspace>';
    throw Error('Неизвестная команда: \\'+cmd);
   }
   if(/[0-9]/.test(c)){const m=/^[0-9]*(?:[.,][0-9]+)?/.exec(source.slice(i))[0];i+=m.length;return tag('mn',c+m);}
   if(/[a-zа-яё]/i.test(c))return tag('mi',escape(c));
   if(c==='^'||c==='_')throw Error('Перед степенью или индексом нужна буква либо число');
   return tag('mo',escape(c));
 }finally{depth--;}}
 function row(end){let out='';skip();while(i<source.length&&source[i]!==end){let base=atom(),sub='',sup='';skip();while(source[i]==='_'||source[i]==='^'){const op=source[i++];if(op==='_'){if(sub)throw Error('Повторный индекс');sub=group();}else{if(sup)throw Error('Повторная степень');sup=group();}skip();}const limits=base.includes('∑')||base.includes('>lim<');if(sub&&sup)base=tag(limits?'munderover':'msubsup',base+sub+sup);else if(sub)base=tag(limits?'munder':'msub',base+sub);else if(sup)base=tag(limits?'mover':'msup',base+sup);out+=base;skip();}return tag('mrow',out);}
 return row();
}
function formula(tex,display=false){try{return '<math xmlns="http://www.w3.org/1998/Math/MathML" display="'+(display?'block':'inline')+'" aria-label="'+escape(tex)+'">'+latex(tex)+'</math>';}catch(e){return '<span class="math-error" title="'+escape(e.message)+'">'+escape(tex)+' <small>⚠ '+escape(e.message)+'</small></span>';}}
function render(value){const s=String(value??'');const re=/\$\$([\s\S]+?)\$\$|(?<!\\)\$([^$]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;let out='',last=0,found=false,m;while((m=re.exec(s))){found=true;out+=escape(s.slice(last,m.index))+formula(m[1]??m[2]??m[3]??m[4],!!(m[1]||m[4]));last=re.lastIndex;}if(found)return out+escape(s.slice(last));if(/\\[A-Za-z]+|[a-z0-9][_^]/i.test(s)&&!/[А-Яа-яЁё]{3,}/.test(s.replace(/\\text\{[^}]*\}/g,'')))return formula(s);return escape(s).replace(/\\\$/g,'$');}
function strip(s){return String(s).trim().replace(/^\$\$?|\$\$?$/g,'').replace(/^\\[([]|\\[)\]]$/g,'');}
function numeric(value){let s=strip(value).replace(/−/g,'-').replace(/×|·/g,'*').replace(/÷/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/,/g,'.').replace(/\\(?:left|right)/g,'');if(s.length>1000)return null;let i=0,depth=0;const ws=()=>{while(/\s/.test(s[i]||'')&&i<s.length)i++;};
 function atom(){ws();if(++depth>40)throw Error();try{if(s[i]==='+'||s[i]==='-'){const sign=s[i++];return(sign==='-'?-1:1)*atom();}if(s[i]==='('||s[i]==='{'){const end=s[i++]==='('?')':'}';const n=expression();ws();if(s[i++]!==end)throw Error();return n;}if(s.slice(i,i+5)==='\\frac'){i+=5;return atom()/atom();}if(s.slice(i,i+5)==='\\sqrt'){i+=5;ws();let n=2;if(s[i]==='['){i++;n=expression();ws();if(s[i++]!==']')throw Error();}const x=atom();return x<0&&Number.isInteger(n)&&n%2?-Math.pow(-x,1/n):Math.pow(x,1/n);}if(s.slice(i,i+3)==='\\pi'){i+=3;return Math.PI;}if(s[i]==='π'){i++;return Math.PI;}const m=/^(?:\d+(?:\.\d*)?|\.\d+)/.exec(s.slice(i));if(!m)throw Error();i+=m[0].length;return +m[0];}finally{depth--;}}
 function power(){ws();if(s[i]==='+'||s[i]==='-'){const sign=s[i++];return(sign==='-'?-1:1)*power();}let n=atom();ws();if(s[i]==='^'){i++;n=Math.pow(n,power());}return n;}
 function product(){let n=power();while(true){ws();let op=s[i];if(s.slice(i,i+6)==='\\times'){i+=6;op='*';}else if(s.slice(i,i+5)==='\\cdot'){i+=5;op='*';}else if(s.slice(i,i+4)==='\\div'){i+=4;op='/';}else if(op==='*'||op==='/')i++;else break;const v=power();n=op==='*'?n*v:n/v;}return n;}
 function expression(){let n=product();while(true){ws();const op=s[i];if(op!=='+'&&op!=='-')break;i++;const v=product();n=op==='+'?n+v:n-v;}return n;}
 try{let n=expression();ws();if(s.slice(i)==='\\%'||s.slice(i)==='%'){n/=100;i=s.length;}return i===s.length&&Number.isFinite(n)?n:null;}catch{return null;}}
function canonical(s){return strip(s).replace(/\\(?:left|right)/g,'').replace(/\\text\{([^}]*)\}/g,'$1').replace(/\\(?:times|cdot)/g,'*').replace(/\\div/g,'/').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\{([^{}])\}/g,'$1').replace(/\s+/g,'').toLocaleLowerCase();}
function equal(a,b){const x=numeric(a),y=numeric(b);if(x!==null&&y!==null)return Math.abs(x-y)<=1e-9*Math.max(1,Math.abs(x),Math.abs(y));return canonical(a)===canonical(b);}
function splitOptions(value){const s=String(value);let parts=[],start=0,mode='',braces=0,env=0;
 for(let i=0;i<s.length;i++){
  if(s.startsWith('\\begin{cases}',i))env++;
  if(s.startsWith('\\end{cases}',i))env=Math.max(0,env-1);
  if(s[i]==='$'&&s[i-1]!=='\\'){const token=s[i+1]==='$'?'$$':'$';if(!mode)mode=token;else if(mode===token)mode='';if(token==='$$')i++;}
  else if(s.startsWith('\\(',i)||s.startsWith('\\[',i)){mode=s.slice(i,i+2);i++;}
  else if(s.startsWith('\\)',i)&&mode==='\\('||s.startsWith('\\]',i)&&mode==='\\['){mode='';i++;}
  else if(s[i]==='{'&&s[i-1]!=='\\')braces++;
  else if(s[i]==='}'&&s[i-1]!=='\\')braces=Math.max(0,braces-1);
  else if(s[i]==='\n'&&!mode&&!braces&&!env){const part=s.slice(start,i).trim();if(part)parts.push(part);start=i+1;}
 }
 const last=s.slice(start).trim();if(last)parts.push(last);return parts;
}
window.DogoniMath={render,formula,latex,numeric,equal,splitOptions};
})();
