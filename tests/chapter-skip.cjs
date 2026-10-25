const test=require('node:test'),assert=require('node:assert/strict');
const {load,ops,frame}=require('./loader.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
function storyState(value){const s=plain(value);delete s.activeChoices;delete s.legacyVisuals;return s;}
function skip(a,s,size=512){const ctx=a.nextChapter(s);if(!ctx)return null;for(let i=0;i<1000;i++){const all=ops(s.chapter),base=Math.floor(s.cursor/size)*size,f=a.readChapterSkip(all.slice(base,base+size),s,ctx,base,all.length);if(!['jump','yield'].includes(f.type))return f;}throw Error('Skip budget exceeded');}
test('skip crosses daily script files and stops at the first ordinary choice with original flags intact',()=>{
 const a=load(),s=a.newState(undefined,true),manual=a.newState(undefined,true);frame(a,s);const before=plain(a.checkpoint(s)),f=skip(a,s);assert.equal(f.type,'choice');assert.equal(s.chapter,'Act01_Chapter01_Adv05');assert.equal(s.cursor,38);assert.equal(f.items.length,2);
 for(let i=0;i<1000;i++){const current=frame(a,manual);if(manual.chapter===s.chapter&&manual.cursor===s.cursor)break;assert.equal(current.type,'text');a.next(manual);}
 assert.deepEqual(plain(s.variables),plain(manual.variables));assert.deepEqual(plain(s.book),plain(manual.book));assert.deepEqual(plain(s.sprites),plain(manual.sprites));assert.deepEqual(plain(f.items),plain(frame(a,manual).items));assert.ok(a.previous(s));assert.deepEqual(storyState(a.checkpoint(s)),storyState(before));assert.equal(frame(a,s).text,before.text);
});
test('skip from daily story stops at the first trial opening before any objection is skipped',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Adv34');frame(a,s);const f=skip(a,s);assert.equal(f.type,'text');assert.equal(s.chapter,'Act01_Chapter01_Trial00');assert.equal(s.cursor,6);assert.equal(s.trial,true);assert.equal(f.text,'接下来，我们要从什么话题开始讨论呢？');
});
test('skip reaches the actual next chapter rather than its next daily scene',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Adv36');frame(a,s);const f=skip(a,s);assert.equal(f.type,'text');assert.equal(s.rootChapter,'Act01_Chapter02_Adv01');assert.equal(a.catalog.scenes[s.rootChapter].route,1);
});
test('act transition stops at new chapter and applies original progress unlock',()=>{
 const a=load(),s=a.newState('Act01_Chapter05_Adv11');frame(a,s);const f=skip(a,s);assert.equal(f.type,'text');assert.equal(s.rootChapter,'Act02_Chapter01_Adv01');assert.equal(s.variables.g_gameProgress,6);
});
test('skip within an existing trial crosses its opening and waits at the first objection keyword',()=>{
 const a=load(),s=a.newState('Act01_Chapter01_Trial00');frame(a,s);const f=skip(a,s);assert.equal(f.type,'text');assert.equal(s.chapter,'Act01_Chapter01_Trial01');assert.equal(s.cursor,19);assert.ok(s.links.length);const p=s.cursor;skip(a,s);assert.equal(s.cursor,p);
});
test('investigation, evidence submission and execution confirmation remain mandatory',()=>{
 const a=load();for(const [id,cursor,title] of [['Act01_Chapter01_Adv11',6,'选择调查地点'],['Act01_Chapter01_Trial04',150,'提交证据'],['Act01_Chapter01_Adv35',133,'处刑确认']]){
  const s=a.newState(id);frame(a,s);s.cursor=cursor;if(title==='提交证据')s.book['Clue:1-1']=1;const f=skip(a,s);assert.equal(f.type,'choice');assert.equal(f.title,title);assert.equal(s.cursor,cursor);assert.ok(f.items.length);
 }
});
test('explicit original click-to-continue pauses are not silently consumed',()=>{
 const a=load(),s=a.newState('Act01_Chapter05_Adv10');s.cursor=216;const f=skip(a,s);assert.equal(f.type,'text');assert.equal(f.text,'点击继续');assert.equal(s.cursor,216);a.next(s);const next=skip(a,s);assert.ok(next);assert.notEqual(s.cursor,216);
});
test('chunked skipping preserves original return stack, variables and visible scene',()=>{
 const a=load(),x=a.newState(undefined,true);frame(a,x);const y=a.restore(a.checkpoint(x));const f=skip(a,x,512),g=skip(a,y,7);assert.deepEqual(plain(f),plain(g));assert.deepEqual(storyState(a.checkpoint(x)),storyState(a.checkpoint(y)));const saved=a.createSave(x,'choice',1234),reloaded=a.decodeSave(JSON.stringify(saved));assert.equal(reloaded.state.cursor,x.cursor);
});
module.exports={skip};
