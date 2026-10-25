const test=require('node:test'),assert=require('node:assert/strict'),path=require('path');const {load,ops,program,frame,root}=require('./loader.cjs'),a=load(),plain=x=>JSON.parse(JSON.stringify(x));
test('text-run index never spans original choices, moves, pauses or objection keywords',()=>{
 const raw=[{op:'text',text:'a'},{op:'text',text:'b'},{op:'text',text:'move',moves:[{clearChoices:true}]},{op:'text',text:'c'},{op:'text',text:'link',links:[{text:'objection'}]},{op:'pause'},{op:'text',text:'d'},{op:'text',text:'e'}],p=a.compileProgram(require('../tools/prepare-runtime.cjs').prepareProgram(raw,'test',512,{}),512);assert.deepEqual(Array.from(p.plan.textEnds,x=>x.charCodeAt(0)-1024),[2,2,0,0,0,0,8,8]);assert.equal(p.base,512);assert.strictEqual(p.ops,raw);
});
test('resident helper programs exactly equal all original source blocks',()=>{
 for(const id of ['System_Subroutine','System_ResetWitchBook']){const all=ops(id);for(let base=0;base<all.length;base+=512)assert.deepEqual(plain(a.residentProgram(id+':'+base/512).ops),all.slice(base,base+512));}
});
test('LRU cache remains bounded and shared calls cannot evict the caller',()=>{
 const store=a.createProgramStore(a.residentProgram),raw=[{op:'text',text:'hello'}];const caller=store.put('caller:0',raw,0,32000);store.get('System_Subroutine:0',0);assert.strictEqual(store.get('caller:0',0),caller);for(let i=0;i<10000;i++){store.put('scene'+i+':0',raw,0,32000);const n=store.stats();assert.ok(n.cachedBlocks<=2&&n.sourceChars<=65536);}assert.equal(store.stats().cachedBlocks,2);store.clear();assert.equal(store.stats().cachedBlocks,0);assert.equal(store.stats().residentBlocks,0);assert.equal(store.stats().sourceChars,0);
});
test('fast compiled text runs preserve real save positions, state and source return stacks',()=>{
 const old=load(path.join(root,'reports/v014-performance-baseline/engine.js'));
 function run(api,s,fast){const ctx=api.nextChapter(s);for(let i=0;i<1000;i++){const all=ops(s.chapter),base=Math.floor(s.cursor/512)*512,part=all.slice(base,base+512),p=a.compileProgram(program(s.chapter,base/512),base),f=api.readChapterSkip(part,s,ctx,base,all.length,fast?p.plan:null);if(!['yield','jump'].includes(f.type))return f;}throw Error('budget');}
 for(const id of ['Act01_Chapter01_Adv01','Act01_Chapter01_Adv34','Act01_Chapter01_Adv36','Act01_Chapter01_Trial00']){const start=old.newState(id);frame(old,start);const s=old.restore(old.checkpoint(start)),t=a.restore(old.checkpoint(start));assert.deepEqual(plain(run(old,s,false)),plain(run(a,t,true)));assert.deepEqual(plain(old.checkpoint(s)),plain(a.checkpoint(t)));}
});
