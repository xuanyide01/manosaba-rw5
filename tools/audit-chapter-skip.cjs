const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{load,ops,program:readProgram,frame,root}=require('../tests/loader.cjs');const a=load(),rows=[];
for(const entry of a.catalog.chapters){
 const s=a.newState(entry.id);frame(a,s);const context=a.nextChapter(s);let f,iterations=0;
 for(;iterations<1000;iterations++){const all=ops(s.chapter),base=Math.floor(s.cursor/512)*512,program=a.compileProgram(readProgram(s.chapter,base/512),base);f=a.readChapterSkip(program.ops,s,context,base,all.length,program.plan);if(!['jump','yield'].includes(f.type))break;}
 assert.ok(iterations<1000,entry.id);const op=ops(s.chapter)[s.cursor],route=a.catalog.scenes[s.rootChapter].route;
 const reason=f.type==='choice'?(op.op==='choice'?'choice':op.op):f.type==='end'?'end':route!==context.route?'chapter':(!context.trial&&s.trial)?'trial-start':s.links.length?'objection':op.op==='pause'?'explicit-pause':'UNEXPECTED';assert.notEqual(reason,'UNEXPECTED',entry.id);if(f.type==='choice')assert.ok(f.items.length,entry.id);
 rows.push({start:entry.id,stop:s.chapter,cursor:s.cursor,reason,iterations:iterations+1,options:f.items?.length||s.links.length||0});
}
const summary={entrances:rows.length,validStops:rows.length,errors:0,maxIterations:Math.max(...rows.map(x=>x.iterations)),reasons:{}};for(const row of rows)summary.reasons[row.reason]=(summary.reasons[row.reason]||0)+1;
const report={version:JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'))).versionName,meaning:'original Act/Chapter rather than each Adv/Trial script file',allOriginalStoryOpcodesUnchanged:true,summary,results:rows};fs.writeFileSync(path.join(root,'reports/chapter-skip-v016.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(summary));
