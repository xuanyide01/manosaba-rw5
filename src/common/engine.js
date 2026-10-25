import {catalog} from './catalog.js';
import {evaluate,assign} from './expressions.js';
import {backgroundAsset,portraitAsset,bookImages} from './assets.js';
import {modifyBackground,modifyCharacter,setSceneVisibility,hideScene,applySceneMoves,sceneBodies} from './scene.js';
let bookCatalog={};
export function setBookCatalog(value){bookCatalog=value;}
function clone(o){return JSON.parse(JSON.stringify(o));}
export function newState(chapter,story){const id=chapter||catalog.initial;return {chapter:id,rootChapter:id,cursor:0,background:'',regularBackground:'',body:'',bodies:[],sprites:{},focus:'',speaker:'',text:'',links:[],pending:[],choices:[],history:[],variables:{maxHp:10,currentHp:10,isDebugDirectJump:!story,g_pi:Math.PI,hasWitchBook:true},book:{},stack:[],ended:false,progression:story?'story':'chapter',sceneVersion:2,initialBook:true,trial:/_Trial\d/.test(id)};}
export function checkpoint(s){const o=Object.assign({},s);delete o.history;delete o.autoSave;return clone(o);}
export function restore(saved){
 if(!saved||!catalog.scenes[String(saved.chapter)]||!Number.isInteger(saved.cursor)||saved.cursor<0||saved.cursor>=catalog.scenes[String(saved.chapter)].length)throw Error('存档位置无效');
 if(!saved.variables||typeof saved.variables!=='object'||Array.isArray(saved.variables)||!Array.isArray(saved.bodies)||saved.bodies.length>3||!Array.isArray(saved.stack)||saved.stack.length>32||!saved.book)throw Error('存档状态无效');
 for(const item of saved.stack)if(!catalog.scenes[item.chapter]||!Number.isInteger(item.cursor)||item.cursor<0||item.cursor>=catalog.scenes[item.chapter].length)throw Error('存档返回位置无效');
 return Object.assign(newState(),clone(saved),{history:[],legacyVisuals:!saved.sceneVersion});
}
function remember(s){s.history.push(checkpoint(s));if(s.history.length>6)s.history.shift();}
function jump(s,t,call){
 if(t&&t.expr!==undefined){const x=t.expr.replace(/\{([A-Za-z_0-9]+)\}/g,(_,v)=>String(s.variables[v]||''));t=[x.split('/').pop(),0];}
 if(!Array.isArray(t)||!catalog.scenes[t[0]]||!Number.isInteger(t[1])||t[1]<0||t[1]>=catalog.scenes[t[0]].length)throw Error('剧情跳转位置无效');
 if(call){if(s.stack.length>=32)throw Error('剧情调用过深');s.stack.push({chapter:s.chapter,cursor:s.cursor+1});}
 s.chapter=t[0];s.cursor=t[1];s.pending=[];s.choiceBlock=null;
 if(!/^System_/.test(s.chapter)&&!/_TrialInit$/.test(s.chapter)){s.rootChapter=s.chapter;s.trial=/_Trial\d/.test(s.chapter);}
 s.ended=false;
}
function frameText(s,o){
 s.speaker=o.speaker;s.text=o.text;s.links=o.links||[];
 sceneBodies(s,o);
 return {type:'text',speaker:s.speaker,text:s.text,links:s.links,debate:o.debate};
}
export function bookEntries(s,categories){const rows=[];for(const key of Object.keys(s.book)){const split=key.indexOf(':'),category=key.slice(0,split),id=key.slice(split+1);if(categories&&categories.indexOf(category)<0)continue;const version=s.book[key],data=bookCatalog[key+':'+version];if(data)rows.push(Object.assign({},data,{key}));}return rows;}
function interaction(s,o,prepared){
 if(o.op==='choice'){
  const menu=s.chapter+':'+(o.menu===undefined?s.cursor:o.menu),pending=s.pending.filter(x=>x.menu===menu);
  let items=pending.length?pending:(o.items||[]).filter(x=>!x.lock&&(x.when||[]).every(expr=>typeof expr==='boolean'?expr:evaluate(expr,s.variables)));
  if(!items.length&&o.items===undefined&&s.activeChoices&&s.activeChoices.chapter===s.chapter&&s.activeChoices.cursor===s.cursor)items=s.activeChoices.items;
  s.activeChoices={chapter:s.chapter,cursor:s.cursor,menu,items:clone(items)};
  return {type:'choice',title:'作出选择',items:items.map(x=>Object.assign({},x))};
 }
 if(o.op==='map'){
  const flag=o.flag?Number(s.variables[o.flag]||0):0,mask=flag&((1<<o.areas.length)-1);
  if(prepared)return {type:'choice',title:'选择调查地点',items:prepared.orders[mask].map(j=>{const item=prepared.items[j],visited=!!(mask&(1<<j));return Object.assign({},item,{text:visited?item.visitedText:item.text,visited});})};
  const fresh=[],visited=[];o.areas.forEach((id,i)=>{const done=!!(mask&(1<<i));(done?visited:fresh).push({text:(catalog.areas[id]||id)+(done?' · 已调查':''),value:id,kind:'map',to:s.cursor+1,sourceIndex:i,visited:done});});return {type:'choice',title:'选择调查地点',items:fresh.concat(visited)};
 }
 if(o.op==='evidence'){const items=bookEntries(s,o.categories).map(x=>({text:x.name,value:x.id,kind:'evidence',detail:x.text,category:x.category,to:s.cursor+1}));if(!items.length)throw Error('当前没有可提交的证据，请先完成调查');return {type:'choice',title:'提交证据',items};}
 if(o.op==='execution')return {type:'choice',title:'处刑确认',items:[{text:'按下处刑按钮',kind:'continue',to:s.cursor+1}]};
 return null;
}
export function readFrame(ops,s,base,total,plan){
 base=base||0;total=total===undefined?ops.length:total;
 for(let n=0;n<96;n++){
  if(s.ended)return {type:'end',kind:s.endingKind||'end'};
  if(s.cursor>=total){s.ended=true;return {type:'end'};}
  if(s.choiceBlock&&s.choiceBlock.chapter===s.chapter&&s.cursor===s.choiceBlock.end){s.cursor=s.choiceBlock.continuation;s.choiceBlock=null;}
  const i=s.cursor-base;if(i<0||i>=ops.length)return {type:'yield'};const o=ops[i];
  applySceneMoves(s,o.moves);
  if(o.op==='text')return frameText(s,o);
  const choice=interaction(s,o,plan&&plan.maps&&plan.maps[i]);if(choice){if(!choice.items.length)throw Error('当前选项为空');return choice;}
  if(o.op==='bg'){modifyBackground(s,o);s.cursor++;}
  else if(o.op==='char'){modifyCharacter(s,o);s.cursor++;}
  else if(o.op==='visibility'){setSceneVisibility(s,o.actors,o.visible);s.cursor++;}
  else if(o.op==='hideAll'){hideScene(s,o.all);s.cursor++;}
  else if(o.op==='focus'){s.focus=o.actor;s.cursor++;}
  else if(o.op==='offer'){if(!o.lock){const menu=s.chapter+':'+o.menu;s.pending=s.pending.filter(x=>!(x.menu===menu&&x.to===s.cursor+1));s.pending.push({text:o.text,to:s.cursor+1,end:o.after,kind:'branch',menu});}s.cursor=o.after;}
  else if(o.op==='if'){const value=typeof o.expr==='boolean'?o.expr:evaluate(o.expr,s.variables);s.cursor=value?s.cursor+1:o.to;}
  else if(o.op==='set'){assign(o.expr,s.variables);s.cursor++;}
  else if(o.op==='flag'){s.variables[o.variable]=(Number(s.variables[o.variable])||0)|(1<<o.number);s.cursor++;}
  else if(o.op==='jump'||o.op==='call'){jump(s,o.target,o.op==='call');return {type:'jump'};}
  else if(o.op==='resetBook'){if(!o.onlyDirect||s.initialBook||s.variables.isDebugDirectJump){s.initialBook=false;jump(s,o.target,true);return {type:'jump'};}s.cursor++;}
  else if(o.op==='return'){const t=s.stack.pop();if(!t){s.cursor++;continue;}s.chapter=t.chapter;s.cursor=t.cursor;s.pending=[];return {type:'jump'};}
  else if(o.op==='cancelCall'){s.stack.pop();s.cursor++;}
  else if(o.op==='bookClear'){s.book={};s.cursor++;}
  else if(o.op==='bookUpdate'){const key=o.category+':'+o.id;if(o.version<=0)delete s.book[key];else s.book[key]=o.version;s.cursor++;}
  else if(o.op==='recordChoice'){s.variables['correctChoice'+o.number]=true;s.cursor++;}
  else if(o.op==='damage'){s.variables.currentHp=Number(s.variables.currentHp||10)-1;if(s.variables.currentHp<=0){s.ended=true;s.endingKind='trialFail';return {type:'end',kind:'trialFail'};}s.cursor++;}
  else if(o.op==='clueImage'){const image=bookImages['Clue:'+o.id];if(image){s.clueBackground=s.background;s.clueImage=image;s.background=image;s.bodies=[];}s.cursor++;}
  else if(o.op==='clueHide'){s.clueImage='';s.background=s.clueBackground||s.regularBackground;s.clueBackground='';s.cursor++;}
  else if(o.op==='autosave'){s.cursor++;s.autoSave=checkpoint(s);}
  else if(o.op==='pause'){s.text=o.text||'点击继续';s.speaker='';s.links=[];return {type:'text',text:s.text,speaker:''};}
  else if(o.op==='stop'||o.op==='end'){s.ended=true;s.endingKind=o.kind||'end';return {type:'end',kind:s.endingKind};}
  else throw Error('未知剧情指令：'+o.op);
 }
 return {type:'yield'};
}
export function next(s){if(s.ended)return;remember(s);s.cursor++;s.links=[];}
export function choose(s,item,index){
 if(!item||!Number.isInteger(item.to)||item.to<0||item.to>=catalog.scenes[String(s.chapter)].length)throw Error('选项无效');
 remember(s);s.choices.push(item.kind==='map'&&Number.isInteger(item.sourceIndex)?item.sourceIndex:index);if(s.choices.length>256)s.choices.shift();s.pending=[];
 if(item.kind==='map')s.variables.chosenAreaId=item.value;
 if(item.kind==='evidence')s.variables.chosenEvidenceId=item.value;
 if(item.kind==='branch')s.choiceBlock={chapter:s.chapter,end:item.end,continuation:s.cursor+1};
 s.cursor=item.to;s.ended=false;
}
export function objectTo(s,index){const link=s.links[index];if(!link)throw Error('反驳位置无效');remember(s);jump(s,link.target,true);}
export function previous(s){const last=s.history.pop();if(!last)return false;const history=s.history;Object.assign(s,last,{history});return true;}
// Follow original control flow across daily scenes, stopping at a real chapter or interaction.
// The context is transient; saved VM positions and all 30 slot keys stay unchanged.
export function nextChapter(s){if(s.ended)return null;remember(s);const info=catalog.scenes[s.rootChapter]||catalog.scenes[s.chapter];return {chapter:s.rootChapter,route:info.route,trial:!!s.trial};}
export function readChapterSkip(ops,s,context,base,total,plan){
 for(let n=0;n<64;n++){
  const f=readFrame(ops,s,base,total,plan);if(f.type!=='text'){if(f.type==='choice'||f.type==='end')context.reason=f.type;return f;}
  const info=catalog.scenes[s.rootChapter],i=s.cursor-(base||0),current=ops[i];
  const reason=(!context.trial&&s.trial)?'trial':(info&&info.route>=0&&info.route!==context.route)?'chapter':s.links.length?'objection':(current&&current.op==='pause')?'pause':'';
  if(reason){context.reason=reason;return f;}
  const end=plan&&plan.textEnds?(plan.textEnds.charCodeAt(i)-1024):0;
  if(end>i+1){frameText(s,ops[end-1]);s.cursor=(base||0)+end;}else s.cursor++;
 }
 return {type:'yield'};
}
export function previewMap(){return [];}
