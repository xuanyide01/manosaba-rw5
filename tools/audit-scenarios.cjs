// Explore actual converted branches, preserving interpreter state and variables.
const fs=require('fs'),path=require('path'),{load,ops,frame,root}=require('../tests/loader.cjs');
const a=load();
function checkpoint(s){const value=a.checkpoint(s);value.choices=[];value.text='';value.speaker='';delete value.autoSave;return value;}
function signature(s){return JSON.stringify([s.chapter,s.cursor,s.variables,s.book,s.stack,s.pending]);}
function run(start,limit=3000,initial){
 initial=initial||a.newState(start);const queue=[{state:checkpoint(initial),decisions:[]}],seen=new Set();let errors=[],nodes=0,best=null;
 while(queue.length&&nodes<limit){
  const entry=queue.shift(),s=a.restore(entry.state);s.history=[];let f,breakout=false;
  try{
   for(let step=0;step<5000;step++){
    f=frame(a,s);
    if(s.rootChapter!==start&&/_(Adv|Trial)\d+$/.test(s.rootChapter)){best={scene:s.rootChapter,decisions:entry.decisions,state:checkpoint(s)};breakout=true;break;}
    if(f.type==='end'){if(f.kind==='clear'){best={ending:f.kind,decisions:entry.decisions,state:checkpoint(s)};breakout=true;}break;}
    const key=signature(s);if(seen.has(key))break;seen.add(key);
    if(f.type==='choice'){
     f.items.map((item,index)=>({item,index})).sort((x,y)=>Number(x.item.text.includes('已调查'))-Number(y.item.text.includes('已调查'))).forEach(({item,index})=>{const n=a.restore(checkpoint(s));a.choose(n,item,index);queue.push({state:checkpoint(n),decisions:entry.decisions.concat([{scene:s.chapter,cursor:s.cursor,type:'choice',index,text:item.text,value:item.value}])});});break;
    }
    if(s.links.length){
     s.links.forEach((link,index)=>{const n=a.restore(checkpoint(s));a.objectTo(n,index);queue.push({state:checkpoint(n),decisions:entry.decisions.concat([{scene:s.chapter,cursor:s.cursor,type:'objection',index,text:link.text}])});});
    }
    s.cursor++;
   }
  }catch(e){errors.push({at:s.chapter+':'+s.cursor,error:e.message});}
  nodes++;if(breakout)break;
 }
 return {start,nodes,states:seen.size,queued:queue.length,complete:!!best,result:best,errors};
}
if(require.main===module){
 if(process.argv.includes('--continuous')){
  let s=a.newState(a.catalog.initial,true),steps=[];
  for(let i=0;i<1000;i++){
   const result=run(s.rootChapter,10000,s);steps.push({start:result.start,nodes:result.nodes,complete:result.complete,errors:result.errors,scene:result.result&&result.result.scene,ending:result.result&&result.result.ending,decisions:result.result&&result.result.decisions});
   console.log(i,result.start,result.complete?'OK':'UNRESOLVED',result.result&&result.result.scene,result.nodes);
   if(result.complete)s=a.restore(result.result.state);
   if(!result.complete||result.result.ending)break;
  }
  fs.writeFileSync(path.join(root,'reports/continuous-playthrough.json'),JSON.stringify({steps,finalState:checkpoint(s)},null,2));
  console.log('CONTINUOUS',steps.length,steps[steps.length-1].ending);
 }else{
  const names=a.catalog.chapters.map(x=>x.id);let report=[];
  for(const id of names){const result=run(id);if(result.result)delete result.result.state;report.push(result);console.log(id,result.complete?'OK':'UNRESOLVED',result.nodes,result.errors.length,result.result&&result.result.scene);}
  fs.writeFileSync(path.join(root,'reports/scenario-exploration.json'),JSON.stringify(report,null,2));
  console.log('SUMMARY',JSON.stringify({scenes:report.length,complete:report.filter(x=>x.complete).length,errors:report.filter(x=>x.errors.length).length}));
 }
}
module.exports={run};
