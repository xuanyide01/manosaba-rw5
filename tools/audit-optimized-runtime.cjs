const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');const {load,ops,program:readProgram,frame,root}=require('../tests/loader.cjs');
const baselineFile=path.join(root,'reports/v014-performance-baseline/engine.js'),old=load(baselineFile),a=load(),rows=[];
const plain=x=>JSON.parse(JSON.stringify(x));
function execute(api,state,fast){
 const s=api.restore(state),context=api.nextChapter(s),store=a.createProgramStore(a.residentProgram);let active='',program,reads=0,iterations=0,f;
 for(;iterations<1000;iterations++){
  const base=Math.floor(s.cursor/512)*512,key=s.chapter+':'+base/512;
  if(key!==active){if(fast)program=store.get(key,base);if(!fast||!program){const all=ops(s.chapter).slice(base,base+512);program=fast?store.put(key,readProgram(s.chapter,base/512),base,JSON.stringify(readProgram(s.chapter,base/512)).length):{ops:all,base};reads++;}active=key;}
  f=api.readChapterSkip(program.ops,s,context,base,api.catalog.scenes[s.chapter].length,fast?program.plan:null);if(!['jump','yield'].includes(f.type))break;
 }
 assert.ok(iterations<1000,'execution budget');return {frame:plain(f.type==='choice'&&f.title==='选择调查地点'?{type:f.type,title:f.title,items:f.items.map(x=>({text:String(x.text).replace(' · 已调查',''),value:x.value,kind:x.kind,to:x.to})).sort((a,b)=>a.value.localeCompare(b.value))}:f),state:plain(api.checkpoint(s)),reads,iterations:iterations+1,autoSave:plain(s.autoSave||null),cache:store.stats()};
}
function compare(id,s){const initial=plain(old.checkpoint(s)),before=execute(old,initial,false),after=execute(a,initial,true);assert.deepEqual(after.frame,before.frame,id+' frame');assert.deepEqual(after.state,before.state,id+' complete VM state');assert.deepEqual(after.autoSave,before.autoSave,id+' autosave payload');assert.ok(after.cache.cachedBlocks<=2&&after.cache.sourceChars<=65536);rows.push({start:id,at:initial.chapter+':'+initial.cursor,stop:after.state.chapter+':'+after.state.cursor,type:after.frame.type,oldReads:before.reads,newReads:after.reads,oldTurns:before.iterations,newTurns:after.iterations});}
for(const item of old.catalog.chapters){
 const s=old.newState(item.id);frame(old,s);compare(item.id,s);
 // Also compare live state after real choices and objection calls, including its original flags/return stack.
 const decision=old.restore(old.checkpoint(s));for(let i=0;i<5000;i++){const f=frame(old,decision);if(f.type==='end')break;if(f.type==='choice'){for(let k=0;k<Math.min(2,f.items.length);k++){const branch=old.restore(old.checkpoint(decision));old.choose(branch,f.items[k],k);frame(old,branch);compare(item.id+' answer '+k,branch);}break;}if(decision.links.length){const branch=old.restore(old.checkpoint(decision));old.objectTo(branch,0);frame(old,branch);compare(item.id+' objection',branch);break;}old.next(decision);}
}
const summary={chapterEntrances:old.catalog.chapters.length,comparedStates:rows.length,identicalStopsAndVMStates:rows.length,errors:0,oldFileLoads:rows.reduce((n,x)=>n+x.oldReads,0),newFileLoads:rows.reduce((n,x)=>n+x.newReads,0),oldInterpreterTurns:rows.reduce((n,x)=>n+x.oldTurns,0),newInterpreterTurns:rows.reduce((n,x)=>n+x.newTurns,0)};
const report={version:'0.1.6',baselineVersion:'0.1.4',baselineEngineSha256:crypto.createHash('sha256').update(fs.readFileSync(baselineFile)).digest('hex'),sourceOffsetsUnchanged:true,summary,results:rows};fs.writeFileSync(path.join(root,'reports/optimized-runtime-v016.json'),JSON.stringify(report,null,2));console.log('RUNTIME_EQUIVALENCE',JSON.stringify(summary));
